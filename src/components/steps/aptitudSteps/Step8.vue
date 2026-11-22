<script setup>
import { computed, toRefs } from 'vue';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { CLASE_ETIQUETA } from '../captura/estiloCaptura';
import { useFormDataStore } from '@/stores/formDataStore';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const formDataStore = useFormDataStore();

// Sin opción preseleccionada al abrir el paso: se ve que falta elegir. Al editar se muestra la
// guardada. Por el store (al editar, el documento puede llegar después del primer dibujo).
const aptitudPuesto = computed({
    get: () => formDataStore.formDataAptitud.aptitudPuesto || '',
    set: (valor) => {
        formDataStore.formDataAptitud.aptitudPuesto = valor;
    },
});

// Punto 45: la aptitud es obligatoria en los dos modos; sin elegir, el aviso al guardar la pide
// (antes, salir del paso sin elegir dejaba «Apto sin restricciones»).

const capturaRapida = enCapturaRapida();

// Cada aptitud con su color (verde, ámbar, naranja, rojo y gris), como en el documento
const OPCIONES = [
  { valor: 'Apto Sin Restricciones', etiqueta: 'Apto sin restricciones', descripcion: 'No tiene impedimentos para el puesto al que aspira o desempeña.', color: 'emerald' },
  { valor: 'Apto Con Precaución', etiqueta: 'Apto con precaución', descripcion: 'Requiere una vigilancia médica más frecuente.', color: 'amber' },
  { valor: 'Apto Con Restricciones', etiqueta: 'Apto con restricciones', descripcion: 'Requiere adaptaciones razonables para asegurar la seguridad y salud.', color: 'orange' },
  { valor: 'No Apto', etiqueta: 'No apto', descripcion: 'No está permitido el desempeño del puesto al que aspira.', color: 'red' },
  { valor: 'Evaluación No Completada', etiqueta: 'Evaluación no completada', descripcion: 'Para concluir, requiere evaluaciones adicionales o tratamiento médico.', color: 'gray' },
];
// Clases completas (Tailwind las necesita escritas tal cual)
const COLORES = {
  emerald: { punto: 'bg-emerald-500', elegida: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
  amber: { punto: 'bg-amber-500', elegida: 'border-amber-500 bg-amber-50 text-amber-800' },
  orange: { punto: 'bg-orange-500', elegida: 'border-orange-500 bg-orange-50 text-orange-800' },
  red: { punto: 'bg-red-500', elegida: 'border-red-500 bg-red-50 text-red-800' },
  gray: { punto: 'bg-gray-400', elegida: 'border-gray-500 bg-gray-100 text-gray-800' },
};
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">APTITUD AL PUESTO</h1>

    <div data-campo="aptitudPuesto" :class="variant === 'compact' ? 'mb-3' : 'mb-8'">
      <p :class="[CLASE_ETIQUETA, 'mb-2']">Aptitud al puesto <span class="text-red-500">*</span></p>
      <!-- Una opción por botón, con su color. En captura rápida, botones en un renglón y debajo la
           descripción de la elegida; en el asistente, una por renglón con su descripción -->
      <div
        role="radiogroup"
        aria-label="Aptitud al puesto"
        :class="capturaRapida ? 'flex flex-wrap gap-2' : 'grid grid-cols-1 gap-2'"
      >
        <label
          v-for="op in OPCIONES"
          :key="op.valor"
          :title="capturaRapida ? op.descripcion : undefined"
          :class="[
            'flex gap-2 rounded-lg border cursor-pointer select-none transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500',
            capturaRapida ? 'items-center min-h-9 px-3 py-1.5 sm:whitespace-nowrap' : 'items-start px-3 py-2',
            aptitudPuesto === op.valor ? COLORES[op.color].elegida : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
          ]"
        >
          <input v-model="aptitudPuesto" type="radio" name="aptitudPuesto" :value="op.valor" class="sr-only" />
          <span :class="['w-2.5 h-2.5 rounded-full shrink-0', capturaRapida ? '' : 'mt-1.5', COLORES[op.color].punto]" aria-hidden="true"></span>
          <span class="min-w-0">
            <span class="flex items-center gap-1.5 text-sm font-semibold">
              {{ op.etiqueta }}
              <!-- En captura rápida la palomita ocupa su lugar aunque no se vea: si solo la elegida la
                   tuviera, cambiaría su ancho y las opciones brincarían de renglón al elegir -->
              <i
                v-if="capturaRapida || aptitudPuesto === op.valor"
                :class="['fas fa-check text-xs', aptitudPuesto === op.valor ? '' : 'invisible']"
                aria-hidden="true"
              ></i>
            </span>
            <span v-if="!capturaRapida" class="block text-xs text-gray-500 leading-snug mt-0.5">{{ op.descripcion }}</span>
          </span>
        </label>
      </div>
      <p v-if="capturaRapida" class="mt-2 text-xs text-gray-500">
        {{ OPCIONES.find((o) => o.valor === aptitudPuesto)?.descripcion ?? 'Elige la aptitud; con ella se redactan los resultados.' }}
      </p>
    </div>
  </div>
</template>
