/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import OperativaModule from "./components/Operativa/OperativaModule";
import MapViewer from "./components/Geovisor/MapViewer";
import { LayoutDashboard, Map as MapIcon, ClipboardCheck, ArrowUpRight, Layers, Users, RefreshCw } from "lucide-react";
import { cn } from "./lib/utils";

export default function App() {
  const [activeModule, setActiveModule] = useState<"home" | "operativa" | "geovisor">("home");
  const [selectedCuadrilla, setSelectedCuadrilla] = useState<string | null>(() => {
    return localStorage.getItem("selected_cuadrilla");
  });
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' };
    setCurrentDate(date.toLocaleDateString('es-ES', options));
  }, []);

  const handleSelectCuadrilla = (cuadrillaName: string) => {
    localStorage.setItem("selected_cuadrilla", cuadrillaName);
    setSelectedCuadrilla(cuadrillaName);
  };

  const handleResetCuadrilla = () => {
    localStorage.removeItem("selected_cuadrilla");
    setSelectedCuadrilla(null);
    if (activeModule !== "geovisor") {
      setActiveModule("home");
    }
  };

  // 11 Cuadrillas array
  const listCuadrillas = Array.from({ length: 11 }, (_, i) => `Cuadrilla ${i + 1}`);

  const renderContent = () => {
    switch (activeModule) {
      case "operativa":
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full">
            <OperativaModule selectedCuadrilla={selectedCuadrilla || "Todas"} />
          </div>
        );
      case "geovisor":
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full">
            <MapViewer 
              selectedCuadrilla={selectedCuadrilla || undefined} 
              onSelectCuadrilla={handleSelectCuadrilla}
            />
          </div>
        );
      default:
        return (
          <div className="min-h-screen bg-white p-6 md:p-12 lg:p-20 relative overflow-hidden animate-in fade-in duration-1000">
            {/* Background Decorations */}
            <div className="absolute top-[20%] -right-20 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-green-100/50 rounded-full blur-[80px] md:blur-[120px] -z-10" />
            <div className="absolute bottom-[10%] -left-20 w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-blue-100/50 rounded-full blur-[80px] md:blur-[120px] -z-10" />

            <div className="max-w-7xl mx-auto relative z-10">
              {/* Header */}
              <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 md:mb-24 gap-6 md:gap-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500/80 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-200">
                    <Layers size={20} className="md:w-6 md:h-6" />
                  </div>
                  <div>
                    <h1 
                      style={{ fontStyle: 'normal' }}
                      className="font-serif text-xl md:text-2xl text-gray-900 leading-tight"
                    >
                      Panel Operativo
                    </h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gestión Diaria</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-gray-55 border border-gray-100 px-4 py-2 rounded-full flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-xs md:text-sm font-medium text-gray-600 capitalize">{currentDate}</span>
                  </div>
                </div>
              </header>

              {/* Title Section */}
              <div className="mb-12 md:mb-16 max-w-2xl">
                <h2 
                  style={{ 
                    fontFamily: 'Fraunces, serif', 
                    fontStyle: 'normal' 
                  }}
                  className="text-4xl sm:text-6xl md:text-7xl font-serif text-gray-900 mb-4 leading-tight"
                >
                  Panel Operativo
                </h2>
              </div>

              {/* Module Cards */}
              <div className="flex flex-col gap-4 md:gap-6">
                <ModuleCard
                  index={1}
                  icon={<ClipboardCheck size={28} className="text-green-600" />}
                  title="Ejecución y Operaciones"
                  onClick={() => setActiveModule("operativa")}
                  bgClass="bg-[#e2ede1]"
                  decorationClass="after:bg-[#f0f7ef]"
                  titleStyle={{ fontFamily: 'Fraunces, serif', fontStyle: 'normal', fontSize: '41px' }}
                  pStyle={{ fontFamily: '"Cactus Classical Serif", serif' }}
                />
                
                <ModuleCard
                  index={2}
                  icon={<MapIcon size={28} id="map-icon-svg" className="text-blue-600" />}
                  title="Portal geográfico"
                  onClick={() => setActiveModule("geovisor")}
                  bgClass="bg-[#c2e2f0]"
                  decorationClass="after:bg-[#d5ebf5]"
                  titleStyle={{ fontFamily: 'Fraunces, serif', fontStyle: 'normal', fontSize: '40px' }}
                  pStyle={{ fontFamily: '"Cactus Classical Serif", serif' }}
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen w-full bg-white relative flex flex-col">
      {/* Top Bar for back navigation when in modules */}
      {activeModule !== "home" && (
        <div className="sticky top-0 left-0 right-0 z-[4000] bg-white/80 backdrop-blur border-b border-gray-100 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button 
              onClick={() => setActiveModule("home")}
              className="flex items-center gap-2 text-xs font-bold text-black uppercase tracking-widest hover:pl-2 transition-all group"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                ←
              </div>
              Volver al Panel
            </button>
            
            <div className="flex items-center gap-4">
              {selectedCuadrilla && (
                <div className="bg-gray-100 border border-gray-200/60 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] font-bold text-gray-700">
                  <Users size={12} className="text-gray-500" />
                  <span>{selectedCuadrilla === "Todas" ? "Todas las Cuadrillas" : selectedCuadrilla}</span>
                  <button 
                    onClick={handleResetCuadrilla}
                    className="bg-white border text-gray-400 border-gray-200 hover:bg-black hover:text-white hover:border-black transition-all rounded-full px-1.5 py-0.5 font-bold ml-1 uppercase text-[8px]"
                  >
                    Cambiar
                  </button>
                </div>
              )}
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Módulo{activeModule === 'operativa' ? ' Operativa' : ' Geovisor'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 relative",
        activeModule === "home" ? "overflow-hidden" : "overflow-auto"
      )}>
        {renderContent()}
      </main>
    </div>
  );
}

