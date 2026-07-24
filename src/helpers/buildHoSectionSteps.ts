import SectionFecha from '@/components/steps/historiaOtologicaSteps/SectionFecha.vue';
import SectionSintomas from '@/components/steps/historiaOtologicaSteps/SectionSintomas.vue';
import SectionAntecedentes from '@/components/steps/historiaOtologicaSteps/SectionAntecedentes.vue';
import SectionExposicion from '@/components/steps/historiaOtologicaSteps/SectionExposicion.vue';
import SectionOtoscopia from '@/components/steps/historiaOtologicaSteps/SectionOtoscopia.vue';
import SectionResultado from '@/components/steps/historiaOtologicaSteps/SectionResultado.vue';
import { getHoSectionDefs, type HoSectionId } from '@/helpers/hoSections';

const SECTION_COMPONENTS: Record<HoSectionId, unknown> = {
  fecha: SectionFecha,
  sintomas: SectionSintomas,
  antecedentes: SectionAntecedentes,
  exposicion: SectionExposicion,
  otoscopia: SectionOtoscopia,
  resultado: SectionResultado,
};

export function buildHoSectionSteps() {
  return getHoSectionDefs().map((def) => ({
    component: SECTION_COMPONENTS[def.id],
    name: def.name,
  }));
}
