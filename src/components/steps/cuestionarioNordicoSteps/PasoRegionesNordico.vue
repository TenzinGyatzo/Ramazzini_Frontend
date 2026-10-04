<script setup>
import { computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import {
  NO,
  PASOS_NORDICO,
  asegurarRegionesNordico,
  calcularResultadoCuestionarioNordico,
  nivelesRegionNordico,
  regionesNordicoDelPaso,
} from '@/helpers/cuestionarioNordico';
import GuiaCorporalNordico from './GuiaCorporalNordico.vue';
import TarjetaRegionNordico from './TarjetaRegionNordico.vue';

/** Un paso de captura: las regiones de un grupo anatómico, cada una en su tarjeta. */
const props = defineProps({
  paso: { type: Number, required: true },
});

const formData = useFormDataStore();

const nombrePaso = computed(() => PASOS_NORDICO.find((p) => p.paso === props.paso)?.nombre ?? '');
const regiones = computed(() => regionesNordicoDelPaso(props.paso));
const clavesDelPaso = computed(() => regiones.value.map((region) => region.clave));

const niveles = computed(() =>
  nivelesRegionNordico(calcularResultadoCuestionarioNordico(formData.formDataCuestionarioNordico.regiones)),
);

const sinResponder = computed(() =>
  regiones.value.filter(
    (region) => !formData.formDataCuestionarioNordico.regiones?.[region.clave]?.molestia12Meses,
  ),
);

/** Contesta «No» solo en las regiones del paso que siguen sin respuesta. */
const negarSinResponder = () => {
  const respuestas = asegurarRegionesNordico(formData.formDataCuestionarioNordico);
  for (const region of sinResponder.value) {
    respuestas[region.clave].molestia12Meses = NO;
  }
};
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-1 text-gray-900">Cuestionario Nórdico</h1>
    <h2 class="text-lg font-semibold text-gray-700">{{ nombrePaso }}</h2>

    <div class="mt-3 flex items-start gap-4">
      <div class="w-20 shrink-0 sm:w-24">
        <GuiaCorporalNordico :niveles="niveles" :regiones-activas="clavesDelPaso" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm text-gray-600 leading-snug">
          Indique si el trabajador ha tenido dolor, molestias o disconfort en cada región durante los
          últimos 12 meses. Al contestar «Sí» se despliega el detalle de esa región.
        </p>
        <button
          v-if="sinResponder.length"
          type="button"
          class="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
          @click="negarSinResponder"
        >
          Marcar «No» en {{ sinResponder.length === 1 ? 'la región' : `las ${sinResponder.length} regiones` }} sin
          responder
        </button>
      </div>
    </div>

    <div class="mt-4 space-y-3">
      <TarjetaRegionNordico v-for="region in regiones" :key="region.clave" :region="region" />
    </div>
  </div>
</template>
