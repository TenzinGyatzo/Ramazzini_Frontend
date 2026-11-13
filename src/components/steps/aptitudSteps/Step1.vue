<script setup>
import { ref, watch, onMounted, onUnmounted, toRefs } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';

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
const { formDataAptitud } = useFormDataStore();
const documentos = useDocumentosStore();
const { fechaDocumentoMax, fechaDocumentoMin } = useSiresDocumentDateMax();

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

// Inicializar la referencia local sincronizada con formData (al volver al paso se conserva
// la fecha ya elegida; antes siempre mostraba la de hoy)
const fechaAptitudPuesto = ref(formDataAptitud.fechaAptitudPuesto || today);

onMounted(() => {
  if (documentos.currentDocument) {
    fechaAptitudPuesto.value = formatDateYYYYMMDD(documentos.currentDocument.fechaAptitudPuesto || today);
  }

  // Establece idTrabajador en formData
  formDataAptitud.idTrabajador = trabajadores.currentTrabajadorId;

  // Establece usuario creador y/o actualizador en formData

  // Establece rutaPDF en formData cuando aun no se ha seleccionado la fecha
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataAptitud.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);

  // La fecha que se ve llega al formulario desde el inicio (si no, al guardar con este paso
  // abierto se pedía una fecha que sí está en pantalla)
  formDataAptitud.fechaAptitudPuesto = fechaAptitudPuesto.value;
});

onUnmounted(() => {
  // Asegurar que formData tenga un valor inicial para fechaAptitudPuesto
  if (!formDataAptitud.fechaAptitudPuesto) {
    formDataAptitud.fechaAptitudPuesto = today;
  }
})

// Mantener sincronizados los valores
watch(fechaAptitudPuesto, (newValue) => {
  formDataAptitud.fechaAptitudPuesto = newValue;
});
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Aptitud al Puesto</h1>
    <div data-campo="fechaAptitudPuesto" :class="variant === 'compact' ? 'mt-1' : 'mt-6'">
      <h2 :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-3 text-gray-800'">
        Fecha de Valoración
      </h2>
      <FormKit 
        type="date" 
        name="fechaAptitudPuesto" 
        placeholder="Seleccione una fecha"
        :min="fechaDocumentoMin"
        :max="fechaDocumentoMax"
        v-model="fechaAptitudPuesto" 
      />
    </div>
  </div>
</template>
