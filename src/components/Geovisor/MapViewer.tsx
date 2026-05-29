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
import { Novedad, Ejecucion, GeoJSONProperties, User } from "../../types";
import { cn } from "../../lib/utils";
import { Search, Filter, Users, Clock, AlertTriangle, Lock } from "lucide-react";

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

const getExecutionForFeature = (props: any, ejecuciones: Record<string, any>) => {
  try {
    if (!props || !ejecuciones || typeof ejecuciones !== "object") return null;
    const mRuta = String(props.Microruta || props.microrruta || props.MICRORRUTA || "").toLowerCase().trim();
    const nLote = String(props.No_Lote || props.no_lote || props.LOTE || props.lote || "").toLowerCase().trim();
    if (!mRuta || !nLote) return null;
  
  const rawExec = Object.values(ejecuciones).find((exec: any) => {
    if (!exec || typeof exec !== "object") return false;
      const execMicro = String(exec.MICRORRUTA || exec.microrruta || exec.id || "").toLowerCase().trim();
      const execLote = String(exec.LOTE !== undefined ? exec.LOTE : (exec.lote !== undefined ? exec.lote : "")).toLowerCase().trim();
      return execMicro === mRuta && execLote === nLote;
  });
  
  if (!rawExec) {
      // Try to find using the old startsWith pattern matching
      const prefix = `${props.Microruta || ""}|${props.No_Lote || ""}|`;
      const execEntry = Object.entries(ejecuciones).find(([key]) => {
        return String(key || "").replace(/_/g, '|').startsWith(prefix);
      });
      if (execEntry && execEntry[1] && typeof execEntry[1] === "object") {
        const e = execEntry[1] as any;
        return {
          id: String(e.id || ""),
          estado: String(e.ESTADO || e.estado || "Pendiente"),
          fechaInicio: String(e.FECHA_INICIO || e.fechaInicio || ""),
          fechaFin: String(e.FECHA_FIN || e.fechaFin || ""),
          microrruta: String(e.MICRORRUTA || e.microrruta || ""),
          lote: String(e.LOTE !== undefined ? e.LOTE : (e.lote !== undefined ? e.lote : "")),
          cuadrilla: String(e.CUADRILLA || e.cuadrilla || "")
        } as Ejecucion;
      }
      return null;
    }
  
  return {
      id: String(rawExec.id || ""),
      estado: String(rawExec.ESTADO || rawExec.estado || "Pendiente"),
      fechaInicio: String(rawExec.FECHA_INICIO || rawExec.fechaInicio || ""),
      fechaFin: String(rawExec.FECHA_FIN || rawExec.fechaFin || ""),
      microrruta: String(rawExec.MICRORRUTA || rawExec.microrruta || ""),
      lote: String(rawExec.LOTE !== undefined ? rawExec.LOTE : (rawExec.lote !== undefined ? rawExec.lote : "")),
      cuadrilla: String(rawExec.CUADRILLA || rawExec.cuadrilla || "")
    } as Ejecucion;
  } catch (err) {
    console.error("Error inside getExecutionForFeature:", err);
    return null;
  }
};

interface MapViewerProps {
  selectedCuadrilla?: string;
  onSelectCuadrilla?: (cuadrilla: string) => void;
  currentUser?: User | null;
  onTriggerLogin?: () => void;
}

