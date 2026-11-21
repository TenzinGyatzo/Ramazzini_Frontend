<script setup>
import { useValorDePartida } from '@/composables/useValorDePartida';
import { ref, watch, onMounted, computed, toRefs, nextTick } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
  NOTA_MEDICA_CEX_RANGES,
  NOTA_MEDICA_CEX_SENTINEL,
  NOTA_MEDICA_CEX_MESSAGES,
  isBlankOrZero,
  isExplicitCexUnknown,
  mensajeErrorCexField,
} from '@/helpers/notaMedicaCexRanges';

import { useAutofocoPrimerVacio } from '@/composables/useAutofocoPrimerVacio';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { CLASE_AYUDA } from '@/components/steps/captura/estiloCaptura';
import NumeroCaptura from '@/components/steps/captura/NumeroCaptura.vue';

// Al abrir el paso, el cursor va al primer signo vital vacío (los marcados «Se desconoce»
// quedan desactivados y se saltan)
useAutofocoPrimerVacio([
  'tensionArterialSistolica',
  'tensionArterialDiastolica',
  'frecuenciaCardiaca',
  'frecuenciaRespiratoria',
  'temperatura',
  'saturacionOxigeno',
]);

const partida = useValorDePartida();
const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();

const tensionArterialSistolica = ref(null);
const tensionArterialDiastolica = ref(null);
const frecuenciaCardiaca = ref(null);
const frecuenciaRespiratoria = ref(null);
const temperatura = ref(null);
const saturacionOxigeno = ref(null);

const seDesconoceSistolica = ref(false);
const seDesconoceDiastolica = ref(false);
const seDesconoceFrecuenciaCardiaca = ref(false);
const seDesconoceFrecuenciaRespiratoria = ref(false);
const seDesconoceTemperatura = ref(false);
const seDesconoceSaturacionOxigeno = ref(false);

function getValFromSource(field) {
  const formVal = formDataNotaMedica[field];
  const docVal = documentos.currentDocument?.[field];
  if (formVal !== undefined && formVal !== null) return formVal;
  if (docVal !== undefined && docVal !== null) return docVal;
  return undefined;
}

function resolveInitial(field, saved) {
  if (saved === undefined || saved === null || saved === '') {
    // Documento existente sin el campo → ya quedó como desconocido; alta nueva → vacío
    if (documentos.currentDocument) {
      return { seDesconoce: true, display: null };
    }
    return { seDesconoce: false, display: null };
  }
  if (isExplicitCexUnknown(field, saved)) {
    return { seDesconoce: true, display: null };
  }
  return { seDesconoce: false, display: Number(saved) };
}

function toPersistedValue(field, seDesconoce, display) {
  if (seDesconoce) return NOTA_MEDICA_CEX_SENTINEL[field];
  if (isBlankOrZero(display)) return null;
  return Number(display);
}

function syncFormData() {
  formDataNotaMedica.tensionArterialSistolica = toPersistedValue(
    'tensionArterialSistolica',
    seDesconoceSistolica.value,
    tensionArterialSistolica.value,
  );
  formDataNotaMedica.tensionArterialDiastolica = toPersistedValue(
    'tensionArterialDiastolica',
    seDesconoceDiastolica.value,
    tensionArterialDiastolica.value,
  );
  formDataNotaMedica.frecuenciaCardiaca = toPersistedValue(
    'frecuenciaCardiaca',
    seDesconoceFrecuenciaCardiaca.value,
    frecuenciaCardiaca.value,
  );
  formDataNotaMedica.frecuenciaRespiratoria = toPersistedValue(
    'frecuenciaRespiratoria',
    seDesconoceFrecuenciaRespiratoria.value,
    frecuenciaRespiratoria.value,
  );
  formDataNotaMedica.temperatura = toPersistedValue(
    'temperatura',
    seDesconoceTemperatura.value,
    temperatura.value,
  );
  formDataNotaMedica.saturacionOxigeno = toPersistedValue(
    'saturacionOxigeno',
    seDesconoceSaturacionOxigeno.value,
    saturacionOxigeno.value,
  );
}

// Vacío → «Se desconoce» ya no se aplica al salir del paso, sino al guardar
// (prepararNotaMedicaParaGuardar). Si eso ocurre con el paso a la vista, la casilla lo refleja.
const casillaPorCampo = {
  tensionArterialSistolica: seDesconoceSistolica,
  tensionArterialDiastolica: seDesconoceDiastolica,
  frecuenciaCardiaca: seDesconoceFrecuenciaCardiaca,
  frecuenciaRespiratoria: seDesconoceFrecuenciaRespiratoria,
  temperatura: seDesconoceTemperatura,
  saturacionOxigeno: seDesconoceSaturacionOxigeno,
};
for (const [campo, casilla] of Object.entries(casillaPorCampo)) {
  watch(
    () => formDataNotaMedica[campo],
    (valor) => {
      if (valor === NOTA_MEDICA_CEX_SENTINEL[campo] && !casilla.value) casilla.value = true;
    },
  );
}

