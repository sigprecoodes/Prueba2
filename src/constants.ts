import cuadrilla1 from "./geojson/Cuadrilla_1.geojson";
import cuadrilla2 from "./geojson/Cuadrilla_2.geojson";
import cuadrilla3 from "./geojson/Cuadrilla_3.geojson";
import cuadrilla4 from "./geojson/Cuadrilla_4.geojson";
import cuadrilla5 from "./geojson/Cuadrilla_5.geojson";
import cuadrilla6 from "./geojson/Cuadrilla_6.geojson";
import cuadrilla7 from "./geojson/Cuadrilla_7.geojson";
import cuadrilla8 from "./geojson/Cuadrilla_8.geojson";
import cuadrilla9 from "./geojson/Cuadrilla_9.geojson";
import cuadrilla10 from "./geojson/Cuadrilla_10.geojson";
import cuadrilla11 from "./geojson/Cuadrilla_11.geojson";

export const CUADRILLAS = [
  "Cuadrilla 1",
  "Cuadrilla 2",
  "Cuadrilla 3",
  "Cuadrilla 4",
  "Cuadrilla 5",
  "Cuadrilla 6",
  "Cuadrilla 7",
  "Cuadrilla 8",
  "Cuadrilla 9",
  "Cuadrilla 10",
  "Cuadrilla 11"
];

export const MICRORRUTAS: Record<string, string[]> = {
  "Cuadrilla A": ["Z1CC0101", "Z1CC0102", "Z1CC0103"],
  "Cuadrilla B": ["Z2CC0311", "Z2CC0312", "Z2CC0313"],
  "Cuadrilla C": ["Z3CC0521", "Z3CC0522", "Z3CC0523"],
};

export const LOTES: Record<string, string[]> = {
  "Z1CC0101": ["101", "102", "103"],
  "Z1CC0102": ["201", "202", "203"],
  "Z2CC0311": ["538", "539", "540"],
  "Z2CC0312": ["601", "602"],
};

export const TIPOS_NOVEDAD = [
  "Barrido",
  "Recolección",
  "Recipiente de combustible sin rotular/ fuga",
  "Corte disparejo",
  "Limpieza previa",
  "Sector sin intervenir",
  "Limpieza Manual",
  "Bordeo",
  "Recuperación y Limpieza de zonas duras",
  "Malla de protección en mal estado",
  "Uso de mallas de protección",
  "Afectación de individuos árboreos",
  "Disposición inadecuada de residuos",
  "Delimitación de área de intervención",
  "Ausencia de kit antiderrame",
  "PMT"
];

// Helper to safely extract features array from various GeoJSON import shapes
const getFeaturesArray = (data: any, defaultCuadrilla: string): any[] => {
  if (!data) return [];
  const features = Array.isArray(data) ? data : (data.features || []);
  return features.map((f: any) => {
    const props = f.properties || {};
    return {
      ...f,
      properties: {
        ...props,
        // If the feature properties don't specify the Cuadrilla, default to its file origin
        Cuadrilla: props.Cuadrilla || props.cuadrilla || defaultCuadrilla
      }
    };
  });
};

// Combine features from all 11 Cuadrilla GeoJSON data sources robustly
export const SAMPLE_GEOJSON = {
  type: "FeatureCollection",
  features: [
    ...getFeaturesArray(cuadrilla1, "Cuadrilla 1"),
    ...getFeaturesArray(cuadrilla2, "Cuadrilla 2"),
    ...getFeaturesArray(cuadrilla3, "Cuadrilla 3"),
    ...getFeaturesArray(cuadrilla4, "Cuadrilla 4"),
    ...getFeaturesArray(cuadrilla5, "Cuadrilla 5"),
    ...getFeaturesArray(cuadrilla6, "Cuadrilla 6"),
    ...getFeaturesArray(cuadrilla7, "Cuadrilla 7"),
    ...getFeaturesArray(cuadrilla8, "Cuadrilla 8"),
    ...getFeaturesArray(cuadrilla9, "Cuadrilla 9"),
    ...getFeaturesArray(cuadrilla10, "Cuadrilla 10"),
    ...getFeaturesArray(cuadrilla11, "Cuadrilla 11"),
  ]
};

export const SAMPLE_CUADRILLA_NAME = "Cuadrilla 6";
