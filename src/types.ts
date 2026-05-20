/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Novedad {
  id: string; // The complex key: MICRORRUTA|CUADRILLA|LOTE|QUINCENA|N{correlativo}
  CUADRILLA: string;
  ESTADO_NOVEDAD: "PENDIENTE" | "EN EJECUCION" | "SUBSANADA";
  FECHA_FIN_SUBSANACION: string;
  FECHA_INICIO_SUBSANACION: string;
  FECHA_REPORTE_NOVEDAD: string;
  LOTE: string | number;
  MICRORRUTA: string;
  QUINCENA: number;
  TIPO_NOVEDAD: string;
  USUARIO_FIN_SUBSANACION: string;
  CORREO?: string;
}

export interface Ejecucion {
  id: string; // microrruta + lote
  estado: "Pendiente" | "En Ejecución" | "Ejecutado";
  fechaInicio?: string;
  fechaFin?: string;
  microrruta: string;
  lote: string;
}

export interface GeoJSONProperties {
  FID: number;
  No_Lote: string;
  Microruta: string;
  Semana: string;
  Frecuencia: string;
  Día_de_ej: string;
}
