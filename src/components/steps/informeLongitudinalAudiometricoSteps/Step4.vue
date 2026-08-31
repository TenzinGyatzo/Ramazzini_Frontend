<script setup>
import { computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const store = useFormDataStore();
const fm = computed(() => store.formDataInformeLongitudinalAudiometrico);
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Recomendaciones</h1>
    <p class="text-sm text-gray-600 mb-4">
      Confirmatoria, referencia, EPP o seguimiento, según el criterio del médico.
    </p>

    <FormKit
      type="textarea"
      name="recomendacionesSeguimientoAudiometrico"
      label="Recomendaciones"
      rows="7"
      input-class="min-h-[9rem]"
      v-model="fm.recomendacionesSeguimientoAudiometrico"
    />
  </div>
</template>
