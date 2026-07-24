/**
 * Registry de secciones V2 de Antidoping y mapeo desde índices legacy (1–2).
 */

export type AntidopingSectionId = 'antidoping';

export interface AntidopingSectionDef {
  id: AntidopingSectionId;
  name: string;
  /** Índices legacy 1-based inclusive */
  legacyFrom: number;
  legacyTo: number;
}

/** Definición canónica de secciones (orden de navegación V2). */
export const ANTIDOPING_SECTION_DEFS: AntidopingSectionDef[] = [
  { id: 'antidoping', name: 'Antidoping', legacyFrom: 1, legacyTo: 2 },
];

export function getAntidopingSectionDefs(): AntidopingSectionDef[] {
  return ANTIDOPING_SECTION_DEFS;
}

/** Índice 1-based de la sección en el stepper V2. */
export function getAntidopingSectionIndex(sectionId: AntidopingSectionId): number {
  const idx = ANTIDOPING_SECTION_DEFS.findIndex((s) => s.id === sectionId);
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Convierte un índice legacy (1–2) al índice de sección V2.
 * Ambos mapean a la única sección `antidoping`.
 */
export function legacyStepToSectionIndex(legacyStep: number): number {
  for (let i = 0; i < ANTIDOPING_SECTION_DEFS.length; i++) {
    const d = ANTIDOPING_SECTION_DEFS[i];
    if (legacyStep >= d.legacyFrom && legacyStep <= d.legacyTo) {
      return i + 1;
    }
  }
  return 1;
}
