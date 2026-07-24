import SectionAntidoping from '@/components/steps/antidopingSteps/SectionAntidoping.vue';
import {
  getAntidopingSectionDefs,
  type AntidopingSectionId,
} from '@/helpers/antidopingSections';

const SECTION_COMPONENTS: Record<AntidopingSectionId, unknown> = {
  antidoping: SectionAntidoping,
};

export function buildAntidopingSectionSteps() {
  return getAntidopingSectionDefs().map((def) => ({
    component: SECTION_COMPONENTS[def.id],
    name: def.name,
  }));
}
