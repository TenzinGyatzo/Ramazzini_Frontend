<script setup>
import { ref, watch, onMounted } from 'vue';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { CLASE_ETIQUETA } from '../captura/estiloCaptura';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';

const capturaRapida = enCapturaRapida();

// En la sección (variant compact) el título lo pone la sección; solo en el asistente anterior
const { variant } = defineProps({ variant: { type: String, default: '' } });

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const { formDataExamenVista } = useFormDataStore();
const documentos = useDocumentosStore();
const { fechaDocumentoMax, fechaDocumentoMin } = useSiresDocumentDateMax();

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

onMounted(() => {
  if (documentos.currentDocument) {
    fechaExamenVista.value = formatDateYYYYMMDD(documentos.currentDocument.fechaExamenVista || today);
  }
  // La fecha que se ve llega al formulario desde el inicio (si no, al guardar con este paso
  // abierto se pedía una fecha que sí está en pantalla)
  formDataExamenVista.fechaExamenVista = fechaExamenVista.value;

  // Establece idTrabajador en formData
  formDataExamenVista.idTrabajador = trabajadores.currentTrabajadorId;

  // Establece usuario creador y/o actualizador en formData

  // Establece rutaPDF en formData cuando aun no se ha seleccionado la fecha
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataExamenVista.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

// Inicializar la referencia local sincronizada con formData (al volver al paso se conserva
// la fecha ya elegida; antes siempre mostraba la de hoy)
const fechaExamenVista = ref(formDataExamenVista.fechaExamenVista || today);

// Mantener sincronizados los valores
watch(fechaExamenVista, (newValue) => {
  formDataExamenVista.fechaExamenVista = newValue;
});
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Examen de la vista</h1>
    <div
      data-campo="fechaExamenVista"
      :class="['captura-fecha', variant === 'compact' ? 'mt-1' : 'mt-6', capturaRapida ? 'w-full sm:w-56' : '']"
    >
      <p :class="[CLASE_ETIQUETA, 'mb-1']">Fecha del examen <span class="text-red-500">*</span></p>
      <FormKit
        type="date"
        name="fechaExamenVista"
        placeholder="Seleccione una fecha"
        :min="fechaDocumentoMin"
        :max="fechaDocumentoMax"
        v-model="fechaExamenVista"
      />
    </div>
  </div>
</template>
