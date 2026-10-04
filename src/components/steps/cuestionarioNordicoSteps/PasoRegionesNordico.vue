<script setup>
import { computed, onMounted } from 'vue';
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

/**
 * Al montar el paso, las regiones que aún no tienen respuesta quedan en «No»
 * (mismo criterio que los demás cuestionarios). Una respuesta ya capturada no se toca.
 */
function asegurarNoPorDefecto() {
  const respuestas = asegurarRegionesNordico(formData.formDataCuestionarioNordico);
  for (const region of regiones.value) {
    if (!respuestas[region.clave].molestia12Meses) {
      respuestas[region.clave].molestia12Meses = NO;
    }
  }
}

onMounted(asegurarNoPorDefecto);
asegurarNoPorDefecto();
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
          últimos 12 meses. Cada región inicia en «No»; al contestar «Sí» se despliega su detalle.
        </p>
      </div>
    </div>

    <div class="mt-4 space-y-3">
      <TarjetaRegionNordico v-for="region in regiones" :key="region.clave" :region="region" />
    </div>
  </div>
</template>