export default function MapViewer({ 
  selectedCuadrilla, 
  onSelectCuadrilla, 
  currentUser, 
  onTriggerLogin 
}: MapViewerProps) {
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
  const [filterCuadrilla, setFilterCuadrilla] = useState(selectedCuadrilla || "Todas");
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
    setFilterCuadrilla(selectedCuadrilla || "Todas");
  }, [selectedCuadrilla]);

  useEffect(() => {
    const unsubNovedades = dataService.subscribeNovedades(setNovedades);
    const unsubEjecuciones = dataService.subscribeEjecuciones(setEjecuciones);
    
    // Static data loads
    const loadStatic = async () => {
      const m = await dataService.getMetadata();
      let f = await dataService.getFeatures();
      
      // OPTIMIZATION: If working in a specific cuadrilla, filter out
      // other cuadrillas' heavy geojson data prior to setting features.
      // This completely resolves render lags for Leaflet!
      if (selectedCuadrilla && selectedCuadrilla !== "Todas") {
        const queryTerm = String(selectedCuadrilla).toLowerCase().replace(/[\s_-]/g, "");
        f = f.filter((item: any) => {
          const cVal = item.properties?.Cuadrilla;
          if (!cVal) return false;
          return String(cVal).toLowerCase().replace(/[\s_-]/g, "") === queryTerm;
        });
      }
      
      setMeta(m);
      setFeatures(f);
    };
    loadStatic();

    return () => {
      unsubNovedades();
      unsubEjecuciones();
    };
  }, [selectedCuadrilla]);

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
    try {
    const props = feature.properties || {};
    const microrruta = props.Microruta || props.microrruta || props.MICRORRUTA || "";
    const lote = props.No_Lote || props.no_lote || props.LOTE || props.lote || "";
    const cuadrilla = props.Cuadrilla || props.cuadrilla || props.CUADRILLA || "Cuadrilla 6";
    const currentMonth = new Date().getMonth() + 1; // 1-12
    
    await dataService.saveEjecucionGeovisor(
      microrruta, 
      lote, 
      cuadrilla, 
      quincenaManual, 
      String(currentMonth), 
      action,
      props
    );
    // Refresh selected feature to update popup UI
      setSelectedFeature((prev: any) => prev ? { ...prev } : null);
    } catch (err) {
      console.error("Error saving execution in map:", err);
      alert("Ocurrió un error al guardar la ejecución en la base de datos de Firebase. Por favor valide su red o configuraciones.");
    }
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    layer.on({
      mouseover: (e) => {
        const l = e.target;
      },
      mouseout: (e) => {
        const l = e.target;
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
    
    // Find execution by searching with robust helper
    const exec = getExecutionForFeature(props, ejecuciones);

    const hasNovedad = novedades.some(
      (n) => n.MICRORRUTA === props.Microruta && String(n.LOTE) === String(props.No_Lote) && n.ESTADO_NOVEDAD !== "SUBSANADA"
    );

    let color = "#0091ff"; // Default Blue
    if (hasNovedad) color = "#ff0808"; // Red for news
    else if (exec?.estado === "Ejecutado") color = "#0eaa08"; // Green
    else if (exec?.estado === "En Ejecución") color = "#fcc900"; // Yellow

    return {
      fillColor: color,
      weight: 1,
      opacity: 1,
      color: "trasnparent",
      fillOpacity: 1,
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
    
    const exec = getExecutionForFeature({ Microruta: mRuta, No_Lote: nLote }, ejecuciones);
    
    const estado = exec?.estado || "Pendiente";
    const matchesEstado = filterEstado === "Todos" || estado === filterEstado;

    const cuadrillaForMicro = Object.entries(meta.microrrutas).find(([_, micros]) => 
      (micros as string[]).some(m => String(m).toLowerCase() === String(mRuta).toLowerCase())
    )?.[0];
    
    const matchesCuadrilla = filterCuadrilla === "Todas" || 
      (cuadrillaForMicro && cuadrillaForMicro === filterCuadrilla) ||
      (props.Cuadrilla && String(props.Cuadrilla) === filterCuadrilla);

    return matchesSearch && matchesEstado && matchesCuadrilla;
  });

  // If no cuadrilla is selected, show the custom selector landing page
  if (!selectedCuadrilla) {
    const listCuadrillas = Array.from({ length: 11 }, (_, i) => `Cuadrilla ${i + 1}`);
    return (
      <div className="min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-100px)] w-full bg-neutral-50 p-4 md:p-8 relative flex items-center justify-center overflow-auto animate-in fade-in duration-700 font-sans">
        {/* Decorative Gradients */}
        <div className="absolute top-[10%] -left-20 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-[#c2e2f0]/30 rounded-full blur-[100px] -z-10" />
        <div className="absolute bottom-[10%] -right-20 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-emerald-100/30 rounded-full blur-[100px] -z-10" />

        <div className="max-w-4xl w-full bg-white/95 backdrop-blur rounded-[32px] md:rounded-[40px] p-6 md:p-12 shadow-xl shadow-neutral-200/55 border border-neutral-100 relative z-10 transition-all">
          <header className="text-center mb-10 max-w-2xl mx-auto">
            <div className="mx-auto w-14 h-14 bg-sky-500 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-sky-200/80 mb-6 font-semibold animate-pulse">
              <Users size={28} />
            </div>
            <h2 className="text-2xl md:text-3xl font-serif text-gray-950 tracking-tight leading-tight mb-3">
              Cartografía operativa - Contrato EMVARIAS
            </h2>
            <p className="text-xs md:text-sm text-neutral-500 font-medium leading-relaxed mb-6">
              Seleccione su cuadrilla de operación.
            </p>
          </header>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
            {listCuadrillas.map((cuadrilla) => {
              const num = cuadrilla.split(" ")[1];
              return (
                <button
                  key={cuadrilla}
                  onClick={() => onSelectCuadrilla?.(cuadrilla)}
                  className="group relative flex flex-col items-center justify-center p-5 rounded-2xl bg-neutral-50 hover:bg-sky-50 border border-neutral-200/60 hover:border-sky-500/40 text-center transition-all duration-300 active:scale-95 shadow-sm hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-100 group-hover:bg-sky-500/10 flex items-center justify-center mb-3 text-neutral-600 group-hover:text-sky-600 transition-all font-bold">
                    <span className="font-extrabold text-xs">{num}</span>
                  </div>
                  <span className="text-xs font-bold text-neutral-800 tracking-tight group-hover:text-sky-900 uppercase">
                    {cuadrilla}
                  </span>
                  <span className="text-[9px] font-semibold text-neutral-400 mt-1 uppercase tracking-wider group-hover:text-sky-500/70">
                    Supervisor
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-neutral-100 pt-6 flex justify-center">
            <button
              onClick={() => onSelectCuadrilla?.("Todas")}
              className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-extrabold uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 inline-flex items-center gap-2"
            >
              Ver Todas las Cuadrillas
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                <option value="Novedad">Novedad</option>
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
            data={{ type: "FeatureCollection", features: filteredFeatures }}
            style={geojsonStyle}
            onEachFeature={onEachFeature}
            key={`geojson-${filteredFeatures.length}-${filterCuadrilla}-${filterEstado}-${searchTerm}`}
          />
        )}

        {selectedFeature && selectedFeature.feature && selectedFeature.latlng && (
          <Popup 
            key={`popup-${selectedFeature.feature.properties.Microruta || ""}-${selectedFeature.feature.properties.No_Lote || ""}-${getExecutionForFeature(selectedFeature.feature.properties, ejecuciones)?.estado || "Pendiente"}-${quincenaManual}`}
            position={selectedFeature.latlng} 
            onClose={() => setSelectedFeature(null)}
          >
            <div className="p-1 min-w-[200px] max-w-[280px]">
              <h3 className="text-[20px] font-bold text-gray-800 border-bottom mb-2 justify-center flex items-center gap-2 mb-2">
                Lote {selectedFeature.feature.properties.No_Lote}
              </h3>
              <div className="space-y-1.5 text-sm mb-4">
                <p><span className="text-black-600 font-bold">Microrruta:</span> {selectedFeature.feature.properties.Microruta}</p>
                <p><span className="text-black-600 font-bold">Cuadrilla:</span> {selectedFeature.feature.properties.Cuadrilla}</p>
                <p><span className="text-black-600 font-bold">Frecuencia:</span> {selectedFeature.feature.properties.Frecuencia}</p>
                
                <div className="flex items-center justify-between py-1.5 border-t border-gray-50 mt-1">
                  <span className="text-black-600 font-bold ml-[-4px] mr-[-2px] mt-[5px]">Quincena a Reportar:</span>
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

                <p><span className="text-black-600 font-bold">Semana:</span> {selectedFeature.feature.properties.Semana}</p>
                <p><span className="text-black-600 font-bold">Día de Ej:</span> {selectedFeature.feature.properties.Día_de_ej}</p>
                <p>
                  <span className="text-black-600 font-bold">Estado:</span> 
                  {(() => {
                    try {
                    const props = selectedFeature.feature.properties;
                    const exec = getExecutionForFeature(props, ejecuciones);
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
                  } catch (e) {
                    console.error("Error rendering status:", e);
                      return <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700">Pendiente</span>;
                    }
                  })()}
                </p>
                {(() => {
                  try {
                    const activeNovs = (novedades || []).filter(
                      n => n && n.MICRORRUTA === selectedFeature.feature.properties.Microruta && 
                      String(n.LOTE || "") === String(selectedFeature.feature.properties.No_Lote || "") && 
                      n.ESTADO_NOVEDAD !== "SUBSANADA"
                    );
                  if (activeNovs.length === 0) return null;
                  return (
                    <div className="mt-2.5 p-2.5 bg-red-50 border border-red-200/60 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-red-700 font-extrabold text-[10px] uppercase tracking-wider mb-1.5">
                        <span>{activeNovs.length === 1 ? 'Novedad Activa' : 'Novedades Activas'}</span>
                      </div>
                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-0.5">
                        {activeNovs.map((n, idx) => (
                          <div key={n.id || idx} className="text-[11px] leading-tight text-red-950 font-medium pb-1.5 last:pb-0 border-b border-red-200/40 last:border-0 pl-1">
                            <span className="font-black block text-red-800 uppercase text-[9px] tracking-tight">
                               {n.TIPO_NOVEDAD || 'Novedad General'}
                            </span>
                            {n.FECHA_REPORTE_NOVEDAD && (
                              <span className="text-red-900/60 block mt-0.5 text-[9px] font-semibold uppercase">
                                Reportado: {n.FECHA_REPORTE_NOVEDAD}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                  } catch (e) {
                    console.error("Error rendering novelty popup state:", e);
                    return null;
                  }
                })()}
              </div>
              
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                {(() => {
                  try {
                  const props = selectedFeature.feature.properties;
                  const exec = getExecutionForFeature(props, ejecuciones);
                  const isSupervisor = currentUser?.role === "supervisor";
                  
                  if (!isSupervisor) {
                    return (
                      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-1.5 text-center shadow-xl">
                        <p className="text-[10px] text-neutral-500 font-bold mb-1.5 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                          Modo Solo Lectura
                        </p>
                        <button
                          onClick={onTriggerLogin}
                          className="w-full bg-neutral-900 hover:bg-black text-white font-extrabold uppercase py-2 rounded-lg text-[9px] tracking-widest transition-colors"
                        >
                          Iniciar Sesión
                        </button>
                      </div>
                    );
                  }
                  
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
                  } catch (e) {
                    console.error("Error rendering action buttons:", e);
                    return null;
                  }
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
