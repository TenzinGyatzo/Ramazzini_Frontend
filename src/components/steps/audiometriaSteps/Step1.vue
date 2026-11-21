<script setup>
import { computed, onMounted } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { metodoDe } from '@/helpers/audiometriaGuardado';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import OpcionesSegmentadas from '../captura/OpcionesSegmentadas.vue';
import { CLASE_AYUDA, CLASE_ETIQUETA } from '../captura/estiloCaptura';

defineProps({ variant: { type: String, default: '' } });

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const formDataStore = useFormDataStore();
const proveedorSaludStore = useProveedorSaludStore();
const { fechaDocumentoMax, fechaDocumentoMin } = useSiresDocumentDateMax();

// Por el store (al editar, el documento puede llegar después del primer dibujo)
const df = () => formDataStore.formDataAudiometria;
const today = format(new Date(), 'yyyy-MM-dd');
const capturaRapida = enCapturaRapida();

const OPCIONES_METODO = [
  { valor: 'AMA', etiqueta: 'AMA' },
  { valor: 'LFT', etiqueta: 'LFT' },
];
const DESCRIPCION_METODO = {
  AMA: 'American Medical Association',
  LFT: 'Ley Federal del Trabajo (México)',
};

// Punto 44: el paso no escribe al abrirse ni al cerrarse. Muestra el método y la fecha del
// formulario o los preseleccionados (LFT en México, AMA en otro país; hoy), que escribe
// audiometriaGuardado al revisar la sección; aquí solo se escribe lo que el usuario cambia.
const metodoAudiometria = computed({
  get: () => metodoDe(df(), proveedorSaludStore.proveedorSalud?.pais),
  set: (valor) => {
    df().metodoAudiometria = valor;
  },
});
const fechaAudiometria = computed({
  get: () => (df().fechaAudiometria ? formatDateYYYYMMDD(df().fechaAudiometria) : today),
  set: (valor) => {
    // El campo devuelve la fecha que se ve al montarse: eso no es un cambio del usuario
    if (!df().fechaAudiometria && valor === today) return;
    if (valor && valor !== formatDateYYYYMMDD(df().fechaAudiometria || '')) df().fechaAudiometria = valor;
  },
});

onMounted(() => {
  // Datos del expediente (no son respuestas): el trabajador y la carpeta del PDF
  if (!df().idTrabajador) df().idTrabajador = trabajadores.currentTrabajadorId;
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  df().rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});
</script>

<template>
  <div>
    <div v-if="variant !== 'compact'" class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-gray-900">Audiometría</h1>
    </div>

    <!-- Método y fecha (punto 44): botones juntos y fecha angosta; en captura rápida, en un renglón -->
    <div :class="['grid gap-4', capturaRapida ? 'grid-cols-1 sm:grid-cols-[auto_14rem] sm:items-start' : 'grid-cols-1']">
      <div data-campo="metodoAudiometria" class="min-w-0">
        <p :class="[CLASE_ETIQUETA, 'mb-1']">Método <span class="text-red-500">*</span></p>
        <OpcionesSegmentadas
          v-model="metodoAudiometria"
          name="metodoAudiometria"
          etiqueta="Método de audiometría"
          :opciones="OPCIONES_METODO"
        />
        <p :class="[CLASE_AYUDA, 'mt-1']">{{ DESCRIPCION_METODO[metodoAudiometria] }}</p>
      </div>

      <div data-campo="fechaAudiometria" :class="['captura-fecha', capturaRapida ? 'w-full sm:w-56' : '']">
        <p :class="[CLASE_ETIQUETA, 'mb-1']">Fecha de realización <span class="text-red-500">*</span></p>
        <FormKit
          type="date"
          name="fechaAudiometria"
          placeholder="Seleccione una fecha"
          :min="fechaDocumentoMin"
          :max="fechaDocumentoMax"
          v-model="fechaAudiometria"
        />
      </div>
    </div>
  </div>
</template>
