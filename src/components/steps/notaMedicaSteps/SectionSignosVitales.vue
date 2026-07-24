<script setup>
import { computed } from 'vue';
import MicrostepAnchor from '../MicrostepAnchor.vue';
import NotaMedicaSectionStep from './NotaMedicaSectionStep.vue';
import Step6 from './Step6.vue';
import { getNotaMedicaStepMap } from '@/helpers/notaMedicaStepMap';
import { useNom024Fields } from '@/composables/useNom024Fields';
import { useTrabajadoresStore } from '@/stores/trabajadores';

const { isSIRES } = useNom024Fields();
const trabajadores = useTrabajadoresStore();
const esMujer = computed(() => trabajadores.currentTrabajador?.sexo === 'Femenino');
const stepMap = computed(() => getNotaMedicaStepMap(isSIRES.value, esMujer.value));
</script>

<template>
  <NotaMedicaSectionStep title="Signos vitales">
    <MicrostepAnchor :legacy-step="stepMap.signos">
      <Step6 variant="compact" />
    </MicrostepAnchor>
  </NotaMedicaSectionStep>
</template>
