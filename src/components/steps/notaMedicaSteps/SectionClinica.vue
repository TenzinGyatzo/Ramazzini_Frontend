<script setup>
import { computed } from 'vue';
import MicrostepAnchor from '../MicrostepAnchor.vue';
import NotaMedicaSectionStep from './NotaMedicaSectionStep.vue';
import Step4 from './Step4.vue';
import Step5 from './Step5.vue';
import { getNotaMedicaStepMap } from '@/helpers/notaMedicaStepMap';
import { useNom024Fields } from '@/composables/useNom024Fields';
import { useTrabajadoresStore } from '@/stores/trabajadores';

const { isSIRES } = useNom024Fields();
const trabajadores = useTrabajadoresStore();
const esMujer = computed(() => trabajadores.currentTrabajador?.sexo === 'Femenino');
const stepMap = computed(() => getNotaMedicaStepMap(isSIRES.value, esMujer.value));
</script>

<template>
  <NotaMedicaSectionStep title="Antecedentes y exploración">
    <MicrostepAnchor :legacy-step="stepMap.antecedentes">
      <Step4 variant="compact" />
    </MicrostepAnchor>
    <div class="py-2.5">
      <div class="border-t border-gray-200 dark:border-slate-700" />
    </div>
    <MicrostepAnchor :legacy-step="stepMap.exploracion">
      <Step5 variant="compact" />
    </MicrostepAnchor>
  </NotaMedicaSectionStep>
</template>
