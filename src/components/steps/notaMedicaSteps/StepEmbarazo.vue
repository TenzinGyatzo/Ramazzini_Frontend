<script setup>
import { ref, watch, onMounted, computed, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { calcularEdad } from '@/helpers/dates';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import OpcionesSegmentadas from '@/components/steps/captura/OpcionesSegmentadas.vue';
import { CLASE_ERROR, CLASE_ETIQUETA } from '@/components/steps/captura/estiloCaptura';

// Punto 38, un solo diseño para los dos modos (acomodo según el modo): las dos preguntas en una fila
const capturaRapida = enCapturaRapida();
const OPCIONES_RELACION = [
  { valor: -1, etiqueta: 'No aplica' },
  { valor: 0, etiqueta: 'Primera vez' },
  { valor: 1, etiqueta: 'Subsecuente' },
];
const OPCIONES_TRIMESTRE = [
  { valor: 1, etiqueta: 'Primero' },
  { valor: 2, etiqueta: 'Segundo' },
  { valor: 3, etiqueta: 'Tercero' },
];

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
const trabajadores = useTrabajadoresStore();

const relacionTemporalEmbarazo = ref(-1);
const trimestreGestacional = ref(-1);

function getValFromSource(field, defaultVal) {
  const formVal = formDataNotaMedica[field];
  const docVal = documentos.currentDocument?.[field];
  if (formVal !== undefined && formVal !== null) return formVal;
  if (docVal !== undefined && docVal !== null) return docVal;
  return defaultVal;
}

function syncFormData() {
  formDataNotaMedica.relacionTemporalEmbarazo = relacionTemporalEmbarazo.value;
  if (relacionTemporalEmbarazo.value === -1) {
    trimestreGestacional.value = -1;
  }
  formDataNotaMedica.trimestreGestacional = trimestreGestacional.value;
}

function aplicarNoAplicaPorEdad() {
  relacionTemporalEmbarazo.value = -1;
  trimestreGestacional.value = -1;
  syncFormData();
}

const edadTrabajadora = computed(() => {
  const fechaNac = trabajadores.currentTrabajador?.fechaNacimiento;
  if (!fechaNac) return null;
  return calcularEdad(fechaNac, formDataNotaMedica.fechaNotaMedica ?? undefined);
});

const edadFueraDeRango = computed(() => {
  const edad = edadTrabajadora.value;
  if (edad == null) return false;
  return edad < 9 || edad > 59;
});

const muestraTrimestre = computed(
  () => !edadFueraDeRango.value && relacionTemporalEmbarazo.value !== -1,
);

const trimestreIncompleto = computed(
  () =>
    !edadFueraDeRango.value &&
    muestraTrimestre.value &&
    ![1, 2, 3].includes(trimestreGestacional.value),
);

function claseOpcionRelacion(valor) {
  const seleccionado = relacionTemporalEmbarazo.value === valor;
  if (edadFueraDeRango.value) {
    return seleccionado
      ? 'border-emerald-600 bg-emerald-50 cursor-not-allowed opacity-90 dark:bg-emerald-950/50 dark:border-emerald-500'
      : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500';
  }
  return seleccionado
    ? 'border-emerald-600 bg-emerald-50 shadow-md cursor-pointer dark:bg-emerald-950/50 dark:border-emerald-500'
    : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 cursor-pointer dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30';
}

onMounted(() => {
  if (edadFueraDeRango.value) {
    aplicarNoAplicaPorEdad();
    return;
  }
  relacionTemporalEmbarazo.value = getValFromSource('relacionTemporalEmbarazo', -1);
  trimestreGestacional.value = getValFromSource('trimestreGestacional', -1);
  syncFormData();
});

watch(relacionTemporalEmbarazo, () => {
  if (edadFueraDeRango.value) return;
  if (relacionTemporalEmbarazo.value === -1) {
    trimestreGestacional.value = -1;
  }
  syncFormData();
});

watch(trimestreGestacional, () => {
  if (edadFueraDeRango.value) return;
  syncFormData();
});

watch(edadFueraDeRango, (fuera) => {
  if (fuera) aplicarNoAplicaPorEdad();
});

</script>

<template>
  <div class="nota-medica-dark-inputs">
    <h2
      v-if="variant !== 'compact'"
      class="text-2xl font-bold text-gray-900 mb-4 uppercase"
    >
      Embarazo
    </h2>
    <p v-if="edadFueraDeRango" class="text-xs text-amber-700 mb-3 flex items-start gap-1.5">
      <i class="fas fa-info-circle mt-0.5" aria-hidden="true"></i>
      La edad de la trabajadora está fuera del rango 9–59 años. Se registrará como «No aplica».
    </p>
    <div class="flex flex-wrap gap-x-8 gap-y-4">
      <div data-campo="relacionTemporalEmbarazo">
        <p :class="[CLASE_ETIQUETA, 'mb-1']">Relación temporal del embarazo</p>
        <fieldset :disabled="edadFueraDeRango" :class="['border-0 p-0 m-0 min-w-0', edadFueraDeRango ? 'opacity-60' : '']">
          <OpcionesSegmentadas
            v-model="relacionTemporalEmbarazo"
            name="relacionTemporalEmbarazo"
            etiqueta="Relación temporal del embarazo"
            :opciones="OPCIONES_RELACION"
          />
        </fieldset>
      </div>
      <div v-if="muestraTrimestre" data-campo="trimestreGestacional">
        <p :class="[CLASE_ETIQUETA, 'mb-1']">Trimestre gestacional <span class="text-red-500">*</span></p>
        <OpcionesSegmentadas
          v-model="trimestreGestacional"
          name="trimestreGestacional"
          etiqueta="Trimestre gestacional"
          :opciones="OPCIONES_TRIMESTRE"
        />
        <p v-if="trimestreIncompleto" :class="CLASE_ERROR">Seleccione el trimestre gestacional.</p>
      </div>
    </div>
  </div>
</template>