onMounted(() => {
  const fields = [
    { key: 'tensionArterialSistolica', ref: tensionArterialSistolica, seDesconoce: seDesconoceSistolica },
    { key: 'tensionArterialDiastolica', ref: tensionArterialDiastolica, seDesconoce: seDesconoceDiastolica },
    { key: 'frecuenciaCardiaca', ref: frecuenciaCardiaca, seDesconoce: seDesconoceFrecuenciaCardiaca },
    { key: 'frecuenciaRespiratoria', ref: frecuenciaRespiratoria, seDesconoce: seDesconoceFrecuenciaRespiratoria },
    { key: 'temperatura', ref: temperatura, seDesconoce: seDesconoceTemperatura },
    { key: 'saturacionOxigeno', ref: saturacionOxigeno, seDesconoce: seDesconoceSaturacionOxigeno },
  ];
  for (const { key, ref: r, seDesconoce } of fields) {
    const { seDesconoce: unk, display } = resolveInitial(key, getValFromSource(key));
    seDesconoce.value = unk;
    r.value = display;
  }
  if (seDesconoceSistolica.value || seDesconoceDiastolica.value) {
    seDesconoceSistolica.value = true;
    seDesconoceDiastolica.value = true;
    tensionArterialSistolica.value = null;
    tensionArterialDiastolica.value = null;
  }
  syncFormData();
});

/** Evita bucles al forzar pareja TA 0/0. */
let syncingTaPareja = false;

function endSyncingTaPareja() {
  nextTick(() => {
    syncingTaPareja = false;
  });
}

/** CEX: si una presión es desconocida, ambas deben serlo. */
function forzarTaDesconocida() {
  if (syncingTaPareja) return;
  syncingTaPareja = true;
  seDesconoceSistolica.value = true;
  seDesconoceDiastolica.value = true;
  tensionArterialSistolica.value = null;
  tensionArterialDiastolica.value = null;
  syncFormData();
  endSyncingTaPareja();
}

function limpiarTaParaCaptura() {
  if (syncingTaPareja) return;
  syncingTaPareja = true;
  seDesconoceSistolica.value = false;
  seDesconoceDiastolica.value = false;
  tensionArterialSistolica.value = null;
  tensionArterialDiastolica.value = null;
  syncFormData();
  endSyncingTaPareja();
}

watch(seDesconoceSistolica, (v) => {
  if (syncingTaPareja) return;
  if (v) forzarTaDesconocida();
  else limpiarTaParaCaptura();
});
watch(seDesconoceDiastolica, (v) => {
  if (syncingTaPareja) return;
  if (v) forzarTaDesconocida();
  else limpiarTaParaCaptura();
});

// Si el usuario escribe 0 en un campo, el otro pasa a desconocido de inmediato
watch(tensionArterialSistolica, (v) => {
  if (syncingTaPareja || seDesconoceSistolica.value) return;
  if (v === 0) forzarTaDesconocida();
});
watch(tensionArterialDiastolica, (v) => {
  if (syncingTaPareja || seDesconoceDiastolica.value) return;
  if (v === 0) forzarTaDesconocida();
});

watch(seDesconoceFrecuenciaCardiaca, (v) => {
  if (v) frecuenciaCardiaca.value = null;
});
watch(seDesconoceFrecuenciaRespiratoria, (v) => {
  if (v) frecuenciaRespiratoria.value = null;
});
watch(seDesconoceTemperatura, (v) => {
  if (v) temperatura.value = null;
});
watch(seDesconoceSaturacionOxigeno, (v) => {
  if (v) saturacionOxigeno.value = null;
});

watch(
  [
    seDesconoceSistolica,
    seDesconoceDiastolica,
    tensionArterialSistolica,
    tensionArterialDiastolica,
  ],
  syncFormData,
);
watch(
  [
    seDesconoceFrecuenciaCardiaca,
    seDesconoceFrecuenciaRespiratoria,
    frecuenciaCardiaca,
    frecuenciaRespiratoria,
  ],
  syncFormData,
);
watch(
  [seDesconoceTemperatura, seDesconoceSaturacionOxigeno, temperatura, saturacionOxigeno],
  syncFormData,
);

const mensajeErrorTensionSistolica = computed(() => {
  if (seDesconoceSistolica.value) return '';
  const rangeErr = mensajeErrorCexField(
    'tensionArterialSistolica',
    tensionArterialSistolica.value,
  );
  if (rangeErr) return rangeErr;
  const s = Number(tensionArterialSistolica.value);
  const d = Number(tensionArterialDiastolica.value);
  if (s > 0 && d > 0 && s < d) return NOTA_MEDICA_CEX_MESSAGES.taRelacion;
  return '';
});

