<script setup>
import { useFormDataStore } from '@/stores/formDataStore';
import { PROCEDIMIENTOS_NOTA_ENFERMERIA } from '@/helpers/notaEnfermeria';
import MedicamentosNotaEnfermeria from './MedicamentosNotaEnfermeria.vue';
import { claseEtiqueta, claseInput, claseOpcion } from './estilos';

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
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Intervención</h1>

    <div class="mt-5" data-pregunta="procedimientos">
      <p :class="claseEtiqueta">Procedimientos realizados <span class="font-normal text-gray-500">(los que apliquen)</span></p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opcion in PROCEDIMIENTOS_NOTA_ENFERMERIA"
          :key="opcion.clave"
          type="button"
          :class="claseOpcion(elegido(opcion.clave))"
          :aria-pressed="elegido(opcion.clave)"
          @click="alternar(opcion.clave)"
        >
          {{ opcion.etiqueta }}
        </button>
      </div>
      <input
        v-if="elegido('otro')"
        v-model="formDataNotaEnfermeria.procedimientoOtro"
        type="text"
        maxlength="300"
        placeholder="¿Qué otro procedimiento?"
        data-campo="procedimientoOtro"
        :class="[claseInput, 'mt-2']"
      />
      <textarea
        v-model="formDataNotaEnfermeria.detalleProcedimientos"
        rows="2"
        maxlength="2000"
        placeholder="Detalle de lo realizado (opcional)"
        :class="[claseInput, 'mt-2']"
      ></textarea>
    </div>

    <div class="mt-5 border-t border-gray-200 pt-4">
      <MedicamentosNotaEnfermeria />
    </div>
  </div>
</template>
