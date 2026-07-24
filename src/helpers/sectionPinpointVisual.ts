/**
 * Pinpoint visual: solo tiene sentido cuando la sección V2 contiene varios microsteps.
 * Secciones singleton (legacyFrom === legacyTo) usan solo el outline amarillo de sección.
 */

import { getHcSectionDefsForSexo, legacyStepToSectionIndex as hcLegacyToSection } from '@/helpers/historiaClinicaSections';
import { getEfSectionDefs, legacyStepToSectionIndex as efLegacyToSection } from '@/helpers/exploracionFisicaSections';
import { getHoSectionDefs, legacyStepToSectionIndex as hoLegacyToSection } from '@/helpers/hoSections';
import { getPeSectionDefs, legacyStepToSectionIndex as peLegacyToSection } from '@/helpers/peSections';
import { getAptitudSectionDefs, legacyStepToSectionIndex as aptitudLegacyToSection } from '@/helpers/aptitudSections';
import { getCertificadoSectionDefs, legacyStepToSectionIndex as certificadoLegacyToSection } from '@/helpers/certificadoSections';
import { getNmSectionDefs, legacyStepToSectionIndex as nmLegacyToSection } from '@/helpers/notaMedicaSections';

type RangeDef = { legacyFrom: number; legacyTo: number };

function isSingletonDef(def: RangeDef | undefined | null): boolean {
  if (!def) return false;
  return def.legacyFrom === def.legacyTo;
}

function defAtSectionIndex(defs: RangeDef[], sectionIndex: number): RangeDef | undefined {
  if (sectionIndex < 1 || sectionIndex > defs.length) return undefined;
  return defs[sectionIndex - 1];
}

export interface PinpointVisualContext {
  documentType: string | null | undefined;
  legacyStep: number;
  /** Historia clínica / nota médica */
  sexo?: string | null;
  /** Nota médica SIRES */
  showSires?: boolean;
}

/**
 * true → pintar azul (fila + microstep).
 * false → sección singleton: no pintar azul (sí se puede navegar/scroll/focus).
 */
export function shouldShowPinpointVisual(ctx: PinpointVisualContext): boolean {
  const { documentType, legacyStep } = ctx;
  if (!documentType || legacyStep == null || legacyStep <= 0) return false;

  switch (documentType) {
    case 'historiaClinica': {
      const defs = getHcSectionDefsForSexo(ctx.sexo);
      return !isSingletonDef(defAtSectionIndex(defs, hcLegacyToSection(legacyStep, ctx.sexo)));
    }
    case 'exploracionFisica': {
      const defs = getEfSectionDefs();
      return !isSingletonDef(defAtSectionIndex(defs, efLegacyToSection(legacyStep)));
    }
    case 'historiaOtologica': {
      const defs = getHoSectionDefs();
      return !isSingletonDef(defAtSectionIndex(defs, hoLegacyToSection(legacyStep)));
    }
    case 'previoEspirometria': {
      const defs = getPeSectionDefs();
      return !isSingletonDef(defAtSectionIndex(defs, peLegacyToSection(legacyStep)));
    }
    case 'aptitud': {
      const defs = getAptitudSectionDefs();
      return !isSingletonDef(defAtSectionIndex(defs, aptitudLegacyToSection(legacyStep)));
    }
    case 'antidoping':
      // Una sola sección compacta (fecha + parámetros): el outline amarillo basta.
      return false;
    case 'certificado': {
      const defs = getCertificadoSectionDefs();
      return !isSingletonDef(defAtSectionIndex(defs, certificadoLegacyToSection(legacyStep)));
    }
    case 'notaMedica': {
      const showSires = !!ctx.showSires;
      const esMujer = ctx.sexo === 'Femenino';
      const defs = getNmSectionDefs(showSires, esMujer);
      return !isSingletonDef(
        defAtSectionIndex(defs, nmLegacyToSection(legacyStep, showSires, esMujer)),
      );
    }
    default:
      return true;
  }
}
