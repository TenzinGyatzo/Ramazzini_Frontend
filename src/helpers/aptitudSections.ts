/**
 * Registry de secciones V2 de Aptitud al puesto y mapeo desde índices legacy (1–11).
 */

export type AptitudSectionId =
  | 'fecha'
  | 'evaluacionesAdicionales'
  | 'aptitud'
  | 'alteraciones'
  | 'resultados'
  | 'medidas';

export interface AptitudSectionDef {
  id: AptitudSectionId;
  name: string;
  /** Índices legacy 1-based inclusive */
  legacyFrom: number;
  legacyTo: number;
}

/** Definición canónica de secciones (orden de navegación V2). */
export const APTITUD_SECTION_DEFS: AptitudSectionDef[] = [
  { id: 'fecha', name: 'Fecha', legacyFrom: 1, legacyTo: 1 },
  {
    id: 'evaluacionesAdicionales',
    name: 'Evaluaciones',
    legacyFrom: 2,
    legacyTo: 7,
  },
  { id: 'aptitud', name: 'Aptitud', legacyFrom: 8, legacyTo: 8 },
  { id: 'alteraciones', name: 'Alteraciones', legacyFrom: 9, legacyTo: 9 },
  { id: 'resultados', name: 'Resultados', legacyFrom: 10, legacyTo: 10 },
  { id: 'medidas', name: 'Medidas', legacyFrom: 11, legacyTo: 11 },
];

export function getAptitudSectionDefs(): AptitudSectionDef[] {
  return APTITUD_SECTION_DEFS;
}

/** Índice 1-based de la sección en el stepper V2. */
export function getAptitudSectionIndex(sectionId: AptitudSectionId): number {
  const idx = APTITUD_SECTION_DEFS.findIndex((s) => s.id === sectionId);
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Convierte un índice legacy (1–11) al índice de sección V2.
 * Cualquier legacy 2–7 mapea a la sección `evaluacionesAdicionales`.
 */
export function legacyStepToSectionIndex(legacyStep: number): number {
  for (let i = 0; i < APTITUD_SECTION_DEFS.length; i++) {
    const d = APTITUD_SECTION_DEFS[i];
    if (legacyStep >= d.legacyFrom && legacyStep <= d.legacyTo) {
      return i + 1;
    }
  }
  return 1;
}
