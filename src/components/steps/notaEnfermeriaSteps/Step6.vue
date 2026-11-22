<script setup>
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import SeccionNotaEnfermeria from './SeccionNotaEnfermeria.vue';
import MedicamentosNotaEnfermeria from './MedicamentosNotaEnfermeria.vue';

// Punto 46: en captura rápida los campos aprovechan el ancho
const capturaRapida = enCapturaRapida();
</script>

<template>
  <SeccionNotaEnfermeria titulo="Medicamentos" icono="fa-pills">
    <div :class="capturaRapida ? '' : 'mt-3'">
      <MedicamentosNotaEnfermeria />
    </div>
  </SeccionNotaEnfermeria>
</template>
