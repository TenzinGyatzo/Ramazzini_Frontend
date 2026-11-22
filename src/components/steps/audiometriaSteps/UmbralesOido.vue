<script setup lang="ts">
/**
 * Umbrales de un oído (pasos 2 y 3 de la audiometría, punto 44). Antes cada paso tenía su copia
 * de los 9 valores, escribía 0 dB al abrirse y calculaba ahí los porcentajes. Ahora lee y escribe
 * el formulario directamente (por el store: al editar, el documento puede llegar después del
 * primer dibujo), los umbrales abren vacíos y los resultados los calcula audiometriaGuardado.
 */
import { computed, ref } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useAutofocoPrimerVacio } from '@/composables/useAutofocoPrimerVacio';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { vValorDePartida } from '@/directives/valorDePartida';
import IndicacionTab from '../IndicacionTab.vue';
import {
  FRECUENCIAS_AUDIOMETRIA,
  campoUmbral,
  metodoDe,
  oidoConUmbrales,
  porcentajePerdidaOido,
  type Lado,
} from '@/helpers/audiometriaGuardado';

const props = defineProps<{ lado: Lado; variant?: string }>();

const formDataStore = useFormDataStore();
const proveedorSaludStore = useProveedorSaludStore();
const df = () => formDataStore.formDataAudiometria as Record<string, any>;
const capturaRapida = enCapturaRapida();

// Al abrir el paso, el cursor queda en 125 Hz: se escribe y se avanza con Tab (en la captura
// rápida no se mueve el cursor al abrir). En la sección «Umbrales» los dos oídos abren a la vez:
// solo el derecho pone el cursor (si no, ganaba el izquierdo, que se monta después)
if (props.lado === 'Derecho' || props.variant !== 'compact') {
  useAutofocoPrimerVacio([campoUmbral(props.lado, 125)], { siempreElPrimero: true });
}

const titulo = computed(() => (props.lado === 'Derecho' ? 'Oído derecho' : 'Oído izquierdo'));

const valor = (f: number) => df()[campoUmbral(props.lado, f)] ?? '';

function alEscribir(f: number, texto: string) {
  df()[campoUmbral(props.lado, f)] = texto.trim() === '' ? null : Number(texto);
}

// Al salir del campo: múltiplo de 5 entre −10 y 110 dB, con un aviso breve si se corrigió
const corregidos = ref<Record<number, boolean>>({});
function alSalir(f: number) {
  const actual = df()[campoUmbral(props.lado, f)];
  if (actual === null || actual === undefined || actual === '' || Number.isNaN(Number(actual))) {
    df()[campoUmbral(props.lado, f)] = null;
    return;
  }
  const corregido = Math.min(110, Math.max(-10, Math.round(Number(actual) / 5) * 5));
  if (corregido !== Number(actual)) {
    corregidos.value[f] = true;
    setTimeout(() => (corregidos.value[f] = false), 1500);
  }
  df()[campoUmbral(props.lado, f)] = corregido;
}
const seleccionar = (e: FocusEvent) => (e.target as HTMLInputElement).select();

const metodo = computed(() => metodoDe(df(), proveedorSaludStore.proveedorSalud?.pais));
const resultado = computed(() =>
  oidoConUmbrales(df(), props.lado) ? porcentajePerdidaOido(df(), props.lado, metodo.value) : null,
);
const nombreResultado = computed(() => (metodo.value === 'AMA' ? 'Pérdida monoaural' : 'Índice de Fletcher'));
const ayudaResultado = computed(() =>
  metodo.value === 'AMA'
    ? 'Pérdida monoaural (%) = max(0, PTA − 25) × 1.5, con 500–3000 Hz.'
    : 'Índice de Fletcher (%) = PTA × 0.8, con el rango A (250–2000 Hz) o B (2000–6000 Hz) de mayor pérdida.',
);
// Con el oído izquierdo (el segundo) va también el resultado de los dos oídos
const binaural = computed(() => {
  if (props.lado !== 'Izquierdo' || !oidoConUmbrales(df(), 'Derecho') || !oidoConUmbrales(df(), 'Izquierdo')) {
    return null;
  }
  return metodo.value === 'AMA'
    ? { nombre: 'Pérdida auditiva bilateral', valor: df().perdidaAuditivaBilateralAMA }
    : { nombre: 'Hipoacusia bilateral combinada', valor: df().hipoacusiaBilateralCombinada };
});
</script>

