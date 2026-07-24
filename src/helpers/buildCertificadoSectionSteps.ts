import SectionCertificado from '@/components/steps/certificadoSteps/SectionCertificado.vue';
import {
  getCertificadoSectionDefs,
  type CertificadoSectionId,
} from '@/helpers/certificadoSections';

const SECTION_COMPONENTS: Record<CertificadoSectionId, unknown> = {
  certificado: SectionCertificado,
};

export function buildCertificadoSectionSteps() {
  return getCertificadoSectionDefs().map((def) => ({
    component: SECTION_COMPONENTS[def.id],
    name: def.name,
  }));
}
