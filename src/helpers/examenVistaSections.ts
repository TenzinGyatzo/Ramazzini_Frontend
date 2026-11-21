/**
 * Secciones del examen de la vista (punto 43). Antes era un paso por pantalla (6 en general, 12
 * en Guatemala). Ahora los pasos se agrupan en secciones, como en los otros documentos:
 * - general (4): Fecha · Agudeza sin corrección · Agudeza con corrección · Ishihara;
 * - Guatemala (8): además Antecedentes (antecedentes, anamnesis y ¿utiliza anteojos?),
 *   Función ocular, Receta y Diagnóstico (decisión del usuario 2026-11-21).
 *
 * Cada paso tiene un número canónico, el orden de Guatemala (1–12), que se usa como ancla de
 * pregunta (MicrostepAnchor) y para el llenado de lo preseleccionado; en general simplemente no
 * existen los números 2–4 y 10–12.
 */

export type EvPasoId =
  | 'evFecha'
  | 'evAntecedentesGT'
  | 'evAnamnesisGT'
  | 'evUtilizaAnteojosGT'
  | 'evAvLejanaSin'
  | 'evAvCercanaSin'
  | 'evAvLejanaCon'
  | 'evAvCercanaCon'
  | 'evIshihara'
  | 'evFuncionOcular'
  | 'evReceta'
  | 'evDiagnostico';

/** Número canónico de cada paso (orden de Guatemala). */
export const PASO_EV: Record<EvPasoId, number> = {
  evFecha: 1,
  evAntecedentesGT: 2,
  evAnamnesisGT: 3,
  evUtilizaAnteojosGT: 4,
  evAvLejanaSin: 5,
  evAvCercanaSin: 6,
  evAvLejanaCon: 7,
  evAvCercanaCon: 8,
  evIshihara: 9,
  evFuncionOcular: 10,
  evReceta: 11,
  evDiagnostico: 12,
};

export type EvSeccionId =
  | 'fecha'
  | 'antecedentes'
  | 'sinCorreccion'
  | 'conCorreccion'
  | 'ishihara'
  | 'funcionOcular'
  | 'receta'
  | 'diagnostico';

export interface EvSeccionDef {
  id: EvSeccionId;
  /** Nombre en el índice y en el asistente. */
  nombre: string;
  /** Ícono de Font Awesome del título en la captura rápida. */
  icono: string;
  pasos: EvPasoId[];
  soloGuatemala?: boolean;
}

export const EV_SECCIONES: EvSeccionDef[] = [
  { id: 'fecha', nombre: 'Fecha', icono: 'fa-calendar-day', pasos: ['evFecha'] },
  {
    id: 'antecedentes',
    nombre: 'Antecedentes',
    icono: 'fa-notes-medical',
    pasos: ['evAntecedentesGT', 'evAnamnesisGT', 'evUtilizaAnteojosGT'],
    soloGuatemala: true,
  },
  { id: 'sinCorreccion', nombre: 'Agudeza sin corrección', icono: 'fa-eye', pasos: ['evAvLejanaSin', 'evAvCercanaSin'] },
  { id: 'conCorreccion', nombre: 'Agudeza con corrección', icono: 'fa-glasses', pasos: ['evAvLejanaCon', 'evAvCercanaCon'] },
  { id: 'ishihara', nombre: 'Ishihara', icono: 'fa-palette', pasos: ['evIshihara'] },
  { id: 'funcionOcular', nombre: 'Función ocular', icono: 'fa-crosshairs', pasos: ['evFuncionOcular'], soloGuatemala: true },
  { id: 'receta', nombre: 'Receta', icono: 'fa-prescription', pasos: ['evReceta'], soloGuatemala: true },
  { id: 'diagnostico', nombre: 'Diagnóstico', icono: 'fa-file-medical', pasos: ['evDiagnostico'], soloGuatemala: true },
];

export function getEvSecciones(esGuatemala: boolean): EvSeccionDef[] {
  return EV_SECCIONES.filter((s) => !s.soloGuatemala || esGuatemala);
}

/** Orden de los pasos sueltos (asistente clásico, sin secciones). */
export function pasosSueltosExamenVista(esGuatemala: boolean): EvPasoId[] {
  return getEvSecciones(esGuatemala).flatMap((s) => s.pasos);
}

/**
 * Número canónico → lugar en el asistente: con secciones, la sección que lo contiene; sin
 * ellas, su lugar en la lista de pasos sueltos. 0 si el paso no existe en ese país.
 */
export function pasoExamenVistaEnAsistente(canonico: number, esGuatemala: boolean, conSecciones: boolean): number {
  const id = (Object.keys(PASO_EV) as EvPasoId[]).find((k) => PASO_EV[k] === canonico);
  if (!id) return 0;
  if (conSecciones) {
    return getEvSecciones(esGuatemala).findIndex((s) => s.pasos.includes(id)) + 1;
  }
  return pasosSueltosExamenVista(esGuatemala).indexOf(id) + 1;
}
