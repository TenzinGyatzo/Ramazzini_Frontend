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

// Al abrir el paso, el cursor queda en 125 Hz: se escribe y se avanza con Tab (en la captura
// rápida no se mueve el cursor al abrir)
useAutofocoPrimerVacio([campoUmbral(props.lado, 125)], { siempreElPrimero: true });

const titulo = computed(() => (props.lado === 'Derecho' ? 'Oído derecho' : 'Oído izquierdo'));
const siglas = computed(() => (props.lado === 'Derecho' ? 'OD' : 'OI'));

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
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="mb-4 text-sm text-gray-800 leading-5">
      <span class="text-xl font-bold uppercase">{{ titulo }}</span> - Valores Audiométricos
    </h1>
    <p v-else class="text-sm font-semibold text-gray-800 mb-2">{{ titulo }}</p>

    <div class="mb-4">
      <p v-if="variant !== 'compact'" class="font-medium mb-3 text-gray-700 leading-5">
        Ingrese los umbrales auditivos en decibeles (dB) para cada frecuencia:
      </p>
      <IndicacionTab v-if="variant !== 'compact'" class="mb-3" />

      <!-- Tantas columnas como quepan (en el asistente angosto, 2) -->
      <div class="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2">
        <div
          v-for="f in FRECUENCIAS_AUDIOMETRIA"
          :key="f"
          :data-campo="campoUmbral(lado, f)"
          class="bg-gray-50 border border-gray-300 rounded p-2"
        >
          <div class="text-center">
            <label :for="campoUmbral(lado, f)" class="block text-sm font-semibold text-gray-800 mb-1">{{ f }} Hz</label>
            <div class="flex items-center justify-center gap-1.5">
              <input
                :id="campoUmbral(lado, f)"
                v-valor-de-partida="0"
                type="number"
                :name="campoUmbral(lado, f)"
                :value="valor(f)"
                :class="[
                  'w-full p-1 text-center border rounded text-base text-emerald-700 focus:outline-none focus:ring-1 transition-all duration-300',
                  corregidos[f]
                    ? 'border-yellow-400 bg-yellow-50 focus:border-yellow-500 focus:ring-yellow-500'
                    : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-500',
                ]"
                min="-10"
                max="110"
                step="5"
                @input="alEscribir(f, ($event.target as HTMLInputElement).value)"
                @focus="seleccionar"
                @blur="alSalir(f)"
              />
              <span class="text-sm text-gray-500">dB</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Porcentaje de pérdida de este oído -->
      <div class="w-1/2 mx-auto mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <div class="flex items-center justify-evenly">
          <p class="text-sm font-medium text-emerald-800">
            {{ metodo === 'AMA' ? 'Pérdida Monoaural' : 'Índice de Fletcher' }} <br />({{ metodo }})
          </p>
          <span
            class="text-xl font-bold text-emerald-800"
            :title="
              metodo === 'AMA'
                ? 'Pérdida monaural (%) = max(0,(PTA-25))*1.5. Frecuencias 500–3000 Hz.'
                : 'Índice de Fletcher (%) = PTA*0.8. Se elige Rango A (250–2000) o B (2000–6000) que produzca mayor pérdida.'
            "
          >
            {{ resultado ? `${resultado.porcentaje}%` : '—' }}
          </span>
        </div>
      </div>
      <p v-if="resultado" class="w-full mt-2 text-center text-xs text-gray-600">
        Frecuencias usadas {{ siglas }}: [{{ resultado.frecuencias.join(', ') }}] Hz{{
          resultado.rango ? ` (Rango ${resultado.rango})` : ''
        }}
      </p>
    </div>
  </div>
</template>
