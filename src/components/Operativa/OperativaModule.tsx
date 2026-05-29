  import React, { useState, useEffect } from "react";
  import { dataService, formatCuadrilla } from "../../services/dataService";
  import { CUADRILLAS, MICRORRUTAS, LOTES, TIPOS_NOVEDAD } from "../../constants";
  import { Novedad } from "../../types";
  import { cn } from "../../lib/utils";
  import { differenceInDays } from "date-fns";
  import { 
    PlusCircle, 
    CheckCircle2, 
    Clock, 
    MapPin, 
    Users, 
    Calendar,
    AlertTriangle,
    History,
    Search,
    X
  } from "lucide-react";

  // Función auxiliar para obtener fecha local YYYY-MM-DD
  const getLocalDate = () => {
    const d = new Date();
    return d.toLocaleDateString('en-CA'); // 'en-CA' garantiza el formato YYYY-MM-DD
  };

  export default function OperativaModule({ selectedCuadrilla = "Todas" }: { selectedCuadrilla?: string }) {
    const [activeTab, setActiveTab] = useState<"reporte" | "cierre" | "historial">("reporte");
    const [novedades, setNovedades] = useState<Novedad[]>([]);
    const [isSyncing, setIsSyncing] = useState(true);
    const [showDebug, setShowDebug] = useState(false);

    useEffect(() => {
      setIsSyncing(true);
      const unsubscribe = dataService.subscribeNovedades((data) => {
        setNovedades(data);
        setIsSyncing(false);
      });

      return () => unsubscribe();
    }, []);

    const loadNovedades = async () => {
      setIsSyncing(true);
      const data = await dataService.getAllNovedades();
      setNovedades(data);
      setIsSyncing(false);
    };

    return (
      <div className="min-h-screen bg-[#edf6ed] p-4 md:p-10 font-sans">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="md:px-5">
              <h1 className="text-4xl md:text-6xl font-serif text-gray-900 leading-none">Gestión Operativa</h1>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-gray-500 font-medium">Reporte y cierre de Novedades Postoperación</p>
                {isSyncing ? (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter animate-pulse">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping" />
                    Sincronizando
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-tighter cursor-help" onClick={() => setShowDebug(!showDebug)}>
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    Sincronizado
                  </div>
                )}
              </div>
              {showDebug && (
                <div className="mt-2 p-3 bg-gray-900 text-[10px] font-mono text-green-400 rounded-lg shadow-inner overflow-hidden max-w-md animate-in slide-in-from-top-1">
                  <p>Firebase Root: {import.meta.env.VITE_FIREBASE_ROOT_PATH || "1J2nsdurIA06xDzlAPbNHUChTszGJiYWtKXZv4AP7o28"}</p>
                  <p>Database: {import.meta.env.VITE_FIREBASE_DATABASE_URL}</p>
                  <p>Proyect: {import.meta.env.VITE_FIREBASE_PROJECT_ID}</p>
                  <button 
                    onClick={() => setShowDebug(false)}
                    className="mt-2 text-white hover:underline uppercase font-bold"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
            
            <nav className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 self-start md:h-[57.6px] w-full md:w-auto">
              <button
                onClick={() => setActiveTab("reporte")}
                className={cn(
                  "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                  activeTab === "reporte" 
                    ? "bg-[#1A1A1A] text-white shadow-lg" 
                    : "text-gray-500 hover:text-gray-800"
                )}
              >
                <PlusCircle className="w-4 h-4" />
                Reporte
              </button>
              <button
                onClick={() => setActiveTab("cierre")}
                className={cn(
                  "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                  activeTab === "cierre" 
                    ? "bg-[#1A1A1A] text-white shadow-lg" 
                    : "text-gray-500 hover:text-gray-800"
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                Cierre
              </button>
              <button
                onClick={() => setActiveTab("historial")}
                className={cn(
                  "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                  activeTab === "historial" 
                    ? "bg-[#1A1A1A] text-white shadow-lg" 
                    : "text-gray-500 hover:text-gray-800"
                )}
              >
                <History className="w-4 h-4" />
                Historial
              </button>
            </nav>
          </header>

          {/* Notificación Crítica Global */}
          {novedades.filter(n => n.ESTADO_NOVEDAD !== "SUBSANADA" && differenceInDays(new Date(), new Date(n.FECHA_REPORTE_NOVEDAD)) > 5).length > 0 && (
            <div className="mb-8 bg-white border-l-[6px] md:border-l-8 border-red-500 p-4 md:p-6 rounded-2xl shadow-xl shadow-red-100 flex flex-col sm:flex-row items-center justify-between group overflow-hidden relative gap-4">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                <AlertTriangle size={80} className="md:w-[100px] md:h-[100px]" />
              </div>
              <div className="flex items-center gap-4 md:gap-5 relative z-10 w-full sm:w-auto">
                <div className="bg-red-500 text-white p-2 md:p-3 rounded-xl shrink-0">
                  <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Existen <span className="text-red-600 font-black">{novedades.filter(n => n.ESTADO_NOVEDAD !== "SUBSANADA" && differenceInDays(new Date(), new Date(n.FECHA_REPORTE_NOVEDAD)) > 5).length} novedades</span>
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Respuesta crítica requerida</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab("cierre")}
                className="relative z-10 bg-[#1A1A1A] hover:bg-red-600 text-white text-xs font-black px-8 py-3.5 rounded-xl transition-all shadow-lg active:scale-95 w-full sm:w-auto"
              >
                GESTIONAR
              </button>
            </div>
          )}

          <main className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {activeTab === "reporte" ? (
              <ReportForm onReported={loadNovedades} selectedCuadrilla={selectedCuadrilla} />
            ) : activeTab === "cierre" ? (
              <CierreList novedades={novedades} onUpdated={loadNovedades} selectedCuadrilla={selectedCuadrilla} />
            ) : (
              <HistorialList novedades={novedades} selectedCuadrilla={selectedCuadrilla} />
            )}
          </main>
        </div>
      </div>
    );
  }

  function ReportForm({ onReported, selectedCuadrilla }: { onReported: () => void; selectedCuadrilla: string }) {
    const [meta, setMeta] = useState<{
      cuadrillas: string[];
      microrrutas: Record<string, string[]>;
      lotes: Record<string, string[]>;
    }>({
      cuadrillas: [],
      microrrutas: {},
      lotes: {}
    });

    const [emailsConfig, setEmailsConfig] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
      cuadrilla: selectedCuadrilla && selectedCuadrilla !== "Todas" ? selectedCuadrilla : "",
      microrruta: "",
      lote: "",
      quincena: "Q1" as const,
      tipoNovedad: "",
      fechaReporte: getLocalDate(),
      correo: ""
    });

    useEffect(() => {
      const fetchMeta = async () => {
        const [metaData, emailsData] = await Promise.all([
          dataService.getMetadata(),
          dataService.getCuadrillasEmails()
        ]);
        setMeta(metaData);
        setEmailsConfig(emailsData);
        
        // Auto pre-populate associated email if a specific Cuadrilla is selected
        if (selectedCuadrilla && selectedCuadrilla !== "Todas") {
          const formatted = formatCuadrilla(selectedCuadrilla);
          const associatedEmail = emailsData[formatted] || emailsData[selectedCuadrilla] || "";
          if (associatedEmail) {
            setFormData(prev => ({ ...prev, correo: associatedEmail }));
          }
        }
      };
      fetchMeta();
    }, [selectedCuadrilla]);

    const handleCuadrillaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const cuadrilla = e.target.value;
      const formatted = formatCuadrilla(cuadrilla);
      const associatedEmail = emailsConfig[formatted] || emailsConfig[cuadrilla] || "";
      
      setFormData({ 
        ...formData, 
        cuadrilla, 
        microrruta: "", 
        lote: "",
        correo: associatedEmail
      });
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.cuadrilla || !formData.microrruta || !formData.lote) {
        alert("Por favor complete los campos obligatorios");
        return;
      }
      
      console.log("Submitting novelty:", formData);
      try {
        const result = await dataService.createNovedad({
          ...formData,
          quincena: parseInt(formData.quincena.substring(1), 10)
        });
        console.log("Creation successful, result:", result);
        onReported();
        alert(`Novedad registrada con éxito. ID: ${result.id}`);
        // Clear some fields
        setFormData(prev => ({ ...prev, tipoNovedad: "" }));
      } catch (error) {
        console.error("Submission failed:", error);
        alert("Error al registrar la novedad. Revise la consola.");
      }
    };

    return (
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 md:p-10 border border-gray-100 overflow-hidden relative">
        <div className="grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_350px] gap-8 md:gap-12">
          <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 relative z-10">
            <div className="grid sm:grid-cols-2 gap-6 md:gap-8">
              <FormField label="Cuadrilla">
                <select
                  className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none font-medium transition-all text-sm"
                  value={formData.cuadrilla}
                  onChange={handleCuadrillaChange}
                >
                  <option value="">Seleccione Cuadrilla</option>
                  {meta.cuadrillas.length > 0 ? (
                    meta.cuadrillas.map(c => (
                      <option key={c} value={c}>
                        {/^\d+$/.test(c) ? `CUADRILLA ${c}` : c.toUpperCase()}
                      </option>
                    ))
                  ) : (
                    <option disabled>Cargando cuadrillas...</option>
                  )}
                </select>
              </FormField>
  
              <FormField label="Microrruta">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Escriba o pegue Microrruta"
                    className={cn(
                      "w-full bg-gray-50 border-0 rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none font-medium transition-all disabled:opacity-50 text-sm"
                    )}
                    value={formData.microrruta}
                    disabled={!formData.cuadrilla}
                    onChange={(e) => setFormData({ ...formData, microrruta: e.target.value, lote: "" })}
                    list="microrrutas-list"
                  />
                  <datalist id="microrrutas-list">
                    {formData.cuadrilla && meta.microrrutas[formData.cuadrilla]?.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </FormField>
  
              {formData.microrruta && (
                <FormField label="Lote" >
                  <select
                    className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none font-medium transition-all disabled:opacity-50 text-sm"
                    value={formData.lote}
                    onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                  >
                    <option value="">Seleccione Lote</option>
                    {meta.lotes[formData.microrruta] ? (
                      meta.lotes[formData.microrruta].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))
                    ) : (
                      meta.lotes[Object.keys(meta.lotes).find(k => k.toUpperCase() === formData.microrruta.toUpperCase()) || ""]?.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))
                    )}
                  </select>
                </FormField>
              )}

              <FormField label="Quincena">
                <div className="flex bg-gray-50 p-1 rounded-xl">
                  {["Q1", "Q2"].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setFormData({ ...formData, quincena: q as any })}
                      className={cn(
                        "flex-1 py-3 md:py-3.5 rounded-lg text-sm font-bold transition-all",
                        formData.quincena === q ? "bg-white shadow-md text-black" : "text-gray-400"
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="Tipo de Novedad">
                <select
                  className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none font-medium transition-all text-sm"
                  value={formData.tipoNovedad}
                  onChange={(e) => setFormData({ ...formData, tipoNovedad: e.target.value })}
                >
                  <option value="">Seleccione...</option>
                  {TIPOS_NOVEDAD.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>

              <FormField label="Fecha Reporte">
                <input
                  type="date"
                  className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none font-medium transition-all text-sm"
                  value={formData.fechaReporte}
                  onChange={(e) => setFormData({ ...formData, fechaReporte: e.target.value })}
                />
              </FormField>

              <FormField label="Correo Electrónico de Notificación">
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none font-medium transition-all text-sm"
                  value={formData.correo}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                />
              </FormField>
            </div>

            <button
              type="submit"
              className="w-full bg-[#1A1A1A] hover:bg-black text-white font-bold py-4 md:py-5 rounded-2xl shadow-xl shadow-gray-200 hover:shadow-2xl transition-all active:scale-[0.98] mt-4"
            >
              REGISTRAR NOVEDAD
            </button>
          </form>

          <aside className="hidden lg:block bg-white rounded-2xl p-6 md:p-8 border border-gray-100 h-fit" style={{ borderWidth: '2.8px' }}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6">Resumen de Registro</h3>
            <div className="space-y-6">
              <SummaryItem label="Ubicación" value={`${formData.microrruta || '---'} | Lote ${formData.lote || '---'}`} />
              <SummaryItem label="Responsable" value={formData.cuadrilla || '---'} />
              <SummaryItem label="Correo de contacto" value={formData.correo || '---'} />
              <SummaryItem label="Temporalidad" value={formData.quincena} />
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-300 mb-2">Previsualización de ID</p>
                <code className="text-[10px] bg-white px-3 py-2 rounded-lg border border-gray-200 block text-gray-500 truncate">
                  {formData.microrruta || "M"}|{formatCuadrilla(formData.cuadrilla) || "C"}|{formData.lote || "L"}|{formData.quincena}|N?
                </code>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  function CierreList({ novedades, onUpdated, selectedCuadrilla }: { novedades: Novedad[]; onUpdated: () => void; selectedCuadrilla: string }) {
    const activeNovedades = novedades.filter(n => n.ESTADO_NOVEDAD !== "SUBSANADA");
    const [selectedNovedad, setSelectedNovedad] = useState<Novedad | null>(null);
    const [activeCuadrilla, setActiveCuadrilla] = useState<string | null>(() => {
      if (selectedCuadrilla && selectedCuadrilla !== "Todas") {
        return formatCuadrilla(selectedCuadrilla);
      }
      return null;
    });
    const [searchTerm, setSearchTerm] = useState("");

    // Sync activeCuadrilla if selectedCuadrilla changes
    useEffect(() => {
      if (selectedCuadrilla && selectedCuadrilla !== "Todas") {
        setActiveCuadrilla(formatCuadrilla(selectedCuadrilla));
      } else {
        setActiveCuadrilla(null);
      }
    }, [selectedCuadrilla]);

    // Reset search when changing cuadrilla
    useEffect(() => {
      setSearchTerm("");
    }, [activeCuadrilla]);

    // Group by cuadrilla
    const groupedNovedades = activeNovedades.reduce((acc, n) => {
      const key = formatCuadrilla(n.CUADRILLA);
      if (!acc[key]) acc[key] = [];
      acc[key].push(n);
      return acc;
    }, {} as Record<string, Novedad[]>);

    // Always show 11 cuadrillas as requested
    const allCuadrillas = Array.from({ length: 11 }, (_, i) => `Cuadrilla_${i + 1}`);

    // View for a specific Cuadrilla
    if (activeCuadrilla) {
      const items = (groupedNovedades[activeCuadrilla] || []).filter(n => 
        (n.MICRORRUTA || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
        String(n.LOTE || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
        (n.TIPO_NOVEDAD || "").toLowerCase().includes((searchTerm || "").toLowerCase())
      );

      return (
        <div className="space-y-8 animate-in slide-in-from-right duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 gap-4">
            <button 
              onClick={() => setActiveCuadrilla(null)}
              className="flex items-center gap-2 text-sm font-black text-gray-400 hover:text-black transition-all uppercase tracking-tighter group shrink-0"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                ←
              </div>
              Volver
            </button>

            <div className="flex-1 max-w-md w-full">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                <input 
                  type="text"
                  placeholder="Buscar por lote, microrruta..."
                  className="w-full bg-gray-50 border-gray-100 border focus:border-black focus:bg-white rounded-2xl pl-11 pr-4 py-3 text-sm font-medium outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="text-right md:shrink-0">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter leading-tight">{activeCuadrilla.replace("_", " ")}</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{items.length} NOVEDADES ACTIVAS</p>
            </div>
          </div>

          {items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {items.map((n) => {
                const age = differenceInDays(new Date(), new Date(n.FECHA_REPORTE_NOVEDAD));
                const isCritical = age > 5;

                return (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNovedad(n)}
                    className={cn(
                      "bg-white rounded-3xl p-5 md:p-6 border-2 transition-all hover:shadow-2xl cursor-pointer group relative overflow-hidden flex flex-col h-full",
                      isCritical ? "border-red-100 hover:border-red-500 shadow-red-50" : "border-gray-100 hover:border-black shadow-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">{n.MICRORRUTA}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-200" />
                      <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Q{n.QUINCENA}</span>
                    </div>

                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Lote {n.LOTE}</h3>
                    <p className="text-xs md:text-sm font-medium text-gray-500 mb-6 line-clamp-2">{n.TIPO_NOVEDAD}</p>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1.5 text-gray-400 shrink-0">
                          <Clock className="w-3 md:w-3.5 h-3 md:h-3.5" />
                          <span className="text-[10px] md:text-xs font-bold">{n.FECHA_REPORTE_NOVEDAD}</span>
                      </div>
                      <span className={cn(
                        "px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-tighter shadow-sm shrink-0 ml-2",
                        n.ESTADO_NOVEDAD === "PENDIENTE" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {n.ESTADO_NOVEDAD}
                      </span>
                    </div>

                    {isCritical && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black px-2 md:px-3 py-1 rounded-bl-xl uppercase tracking-tighter">
                        CRÍTICO
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 md:p-20 text-center border-2 border-dashed border-gray-100">
              <div className="bg-green-50 w-16 md:w-20 h-16 md:h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 md:w-10 h-8 md:h-10 text-green-500" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Cuadrilla al día</h3>
              <p className="text-gray-400 font-medium text-sm">No hay novedades pendientes</p>
            </div>
          )}

          {selectedNovedad && (
            <CierreModal 
              novedad={selectedNovedad} 
              onClose={() => setSelectedNovedad(null)} 
              onUpdated={() => {
                onUpdated();
                setSelectedNovedad(null);
              }}
            />
          )}
        </div>
      );
    }

    // Main Multi-Card View (Grid of Cuadrillas)
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
        {allCuadrillas.map((cuadrilla) => {
          const count = groupedNovedades[cuadrilla]?.length || 0;
          const hasCritical = groupedNovedades[cuadrilla]?.some(n => 
            differenceInDays(new Date(), new Date(n.FECHA_REPORTE_NOVEDAD)) > 5
          );

          return (
            <div
              key={cuadrilla}
              onClick={() => setActiveCuadrilla(cuadrilla)}
              className={cn(
                "group relative aspect-video sm:aspect-[16/9] flex flex-col items-center justify-center text-center p-6 md:p-8 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xl border-4 rounded-[32px] uppercase overflow-hidden",
                count === 0 
                  ? "bg-emerald-600 border-emerald-700 text-white shadow-emerald-200" 
                  : hasCritical 
                    ? "bg-red-600 border-red-800 text-white shadow-red-200" 
                    : "bg-[#f97316] border-[#ea580c] text-white shadow-[#f97316]/20"
              )}
            >
              {/* Glossy overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-30 pointer-events-none" />
              
              <h3 className={cn(
                "text-xl md:text-2xl font-black tracking-tighter mb-1 relative z-10 group-hover:scale-110 transition-transform duration-300",
                "text-white"
              )}>
                {cuadrilla.replace("_", " ")}
              </h3>
              
              <div className={cn("h-0.5 w-12 md:w-16 mb-4 relative z-10", count === 0 ? "bg-emerald-400" : "bg-white/40")} />
              
              <div className="space-y-0.5 relative z-10 mb-4">
                <p className={cn("text-[10px] md:text-xs font-black text-white/90")}>
                  {count} NOVEDADES
                </p>
                {hasCritical && (
                  <p className="text-[8px] md:text-[10px] font-bold bg-white text-red-600 px-3 py-0.5 rounded-full inline-block">
                    ALERTA
                  </p>
                )}
                {count === 0 && (
                  <p className="text-[8px] md:text-[10px] font-bold text-emerald-100">OPERACIÓN SIN NOVEDAD</p>
                )}
              </div>

              {/* Purple hover highlight like in the image's first card */}
              <div className="absolute inset-0 border-4 border-purple-500 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          );
        })}
      </div>
    );
  }

  function CierreModal({ novedad, onClose, onUpdated }: { novedad: Novedad; onClose: () => void; onUpdated: () => void }) {
    const [formData, setFormData] = useState({
      FECHA_INICIO_SUBSANACION: novedad.FECHA_INICIO_SUBSANACION || getLocalDate(),
      FECHA_FIN_SUBSANACION: novedad.FECHA_FIN_SUBSANACION || getLocalDate(),
      USUARIO_FIN_SUBSANACION: novedad.USUARIO_FIN_SUBSANACION || "auxiliaremvarias@precoodes.com"
    });

    const handleCerrar = async () => {
      await dataService.updateNovedad(novedad.id, {
        ...formData,
        ESTADO_NOVEDAD: "SUBSANADA"
      });
      onUpdated();
    };

    const handleUpdate = async () => {
      await dataService.updateNovedad(novedad.id, {
        ...formData,
        ESTADO_NOVEDAD: "EN EJECUCION"
      });
      onUpdated();
    };

    return (
      <div className="fixed inset-0 z-[4500] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white rounded-[24px] md:rounded-[32px] w-full max-w-lg shadow-2xl p-6 md:p-10 relative animate-in scale-in duration-300 max-h-[90vh] overflow-y-auto">
          <button onClick={onClose} className="absolute top-6 md:top-8 right-6 md:right-8 text-gray-300 hover:text-black transition-colors">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          <h2 className="text-2xl md:text-3xl font-black text-black mb-1">Cerrar Novedad</h2>
          <p className="text-[10px] md:text-sm font-medium text-gray-400 mb-6 md:mb-10 truncate">{novedad.id}</p>

          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-5">
            <div className="bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-2xl">
              <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase mb-0.5 md:mb-1">Microrruta</p>
              <p className="font-bold text-gray-900 text-xs md:text-base">{novedad.MICRORRUTA}</p>
            </div>
            <div className="bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-2xl">
              <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase mb-0.5 md:mb-1">Lote</p>
              <p className="font-bold text-gray-900 text-xs md:text-base">{novedad.LOTE}</p>
            </div>
          </div>

          <div className="bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-2xl mb-6 md:mb-10">
            <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase mb-0.5 md:mb-1">Correo de Notificación</p>
            <p className="font-bold text-gray-900 text-xs md:text-base truncate">{novedad.CORREO || "No registrado"}</p>
          </div>

          <div className="space-y-4 md:space-y-6 mb-8 md:mb-10">
            <FormField label="Fecha Inicio Corrección">
              <input
                type="date"
                className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                value={formData.FECHA_INICIO_SUBSANACION}
                onChange={(e) => setFormData({ ...formData, FECHA_INICIO_SUBSANACION: e.target.value })}
              />
            </FormField>
            <FormField label="Fecha Corrección">
              <input
                type="date"
                className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                value={formData.FECHA_FIN_SUBSANACION}
                onChange={(e) => setFormData({ ...formData, FECHA_FIN_SUBSANACION: e.target.value })}
              />
            </FormField>
            <FormField label="Usuario">
              <input
                type="email"
                placeholder="Email del responsable"
                className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                value={formData.USUARIO_FIN_SUBSANACION}
                onChange={(e) => setFormData({ ...formData, USUARIO_FIN_SUBSANACION: e.target.value })}
              />
            </FormField>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <button
              onClick={handleUpdate}
              className="flex-1 border-2 border-black hover:bg-black hover:text-white font-bold py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all text-xs md:text-sm"
            >
              GUARDAR TRABAJO
            </button>
            <button
              onClick={handleCerrar}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 md:py-4 rounded-xl md:rounded-2xl shadow-xl shadow-green-100 transition-all text-xs md:text-sm"
            >
              FINALIZAR Y CERRAR
            </button>
          </div>
        </div>
      </div>
    );
  }

  function HistorialList({ novedades, selectedCuadrilla }: { novedades: Novedad[]; selectedCuadrilla: string }) {
    const subsidedNovedades = novedades
      .filter(n => {
        const matchesState = (n.ESTADO_NOVEDAD || "").toUpperCase() === "SUBSANADA";
        if (!matchesState) return false;
        
        // Filter history by cuadrilla if one is selected
        if (selectedCuadrilla && selectedCuadrilla !== "Todas") {
          const queryTerm = String(selectedCuadrilla).toLowerCase().replace(/[\s_-]/g, "");
          return String(n.CUADRILLA || "").toLowerCase().replace(/[\s_-]/g, "") === queryTerm;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.FECHA_FIN_SUBSANACION || "").getTime();
        const dateB = new Date(b.FECHA_FIN_SUBSANACION || "").getTime();
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
      });

    const [searchTerm, setSearchTerm] = useState("");

    const filtered = subsidedNovedades.filter(n => 
      String(n.MICRORRUTA || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
      String(n.LOTE || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
      String(n.TIPO_NOVEDAD || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
      String(n.CUADRILLA || "").toLowerCase().includes((searchTerm || "").toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 rounded-2xl h-[35px] w-[43px] pt-[11px] pb-[7px] -mr-[7px] flex items-center justify-center">
              <History className="w-[24px] h-[21px] text-green-600 mt-[-3px] ml-[-1px]" />
            </div>
            <div>
              <h2 className="text-[15px] font-black text-gray-900 uppercase">Historial de Subsanación</h2>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{filtered.length} NOVEDADES CERRADAS</p>
            </div>
          </div>

          <div className="w-full md:w-[449px] relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
            <input 
              type="text"
              placeholder="Buscar por lote, microrruta, cuadrilla..."
              className="w-full bg-gray-50 border-gray-100 border focus:border-black focus:bg-white rounded-2xl pl-11 pr-4 py-3 text-sm font-medium outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cuadrilla</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Microrruta</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Lote</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Novedad</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">F. Reporte</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">F. Cierre</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900 text-sm whitespace-nowrap">{String(n.CUADRILLA || "").replace("_", " ")}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-black text-gray-400 uppercase">{String(n.MICRORRUTA || "")}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900 text-sm">Lote {String(n.LOTE || "")}</p>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-[11px] font-medium text-gray-500 line-clamp-2">{String(n.TIPO_NOVEDAD || "")}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="text-[10px] font-bold text-gray-400">{String(n.FECHA_REPORTE_NOVEDAD || "")}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <p className="text-[10px] font-bold text-green-600">{String(n.FECHA_FIN_SUBSANACION || "---")}</p>
                      {n.USUARIO_FIN_SUBSANACION && (
                        <p className="text-[8px] text-gray-300 truncate max-w-[100px]">{String(n.USUARIO_FIN_SUBSANACION).split('@')[0]}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">
                      SUBSANADA
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="w-8 h-8 text-gray-200" />
                      <p className="text-gray-400 font-medium italic">No se encontraron registros de subsanación</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function FormField({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
    return (
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
          {label}
        </label>
        {children}
      </div>
    );
  }

  function SummaryItem({ label, value }: { label: string; value: string }) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">{label}</p>
        <p className="text-sm font-bold text-gray-800">{value}</p>
      </div>
    );
  }
