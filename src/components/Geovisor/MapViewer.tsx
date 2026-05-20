import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  LayersControl,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { SAMPLE_GEOJSON } from "../../constants";
import { dataService } from "../../services/dataService";
import { Novedad, Ejecucion, GeoJSONProperties } from "../../types";
import { cn } from "../../lib/utils";
import { Search, Filter, Users, Clock, AlertTriangle } from "lucide-react";

const { BaseLayer } = LayersControl;

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function FitBounds({ features }: { features: any[] }) {
  const map = useMap();
  const [hasFitted, setHasFitted] = useState(false);
  
  useEffect(() => {
    if (features && features.length > 0 && !hasFitted) {
      try {
        const group = L.featureGroup(features.map(f => L.geoJSON(f)));
        const bounds = group.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
          setHasFitted(true);
        }
      } catch (err) {
        console.error("Error fitting bounds:", err);
      }
    }
  }, [features, map, hasFitted]);
  return null;
}

export default function MapViewer() {
  const [ejecuciones, setEjecuciones] = useState<Record<string, Ejecucion>>({});
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [meta, setMeta] = useState<{
    cuadrillas: string[];
    microrrutas: Record<string, string[]>;
    lotes: Record<string, string[]>;
  }>({
    cuadrillas: [],
    microrrutas: {},
    lotes: {}
  });
  const [features, setFeatures] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCuadrilla, setFilterCuadrilla] = useState("Todas");
  const [filterEstado, setFilterEstado] = useState("Todos");
  // Cambia estas coordenadas por las de tu ciudad [Latitud, Longitud]
  // Ejemplo Medellín: [6.2442, -75.5812]
  // Ejemplo Cali: [3.4516, -76.5320]
  const [mapCenter, setMapCenter] = useState<[number, number]>([6.2442, -75.5812]); 
  const DEFAULT_ZOOM = 12; // Ajustado para ver mejor la ciudad inicialmente
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [quincenaManual, setQuincenaManual] = useState<"Q1" | "Q2">("Q1");

  useEffect(() => {
    const unsubNovedades = dataService.subscribeNovedades(setNovedades);
    const unsubEjecuciones = dataService.subscribeEjecuciones(setEjecuciones);
    
    // Static data loads
    const loadStatic = async () => {
      const m = await dataService.getMetadata();
      const f = await dataService.getFeatures();
      setMeta(m);
      setFeatures(f);
    };
    loadStatic();

    return () => {
      unsubNovedades();
      unsubEjecuciones();
    };
  }, []);

  const getQuincenaFromSemana = (semana: any) => {
    const semStr = String(semana || "").toLowerCase();
    const today = new Date().getDate();
    
    // Explicit week mapping
    if (semStr === "1" || semStr === "2") return "Q1";
    if (semStr === "3" || semStr === "4") return "Q2";
    
    // Combined weeks (e.g., "1 y 3", "2 y 4")
    const has1 = semStr.includes("1");
    const has2 = semStr.includes("2");
    const has3 = semStr.includes("3");
    const has4 = semStr.includes("4");

    if ((has1 && has3) || (has2 && has4)) {
      return today <= 15 ? "Q1" : "Q2";
    }
    
    return today <= 15 ? "Q1" : "Q2";
  };

  const handleAction = async (feature: any, action: "En Ejecución" | "Ejecutado") => {
    const { Microruta, No_Lote, Cuadrilla } = feature.properties;
    const currentMonth = new Date().getMonth() + 1; // 1-12
    
    await dataService.saveEjecucionGeovisor(
      Microruta, 
      No_Lote, 
      Cuadrilla || "Cuadrilla 6", 
      quincenaManual, 
      String(currentMonth), 
      action
    );
    // Refresh selected feature to update popup UI
    setSelectedFeature((prev: any) => ({ ...prev }));
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({ fillOpacity: 0.7 });
      },
      mouseout: (e) => {
        const l = e.target;
        l.setStyle({ fillOpacity: 0.6 });
      },
      click: (e) => {
        const props = feature.properties;
        setQuincenaManual(getQuincenaFromSemana(props.Semana));
        setSelectedFeature({
          feature,
          latlng: e.latlng
        });
      }
    });
  };

  const geojsonStyle = (feature: any) => {
    const props = feature.properties as any;
    
    // Find execution by searching for key that starts with microrruta|lote
    const prefix = `${props.Microruta}|${props.No_Lote}|`;
    const execEntry = Object.entries(ejecuciones).find(([key]) => key.replace(/_/g, '|').startsWith(prefix));
    const exec = execEntry ? (execEntry[1] as Ejecucion) : null;

    const hasNovedad = novedades.some(
      (n) => n.MICRORRUTA === props.Microruta && String(n.LOTE) === String(props.No_Lote) && n.ESTADO_NOVEDAD !== "SUBSANADA"
    );

    let color = "#080cfc"; // Default Blue
    if (hasNovedad) color = "#ef4444"; // Red for news
    else if (exec?.estado === "Ejecutado") color = "#22c55e"; // Green
    else if (exec?.estado === "En Ejecución") color = "#f59e0b"; // Yellow

    return {
      fillColor: color,
      weight: 2,
      opacity: 1,
      color: "transparent",
      fillOpacity: 0.6,
    };
  };

  const filteredFeatures = (features || []).filter((f) => {
    const props = f?.properties as any;
    if (!props) return false;
    
    // Normalize props if they are missing (use sample names)
    const mRuta = props.Microruta || props.microruta || props.RUTA || "";
    const nLote = props.No_Lote || props.no_lote || props.LOTE || "";

    const matchesSearch = 
      (String(mRuta).toLowerCase()).includes(searchTerm.toLowerCase()) ||
      (String(nLote).toLowerCase()).includes(searchTerm.toLowerCase());
    
    const prefix = `${mRuta}|${nLote}|`;
    const execEntry = Object.entries(ejecuciones).find(([key]) => key.replace(/_/g, '|').startsWith(prefix));
    const exec = execEntry ? (execEntry[1] as Ejecucion) : null;
    
    const estado = exec?.estado || "Pendiente";
    const hasNovedad = novedades.some(
      (n) => n.MICRORRUTA === mRuta && String(n.LOTE) === String(nLote) && n.ESTADO_NOVEDAD !== "SUBSANADA"
    );

    const matchesEstado = 
      filterEstado === "Todos" || 
      (filterEstado === "Con Novedad" && hasNovedad) ||
      (filterEstado !== "Con Novedad" && estado === filterEstado);

    const cuadrillaForMicro = Object.entries(meta.microrrutas).find(([_, micros]) => 
      (micros as string[]).some(m => String(m).toLowerCase() === String(mRuta).toLowerCase())
    )?.[0];
    
    const matchesCuadrilla = filterCuadrilla === "Todas" || 
      (cuadrillaForMicro && cuadrillaForMicro === filterCuadrilla) ||
      (props.Cuadrilla && String(props.Cuadrilla) === filterCuadrilla);

    return matchesSearch && matchesEstado && matchesCuadrilla;
  });

  return (
    <div className="relative h-screen w-full flex flex-col font-sans overflow-hidden">
      {/* Search and Toggle Filters button for Mobile */}
      <div className="absolute top-4 left-4 right-4 z-[2000] flex flex-col gap-2 pointer-events-none md:flex-row">
        <div className="flex gap-2 w-full md:w-auto overflow-visible pointer-events-auto">
          <div className="bg-white/95 backdrop-blur shadow-xl rounded-2xl p-3 flex items-center gap-3 border border-gray-100 flex-1 md:min-w-[300px]">
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar Microrruta o Lote..."
              className="flex-1 outline-none text-sm font-medium text-gray-700 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "md:hidden p-3 rounded-2xl shadow-xl border border-gray-100 bg-white transition-all",
              showFilters ? "bg-black text-white" : "bg-white text-black"
            )}
          >
            <Filter className="w-6 h-6" />
          </button>
        </div>

        {/* Filters Group */}
        <div className={cn(
          "flex flex-col md:flex-row gap-2 pointer-events-auto transition-all overflow-hidden md:h-auto",
          showFilters ? "max-h-[300px] opacity-100 mt-2" : "max-h-0 md:max-h-none opacity-0 md:opacity-100"
        )}>
          <div className="bg-white/95 backdrop-blur shadow-xl rounded-2xl p-3 flex items-center gap-4 border border-gray-100">
             <div className="flex items-center gap-2 w-full">
              <Users className="w-4 h-4 text-gray-400 shrink-0" />
              <select 
                className="text-xs font-semibold uppercase tracking-wider bg-transparent outline-none cursor-pointer w-full"
                value={filterCuadrilla}
                onChange={(e) => setFilterCuadrilla(e.target.value)}
              >
                <option value="Todas">Todas las Cuadrillas</option>
                {meta.cuadrillas.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
             </div>
          </div>

          <div className="bg-white/95 backdrop-blur shadow-xl rounded-2xl p-3 flex items-center gap-4 border border-gray-100">
             <div className="flex items-center gap-2 w-full">
              <Filter className="w-4 h-4 text-gray-400 shrink-0" />
              <select 
                className="text-xs font-semibold uppercase tracking-wider bg-transparent outline-none cursor-pointer w-full"
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
              >
                <option value="Todos">Todos los Estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En Ejecución">En Ejecución</option>
                <option value="Ejecutado">Ejecutado</option>
                <option value="Con Novedad">Con Novedad</option>
              </select>
             </div>
          </div>
        </div>
      </div>

      {/* Floating Legend Toggle for Mobile */}
      <div className="absolute bottom-10 left-4 z-[1000] md:hidden">
        <button 
          onClick={() => setShowLegend(!showLegend)}
          className={cn(
            "w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all animate-bounce",
            showLegend ? "bg-black text-white" : "bg-white text-black"
          )}
        >
          <AlertTriangle className="w-6 h-6" />
        </button>
      </div>

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={DEFAULT_ZOOM}
        className="flex-1 w-full"
        zoomControl={false}
      >
        <LayersControl position="bottomright">
          <BaseLayer checked name="OpenStreetMap">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </BaseLayer>
          <BaseLayer name="Satelital (Esri)">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </BaseLayer>
        </LayersControl>

        <FitBounds features={features} />

        {filteredFeatures.length > 0 && (
          <GeoJSON
            data={{ type: "FeatureCollection", features: filteredFeatures } as any}
            style={geojsonStyle}
            onEachFeature={onEachFeature}
            key={`geojson-${filteredFeatures.length}-${filterCuadrilla}-${filterEstado}-${searchTerm}`}
          />
        )}

        {selectedFeature && (
          <Popup 
            position={selectedFeature.latlng} 
            eventHandlers={{ remove: () => setSelectedFeature(null) }}
          >
            <div className="p-1 min-w-[200px] max-w-[280px]">
              <h3 className="font-bold text-lg text-gray-900 border-bottom mb-2">
                Lote {selectedFeature.feature.properties.No_Lote}
              </h3>
              <div className="space-y-1.5 text-sm mb-4">
                <p><span className="text-gray-500 font-medium">Microrruta:</span> {selectedFeature.feature.properties.Microruta}</p>
                <p><span className="text-gray-500 font-medium">Cuadrilla:</span> {selectedFeature.feature.properties.Cuadrilla}</p>
                <p><span className="text-gray-500 font-medium">Frecuencia:</span> {selectedFeature.feature.properties.Frecuencia}</p>
                
                <div className="flex items-center justify-between py-1.5 border-t border-gray-50 mt-1">
                  <span className="text-gray-500 font-medium ml-[-4px] mr-[-2px] mt-[5px]">Quincena a Reportar:</span>
                  <div className="flex bg-gray-100/80 p-0.5 rounded-full border border-gray-200 ml-1.5 pl-[5px] w-[96.3px]">
                    <button 
                      onClick={() => setQuincenaManual("Q1")}
                      className={cn(
                        "px-3 pt-[4px] pb-0.5 rounded-full text-[10px] font-bold transition-all ml-[1px]",
                        quincenaManual === "Q1" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      Q1
                    </button>
                    <button 
                      onClick={() => setQuincenaManual("Q2")}
                      className={cn(
                        "px-3 pt-[6px] pb-0.5 rounded-full text-[10px] font-bold transition-all ml-0 mr-[2px] w-[47.35px] h-[28.275px]",
                        quincenaManual === "Q2" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      Q2
                    </button>
                  </div>
                </div>

                <p><span className="text-gray-500 font-medium">Semana:</span> {selectedFeature.feature.properties.Semana}</p>
                <p><span className="text-gray-500 font-medium">Día de Ej:</span> {selectedFeature.feature.properties.Día_de_ej}</p>
                <p>
                  <span className="text-gray-500 font-medium">Estado:</span> 
                  {(() => {
                    const props = selectedFeature.feature.properties;
                    const prefix = `${props.Microruta}|${props.No_Lote}|`;
                    const execEntry = Object.entries(ejecuciones).find(([key]) => key.replace(/_/g, '|').startsWith(prefix));
                    const exec = execEntry ? (execEntry[1] as Ejecucion) : null;
                    const estado = exec?.estado || "Pendiente";
                    
                    return (
                      <span className={cn(
                        "ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        estado === "Pendiente" ? "bg-blue-100 text-blue-700" :
                        estado === "En Ejecución" ? "bg-amber-100 text-amber-700" :
                        "bg-green-100 text-green-700"
                      )}>
                        {estado}
                      </span>
                    );
                  })()}
                </p>
                {novedades.some(n => n.MICRORRUTA === selectedFeature.feature.properties.Microruta && String(n.LOTE) === String(selectedFeature.feature.properties.No_Lote) && n.ESTADO_NOVEDAD !== "SUBSANADA") && (
                  <p className="flex items-center gap-1.5 text-red-600 font-bold bg-red-50 p-2 rounded-lg mt-2">
                    <AlertTriangle className="w-4 h-4" />
                    NOVEDAD ACTIVA
                  </p>
                )}
              </div>
              
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                {(() => {
                  const props = selectedFeature.feature.properties;
                  const prefix = `${props.Microruta}|${props.No_Lote}|`;
                  const execEntry = Object.entries(ejecuciones).find(([key]) => key.replace(/_/g, '|').startsWith(prefix));
                  const exec = execEntry ? (execEntry[1] as Ejecucion) : null;
                  
                  return (
                    <>
                      <button
                        onClick={() => handleAction(selectedFeature.feature, "En Ejecución")}
                        disabled={exec?.estado === "En Ejecución" || exec?.estado === "Ejecutado"}
                        className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 md:py-2 rounded-xl md:rounded-lg text-xs transition-colors"
                      >
                        INICIAR TRABAJO
                      </button>
                      <button
                        onClick={() => handleAction(selectedFeature.feature, "Ejecutado")}
                        disabled={exec?.estado === "Ejecutado"}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 md:py-2 rounded-xl md:rounded-lg text-xs transition-colors"
                      >
                        FINALIZAR TRABAJO
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </Popup>
        )}
      </MapContainer>

      {/* Sidebar / Layer Panel - Legend */}
      <div className={cn(
        "absolute right-4 z-[1000] flex flex-col gap-3 transition-all duration-500",
        "top-[100px] pointer-events-auto",
        showLegend ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
      )}>
        <div className="bg-white/95 backdrop-blur-xl p-6 rounded-[32px] shadow-2xl border border-white/20 h-[185.455px] w-[200px] pt-[15px]">
          <div className="flex items-center justify-between mb-4 md:block">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Simbología</h4>
            <button onClick={() => setShowLegend(false)} className="md:hidden text-gray-400 font-black">×</button>
          </div>
          <div className="space-y-3">
            <LegendItem color="#ef4444" label="Novedad Activa" />
            <LegendItem color="#3b82f6" label="Pendiente" />
            <LegendItem color="#f59e0b" label="En Ejecución" />
            <LegendItem color="#22c55e" label="Ejecutado" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-lg shadow-sm" style={{ backgroundColor: color, opacity: 0.6, border: `2px solid ${color}` }} />
      <span className="text-[12px] font-bold text-gray-700">{label}</span>
    </div>
  );
}
