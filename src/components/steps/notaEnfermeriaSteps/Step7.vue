<script setup>
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import SeccionNotaEnfermeria from './SeccionNotaEnfermeria.vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { DESTINOS_NOTA_ENFERMERIA } from '@/helpers/notaEnfermeria';
import Requerido from './Requerido.vue';
import { claseEtiqueta, claseInput, claseOpcionLista } from './estilos';

const { formDataNotaEnfermeria } = useFormDataStore();

// Punto 46: en captura rápida las opciones y los campos aprovechan el ancho
const capturaRapida = enCapturaRapida();
</script>

<template>
  <SeccionNotaEnfermeria titulo="Cierre" icono="fa-door-open">

    <div :class="capturaRapida ? '' : 'mt-5'" data-pregunta="destino" data-campo="destino">
      <p :class="claseEtiqueta">Destino del trabajador <Requerido /></p>
      <!-- Una columna, de lo más a lo menos frecuente -->
      <div :class="capturaRapida ? 'grid gap-1.5 sm:grid-cols-2' : 'flex max-w-xl flex-col gap-1.5'">
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

    <div :class="capturaRapida ? 'mt-5 grid gap-4 sm:grid-cols-2' : ''">
    <div :class="capturaRapida ? '' : 'mt-5'">
      <p :class="claseEtiqueta">Recomendaciones e indicaciones al trabajador</p>
      <textarea
        v-model="formDataNotaEnfermeria.recomendaciones"
        rows="3"
        maxlength="2000"
        placeholder="Cuidados en casa, cuándo regresar, signos de alarma"
        :class="claseInput"
      ></textarea>
    </div>

    <div :class="capturaRapida ? '' : 'mt-5'">
      <p :class="claseEtiqueta">Observaciones</p>
      <textarea
        v-model="formDataNotaEnfermeria.observaciones"
        rows="3"
        maxlength="2000"
        :class="claseInput"
      ></textarea>
    </div>
    </div>
  </SeccionNotaEnfermeria>
</template>
