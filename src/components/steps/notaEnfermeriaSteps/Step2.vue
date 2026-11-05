<script setup>
import { useFormDataStore } from '@/stores/formDataStore';
import {
  ORIGENES_NOTA_ENFERMERIA,
  SISTEMAS_NOTA_ENFERMERIA,
  TIPOS_PROBLEMA_NOTA_ENFERMERIA,
} from '@/helpers/notaEnfermeria';
import SelectorConBuscador from './SelectorConBuscador.vue';
import { claseEtiqueta, claseOpcion } from './estilos';

const { formDataNotaEnfermeria } = useFormDataStore();
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Clasificación</h1>
    <p class="text-xs italic text-gray-500">Sirve para las estadísticas del tablero de salud.</p>

    <div class="mt-5" data-pregunta="tipoProblema">
      <p :class="claseEtiqueta">Tipo de problema</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opcion in TIPOS_PROBLEMA_NOTA_ENFERMERIA"
          :key="opcion.clave"
          type="button"
          :title="opcion.ayuda"
          :class="claseOpcion(formDataNotaEnfermeria.tipoProblema === opcion.clave)"
          :aria-pressed="formDataNotaEnfermeria.tipoProblema === opcion.clave"
          @click="formDataNotaEnfermeria.tipoProblema = opcion.clave"
        >
          {{ opcion.etiqueta }}
          <span v-if="opcion.ayuda" class="block text-xs font-normal text-gray-500">{{ opcion.ayuda }}</span>
        </button>
      </div>
    </div>

    <div class="mt-5" data-pregunta="sistema">
      <p :class="claseEtiqueta">Aparato o sistema</p>
      <SelectorConBuscador
        v-model="formDataNotaEnfermeria.sistema"
        :opciones="SISTEMAS_NOTA_ENFERMERIA"
        placeholder="Buscar aparato o sistema"
      />
    </div>

    <div class="mt-5" data-pregunta="origen">
      <p :class="claseEtiqueta">Origen de la atención</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opcion in ORIGENES_NOTA_ENFERMERIA"
          :key="opcion.clave"
          type="button"
          :class="claseOpcion(formDataNotaEnfermeria.origen === opcion.clave)"
          :aria-pressed="formDataNotaEnfermeria.origen === opcion.clave"
          @click="formDataNotaEnfermeria.origen = opcion.clave"
        >
          {{ opcion.etiqueta }}
        </button>
      </div>
    </div>
  </div>
</template>
