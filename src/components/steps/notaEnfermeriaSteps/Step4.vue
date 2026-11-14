<script setup>
import { onMounted } from 'vue';
import { format } from 'date-fns';
import { useFormDataStore } from '@/stores/formDataStore';
import { MAX_TOMAS_CONTROL_NOTA_ENFERMERIA } from '@/helpers/notaEnfermeria';
import CamposSignosVitales from './CamposSignosVitales.vue';
import {
  claseAyuda,
  claseBotonAgregar,
  claseBotonQuitar,
  claseEtiquetaCampo,
  claseInput,
} from './estilos';

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
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Signos vitales</h1>

    <div class="mt-3">
      <p :class="claseAyuda">Todos son opcionales: captura solo los que tomaste.</p>
      <CamposSignosVitales
        v-if="formDataNotaEnfermeria.signosVitales"
        :toma="formDataNotaEnfermeria.signosVitales"
        prefijo-campo="signosVitales"
      />
    </div>

    <div
      v-for="(toma, indice) in formDataNotaEnfermeria.tomasControl ?? []"
      :key="indice"
      class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3"
      :data-toma-control="indice + 1"
    >
      <div class="mb-3 flex items-end justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-gray-800">Toma de control {{ indice + 1 }}</p>
          <label :class="[claseEtiquetaCampo, 'mt-2 block']" :data-campo="`tomasControl.${indice}.hora`">
            Hora
            <input
              v-model="toma.hora"
              type="time"
              :class="[claseInput, 'mt-1 w-36 font-normal']"
              :aria-label="`Hora de la toma de control ${indice + 1}`"
            />
          </label>
        </div>
        <button
          type="button"
          :class="claseBotonQuitar"
          :aria-label="`Quitar la toma de control ${indice + 1}`"
          title="Quitar toma de control"
          @click="quitarToma(indice)"
        >
          <i class="fas fa-trash-alt" aria-hidden="true"></i>
        </button>
      </div>
      <CamposSignosVitales :toma="toma" :prefijo-campo="`tomasControl.${indice}`" />
    </div>

    <div class="mt-4">
      <button
        v-if="(formDataNotaEnfermeria.tomasControl?.length ?? 0) < MAX_TOMAS_CONTROL_NOTA_ENFERMERIA"
        type="button"
        :class="claseBotonAgregar"
        data-agregar-toma
        @click="agregarToma"
      >
        <i class="fas fa-plus" aria-hidden="true"></i>
        Agregar toma de control
      </button>
      <p class="mt-1 text-xs text-gray-500">
        Hasta {{ MAX_TOMAS_CONTROL_NOTA_ENFERMERIA }}. Por ejemplo, para registrar la respuesta tras administrar un medicamento.
      </p>
    </div>
  </div>
</template>
