<script setup>
import { computed } from 'vue';
import MicrostepAnchor from '../MicrostepAnchor.vue';
import NotaMedicaSectionStep from './NotaMedicaSectionStep.vue';
import Step12 from './Step12.vue';
import Step13 from './Step13.vue';
import Step14 from './Step14.vue';
import { getNotaMedicaStepMap } from '@/helpers/notaMedicaStepMap';
import { useNom024Fields } from '@/composables/useNom024Fields';
import { useTrabajadoresStore } from '@/stores/trabajadores';

const { isSIRES } = useNom024Fields();
const trabajadores = useTrabajadoresStore();
const esMujer = computed(() => trabajadores.currentTrabajador?.sexo === 'Femenino');
const stepMap = computed(() => getNotaMedicaStepMap(isSIRES.value, esMujer.value));
</script>

<template>
  <NotaMedicaSectionStep title="Plan">
    <MicrostepAnchor :legacy-step="stepMap.tratamiento">
      <Step12 variant="compact" />
    </MicrostepAnchor>
    <div class="py-2.5">
      <div class="border-t border-gray-200 dark:border-slate-700" />
    </div>
    <MicrostepAnchor :legacy-step="stepMap.recomendaciones">
      <Step13 variant="compact" />
    </MicrostepAnchor>
    <div class="py-2.5">
      <div class="border-t border-gray-200 dark:border-slate-700" />
    </div>
    <MicrostepAnchor :legacy-step="stepMap.observaciones">
      <Step14 variant="compact" />
    </MicrostepAnchor>
  </NotaMedicaSectionStep>
</template>
