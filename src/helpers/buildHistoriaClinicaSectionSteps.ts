import SectionMotivo from '@/components/steps/historiaClinicaSteps/SectionMotivo.vue';
import SectionHeredoFamiliares from '@/components/steps/historiaClinicaSteps/SectionHeredoFamiliares.vue';
import SectionPatologicos from '@/components/steps/historiaClinicaSteps/SectionPatologicos.vue';
import SectionNoPatologicos from '@/components/steps/historiaClinicaSteps/SectionNoPatologicos.vue';
import SectionGinecoObstetricos from '@/components/steps/historiaClinicaSteps/SectionGinecoObstetricos.vue';
import SectionLaborales from '@/components/steps/historiaClinicaSteps/SectionLaborales.vue';
import SectionResumen from '@/components/steps/historiaClinicaSteps/SectionResumen.vue';
import {
  getHcSectionDefsForSexo,
  type HcSectionId,
} from '@/helpers/historiaClinicaSections';

const SECTION_COMPONENTS: Record<HcSectionId, unknown> = {
  motivo: SectionMotivo,
  heredofamiliares: SectionHeredoFamiliares,
  patologicos: SectionPatologicos,
  noPatologicos: SectionNoPatologicos,
  ginecoObstetricos: SectionGinecoObstetricos,
  laborales: SectionLaborales,
  resumen: SectionResumen,
};

export function buildHistoriaClinicaSectionSteps(sexo?: string | null) {
  return getHcSectionDefsForSexo(sexo).map((def) => ({
    component: SECTION_COMPONENTS[def.id],
    name: def.name,
  }));
}
