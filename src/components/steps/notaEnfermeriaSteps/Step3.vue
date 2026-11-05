<script setup>
import { onMounted } from 'vue';
import { format } from 'date-fns';
import { useFormDataStore } from '@/stores/formDataStore';
import { MAX_TOMAS_CONTROL_NOTA_ENFERMERIA } from '@/helpers/notaEnfermeria';
import CamposSignosVitales from './CamposSignosVitales.vue';
import { claseEtiqueta, claseInput } from './estilos';

const { formDataNotaEnfermeria } = useFormDataStore();

onMounted(() => {
  if (!formDataNotaEnfermeria.signosVitales) formDataNotaEnfermeria.signosVitales = {};
});

const agregarToma = () => {
  if (!formDataNotaEnfermeria.tomasControl) formDataNotaEnfermeria.tomasControl = [];
  formDataNotaEnfermeria.tomasControl.push({ hora: format(new Date(), 'HH:mm') });
};

const quitarToma = (indice) => {
  formDataNotaEnfermeria.tomasControl.splice(indice, 1);
};
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Valoración</h1>

    <div class="mt-5">
      <p :class="claseEtiqueta">Aspecto general (hábitus exterior)</p>
      <textarea
        v-model="formDataNotaEnfermeria.habitusExterior"
        rows="3"
        maxlength="2000"
        data-campo="habitusExterior"
        placeholder="Conciencia, orientación, marcha, coloración, facies, actitud"
        :class="claseInput"
      ></textarea>
    </div>

    <div class="mt-5">
      <p :class="claseEtiqueta">Signos vitales <span class="font-normal text-gray-500">(opcionales)</span></p>
      <CamposSignosVitales v-if="formDataNotaEnfermeria.signosVitales" :toma="formDataNotaEnfermeria.signosVitales" />
    </div>

    <div
      v-for="(toma, indice) in formDataNotaEnfermeria.tomasControl ?? []"
      :key="indice"
      class="mt-4 rounded-lg border border-gray-200 p-3"
      :data-toma-control="indice + 1"
    >
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-sm font-semibold text-gray-800">Toma de control {{ indice + 1 }}</p>
        <div class="flex items-center gap-2">
          <input v-model="toma.hora" type="time" :class="[claseInput, 'w-32']" :aria-label="`Hora de la toma de control ${indice + 1}`" />
          <button type="button" class="px-2 font-bold text-red-500" title="Quitar toma de control" @click="quitarToma(indice)">
            ✕
          </button>
        </div>
      </div>
      <CamposSignosVitales :toma="toma" />
    </div>

    <button
      v-if="(formDataNotaEnfermeria.tomasControl?.length ?? 0) < MAX_TOMAS_CONTROL_NOTA_ENFERMERIA"
      type="button"
      class="mt-4 rounded-lg border border-emerald-500 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
      data-agregar-toma
      @click="agregarToma"
    >
      Agregar toma de control
    </button>
    <p class="mt-1 text-xs text-gray-500">Por ejemplo, para registrar la respuesta tras administrar un medicamento.</p>
  </div>
</template>
