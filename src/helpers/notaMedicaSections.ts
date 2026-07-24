/**
 * Registry de secciones V2 de Nota Médica y mapeo desde índices legacy
 * (getNotaMedicaStepMap: 11 / 14 / 15 según régimen y sexo).
 */

import { getNotaMedicaStepMap } from '@/helpers/notaMedicaStepMap';

export type NmSectionId =
  | 'consulta'
  | 'identificacionCex'
  | 'clinica'
  | 'signosVitales'
  | 'somatometria'
  | 'glucemia'
  | 'embarazo'
  | 'diagnosticos'
  | 'plan';

export interface NmSectionDef {
  id: NmSectionId;
  name: string;
  /** Índices legacy 1-based inclusive (canónico SIRES mujer, 1–15) */
  legacyFrom: number;
  legacyTo: number;
  /** Solo incluir si showSiresUI */
  siresOnly?: boolean;
  /** Solo incluir si SIRES y sexo Femenino */
  mujerOnly?: boolean;
}

/** Definición canónica de secciones (orden de navegación V2, SIRES mujer). */
export const NM_SECTION_DEFS: NmSectionDef[] = [
  { id: 'consulta', name: 'Consulta', legacyFrom: 1, legacyTo: 2 },
  {
    id: 'identificacionCex',
    name: 'Identificación CEX',
    legacyFrom: 3,
    legacyTo: 3,
    siresOnly: true,
  },
  {
    id: 'clinica',
    name: 'Antecedentes y exploración',
    legacyFrom: 4,
    legacyTo: 5,
  },
  { id: 'signosVitales', name: 'Signos vitales', legacyFrom: 6, legacyTo: 6 },
  {
    id: 'somatometria',
    name: 'Somatometría',
    legacyFrom: 7,
    legacyTo: 7,
    siresOnly: true,
  },
  {
    id: 'glucemia',
    name: 'Glucemia',
    legacyFrom: 8,
    legacyTo: 8,
    siresOnly: true,
  },
  {
    id: 'embarazo',
    name: 'Embarazo',
    legacyFrom: 9,
    legacyTo: 9,
    siresOnly: true,
    mujerOnly: true,
  },
  { id: 'diagnosticos', name: 'Diagnósticos', legacyFrom: 10, legacyTo: 12 },
  { id: 'plan', name: 'Plan', legacyFrom: 13, legacyTo: 15 },
];

export function getNmSectionDefs(
  showSires: boolean,
  esMujer: boolean,
): NmSectionDef[] {
  return NM_SECTION_DEFS.filter((s) => {
    if (s.siresOnly && !showSires) return false;
    if (s.mujerOnly && !(showSires && esMujer)) return false;
    return true;
  });
}

/** Índice 1-based de la sección en el stepper V2. */
export function getNmSectionIndex(
  sectionId: NmSectionId,
  showSires: boolean,
  esMujer: boolean,
): number {
  const defs = getNmSectionDefs(showSires, esMujer);
  const idx = defs.findIndex((s) => s.id === sectionId);
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Convierte un índice legacy (según getNotaMedicaStepMap del régimen actual)
 * al índice de sección V2.
 */
export function legacyStepToSectionIndex(
  legacyStep: number,
  showSires: boolean,
  esMujer: boolean,
): number {
  const map = getNotaMedicaStepMap(showSires, esMujer);

  if (legacyStep === 1 || legacyStep === 2) {
    return getNmSectionIndex('consulta', showSires, esMujer);
  }
  if (map.genero != null && legacyStep === map.genero) {
    return getNmSectionIndex('identificacionCex', showSires, esMujer);
  }
  if (
    legacyStep === map.antecedentes ||
    legacyStep === map.exploracion
  ) {
    return getNmSectionIndex('clinica', showSires, esMujer);
  }
  if (legacyStep === map.signos) {
    return getNmSectionIndex('signosVitales', showSires, esMujer);
  }
  if (map.somatometria != null && legacyStep === map.somatometria) {
    return getNmSectionIndex('somatometria', showSires, esMujer);
  }
  if (map.glucemia != null && legacyStep === map.glucemia) {
    return getNmSectionIndex('glucemia', showSires, esMujer);
  }
  if (map.embarazo != null && legacyStep === map.embarazo) {
    return getNmSectionIndex('embarazo', showSires, esMujer);
  }
  if (
    legacyStep === map.diagnostico ||
    legacyStep === map.comorbilidad2 ||
    legacyStep === map.comorbilidad3
  ) {
    return getNmSectionIndex('diagnosticos', showSires, esMujer);
  }
  if (
    legacyStep === map.tratamiento ||
    legacyStep === map.recomendaciones ||
    legacyStep === map.observaciones
  ) {
    return getNmSectionIndex('plan', showSires, esMujer);
  }

  return 1;
}
