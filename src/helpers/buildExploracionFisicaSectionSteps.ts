import SectionFecha from '@/components/steps/exploracionFisicaSteps/SectionFecha.vue';
import SectionSomatometria from '@/components/steps/exploracionFisicaSteps/SectionSomatometria.vue';
import SectionSignosVitales from '@/components/steps/exploracionFisicaSteps/SectionSignosVitales.vue';
import SectionExploracion from '@/components/steps/exploracionFisicaSteps/SectionExploracion.vue';
import SectionResumen from '@/components/steps/exploracionFisicaSteps/SectionResumen.vue';
import {
  getEfSectionDefs,
  type EfSectionId,
} from '@/helpers/exploracionFisicaSections';

const SECTION_COMPONENTS: Record<EfSectionId, unknown> = {
  fecha: SectionFecha,
  somatometria: SectionSomatometria,
  signosVitales: SectionSignosVitales,
  exploracion: SectionExploracion,
  resumen: SectionResumen,
};

export function buildExploracionFisicaSectionSteps() {
  return getEfSectionDefs().map((def) => ({
    component: SECTION_COMPONENTS[def.id],
    name: def.name,
  }));
}
