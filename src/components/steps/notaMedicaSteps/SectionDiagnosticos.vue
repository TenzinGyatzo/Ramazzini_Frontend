<script setup>
import { computed } from 'vue';
import MicrostepAnchor from '../MicrostepAnchor.vue';
import NotaMedicaSectionStep from './NotaMedicaSectionStep.vue';
import Step9 from './Step9.vue';
import Step10 from './Step10.vue';
import Step11 from './Step11.vue';
import { getNotaMedicaStepMap } from '@/helpers/notaMedicaStepMap';
import { useNom024Fields } from '@/composables/useNom024Fields';
import { useTrabajadoresStore } from '@/stores/trabajadores';

const { isSIRES } = useNom024Fields();
const trabajadores = useTrabajadoresStore();
const esMujer = computed(() => trabajadores.currentTrabajador?.sexo === 'Femenino');
const stepMap = computed(() => getNotaMedicaStepMap(isSIRES.value, esMujer.value));
</script>

<template>
  <NotaMedicaSectionStep title="Diagnósticos">
    <MicrostepAnchor :legacy-step="stepMap.diagnostico">
      <Step9 variant="compact" />
    </MicrostepAnchor>
    <div class="py-3.5">
      <div class="border-t border-gray-200 dark:border-slate-700" />
    </div>
    <MicrostepAnchor :legacy-step="stepMap.comorbilidad2">
      <Step10 variant="compact" />
    </MicrostepAnchor>
    <div class="py-3.5">
      <div class="border-t border-gray-200 dark:border-slate-700" />
    </div>
    <MicrostepAnchor :legacy-step="stepMap.comorbilidad3">
      <Step11 variant="compact" />
    </MicrostepAnchor>
  </NotaMedicaSectionStep>
</template>
