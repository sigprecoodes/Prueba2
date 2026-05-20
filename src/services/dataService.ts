import { Novedad, Ejecucion } from "../types";
import { getDb } from "../lib/firebase";
import { ref, set, get, update, onValue, off } from "firebase/database";
import { SAMPLE_GEOJSON, CUADRILLAS, MICRORRUTAS, LOTES, SAMPLE_CUADRILLA_NAME } from "../constants";

const PATHS = {
  NOVEDADES: "/NOVEDADES",
  EJECUCION: "/EJECUCIÓN",
  MICRORRUTAS: "/MICRORRUTAS",
  CORREOS: "/CONFIGURACION/CORREOS"
};

export function formatCuadrilla(name: string): string {
  if (!name) return "";
  let val = name.trim();
  
  // If it's just a number, normalize to "Cuadrilla X"
  if (/^\d+$/.test(val)) {
    val = `Cuadrilla ${val}`;
  }
  
  // If it already has "Cuadrilla" but maybe in different case/format, 
  // the split/map/join will normalize it to "Cuadrilla_X"
  return val.split(/[\s_+]+/)
    .map(word => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join('_');
}

export function idToFirebaseKey(id: string): string {
  if (!id) return "";
  return id.replace(/\./g, '___');
}

export function firebaseKeyToId(key: string): string {
  if (!key) return "";
  return key.replace(/___/g, '.');
}

console.log("Firebase Paths initialized:", PATHS);

class DataService {
  subscribeNovedades(callback: (novedades: Novedad[]) => void): () => void {
    try {
      const db = getDb();
      const novedadesRef = ref(db, PATHS.NOVEDADES);
      
      console.log("Subscribing to Novedades at:", PATHS.NOVEDADES);
      const unsubscribe = onValue(novedadesRef, (snapshot) => {
        if (!snapshot.exists()) {
          console.log("No novedades found at path");
          callback([]);
          return;
        }
        const data = snapshot.val();
        console.log("Novedades data received from Firebase:", Object.keys(data).length, "items");
        const list = Object.entries(data).map(([key, val]: [string, any]) => ({
          ...val,
          id: val.id || firebaseKeyToId(key) // Restoring safe dot notation if needed
        }));
        callback(list);
      }, (error) => {
        console.error("Firebase subscription error (NOVEDADES):", error);
      });

      return () => off(novedadesRef, "value", unsubscribe);
    } catch (e) {
      console.error("Failed to subscribe to novedades:", e);
      return () => {};
    }
  }

  subscribeEjecuciones(callback: (ejecuciones: Record<string, Ejecucion>) => void): () => void {
    try {
      const db = getDb();
      const execRef = ref(db, PATHS.EJECUCION);
      
      console.log("Subscribing to Ejecuciones at:", PATHS.EJECUCION);
      const unsubscribe = onValue(execRef, (snapshot) => {
        if (!snapshot.exists()) {
          callback({});
          return;
        }
        callback(snapshot.val());
      }, (error) => {
        console.error("Ejecuciones subscription error:", error);
      });

      return () => off(execRef, "value", unsubscribe);
    } catch (e) {
      console.error("Failed to subscribe to ejecuciones:", e);
      return () => {};
    }
  }

  async createNovedad(data: {
    cuadrilla: string;
    microrruta: string;
    lote: string | number;
    quincena: number;
    tipoNovedad: string;
    fechaReporte: string;
    correo?: string;
  }): Promise<Novedad> {
    try {
      const db = getDb();
      const novedadesRef = ref(db, PATHS.NOVEDADES);
      const snapshot = await get(novedadesRef);
      const rawData = snapshot.exists() ? snapshot.val() : {};
      const novedades: any[] = Object.values(rawData);
      
      // Pattern: MICRORRUTA|CUADRILLA|LOTE|Q{quincena}|N{correlativo}
      const qPart = `Q${data.quincena}`;
      const formattedCuadrilla = formatCuadrilla(data.cuadrilla);
      const prefix = `${data.microrruta}|${formattedCuadrilla}|${data.lote}|${qPart}`;
      
      // Encontrar el correlativo más alto existente para este prefijo
      let maxNumber = 0;
      novedades.forEach(n => {
        const id = n?.id || "";
        if (id && id.startsWith(prefix)) {
          const parts = id.split('|');
          const lastPart = parts[parts.length - 1];
          if (lastPart && lastPart.startsWith('N')) {
            const num = parseInt(lastPart.substring(1), 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });

      const id = `${prefix}|N${maxNumber + 1}`;

      const newNovedad: Novedad = {
        id,
        CUADRILLA: formattedCuadrilla,
        MICRORRUTA: data.microrruta,
        LOTE: data.lote,
        QUINCENA: data.quincena,
        TIPO_NOVEDAD: data.tipoNovedad,
        FECHA_REPORTE_NOVEDAD: data.fechaReporte,
        ESTADO_NOVEDAD: "PENDIENTE",
        FECHA_INICIO_SUBSANACION: "",
        FECHA_FIN_SUBSANACION: "",
        USUARIO_FIN_SUBSANACION: "",
        CORREO: data.correo || ""
      };

      // Sanitize key (Firebase keys cannot contain ., $, #, [, ], or /)
      // We use a safe separator for dots if they exist
      const firebaseKey = idToFirebaseKey(id);
      
      console.log("Saving new novedad to Firebase:", id, "at key:", firebaseKey);
      await set(ref(db, `${PATHS.NOVEDADES}/${firebaseKey}`), newNovedad);
      console.log("Novedad saved successfully");
      return newNovedad;
    } catch (e) {
      console.error("Error creating novedad in Firebase:", e);
      throw e;
    }
  }

  async updateNovedad(id: string, updates: Partial<Novedad>): Promise<void> {
    try {
      const db = getDb();
      const firebaseKey = idToFirebaseKey(id));
      console.log("Updating novedad:", id, "with updates:", updates);
      await update(ref(db, `${PATHS.NOVEDADES}/${firebaseKey}`), updates);
      console.log("Novedad updated successfully");
    } catch (e) {
      console.error("Error updating novedad in Firebase:", e);
      throw e;
    }
  }

  async getAllNovedades(): Promise<Novedad[]> {
    try {
      const db = getDb();
      const snapshot = await get(ref(db, PATHS.NOVEDADES));
      if (!snapshot.exists()) return [];
      const data = snapshot.val();
      return Object.entries(data).map(([key, val]: [string, any]) => ({
        ...val,
        id: val.id || firebaseKeyToId(key)
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  // Geovisor specific storage
  async saveEjecucionGeovisor(
    microrruta: string, 
    lote: string, 
    cuadrilla: string, 
    frecuencia: string, 
    mes: string, 
    estado: "En Ejecución" | "Ejecutado"
  ): Promise<void> {
    const db = getDb();
    // Path pattern: microrruta|lote|cuadrilla|frecuencia|mes
    const id = `${microrruta}|${lote}|${formatCuadrilla(cuadrilla)}|${frecuencia}|${mes}`;
    const firebaseKey = id.replace(/\./g, '_').replace(/[\s#$\[\]]/g, '_');
    const now = new Date().toISOString();
    
    const execRef = ref(db, `${PATHS.EJECUCION}/${firebaseKey}`);
    
    await set(execRef, {
      id,
      microrruta,
      lote,
      cuadrilla: formatCuadrilla(cuadrilla),
      frecuencia,
      mes,
      estado,
      ...(estado === "En Ejecución" ? { fechaInicio: now } : { fechaFin: now }),
    });
  }

  // Ejecucion Module
  async upsertEjecucion(microrruta: string, lote: string, estado: "En Ejecución" | "Ejecutado"): Promise<void> {
    const db = getDb();
    const id = `${microrruta}|${lote}`.replace(/\./g, '_');
    const now = new Date().toISOString();
    
    const execRef = ref(db, `${PATHS.EJECUCION}/${id}`);
    const snapshot = await get(execRef);
    
    if (snapshot.exists()) {
      const existing = snapshot.val();
      await update(execRef, {
        estado,
        ...(estado === "En Ejecución" ? { fechaInicio: now } : { fechaFin: now }),
      });
    } else {
      await set(execRef, {
        id: `${microrruta}|${lote}`,
        microrruta,
        lote,
        estado,
        ...(estado === "En Ejecución" ? { fechaInicio: now } : { fechaFin: now }),
      });
    }
  }

  async getEjecucionesMap(): Promise<Record<string, Ejecucion>> {
    try {
      const db = getDb();
      const snapshot = await get(ref(db, PATHS.EJECUCION));
      if (!snapshot.exists()) return {};
      return snapshot.val();
    } catch (e) {
      console.error(e);
      return {};
    }
  }

  async getCuadrillasEmails(): Promise<Record<string, string>> {
    try {
      const db = getDb();
      const snapshot = await get(ref(db, PATHS.CORREOS));
      if (!snapshot.exists()) return {};
      return snapshot.val();
    } catch (e) {
      console.error("Error fetching emails configuration:", e);
      return {};
    }
  }

  async getMetadata() {
    const fallback = {
      cuadrillas: [...new Set([...CUADRILLAS, SAMPLE_CUADRILLA_NAME])],
      microrrutas: MICRORRUTAS,
      lotes: LOTES
    };

    try {
      const featuresList = await this.getFeatures();
      
      const cuadrillasSet = new Set<string>(CUADRILLAS);
      const microrrutasMap: Record<string, Set<string>> = {};
      const lotesMap: Record<string, Set<string>> = {};

      featuresList.forEach((item: any) => {
        const props = item.properties || item;
        
        const cuadrillaVal = props.Cuadrilla;
        const microrrutaVal = props.Microruta;
        const loteVal = props.No_Lote;

        const cuadrilla = String(cuadrillaVal || "Sin Cuadrilla").trim();
        const microrruta = microrrutaVal ? String(microrrutaVal).trim() : null;
        const lote = loteVal ? String(loteVal).trim() : null;

        if (microrruta) {
          cuadrillasSet.add(cuadrilla);
          if (!microrrutasMap[cuadrilla]) microrrutasMap[cuadrilla] = new Set();
          microrrutasMap[cuadrilla].add(microrruta);

          // Build lot relationships for both exact and uppercase keys to be safe
          if (!lotesMap[microrruta]) lotesMap[microrruta] = new Set();
          if (lote) {
            lotesMap[microrruta].add(lote);
            const upperMicro = microrruta.toUpperCase();
            if (!lotesMap[upperMicro]) lotesMap[upperMicro] = new Set();
            lotesMap[upperMicro].add(lote);
          }
        }
      });

      const finalCuadrillas = Array.from(cuadrillasSet).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ""), 10);
        const numB = parseInt(b.replace(/\D/g, ""), 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.localeCompare(b);
      });
      
      if (finalCuadrillas.length === 0) {
        return fallback;
      }

      const finalMicrorrutas: Record<string, string[]> = {};
      Object.keys(microrrutasMap).forEach(k => finalMicrorrutas[k] = Array.from(microrrutasMap[k]).sort());

      const finalLotes: Record<string, string[]> = {};
      Object.keys(lotesMap).forEach(k => finalLotes[k] = Array.from(lotesMap[k]).sort());

      return {
        cuadrillas: finalCuadrillas,
        microrrutas: finalMicrorrutas,
        lotes: finalLotes
      };
    } catch (e) {
      console.error("Error fetching metadata:", e);
      return fallback;
    }
  }

  async getFeatures() {
    try {
      const db = getDb();
      const snapshot = await get(ref(db, PATHS.MICRORRUTAS));
      
      const getSampleFeatures = () => {
        return (SAMPLE_GEOJSON.features || []).map((f: any) => ({
          ...f,
          properties: {
            ...f.properties,
            Cuadrilla: f.properties?.Cuadrilla || SAMPLE_CUADRILLA_NAME
          }
        }));
      };

      if (!snapshot.exists()) return getSampleFeatures();
      
      let data = snapshot.val();

      // Handle nesting
      if (data && data.MICRORRUTAS && !data.features && !data.type) {
        data = data.MICRORRUTAS;
      }

      const items = data.features || (Array.isArray(data) ? data : Object.values(data));
      // Map items to standard feature structure if needed
      const features = items.map((item: any) => {
        const props = item.properties || item;
        
        const findVal = (candidates: string[]) => {
          const keys = Object.keys(props);
          const match = keys.find(k => candidates.some(c => k.toLowerCase() === c.toLowerCase()));
          return match ? props[match] : null;
        };

        // Normalize properties for the UI
        const normalizedProps = {
          ...props,
          Microruta: findVal(['microrruta', 'microruta', 'ruta', 'micro', 'm_ruta', 'id_microrruta']) || props.Microruta,
          No_Lote: findVal(['lote', 'lotes', 'no_lote', 'n_lote', 'no.lote', 'fid', 'objectid', 'id_lote', 'lote_no']) || props.No_Lote,
          Cuadrilla: findVal(['cuadrilla', 'cuadrillas', 'squad', 'equipo', 'crew', 'cuad']) || props.Cuadrilla,
          Frecuencia: props.Frecuencia || props.frecuencia || props.FRECUENCIA,
          Semana: props.Semana || props.semana || props.SEMANA,
          Día_de_ej: props.Día_de_ej || props.dia_de_ej || props.DIA_DE_EJ || props.Dia_de_ej
        };

        if (item.type === "Feature") {
          return { ...item, properties: normalizedProps };
        }
        return {
          type: "Feature",
          geometry: item.geometry || null,
          properties: normalizedProps
        };
      }).filter((f: any) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon" || f.geometry.type === "Point"));

      return features.length > 0 ? features : getSampleFeatures();
    } catch (e) {
      console.error("Error fetching features:", e);
      const getSampleFeatures = () => {
        return (SAMPLE_GEOJSON.features || []).map((f: any) => ({
          ...f,
          properties: {
            ...f.properties,
            Cuadrilla: f.properties?.Cuadrilla || SAMPLE_CUADRILLA_NAME
          }
        }));
      };
      return getSampleFeatures();
    }
  }
}

export const dataService = new DataService();

