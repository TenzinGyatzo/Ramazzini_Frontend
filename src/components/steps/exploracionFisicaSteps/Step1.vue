<script setup>
import { ref, watch, onMounted, toRefs } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { CLASE_ETIQUETA } from '@/components/steps/captura/estiloCaptura';

// Punto 41: en captura rápida la fecha es un campo angosto alineado a la izquierda (a todo lo
// ancho quedaba desproporcionada); en el asistente angosto ocupa su ancho
const capturaRapida = enCapturaRapida();

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const { formDataExploracionFisica } = useFormDataStore();
const documentos = useDocumentosStore();
const { fechaDocumentoMax, fechaDocumentoMin } = useSiresDocumentDateMax();

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

// Inicializar la referencia local sincronizada con formData
const fechaExploracionFisica = ref(today);

onMounted(() => {
  if (documentos.currentDocument) {
    fechaExploracionFisica.value = formatDateYYYYMMDD(documentos.currentDocument.fechaExploracionFisica || today);
  } else if (formDataExploracionFisica.fechaExploracionFisica) {
    // Documento nuevo y se regresó al paso 1: conservar la fecha ya elegida
    fechaExploracionFisica.value = formatDateYYYYMMDD(formDataExploracionFisica.fechaExploracionFisica);
  }
  // La fecha que se ve cuenta como capturada desde que se abre el paso (vista previa y
  // aviso al guardar); antes solo al cambiarla o salir del paso.
  formDataExploracionFisica.fechaExploracionFisica = fechaExploracionFisica.value;

  // Establece idTrabajador en formData
  formDataExploracionFisica.idTrabajador = trabajadores.currentTrabajadorId;

  // Establece usuario creador y/o actualizador en formData

  // Establece rutaPDF en formData cuando aun no se ha seleccionado la fecha
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataExploracionFisica.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});


// Mantener sincronizados los valores
watch(fechaExploracionFisica, (newValue) => {
  formDataExploracionFisica.fechaExploracionFisica = newValue;
});
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Exploración Física</h1>
    
    <div
      data-campo="fechaExploracionFisica"
      :class="['captura-fecha', variant === 'compact' ? 'mt-1' : 'mt-6', capturaRapida ? 'w-full sm:w-56' : '']"
    >
      <p :class="[CLASE_ETIQUETA, 'mb-1']">Fecha de la exploración física <span class="text-red-500">*</span></p>
      <FormKit 
        type="date" 
        name="fechaExploracionFisica" 
        placeholder="Seleccione una fecha"
        :min="fechaDocumentoMin"
        :max="fechaDocumentoMax"
        v-model="fechaExploracionFisica" 
      />
    </div>
  </div>
</template>
