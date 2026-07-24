/**
 * Registry de secciones V2 de Certificado y mapeo desde índices legacy (1–2).
 */

export type CertificadoSectionId = 'certificado';

export interface CertificadoSectionDef {
  id: CertificadoSectionId;
  name: string;
  /** Índices legacy 1-based inclusive */
  legacyFrom: number;
  legacyTo: number;
}

/** Definición canónica de secciones (orden de navegación V2). */
export const CERTIFICADO_SECTION_DEFS: CertificadoSectionDef[] = [
  { id: 'certificado', name: 'Certificado', legacyFrom: 1, legacyTo: 2 },
];

export function getCertificadoSectionDefs(): CertificadoSectionDef[] {
  return CERTIFICADO_SECTION_DEFS;
}

/** Índice 1-based de la sección en el stepper V2. */
export function getCertificadoSectionIndex(sectionId: CertificadoSectionId): number {
  const idx = CERTIFICADO_SECTION_DEFS.findIndex((s) => s.id === sectionId);
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Convierte un índice legacy (1–2) al índice de sección V2.
 * Ambos mapean a la única sección `certificado`.
 */
export function legacyStepToSectionIndex(legacyStep: number): number {
  for (let i = 0; i < CERTIFICADO_SECTION_DEFS.length; i++) {
    const d = CERTIFICADO_SECTION_DEFS[i];
    if (legacyStep >= d.legacyFrom && legacyStep <= d.legacyTo) {
      return i + 1;
    }
  }
  return 1;
}
