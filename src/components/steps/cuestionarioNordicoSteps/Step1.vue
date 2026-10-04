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
import { MANO_DOMINANTE_NORDICO } from '@/helpers/cuestionarioNordico';

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const { formDataCuestionarioNordico } = useFormDataStore();
const documentos = useDocumentosStore();
const { fechaDocumentoMax, fechaDocumentoMin } = useSiresDocumentDateMax();

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

onMounted(() => {
  if (documentos.currentDocument) {
    fechaCuestionarioNordico.value = formatDateYYYYMMDD(documentos.currentDocument.fechaCuestionarioNordico || today);
  } else if (formDataCuestionarioNordico.fechaCuestionarioNordico) {
    // Documento nuevo y se regresó al paso 1: conservar la fecha ya elegida
    fechaCuestionarioNordico.value = formatDateYYYYMMDD(formDataCuestionarioNordico.fechaCuestionarioNordico);
  }

  // Establece idTrabajador en formData
  formDataCuestionarioNordico.idTrabajador = trabajadores.currentTrabajadorId;

  // Establece rutaPDF en formData cuando aun no se ha seleccionado la fecha
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataCuestionarioNordico.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

onUnmounted(() => {
  // Asegurar que formData tenga un valor inicial para la fecha
  if (!formDataCuestionarioNordico.fechaCuestionarioNordico) {
    formDataCuestionarioNordico.fechaCuestionarioNordico = today;
  }
});

// Inicializar la referencia local sincronizada con formData
const fechaCuestionarioNordico = ref(today);

// Mantener sincronizados los valores
watch(fechaCuestionarioNordico, (newValue) => {
  formDataCuestionarioNordico.fechaCuestionarioNordico = newValue;
});

/** Campo numérico opcional: vacío = sin dato (no se envía), acotado a [min, max]. */
const campoNumerico = (campo, min, max, entero = true) =>
  computed({
    get: () => formDataCuestionarioNordico[campo] ?? '',
    set: (valor) => {
      const numero = Number(valor);
      if (valor === '' || valor == null || !Number.isFinite(numero)) {
        delete formDataCuestionarioNordico[campo];
        return;
      }
      const acotado = Math.min(max, Math.max(min, numero));
      formDataCuestionarioNordico[campo] = entero ? Math.trunc(acotado) : acotado;
    },
  });

const antiguedadActividadAnios = campoNumerico('antiguedadActividadAnios', 0, 80);
const antiguedadActividadMeses = campoNumerico('antiguedadActividadMeses', 0, 11);
const horasTrabajoSemana = campoNumerico('horasTrabajoSemana', 0, 168, false);

const manoDominante = computed({
  get: () => formDataCuestionarioNordico.manoDominante ?? '',
  set: (valor) => {
    if (valor) formDataCuestionarioNordico.manoDominante = valor;
    else delete formDataCuestionarioNordico.manoDominante;
  },
});

const claseInput =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Cuestionario Nórdico</h1>
    <p class="text-xs italic text-gray-500">
      Cuestionario Nórdico de Kuorinka: percepción de síntomas musculoesqueléticos.
    </p>

    <div class="mt-6">
      <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha de aplicación</h2>
      <FormKit
        type="date"
        name="fechaCuestionarioNordico"
        placeholder="Seleccione una fecha"
        :min="fechaDocumentoMin"
        :max="fechaDocumentoMax"
        v-model="fechaCuestionarioNordico"
      />
    </div>

    <div class="mt-6">
      <h2 class="text-lg font-medium text-gray-800">
        Datos de la actividad <span class="text-sm font-normal text-gray-500">(opcionales)</span>
      </h2>

      <div class="mt-3">
        <p class="text-sm font-medium text-gray-800">Antigüedad en la actividad</p>
        <p class="mb-1.5 text-xs text-gray-500">
          Tiempo realizando este mismo tipo de trabajo, aunque haya sido en otras empresas. No es la
          antigüedad en la empresa.
        </p>
        <div class="grid grid-cols-2 gap-3">
          <label class="text-xs text-gray-600">
            Años
            <input
              v-model="antiguedadActividadAnios"
              type="number"
              min="0"
              max="80"
              step="1"
              inputmode="numeric"
              data-skip-validation
              :class="claseInput"
            />
          </label>
          <label class="text-xs text-gray-600">
            Meses
            <input
              v-model="antiguedadActividadMeses"
              type="number"
              min="0"
              max="11"
              step="1"
              inputmode="numeric"
              data-skip-validation
              :class="claseInput"
            />
          </label>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3">
        <label class="text-sm font-medium text-gray-800">
          Horas de trabajo por semana
          <input
            v-model="horasTrabajoSemana"
            type="number"
            min="0"
            max="168"
            step="0.5"
            inputmode="decimal"
            data-skip-validation
            :class="[claseInput, 'mt-1.5 font-normal']"
          />
        </label>
        <label class="text-sm font-medium text-gray-800">
          Mano dominante
          <select v-model="manoDominante" :class="[claseInput, 'mt-1.5 font-normal']">
            <option value="">Sin registrar</option>
            <option v-for="opcion in MANO_DOMINANTE_NORDICO" :key="opcion" :value="opcion">
              {{ opcion }}
            </option>
          </select>
        </label>
      </div>
    </div>
  </div>
</template>
