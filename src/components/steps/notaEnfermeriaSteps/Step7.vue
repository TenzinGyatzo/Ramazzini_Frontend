<script setup>
import { useFormDataStore } from '@/stores/formDataStore';
import { DESTINOS_NOTA_ENFERMERIA } from '@/helpers/notaEnfermeria';
import Requerido from './Requerido.vue';
import { claseEtiqueta, claseInput, claseOpcionLista } from './estilos';

const { formDataNotaEnfermeria } = useFormDataStore();
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Cierre</h1>

    <div class="mt-5" data-pregunta="destino">
      <p :class="claseEtiqueta">Destino del trabajador <Requerido /></p>
      <!-- Una columna, de lo más a lo menos frecuente -->
      <div class="flex max-w-xl flex-col gap-1.5">
        <button
          v-for="opcion in DESTINOS_NOTA_ENFERMERIA"
          :key="opcion.clave"
          type="button"
          :class="claseOpcionLista(formDataNotaEnfermeria.destino === opcion.clave)"
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
        placeholder="Cuidados en casa, cuándo regresar, signos de alarma"
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
