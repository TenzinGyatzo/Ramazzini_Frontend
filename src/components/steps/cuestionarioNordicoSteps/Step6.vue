<script setup>
import { computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const { formDataCuestionarioNordico } = useFormDataStore();

const observaciones = computed({
  get: () => formDataCuestionarioNordico.observaciones ?? '',
  set: (valor) => {
    if (valor) formDataCuestionarioNordico.observaciones = valor;
    else delete formDataCuestionarioNordico.observaciones;
  },
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-1 text-gray-900">Cuestionario Nórdico</h1>
    <h2 class="text-lg font-semibold mb-3 text-gray-700">Observaciones</h2>
    <p class="mb-2 text-sm text-gray-600">
      Comentarios del trabajador o de quien aplica el cuestionario (opcional).
    </p>
    <textarea
      v-model="observaciones"
      rows="6"
      maxlength="2000"
      data-skip-validation
      placeholder="Escriba aquí cualquier comentario relevante."
      class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    ></textarea>
    <p class="mt-1 text-right text-xs text-gray-500">{{ observaciones.length }} / 2000</p>
  </div>
</template>