const mensajeErrorTensionDiastolica = computed(() =>
  mensajeErrorCexField(
    'tensionArterialDiastolica',
    tensionArterialDiastolica.value,
    seDesconoceDiastolica.value,
  ),
);

const mensajeErrorFrecuenciaCardiaca = computed(() =>
  mensajeErrorCexField(
    'frecuenciaCardiaca',
    frecuenciaCardiaca.value,
    seDesconoceFrecuenciaCardiaca.value,
  ),
);

const mensajeErrorFrecuenciaRespiratoria = computed(() =>
  mensajeErrorCexField(
    'frecuenciaRespiratoria',
    frecuenciaRespiratoria.value,
    seDesconoceFrecuenciaRespiratoria.value,
  ),
);

const mensajeErrorTempertura = computed(() =>
  mensajeErrorCexField('temperatura', temperatura.value, seDesconoceTemperatura.value),
);

const mensajeErrorSaturacionOxigeno = computed(() =>
  mensajeErrorCexField(
    'saturacionOxigeno',
    saturacionOxigeno.value,
    seDesconoceSaturacionOxigeno.value,
  ),
);

const ranges = NOTA_MEDICA_CEX_RANGES;

// Punto 38: los seis campos con el mismo diseño en los dos modos (unidad dentro del campo).
// En captura rápida van en pares a lo ancho; en el asistente, en dos columnas angostas con
// la etiqueta corta y «Se desconoce» debajo.
const capturaRapida = enCapturaRapida();
const signos = [
  { campo: 'tensionArterialSistolica', etiqueta: 'Presión sistólica', corta: 'Sistólica', unidad: 'mmHg', step: '1', placeholder: '50-300', valor: tensionArterialSistolica, seDesconoce: seDesconoceSistolica, error: mensajeErrorTensionSistolica },
  { campo: 'tensionArterialDiastolica', etiqueta: 'Presión diastólica', corta: 'Diastólica', unidad: 'mmHg', step: '1', placeholder: '20-200', valor: tensionArterialDiastolica, seDesconoce: seDesconoceDiastolica, error: mensajeErrorTensionDiastolica },
  { campo: 'frecuenciaCardiaca', etiqueta: 'Frecuencia cardiaca', corta: 'Frec. cardiaca', unidad: 'lpm', step: '1', placeholder: '40-220', valor: frecuenciaCardiaca, seDesconoce: seDesconoceFrecuenciaCardiaca, error: mensajeErrorFrecuenciaCardiaca },
  { campo: 'frecuenciaRespiratoria', etiqueta: 'Frecuencia respiratoria', corta: 'Frec. respiratoria', unidad: 'rpm', step: '1', placeholder: '10-99', valor: frecuenciaRespiratoria, seDesconoce: seDesconoceFrecuenciaRespiratoria, error: mensajeErrorFrecuenciaRespiratoria },
  { campo: 'temperatura', etiqueta: 'Temperatura', corta: 'Temperatura', unidad: '°C', step: '0.1', placeholder: '30-44', valor: temperatura, seDesconoce: seDesconoceTemperatura, error: mensajeErrorTempertura },
  { campo: 'saturacionOxigeno', etiqueta: 'Saturación de oxígeno', corta: 'Saturación O₂', unidad: '%', step: '1', placeholder: '1-100', valor: saturacionOxigeno, seDesconoce: seDesconoceSaturacionOxigeno, error: mensajeErrorSaturacionOxigeno },
];
</script>

<template>
  <div class="nota-medica-dark-inputs">
    <h2
      v-if="variant !== 'compact'"
      class="text-2xl font-bold text-gray-900 mb-4 uppercase"
    >
      Signos Vitales
    </h2>
    <p :class="[CLASE_AYUDA, 'mb-3']">Marque «Se desconoce» si no se registró el dato.</p>
    <div
      :class="[
        'grid',
        capturaRapida ? 'grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4' : 'grid-cols-2 gap-x-3 gap-y-3',
      ]"
    >
      <NumeroCaptura
        v-for="s in signos"
        :id="s.campo"
        :key="s.campo"
        v-model="s.valor.value"
        v-model:se-desconoce="s.seDesconoce.value"
        :data-campo="s.campo"
        :etiqueta="s.etiqueta"
        :etiqueta-corta="s.corta"
        :unidad="s.unidad"
        obligatorio
        con-se-desconoce
        :step="s.step"
        :placeholder="s.placeholder"
        :min="ranges[s.campo].min"
        :max="ranges[s.campo].max"
        :error="s.error.value"
        :partida="partida(s.campo)"
      />
    </div>
  </div>
</template>
