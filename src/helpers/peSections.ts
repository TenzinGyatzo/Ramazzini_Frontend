/**
 * Registry de secciones V2 de Previo Espirometría y mapeo desde índices legacy (1–28).
 */

export type PeSectionId =
  | 'fecha'
  | 'factoresRiesgo'
  | 'sintomas'
  | 'antecedentes'
  | 'contraindRelativas'
  | 'contraindAbsolutas'
  | 'resultado';

export interface PeSectionDef {
  id: PeSectionId;
  name: string;
  /** Índices legacy 1-based inclusive */
  legacyFrom: number;
  legacyTo: number;
}

/** Definición canónica de secciones (orden de navegación V2). */
export const PE_SECTION_DEFS: PeSectionDef[] = [
  { id: 'fecha', name: 'Fecha', legacyFrom: 1, legacyTo: 1 },
  { id: 'factoresRiesgo', name: 'Factores de riesgo', legacyFrom: 2, legacyTo: 6 },
  { id: 'sintomas', name: 'Síntomas respiratorios', legacyFrom: 7, legacyTo: 12 },
  { id: 'antecedentes', name: 'Antecedentes y medicamentos', legacyFrom: 13, legacyTo: 17 },
  { id: 'contraindRelativas', name: 'Contraindicaciones relativas', legacyFrom: 18, legacyTo: 22 },
  { id: 'contraindAbsolutas', name: 'Contraindicaciones absolutas', legacyFrom: 23, legacyTo: 27 },
  { id: 'resultado', name: 'Resultado', legacyFrom: 28, legacyTo: 28 },
];

export function getPeSectionDefs(): PeSectionDef[] {
  return PE_SECTION_DEFS;
}

/** Índice 1-based de la sección en el stepper V2. */
export function getPeSectionIndex(sectionId: PeSectionId): number {
  const idx = PE_SECTION_DEFS.findIndex((s) => s.id === sectionId);
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Convierte un índice legacy (1–28) al índice de sección V2.
 */
export function legacyStepToSectionIndex(legacyStep: number): number {
  for (let i = 0; i < PE_SECTION_DEFS.length; i++) {
    const d = PE_SECTION_DEFS[i];
    if (legacyStep >= d.legacyFrom && legacyStep <= d.legacyTo) {
      return i + 1;
    }
  }
  return 1;
}
