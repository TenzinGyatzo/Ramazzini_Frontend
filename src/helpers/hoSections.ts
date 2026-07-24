/**
 * Registry de secciones V2 de Historia Otológica y mapeo desde índices legacy (1–25).
 */

export type HoSectionId =
  | 'fecha'
  | 'sintomas'
  | 'antecedentes'
  | 'exposicion'
  | 'otoscopia'
  | 'resultado';

export interface HoSectionDef {
  id: HoSectionId;
  name: string;
  /** Índices legacy 1-based inclusive */
  legacyFrom: number;
  legacyTo: number;
}

/** Definición canónica de secciones (orden de navegación V2). */
export const HO_SECTION_DEFS: HoSectionDef[] = [
  { id: 'fecha', name: 'Fecha', legacyFrom: 1, legacyTo: 1 },
  { id: 'sintomas', name: 'Últimos 2 meses', legacyFrom: 2, legacyTo: 7 },
  { id: 'antecedentes', name: 'Antecedentes', legacyFrom: 8, legacyTo: 15 },
  { id: 'exposicion', name: 'Exposición a ruido', legacyFrom: 16, legacyTo: 21 },
  { id: 'otoscopia', name: 'Otros y otoscopia', legacyFrom: 22, legacyTo: 24 },
  { id: 'resultado', name: 'Resultado', legacyFrom: 25, legacyTo: 25 },
];

export function getHoSectionDefs(): HoSectionDef[] {
  return HO_SECTION_DEFS;
}

/** Índice 1-based de la sección en el stepper V2. */
export function getHoSectionIndex(sectionId: HoSectionId): number {
  const idx = HO_SECTION_DEFS.findIndex((s) => s.id === sectionId);
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Convierte un índice legacy (1–25) al índice de sección V2.
 */
export function legacyStepToSectionIndex(legacyStep: number): number {
  for (let i = 0; i < HO_SECTION_DEFS.length; i++) {
    const d = HO_SECTION_DEFS[i];
    if (legacyStep >= d.legacyFrom && legacyStep <= d.legacyTo) {
      return i + 1;
    }
  }
  return 1;
}
