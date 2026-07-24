import SectionConsulta from '@/components/steps/notaMedicaSteps/SectionConsulta.vue';
import SectionIdentificacionCex from '@/components/steps/notaMedicaSteps/SectionIdentificacionCex.vue';
import SectionClinica from '@/components/steps/notaMedicaSteps/SectionClinica.vue';
import SectionSignosVitales from '@/components/steps/notaMedicaSteps/SectionSignosVitales.vue';
import SectionSomatometria from '@/components/steps/notaMedicaSteps/SectionSomatometria.vue';
import SectionGlucemia from '@/components/steps/notaMedicaSteps/SectionGlucemia.vue';
import SectionEmbarazo from '@/components/steps/notaMedicaSteps/SectionEmbarazo.vue';
import SectionDiagnosticos from '@/components/steps/notaMedicaSteps/SectionDiagnosticos.vue';
import SectionPlan from '@/components/steps/notaMedicaSteps/SectionPlan.vue';
import {
  getNmSectionDefs,
  type NmSectionId,
} from '@/helpers/notaMedicaSections';

const SECTION_COMPONENTS: Record<NmSectionId, unknown> = {
  consulta: SectionConsulta,
  identificacionCex: SectionIdentificacionCex,
  clinica: SectionClinica,
  signosVitales: SectionSignosVitales,
  somatometria: SectionSomatometria,
  glucemia: SectionGlucemia,
  embarazo: SectionEmbarazo,
  diagnosticos: SectionDiagnosticos,
  plan: SectionPlan,
};

export function buildNotaMedicaSectionSteps(
  showSires: boolean,
  esMujer: boolean,
) {
  return getNmSectionDefs(showSires, esMujer).map((def) => ({
    component: SECTION_COMPONENTS[def.id],
    name: def.name,
  }));
}
