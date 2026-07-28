<script setup lang="ts">
import { computed } from 'vue';
import { useStepsStore } from '@/stores/steps';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useNom024Fields } from '@/composables/useNom024Fields';
import { shouldShowPinpointVisual } from '@/helpers/sectionPinpointVisual';

const props = defineProps<{
  legacyStep: number;
}>();

const steps = useStepsStore();
const documentos = useDocumentosStore();
const trabajadores = useTrabajadoresStore();
const { isSIRES } = useNom024Fields();

const showVisual = computed(() =>
  shouldShowPinpointVisual({
    documentType: documentos.currentTypeOfDocument,
    legacyStep: props.legacyStep,
    sexo: trabajadores.currentTrabajador?.sexo,
    showSires: isSIRES.value,
  }),
);

const isPinned = computed(
  () =>
    showVisual.value &&
    steps.focusedLegacyStep === props.legacyStep,
);
</script>

<template>
  <div
    :data-legacy-step="legacyStep"
    class="microstep-anchor rounded-md transition-colors duration-150"
    :class="isPinned ? 'microstep-pinpoint' : ''"
  >
    <slot />
  </div>
</template>

<style scoped>
/* Halo hacia afuera: aire visual sin comprimir el contenido ni desplazar vecinos. */
.microstep-pinpoint {
  margin: -6px -8px;
  padding: 6px 8px;
  background-color: #dbeafe; /* blue-100 */
  border-radius: 0.375rem;
}
</style>

<!-- Sin scoped: :global(html.dark-mode) .clase se compilaba mal a html.dark-mode { … }. -->
<style>
html.dark-mode .microstep-pinpoint {
  background-color: #1e4a7a !important;
}
</style>