function ModuleCard({ 
  index, 
  icon, 
  title, 
  subtitle, 
  onClick, 
  bgClass,
  decorationClass,
  titleStyle,
  pStyle
}: { 
  index: number; 
  icon: React.ReactNode; 
  title: string; 
  subtitle?: string; 
  onClick: () => void;
  bgClass: string;
  decorationClass: string;
  titleStyle?: React.CSSProperties;
  pStyle?: React.CSSProperties;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-6 md:gap-12 p-6 md:p-10 rounded-[32px] md:rounded-[48px] overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] text-left w-full",
        bgClass,
        "after:content-[''] after:absolute after:top-0 after:right-0 after:w-1/2 after:h-full after:rounded-full after:blur-[80px] after:opacity-40 after:-translate-y-1/2 after:translate-x-1/4",
        decorationClass
      )}
    >
      {/* Icon Box */}
      <div className="relative z-10 w-12 h-12 md:w-20 md:h-20 bg-white rounded-2xl md:rounded-3xl flex items-center justify-center shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-500 shrink-0">
        <div className="scale-75 md:scale-100">
          {icon}
        </div>
      </div>

      {/* Info */}
      <div className="relative z-10 flex-1">
        <p 
          style={pStyle}
          className="text-[9px] md:text-[10px] font-black text-gray-900/40 uppercase tracking-widest mb-1 md:mb-2 font-sans"
        >
          Módulo {index}
        </p>
        <h3 
          style={titleStyle}
          className="text-2xl md:text-4xl font-serif text-gray-900 group-hover:translate-x-2 transition-transform duration-500 tracking-tight leading-tight"
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs md:text-sm text-gray-500 font-medium mt-1 group-hover:translate-x-2 transition-transform duration-500 delay-75">
            {subtitle}
          </p>
        )}
      </div>

      {/* Arrow Button */}
      <div className="relative z-10 w-10 h-10 md:w-14 md:h-14 bg-gray-900 text-white rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-500 shadow-xl group-hover:rotate-45 shrink-0">
        <ArrowUpRight size={20} className="md:w-6 md:h-6" />
      </div>
    </button>
  );
}
