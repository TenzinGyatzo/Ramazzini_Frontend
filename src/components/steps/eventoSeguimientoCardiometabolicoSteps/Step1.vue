<script setup>
import { ref, watch, onMounted } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const { formDataEventoSeguimientoCardiometabolico } = useFormDataStore();
const documentos = useDocumentosStore();

const MOTIVO_OTRO = 'OTRO';

const OPCIONES_MOTIVO = [
  'Seguimiento rutinario',
  'Diagnóstico reciente',
  'Ajuste terapéutico',
  'Refiere sintomas',
  'Descontrol',
];

const opcionesSelectMotivo = [
  ...OPCIONES_MOTIVO.map((label) => ({ label, value: label })),
  { label: 'Otro', value: MOTIVO_OTRO },
];

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

// Fecha en el paso: sincronizar con Pinia al montar/aun si el usuario no toca el datepicker (@IsDate/@IsNotEmpty en backend)
const fechaEventoSeguimientoCardiometabolico = ref(today);

watch(
  fechaEventoSeguimientoCardiometabolico,
  (newValue) => {
    formDataEventoSeguimientoCardiometabolico.fechaEventoSeguimientoCardiometabolico = newValue;
  },
  { immediate: true },
);

const motivoSeleccion = ref(OPCIONES_MOTIVO[0]);
const motivoOtroTexto = ref('');

function motivoValorParaPayload() {
  if (motivoSeleccion.value === MOTIVO_OTRO) {
    return motivoOtroTexto.value.trim();
  }
  return motivoSeleccion.value;
}

watch(
  [motivoSeleccion, motivoOtroTexto],
  () => {
    formDataEventoSeguimientoCardiometabolico.motivoSeguimiento = motivoValorParaPayload();
  },
  { immediate: true },
);

function hidratarMotivoDesdeString(valor) {
  if (!valor || typeof valor !== 'string') {
    return;
  }
  if (OPCIONES_MOTIVO.includes(valor)) {
    motivoSeleccion.value = valor;
    motivoOtroTexto.value = '';
  } else {
    motivoSeleccion.value = MOTIVO_OTRO;
    motivoOtroTexto.value = valor;
  }
}

onMounted(() => {
  if (documentos.currentDocument) {
    fechaEventoSeguimientoCardiometabolico.value = formatDateYYYYMMDD(
      documentos.currentDocument.fechaEventoSeguimientoCardiometabolico || today,
    );
    if (documentos.currentDocument.motivoSeguimiento) {
      hidratarMotivoDesdeString(documentos.currentDocument.motivoSeguimiento);
    }
  }

  formDataEventoSeguimientoCardiometabolico.idTrabajador = trabajadores.currentTrabajadorId;

  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataEventoSeguimientoCardiometabolico.rutaPDF = `expedientes-medicos/${empresa}/${centroTrabajo}/${trabajadorNombre}_${trabajadorId}`;
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Evento Seguimiento Cardiometabolico</h1>
    <div class="mt-6">
      <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha de seguimiento</h2>
      <FormKit
        type="date"
        name="fechaEventoSeguimientoCardiometabolico"
        placeholder="Seleccione una fecha"
        v-model="fechaEventoSeguimientoCardiometabolico"
      />
    </div>
    <div class="mt-6">
      <h2 class="text-lg font-medium mb-3 text-gray-800">Motivo del seguimiento</h2>
      <FormKit
        type="select"
        name="motivoSeguimientoTipo"
        :options="opcionesSelectMotivo"
        placeholder="Seleccione un motivo"
        v-model="motivoSeleccion"
      />
      <div v-if="motivoSeleccion === MOTIVO_OTRO" class="mt-4">
        <FormKit
          type="textarea"
          name="motivoSeguimientoOtro"
          label="Especifique el motivo"
          rows="3"
          placeholder="Describe el motivo del seguimiento"
          v-model="motivoOtroTexto"
        />
      </div>
    </div>
  </div>
</template>
