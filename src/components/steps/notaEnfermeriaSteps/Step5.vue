<script setup>
import { useFormDataStore } from '@/stores/formDataStore';
import { DESTINOS_NOTA_ENFERMERIA } from '@/helpers/notaEnfermeria';
import { claseEtiqueta, claseInput, claseOpcion } from './estilos';

const { formDataNotaEnfermeria } = useFormDataStore();
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Cierre</h1>

    <div class="mt-5" data-pregunta="destino">
      <p :class="claseEtiqueta">Destino del trabajador</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opcion in DESTINOS_NOTA_ENFERMERIA"
          :key="opcion.clave"
          type="button"
          :class="claseOpcion(formDataNotaEnfermeria.destino === opcion.clave)"
          :aria-pressed="formDataNotaEnfermeria.destino === opcion.clave"
          @click="formDataNotaEnfermeria.destino = opcion.clave"
        >
          {{ opcion.etiqueta }}
        </button>
      </div>
    </div>

    <div class="mt-5">
      <p :class="claseEtiqueta">Recomendaciones e indicaciones al trabajador</p>
      <textarea
        v-model="formDataNotaEnfermeria.recomendaciones"
        rows="3"
        maxlength="2000"
        :class="claseInput"
      ></textarea>
    </div>

    <div class="mt-5">
      <p :class="claseEtiqueta">Observaciones</p>
      <textarea
        v-model="formDataNotaEnfermeria.observaciones"
        rows="3"
        maxlength="2000"
        :class="claseInput"
      ></textarea>
    </div>
  </div>
</template>
