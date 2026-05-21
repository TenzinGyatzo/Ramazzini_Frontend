<script setup>
import { computed, onMounted, ref } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import {
  aplicarIteracionDosAlFormulario,
  calcularSugerenciaRiesgoLongitudinal,
} from '@/helpers/informeLongitudinalOperativo';
import { NIVEL_RIESGO_LONGITUDINAL } from '@/helpers/informeLongitudinalCardiometabolicoOptions';

const store = useFormDataStore();
const fm = computed(() => store.formDataInformeLongitudinalCardiometabolico);

const sugerencia = ref({
  nivelRiesgoLongitudinal: undefined,
  interpretacionRiesgoLongitudinal: undefined,
});

const AURA = {
  ok: {
    ring: 'border-emerald-200',
    bg: 'bg-emerald-50/80',
    lab: 'text-emerald-900/80',
    texto: 'text-emerald-600',
    btn: 'border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100',
    btnOn: 'border-emerald-600 bg-emerald-600 text-white ring-2 ring-emerald-300',
  },
  warn: {
    ring: 'border-amber-200',
    bg: 'bg-amber-50/80',
    lab: 'text-amber-900/80',
    texto: 'text-amber-600',
    btn: 'border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100',
    btnOn: 'border-amber-600 bg-amber-600 text-white ring-2 ring-amber-300',
  },
  bad: {
    ring: 'border-red-200',
    bg: 'bg-red-50/80',
    lab: 'text-red-900/80',
    texto: 'text-red-600',
    btn: 'border-red-300 bg-red-50 text-red-950 hover:bg-red-100',
    btnOn: 'border-red-600 bg-red-600 text-white ring-2 ring-red-300',
  },
  neutral: {
    ring: 'border-slate-200',
    bg: 'bg-slate-50/90',
    lab: 'text-slate-700',
    texto: 'text-slate-600',
    btn: 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    btnOn: 'border-slate-600 bg-slate-700 text-white ring-2 ring-slate-300',
  },
};

function tonoRiesgoLongitudinal(nivel) {
  const s = nivel == null ? '' : String(nivel).trim();
  if (!s) return 'neutral';
  if (s === 'Muy Bajo' || s === 'Bajo') return 'ok';
  if (s === 'Moderado') return 'warn';
  if (s === 'Alto' || s === 'Crítico') return 'bad';
  return 'neutral';
}

function estiloBotonRiesgo(nivel, seleccionado) {
  const t = tonoRiesgoLongitudinal(nivel);
  const a = AURA[t];
  const tamTexto = nivel === 'No valorable' ? 'text-xs leading-snug' : 'text-sm';
  const base = `rounded-lg border px-3 py-2.5 ${tamTexto} font-semibold text-center transition-colors duration-150 cursor-pointer`;
  return seleccionado ? `${base} ${a.btnOn}` : `${base} ${a.btn}`;
}

function etiquetaNivelLegible(nivel) {
  const s = nivel == null ? '' : String(nivel).trim();
  return s || 'No valorable';
}

function claseTextoRiesgo(nivel) {
  const t = tonoRiesgoLongitudinal(etiquetaNivelLegible(nivel));
  return `font-semibold ${AURA[t].texto}`;
}

const nivelesRiesgoOpciones = NIVEL_RIESGO_LONGITUDINAL;

const nivelSugeridoLegible = computed(() =>
  etiquetaNivelLegible(sugerencia.value.nivelRiesgoLongitudinal),
);

const nivelSeleccionadoLegible = computed(() =>
  etiquetaNivelLegible(fm.value.nivelRiesgoLongitudinal),
);

function textoVacio(s) {
  return s == null || String(s).trim() === '';
}

function recalcularSugerencia() {
  aplicarIteracionDosAlFormulario(store.formDataInformeLongitudinalCardiometabolico, {
    recalcDatosFaltantes: true,
    preservarJuicioClinicoRiesgo: true,
  });
  const s = calcularSugerenciaRiesgoLongitudinal(store.formDataInformeLongitudinalCardiometabolico);
  sugerencia.value = {
    nivelRiesgoLongitudinal: s.nivelRiesgoLongitudinal,
    interpretacionRiesgoLongitudinal: s.interpretacionRiesgoLongitudinal,
  };
}

function prellenarSiVacio() {
  const f = store.formDataInformeLongitudinalCardiometabolico;
  if (textoVacio(f.nivelRiesgoLongitudinal) && sugerencia.value.nivelRiesgoLongitudinal) {
    f.nivelRiesgoLongitudinal = sugerencia.value.nivelRiesgoLongitudinal;
  }
  if (textoVacio(f.interpretacionRiesgoLongitudinal) && sugerencia.value.interpretacionRiesgoLongitudinal) {
    f.interpretacionRiesgoLongitudinal = sugerencia.value.interpretacionRiesgoLongitudinal;
  }
}

onMounted(() => {
  const f = store.formDataInformeLongitudinalCardiometabolico;
  if (f.consistenciaSeguimiento === '') f.consistenciaSeguimiento = undefined;
  if (f.nivelRiesgoLongitudinal === '') f.nivelRiesgoLongitudinal = undefined;
  if (f.tendenciaLongitudinal === '') f.tendenciaLongitudinal = undefined;
  recalcularSugerencia();
  prellenarSiVacio();
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Riesgo e interpretación</h1>

    <div class="max-w-4xl space-y-2">
      <label for="interpretacion-riesgo-ilc" class="text-sm font-medium text-gray-700 mb-1 block">
        Riesgo longitudinal:
      </label>
      <!-- Decisión del médico -->
      <section class="space-y-4" aria-labelledby="titulo-decision-medico">
        <fieldset>
          <legend class="sr-only">Riesgo longitudinal</legend>
          <div
            class="grid grid-cols-2 sm:grid-cols-3 gap-2"
            role="radiogroup"
            aria-label="Riesgo longitudinal"
          >
            <label
              v-for="nivel in nivelesRiesgoOpciones"
              :key="nivel"
              :class="estiloBotonRiesgo(nivel, fm.nivelRiesgoLongitudinal === nivel)"
            >
              <input
                v-model="fm.nivelRiesgoLongitudinal"
                type="radio"
                class="sr-only"
                :value="nivel"
                name="nivelRiesgoLongitudinal"
              />
              {{ nivel }}
            </label>
          </div>
        </fieldset>

        <div class="mb-2 grid grid-cols-2 gap-2">
          <div>
            <p class="text-sm text-gray-700">Sugerido:</p>
            <p :class="claseTextoRiesgo(sugerencia.nivelRiesgoLongitudinal)">{{ nivelSugeridoLegible }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-700">Seleccionado:</p>
            <p :class="claseTextoRiesgo(fm.nivelRiesgoLongitudinal)">{{ nivelSeleccionadoLegible }}</p>
          </div>
        </div>

        <div>
          <label for="interpretacion-riesgo-ilc" class="text-sm font-medium text-gray-700 mb-1 block">
            Interpretación del riesgo
          </label>
          <textarea
            id="interpretacion-riesgo-ilc"
            v-model="fm.interpretacionRiesgoLongitudinal"
            rows="10"
            class="w-full text-sm text-gray-800 border border-gray-300 rounded-md p-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 min-h-[8rem]"
            placeholder="Redacte o ajuste la interpretación clínica del riesgo para este periodo…"
          />
        </div>
      </section>
    </div>
  </div>
</template>
