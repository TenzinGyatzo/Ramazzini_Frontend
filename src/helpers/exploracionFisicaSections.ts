/**
 * Registry de secciones V2 de Exploración Física y mapeo desde índices legacy (1–31).
 */

export type EfSectionId =
  | 'fecha'
  | 'somatometria'
  | 'signosVitales'
  | 'exploracion'
  | 'resumen';

export interface EfSectionDef {
  id: EfSectionId;
  name: string;
  /** Índices legacy 1-based inclusive */
  legacyFrom: number;
  legacyTo: number;
}

/** Definición canónica de secciones (orden de navegación V2). */
export const EF_SECTION_DEFS: EfSectionDef[] = [
  { id: 'fecha', name: 'Fecha', legacyFrom: 1, legacyTo: 1 },
  { id: 'somatometria', name: 'Somatometría', legacyFrom: 2, legacyTo: 2 },
  { id: 'signosVitales', name: 'Signos vitales', legacyFrom: 3, legacyTo: 3 },
  { id: 'exploracion', name: 'Exploración', legacyFrom: 4, legacyTo: 30 },
  { id: 'resumen', name: 'Resumen', legacyFrom: 31, legacyTo: 31 },
];

export function getEfSectionDefs(): EfSectionDef[] {
  return EF_SECTION_DEFS;
}

/** Índice 1-based de la sección en el stepper V2. */
export function getEfSectionIndex(sectionId: EfSectionId): number {
  const idx = EF_SECTION_DEFS.findIndex((s) => s.id === sectionId);
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Convierte un índice legacy (1–31, como en el visualizador V1) al índice de sección V2.
 * Cualquier legacy 4–30 mapea a la sección `exploracion`.
 */
export function legacyStepToSectionIndex(legacyStep: number): number {
  for (let i = 0; i < EF_SECTION_DEFS.length; i++) {
    const d = EF_SECTION_DEFS[i];
    if (legacyStep >= d.legacyFrom && legacyStep <= d.legacyTo) {
      return i + 1;
    }
  }
  return 1;
}
