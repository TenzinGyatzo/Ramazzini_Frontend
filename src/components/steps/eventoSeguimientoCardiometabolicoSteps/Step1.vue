<script setup>
import { ref, watch, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const formDataStore = useFormDataStore();
const { formDataEventoSeguimientoCardiometabolico: fdRef } = storeToRefs(formDataStore);
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

const today = format(new Date(), 'yyyy-MM-dd');

function fechaInicialDesdeFuentes() {
  const fd = fdRef.value;
  const doc = documentos.currentDocument;
  return (
    formatDateYYYYMMDD(fd?.fechaEventoSeguimientoCardiometabolico) ||
    formatDateYYYYMMDD(doc?.fechaEventoSeguimientoCardiometabolico) ||
    today
  );
}

function parseMotivoRefsDesdeString(valor) {
  if (!valor || typeof valor !== 'string' || !String(valor).trim()) {
    return { sel: OPCIONES_MOTIVO[0], otro: '' };
  }
  const s = String(valor).trim();
  if (OPCIONES_MOTIVO.includes(s)) return { sel: s, otro: '' };
  return { sel: MOTIVO_OTRO, otro: s };
}

function motivoStringInicial() {
  const fd = fdRef.value;
  const doc = documentos.currentDocument;
  const fromFd = fd?.motivoSeguimiento != null ? String(fd.motivoSeguimiento).trim() : '';
  if (fromFd) return fromFd;
  const fromDoc = doc?.motivoSeguimiento != null ? String(doc.motivoSeguimiento).trim() : '';
  return fromDoc;
}

const fechaEventoSeguimientoCardiometabolico = ref(fechaInicialDesdeFuentes());
const motivoIni = parseMotivoRefsDesdeString(motivoStringInicial());
const motivoSeleccion = ref(motivoIni.sel);
const motivoOtroTexto = ref(motivoIni.otro);

watch(
  fechaEventoSeguimientoCardiometabolico,
  (newValue) => {
    fdRef.value.fechaEventoSeguimientoCardiometabolico = newValue;
  },
  { immediate: true },
);

function motivoValorParaPayload() {
  if (motivoSeleccion.value === MOTIVO_OTRO) {
    return motivoOtroTexto.value.trim();
  }
  return motivoSeleccion.value;
}

watch(
  [motivoSeleccion, motivoOtroTexto],
  () => {
    fdRef.value.motivoSeguimiento = motivoValorParaPayload();
  },
  { immediate: true },
);

function hidratarMotivoDesdeString(valor) {
  const { sel, otro } = parseMotivoRefsDesdeString(valor);
  motivoSeleccion.value = sel;
  motivoOtroTexto.value = otro;
}

/** Cuando `setFormDataFromDocument` llega después del primer render, alinear refs con el borrador. */
watch(
  fdRef,
  (fd) => {
    if (!fd || typeof fd !== 'object') return;
    const f = formatDateYYYYMMDD(fd.fechaEventoSeguimientoCardiometabolico);
    if (f) fechaEventoSeguimientoCardiometabolico.value = f;
    const ms = fd.motivoSeguimiento != null ? String(fd.motivoSeguimiento).trim() : '';
    if (ms) hidratarMotivoDesdeString(ms);
  },
  { deep: true },
);

onMounted(() => {
  fdRef.value.idTrabajador = trabajadores.currentTrabajadorId;

  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  fdRef.value.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
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
