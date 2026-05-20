import { GeoJSONProperties } from "../types";

export interface NormalizedProperties extends GeoJSONProperties {
  originalProps: any;
}

export class GeoProcessor {
  /**
   * Normalizes a feature's properties to a standard format used by the application.
   * This allows the app to work with different GeoJSON files that might have different property names.
   */
  static normalizeProperties(props: any): NormalizedProperties {
    if (!props) return {
      Microruta: "",
      No_Lote: "",
      Cuadrilla: "Sin Cuadrilla",
      Semana: "",
      originalProps: {}
    };

    const findVal = (candidates: string[]) => {
      const keys = Object.keys(props);
      const match = keys.find(k => candidates.some(c => k.toLowerCase() === c.toLowerCase()));
      return match ? props[match] : null;
    };

    return {
      Microruta: String(findVal(['microrruta', 'microruta', 'ruta', 'micro', 'm_ruta', 'id_microrruta', 'code']) || props.Microruta || ""),
      No_Lote: String(findVal(['lote', 'lotes', 'no_lote', 'n_lote', 'no.lote', 'fid', 'objectid', 'id_lote', 'lote_no', 'label']) || props.No_Lote || ""),
      Cuadrilla: String(findVal(['cuadrilla', 'cuadrillas', 'squad', 'equipo', 'crew', 'cuad', 'group']) || props.Cuadrilla || "Sin Cuadrilla"),
      Semana: String(findVal(['semana', 'week', 'periodo', 'period']) || props.Semana || ""),
      originalProps: props
    };
  }

  /**
   * Processes a FeatureCollection or an array of features.
   */
  static processFeatures(data: any): any[] {
    if (!data) return [];
    
    // Handle nested data if it comes from our specific Firebase structure
    let items = data.features || (Array.isArray(data) ? data : (data.MICRORRUTAS?.features || Object.values(data)));
    
    if (!Array.isArray(items)) {
       // Deep check for MICRORRUTAS nested objects if not already handled
       if (data.MICRORRUTAS) {
         items = data.MICRORRUTAS.features || Object.values(data.MICRORRUTAS);
       } else {
         items = [];
       }
    }

    return items
      .map((item: any) => {
        const props = item.properties || item;
        const normalizedProps = this.normalizeProperties(props);

        if (item.type === "Feature") {
          return { ...item, properties: normalizedProps };
        }
        
        // If it's just a raw object with geometry, wrap it as a Feature
        return {
          type: "Feature",
          geometry: item.geometry || null,
          properties: normalizedProps
        };
      })
      .filter((f: any) => f.geometry && (
        f.geometry.type === "Polygon" || 
        f.geometry.type === "MultiPolygon" || 
        f.geometry.type === "Point"
      ));
  }
}
