<script setup>
import SeccionNotaEnfermeria from './SeccionNotaEnfermeria.vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { ORIGENES_NOTA_ENFERMERIA } from '@/helpers/notaEnfermeria';
import Requerido from './Requerido.vue';
import { claseEtiqueta, claseInput, claseOpcionLista } from './estilos';

import { useAutofocoPrimerVacio } from '@/composables/useAutofocoPrimerVacio';

// Al abrir el paso, si el aspecto general está vacío, el cursor va a él (el origen son botones)
useAutofocoPrimerVacio(['habitusExterior']);

const { formDataNotaEnfermeria } = useFormDataStore();
</script>

<template>
  <SeccionNotaEnfermeria titulo="Origen y aspecto general" icono="fa-person">

    <div class="mt-5" data-pregunta="origen" data-campo="origen">
      <p :class="claseEtiqueta">Origen de la atención <Requerido /></p>
      <div class="flex max-w-xl flex-col gap-1.5">
        <button
          v-for="opcion in ORIGENES_NOTA_ENFERMERIA"
          :key="opcion.clave"
          type="button"
          :class="claseOpcionLista(formDataNotaEnfermeria.origen === opcion.clave)"
          :aria-pressed="formDataNotaEnfermeria.origen === opcion.clave"
          @click="formDataNotaEnfermeria.origen = opcion.clave"
        >
          {{ opcion.etiqueta }}
        </button>
      </div>
    </div>

    <div class="mt-5" data-campo="habitusExterior">
      <p :class="claseEtiqueta">Aspecto general (hábitus exterior) <Requerido /></p>
      <textarea
        v-model="formDataNotaEnfermeria.habitusExterior"
        rows="3"
        maxlength="2000"
        placeholder="Conciencia, orientación, marcha, coloración, facies, actitud"
        :class="claseInput"
      ></textarea>
    </div>
  </SeccionNotaEnfermeria>
</template>
