/**
 * Secciones de la audiometría (punto 44). Antes eran 7 pasos sueltos; ahora 6 secciones, como
 * en los otros documentos con captura rápida (decisión del usuario 2026-11-21):
 * Método y fecha · Umbrales (los dos oídos) · Observaciones · Interpretación · Diagnóstico ·
 * Recomendaciones. Interpretación y diagnóstico iban juntas; se separaron para que cada una
 * tenga su propio paso con vista previa (las mismas en los dos modos).
 *
 * Cada paso conserva su número de siempre (1–7), que se usa como ancla de pregunta
 * (MicrostepAnchor), en la lista de obligatorios y para el llenado de lo preseleccionado.
 */

export const PASO_AU = {
  metodoFecha: 1,
  oidoDerecho: 2,
  oidoIzquierdo: 3,
  observaciones: 4,
  interpretacion: 5,
  diagnostico: 6,
  recomendaciones: 7,
} as const;

export type AuSeccionId = 'metodoFecha' | 'umbrales' | 'observaciones' | 'interpretacion' | 'diagnostico' | 'recomendaciones';

export interface AuSeccionDef {
  id: AuSeccionId;
  /** Nombre en el índice y en el asistente. */
  nombre: string;
  /** Ícono de Font Awesome del título en la captura rápida. */
  icono: string;
  /** Pasos (número de siempre) que contiene. */
  pasos: number[];
}

export const AU_SECCIONES: AuSeccionDef[] = [
  { id: 'metodoFecha', nombre: 'Método y fecha', icono: 'fa-calendar-day', pasos: [1] },
  { id: 'umbrales', nombre: 'Umbrales', icono: 'fa-ear-listen', pasos: [2, 3] },
  { id: 'observaciones', nombre: 'Observaciones', icono: 'fa-comment-medical', pasos: [4] },
  { id: 'interpretacion', nombre: 'Interpretación', icono: 'fa-wave-square', pasos: [5] },
  { id: 'diagnostico', nombre: 'Diagnóstico', icono: 'fa-stethoscope', pasos: [6] },
  { id: 'recomendaciones', nombre: 'Recomendaciones', icono: 'fa-list-check', pasos: [7] },
];

/** Paso de siempre → lugar en el asistente (con secciones, la sección que lo contiene). */
export function pasoAudiometriaEnAsistente(paso: number, conSecciones: boolean): number {
  if (!conSecciones) return paso;
  const i = AU_SECCIONES.findIndex((s) => s.pasos.includes(paso));
  return i >= 0 ? i + 1 : paso;
}