<template>
  <div>
    <template v-if="variant !== 'compact'">
      <h1 class="mb-4 text-sm text-gray-800 leading-5">
        <span class="text-xl font-bold uppercase">{{ titulo }}</span> - Valores Audiométricos
      </h1>
      <p class="font-medium mb-3 text-gray-700 leading-5">
        Ingrese los umbrales auditivos en decibeles (dB) para cada frecuencia:
      </p>
      <IndicacionTab class="mb-3" />
    </template>

    <!-- Un renglón por oído, con el color y el símbolo de la gráfica (○ derecho, × izquierdo) -->
    <p class="flex items-center gap-2 mb-1.5 text-sm font-semibold text-gray-800">
      <span
        :class="['inline-flex w-4 justify-center text-base leading-none font-bold', lado === 'Derecho' ? 'text-red-600' : 'text-blue-600']"
        aria-hidden="true"
      >{{ lado === 'Derecho' ? '○' : '×' }}</span>
      {{ titulo }} <span class="font-normal text-gray-500">· dB</span>
    </p>
    <!-- En captura rápida, tantas frecuencias por renglón como quepan (las 9 en pantalla ancha);
         en el asistente angosto, 5 + 4 -->
    <div
      :class="[
        'grid gap-1.5',
        capturaRapida ? 'grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))]' : 'grid-cols-5',
      ]"
    >
      <div v-for="f in FRECUENCIAS_AUDIOMETRIA" :key="f" :data-campo="campoUmbral(lado, f)" class="min-w-0">
        <label :for="campoUmbral(lado, f)" class="block text-center text-[11px] text-gray-500 mb-0.5">
          {{ f >= 1000 ? `${f / 1000}k` : f }}<span class="sr-only"> Hz</span>
        </label>
        <input
          :id="campoUmbral(lado, f)"
          v-valor-de-partida="0"
          type="number"
          :name="campoUmbral(lado, f)"
          :value="valor(f)"
          :aria-label="`${titulo}, ${f} Hz`"
          :class="[
            'w-full h-10 px-1 text-center text-sm rounded-lg border bg-white text-gray-800 focus:outline-none focus:ring-1 transition-colors duration-300',
            corregidos[f]
              ? 'border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-500'
              : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-500',
          ]"
          min="-10"
          max="110"
          step="5"
          @input="alEscribir(f, ($event.target as HTMLInputElement).value)"
          @focus="seleccionar"
          @blur="alSalir(f)"
        />
      </div>
    </div>

    <!-- Lo que se calcula solo, como las tarjetas de la exploración física -->
    <div class="mt-2 grid gap-2 grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]">
      <div
        data-calculado
        class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
        :title="ayudaResultado"
      >
        <div class="min-w-0">
          <p class="text-xs text-gray-500">{{ nombreResultado }} ({{ metodo }})</p>
          <p v-if="resultado?.rango" class="text-[11px] text-gray-400">Rango {{ resultado.rango }}</p>
        </div>
        <p class="text-base font-bold text-gray-900 whitespace-nowrap">{{ resultado ? `${resultado.porcentaje} %` : '—' }}</p>
      </div>
      <div
        v-if="binaural"
        data-calculado
        class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
      >
        <p class="text-xs text-gray-500 min-w-0">{{ binaural.nombre }} ({{ metodo }})</p>
        <p class="text-base font-bold text-gray-900 whitespace-nowrap">{{ binaural.valor ?? '—' }} %</p>
      </div>
    </div>
  </div>
</template>
