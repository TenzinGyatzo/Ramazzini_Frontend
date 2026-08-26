<script setup>
import { computed, onMounted, ref } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const store = useFormDataStore();
const fm = computed(() => store.formDataInformeLongitudinalAudiometrico);
const mensajeCopiado = ref(false);

const copiarBorrador = async () => {
  const texto = fm.value.borradorInterpretacionObjetiva || '';
  if (!texto) return;
  try {
    await navigator.clipboard.writeText(texto);
    mensajeCopiado.value = true;
    setTimeout(() => { mensajeCopiado.value = false; }, 2000);
  } catch (err) {
    console.error('No se pudo copiar el borrador', err);
  }
};

function usarBorradorSiVacio() {
  const f = store.formDataInformeLongitudinalAudiometrico;
  if ((!f.interpretacionLongitudinal || !String(f.interpretacionLongitudinal).trim()) && f.borradorInterpretacionObjetiva) {
    f.interpretacionLongitudinal = f.borradorInterpretacionObjetiva;
  }
}

onMounted(() => {
  usarBorradorSiVacio();
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Interpretación y recomendaciones</h1>
    <p class="text-sm text-gray-600 mb-4">
      Ramazzini describe variación de umbrales; no atribuye el cambio a ruido laboral. AMA y LFT interpretan cada estudio; el seguimiento usa umbrales tonales originales.
    </p>

    <div class="space-y-4">
      <div class="border border-gray-200 rounded-lg p-4 bg-slate-50">
        <div class="flex items-center justify-between gap-2 mb-2">
          <h2 class="text-sm font-semibold text-gray-800">Borrador objetivo</h2>
          <button type="button" class="text-xs px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50" @click="copiarBorrador">
            {{ mensajeCopiado ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
        <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ fm.borradorInterpretacionObjetiva || 'Seleccione basal y subsecuentes en el paso 1.' }}</p>
      </div>

      <FormKit
        type="textarea"
        name="interpretacionLongitudinal"
        label="Interpretación longitudinal (médico)"
        v-model="fm.interpretacionLongitudinal"
      />
      <FormKit
        type="textarea"
        name="recomendacionesSeguimientoAudiometrico"
        label="Recomendaciones (confirmatoria, referencia, EPP, seguimiento)"
        v-model="fm.recomendacionesSeguimientoAudiometrico"
      />
    </div>
  </div>
</template>
