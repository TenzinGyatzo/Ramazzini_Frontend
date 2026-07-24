import SectionFecha from '@/components/steps/previoEspirometriaSteps/SectionFecha.vue';
import SectionFactoresRiesgo from '@/components/steps/previoEspirometriaSteps/SectionFactoresRiesgo.vue';
import SectionSintomas from '@/components/steps/previoEspirometriaSteps/SectionSintomas.vue';
import SectionAntecedentes from '@/components/steps/previoEspirometriaSteps/SectionAntecedentes.vue';
import SectionContraindRelativas from '@/components/steps/previoEspirometriaSteps/SectionContraindRelativas.vue';
import SectionContraindAbsolutas from '@/components/steps/previoEspirometriaSteps/SectionContraindAbsolutas.vue';
import SectionResultado from '@/components/steps/previoEspirometriaSteps/SectionResultado.vue';
import { getPeSectionDefs, type PeSectionId } from '@/helpers/peSections';

const SECTION_COMPONENTS: Record<PeSectionId, unknown> = {
  fecha: SectionFecha,
  factoresRiesgo: SectionFactoresRiesgo,
  sintomas: SectionSintomas,
  antecedentes: SectionAntecedentes,
  contraindRelativas: SectionContraindRelativas,
  contraindAbsolutas: SectionContraindAbsolutas,
  resultado: SectionResultado,
};

export function buildPeSectionSteps() {
  return getPeSectionDefs().map((def) => ({
    component: SECTION_COMPONENTS[def.id],
    name: def.name,
  }));
}
