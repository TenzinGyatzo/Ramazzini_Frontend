<script setup>
import { useFormDataStore } from '@/stores/formDataStore';
import { PROCEDIMIENTOS_NOTA_ENFERMERIA } from '@/helpers/notaEnfermeria';
import Requerido from './Requerido.vue';
import { claseEtiqueta, claseInput, claseOpcionLista } from './estilos';

const { formDataNotaEnfermeria } = useFormDataStore();

const elegido = (clave) => (formDataNotaEnfermeria.procedimientos ?? []).includes(clave);

const alternar = (clave) => {
  const actuales = formDataNotaEnfermeria.procedimientos ?? [];
  formDataNotaEnfermeria.procedimientos = elegido(clave)
    ? actuales.filter((c) => c !== clave)
    : [...actuales, clave];
  if (clave === 'otro' && !elegido('otro')) delete formDataNotaEnfermeria.procedimientoOtro;
};
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Procedimientos</h1>

    <div class="mt-5" data-pregunta="procedimientos">
      <p :class="claseEtiqueta">Procedimientos realizados <span class="font-normal text-gray-500">(los que apliquen)</span></p>
      <!-- Dos columnas fijas, en el orden de la lista -->
      <div class="grid grid-cols-2 gap-1.5">
        <button
          v-for="opcion in PROCEDIMIENTOS_NOTA_ENFERMERIA"
          :key="opcion.clave"
          type="button"
          :class="claseOpcionLista(elegido(opcion.clave))"
          :aria-pressed="elegido(opcion.clave)"
          @click="alternar(opcion.clave)"
        >
          <i v-if="elegido(opcion.clave)" class="fas fa-check mr-1 text-emerald-600" aria-hidden="true"></i>
          {{ opcion.etiqueta }}
        </button>
      </div>
      <label v-if="elegido('otro')" class="mt-3 block" data-campo="procedimientoOtro">
        <span :class="claseEtiqueta">¿Qué otro procedimiento? <Requerido /></span>
        <input
          v-model="formDataNotaEnfermeria.procedimientoOtro"
          type="text"
          maxlength="300"
          :class="[claseInput, 'mt-1.5']"
        />
      </label>
      <label class="mt-3 block">
        <span :class="claseEtiqueta">Detalle de lo realizado <span class="font-normal text-gray-500">(opcional)</span></span>
        <textarea
          v-model="formDataNotaEnfermeria.detalleProcedimientos"
          rows="2"
          maxlength="2000"
          :class="[claseInput, 'mt-1.5']"
        ></textarea>
      </label>
    </div>

  </div>
</template>
