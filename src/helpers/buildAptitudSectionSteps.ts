import SectionFecha from '@/components/steps/aptitudSteps/SectionFecha.vue';
import SectionEvaluacionesAdicionales from '@/components/steps/aptitudSteps/SectionEvaluacionesAdicionales.vue';
import SectionSeleccionAptitud from '@/components/steps/aptitudSteps/SectionSeleccionAptitud.vue';
import SectionAlteraciones from '@/components/steps/aptitudSteps/SectionAlteraciones.vue';
import SectionResultados from '@/components/steps/aptitudSteps/SectionResultados.vue';
import SectionMedidas from '@/components/steps/aptitudSteps/SectionMedidas.vue';
import {
  getAptitudSectionDefs,
  type AptitudSectionId,
} from '@/helpers/aptitudSections';

const SECTION_COMPONENTS: Record<AptitudSectionId, unknown> = {
  fecha: SectionFecha,
  evaluacionesAdicionales: SectionEvaluacionesAdicionales,
  aptitud: SectionSeleccionAptitud,
  alteraciones: SectionAlteraciones,
  resultados: SectionResultados,
  medidas: SectionMedidas,
};

export function buildAptitudSectionSteps() {
  return getAptitudSectionDefs().map((def) => ({
    component: SECTION_COMPONENTS[def.id],
    name: def.name,
  }));
}
