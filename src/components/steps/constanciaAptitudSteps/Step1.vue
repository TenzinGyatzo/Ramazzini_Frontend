<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const { formDataConstanciaAptitud } = useFormDataStore();
const documentos = useDocumentosStore();
const { fechaDocumentoMax } = useSiresDocumentDateMax();

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

// Inicializar la referencia local sincronizada con formData
const fechaConstanciaAptitud = ref(today);

onMounted(() => {
  if (documentos.currentDocument) {
    fechaConstanciaAptitud.value = formatDateYYYYMMDD(documentos.currentDocument.fechaConstanciaAptitud || today);
  }

  // Establece idTrabajador en formData
  formDataConstanciaAptitud.idTrabajador = trabajadores.currentTrabajadorId;

  // Establece usuario creador y/o actualizador en formData

  // Establece rutaPDF en formData cuando aun no se ha seleccionado la fecha
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataConstanciaAptitud.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

onUnmounted(() => {
  // Asegurar que formData tenga un valor inicial para fechaConstanciaAptitud
  if (!formDataConstanciaAptitud.fechaConstanciaAptitud) {
    formDataConstanciaAptitud.fechaConstanciaAptitud = today;
  }
})

// Mantener sincronizados los valores
watch(fechaConstanciaAptitud, (newValue) => {
  formDataConstanciaAptitud.fechaConstanciaAptitud = newValue;
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Constancia de Aptitud</h1>
    <div class="mt-6">
      <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha de Emisión</h2>
      <FormKit 
        type="date" 
        name="fechaConstanciaAptitud" 
        placeholder="Seleccione una fecha"
        :max="fechaDocumentoMax"
        v-model="fechaConstanciaAptitud" 
      />
    </div>
  </div>
</template>
