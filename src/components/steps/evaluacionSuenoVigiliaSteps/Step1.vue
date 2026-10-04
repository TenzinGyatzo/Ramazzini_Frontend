<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';
import {
  CALIDADES_GENERALES_SUENO,
  HORARIOS_LABORALES_SUENO_VIGILIA,
  INSTRUCCION_SUENO_VIGILIA,
} from '@/helpers/evaluacionSuenoVigilia';

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const { formDataEvaluacionSuenoVigilia } = useFormDataStore();
const documentos = useDocumentosStore();
const { fechaDocumentoMax, fechaDocumentoMin } = useSiresDocumentDateMax();

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

onMounted(() => {
  if (documentos.currentDocument) {
    fechaEvaluacionSuenoVigilia.value = formatDateYYYYMMDD(documentos.currentDocument.fechaEvaluacionSuenoVigilia || today);
  } else if (formDataEvaluacionSuenoVigilia.fechaEvaluacionSuenoVigilia) {
    // Documento nuevo y se regresó al paso 1: conservar la fecha ya elegida
    fechaEvaluacionSuenoVigilia.value = formatDateYYYYMMDD(formDataEvaluacionSuenoVigilia.fechaEvaluacionSuenoVigilia);
  }

  // Establece idTrabajador en formData
  formDataEvaluacionSuenoVigilia.idTrabajador = trabajadores.currentTrabajadorId;

  // Establece rutaPDF en formData cuando aun no se ha seleccionado la fecha
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataEvaluacionSuenoVigilia.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

onUnmounted(() => {
  // Asegurar que formData tenga un valor inicial para la fecha
  if (!formDataEvaluacionSuenoVigilia.fechaEvaluacionSuenoVigilia) {
    formDataEvaluacionSuenoVigilia.fechaEvaluacionSuenoVigilia = today;
  }
});

// Inicializar la referencia local sincronizada con formData
const fechaEvaluacionSuenoVigilia = ref(today);

// Mantener sincronizados los valores
watch(fechaEvaluacionSuenoVigilia, (newValue) => {
  formDataEvaluacionSuenoVigilia.fechaEvaluacionSuenoVigilia = newValue;
});

/**
 * Las horas de sueño se capturan como horas y minutos y se guardan en minutos.
 * Sin horas capturadas no hay dato: el campo no tiene valor por defecto.
 */
const minutosGuardados = () => formDataEvaluacionSuenoVigilia.minutosSuenoDiarios;

const guardarSueno = (horas, minutos) => {
  if (horas === '' || horas == null || !Number.isFinite(Number(horas))) {
    delete formDataEvaluacionSuenoVigilia.minutosSuenoDiarios;
    return;
  }
  const h = Math.min(24, Math.max(0, Math.trunc(Number(horas))));
  const m = h === 24 ? 0 : Math.min(59, Math.max(0, Math.trunc(Number(minutos) || 0)));
  formDataEvaluacionSuenoVigilia.minutosSuenoDiarios = h * 60 + m;
};

const horasSueno = computed({
  get: () => (minutosGuardados() == null ? '' : Math.floor(minutosGuardados() / 60)),
  set: (valor) => guardarSueno(valor, minutosGuardados() == null ? 0 : minutosGuardados() % 60),
});

const minutosSueno = computed({
  get: () => (minutosGuardados() == null ? '' : minutosGuardados() % 60),
  set: (valor) => guardarSueno(minutosGuardados() == null ? '' : Math.floor(minutosGuardados() / 60), valor),
});

const elegir = (campo, valor) => {
  formDataEvaluacionSuenoVigilia[campo] = valor;
};

const claseOpcion = (seleccionada) => [
  'px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all duration-150 ease-in-out',
  seleccionada
    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
    : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50/50',
];

const claseInput =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Evaluación de sueño y vigilia</h1>
    <p class="text-xs italic text-gray-500">Instrumento propio de tamizaje inicial. Se aplica por entrevista.</p>

    <div class="mt-6">
      <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha de aplicación</h2>
      <FormKit
        type="date"
        name="fechaEvaluacionSuenoVigilia"
        placeholder="Seleccione una fecha"
        :min="fechaDocumentoMin"
        :max="fechaDocumentoMax"
        v-model="fechaEvaluacionSuenoVigilia"
      />
    </div>

    <div class="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
      <p class="text-xs font-semibold uppercase tracking-wide text-emerald-800">Leer al trabajador</p>
      <p class="mt-1 text-sm text-gray-700 leading-snug">{{ INSTRUCCION_SUENO_VIGILIA }}</p>
    </div>

    <div class="mt-5 space-y-4">
      <div data-pregunta="minutosSuenoDiarios">
        <p class="text-sm font-medium text-gray-800">¿Cuánto duerme por cada 24 horas, incluyendo siestas?</p>
        <div class="mt-1.5 grid grid-cols-2 gap-3 max-w-xs">
          <label class="text-xs text-gray-600">
            Horas
            <input
              v-model="horasSueno"
              type="number"
              min="0"
              max="24"
              step="1"
              inputmode="numeric"
              data-skip-validation
              :class="claseInput"
            />
          </label>
          <label class="text-xs text-gray-600">
            Minutos
            <input
              v-model="minutosSueno"
              type="number"
              min="0"
              max="59"
              step="5"
              inputmode="numeric"
              data-skip-validation
              :disabled="horasSueno === ''"
              :class="[claseInput, horasSueno === '' ? 'bg-gray-100 text-gray-400' : '']"
            />
          </label>
        </div>
      </div>

      <div data-pregunta="horarioLaboral">
        <p class="mb-1.5 text-sm font-medium text-gray-800">Horario laboral</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opcion in HORARIOS_LABORALES_SUENO_VIGILIA"
            :key="opcion"
            type="button"
            :class="claseOpcion(formDataEvaluacionSuenoVigilia.horarioLaboral === opcion)"
            :aria-pressed="formDataEvaluacionSuenoVigilia.horarioLaboral === opcion"
            @click="elegir('horarioLaboral', opcion)"
          >
            {{ opcion }}
          </button>
        </div>
      </div>

      <div data-pregunta="calidadGeneralSueno">
        <p class="mb-1.5 text-sm font-medium text-gray-800">En general, ¿cómo calificaría la calidad de su sueño?</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opcion in CALIDADES_GENERALES_SUENO"
            :key="opcion"
            type="button"
            :class="claseOpcion(formDataEvaluacionSuenoVigilia.calidadGeneralSueno === opcion)"
            :aria-pressed="formDataEvaluacionSuenoVigilia.calidadGeneralSueno === opcion"
            @click="elegir('calidadGeneralSueno', opcion)"
          >
            {{ opcion }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
