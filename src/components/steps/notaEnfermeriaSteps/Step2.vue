<script setup>
import { useFormDataStore } from '@/stores/formDataStore';
import {
  SISTEMAS_NOTA_ENFERMERIA,
  TIPOS_PROBLEMA_NOTA_ENFERMERIA,
} from '@/helpers/notaEnfermeria';
import Requerido from './Requerido.vue';
import { claseEtiqueta, claseOpcionLista } from './estilos';

const { formDataNotaEnfermeria } = useFormDataStore();
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Clasificación</h1>

    <div class="mt-5" data-pregunta="tipoProblema" data-campo="tipoProblema">
      <p :class="claseEtiqueta">Tipo de problema <Requerido /></p>
      <!-- Una columna, de lo más a lo menos frecuente -->
      <div class="flex max-w-xl flex-col gap-1.5">
        <button
          v-for="opcion in TIPOS_PROBLEMA_NOTA_ENFERMERIA"
          :key="opcion.clave"
          type="button"
          :class="claseOpcionLista(formDataNotaEnfermeria.tipoProblema === opcion.clave)"
          :aria-pressed="formDataNotaEnfermeria.tipoProblema === opcion.clave"
          @click="formDataNotaEnfermeria.tipoProblema = opcion.clave"
        >
          {{ opcion.etiqueta }}
          <span v-if="opcion.ayuda" class="block text-xs font-normal text-gray-500">{{ opcion.ayuda }}</span>
        </button>
      </div>
    </div>

    <div class="mt-5" data-pregunta="sistema" data-campo="sistema">
      <p :class="claseEtiqueta">Aparato o sistema <Requerido /></p>
      <!-- Dos columnas fijas: las trece opciones a la vista, sin buscar ni desplazarse -->
      <div class="grid grid-cols-2 gap-1.5">
        <button
          v-for="opcion in SISTEMAS_NOTA_ENFERMERIA"
          :key="opcion.clave"
          type="button"
          :class="[claseOpcionLista(formDataNotaEnfermeria.sistema === opcion.clave), opcion.clave === 'general' ? 'col-span-2' : '']"
          :aria-pressed="formDataNotaEnfermeria.sistema === opcion.clave"
          :data-opcion="opcion.clave"
          @click="formDataNotaEnfermeria.sistema = opcion.clave"
        >
          {{ opcion.etiqueta }}
        </button>
      </div>
    </div>
  </div>
</template>
