/**
 * Registry de secciones V2 de Historia Clínica y mapeo desde índices legacy (1–46).
 */

export type HcSectionId =
  | 'motivo'
  | 'heredofamiliares'
  | 'patologicos'
  | 'noPatologicos'
  | 'ginecoObstetricos'
  | 'laborales'
  | 'resumen';

export interface HcSectionDef {
  id: HcSectionId;
  name: string;
  /** Índices legacy 1-based inclusive */
  legacyFrom: number;
  legacyTo: number;
  /** Solo incluir si sexo Femenino */
  femeninoOnly?: boolean;
}

/** Definición canónica de secciones (orden de navegación V2). */
export const HC_SECTION_DEFS: HcSectionDef[] = [
  { id: 'motivo', name: 'Motivo', legacyFrom: 1, legacyTo: 1 },
  { id: 'heredofamiliares', name: 'Heredofamiliares', legacyFrom: 2, legacyTo: 11 },
  { id: 'patologicos', name: 'Patológicos', legacyFrom: 12, legacyTo: 21 },
  { id: 'noPatologicos', name: 'No patológicos', legacyFrom: 22, legacyTo: 27 },
  {
    id: 'ginecoObstetricos',
    name: 'Gineco-obstétricos',
    legacyFrom: 28,
    legacyTo: 41,
    femeninoOnly: true,
  },
  { id: 'laborales', name: 'Laborales', legacyFrom: 42, legacyTo: 45 },
  { id: 'resumen', name: 'Resumen', legacyFrom: 46, legacyTo: 46 },
];

export function getHcSectionDefsForSexo(sexo?: string | null): HcSectionDef[] {
  const esMujer = sexo === 'Femenino';
  return HC_SECTION_DEFS.filter((s) => !s.femeninoOnly || esMujer);
}

/** Índice 1-based de la sección en el stepper V2 para un sexo dado. */
export function getHcSectionIndex(
  sectionId: HcSectionId,
  sexo?: string | null,
): number {
  const defs = getHcSectionDefsForSexo(sexo);
  const idx = defs.findIndex((s) => s.id === sectionId);
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Convierte un índice legacy (1–46, como en el visualizador V1) al índice de sección V2.
 * Para hombres, los legacy 42–46 ya vienen “comprimidos” en el visualizador vía +14;
 * aquí se asume el número legacy canónico (mujer: 1–46; hombre visualizador suele
 * pasar el step real del array granular o el canónico — ver legacyStepToSectionIndex).
 */
export function legacyStepToSectionIndex(
  legacyStep: number,
  sexo?: string | null,
): number {
  const defs = getHcSectionDefsForSexo(sexo);
  const esMujer = sexo === 'Femenino';

  // Visualizador V1 en hombres: laborales usan currentStep+14 al highlight,
  // pero los clicks pasan step canónico 42–46. Si llega un índice “comprimido”
  // (28–32 = laborales en array masculino granular), mapear a canónico.
  let step = legacyStep;
  if (!esMujer && step >= 28 && step <= 32) {
    // En flujo granular hombre: 28=lab1 … 32=resumen (equiv. 42–46)
    step = step + 14;
  }

  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    if (step >= d.legacyFrom && step <= d.legacyTo) {
      return i + 1;
    }
  }

  // GO en hombre no existe: si piden 28–41, ir a laborales
  if (!esMujer && step >= 28 && step <= 41) {
    return getHcSectionIndex('laborales', sexo);
  }

  return 1;
}
