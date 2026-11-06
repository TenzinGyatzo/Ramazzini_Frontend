<script setup>
import { useFormDataStore } from '@/stores/formDataStore';
import { ORIGENES_NOTA_ENFERMERIA } from '@/helpers/notaEnfermeria';
import Requerido from './Requerido.vue';
import { claseEtiqueta, claseInput, claseOpcionLista } from './estilos';

const { formDataNotaEnfermeria } = useFormDataStore();
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Origen y aspecto general</h1>

    <div class="mt-5" data-pregunta="origen">
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

    <div class="mt-5">
      <p :class="claseEtiqueta">Aspecto general (hábitus exterior) <Requerido /></p>
      <textarea
        v-model="formDataNotaEnfermeria.habitusExterior"
        rows="3"
        maxlength="2000"
        data-campo="habitusExterior"
        placeholder="Conciencia, orientación, marcha, coloración, facies, actitud"
        :class="claseInput"
      ></textarea>
    </div>
  </div>
</template>
