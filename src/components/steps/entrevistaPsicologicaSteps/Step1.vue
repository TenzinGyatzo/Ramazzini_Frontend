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
const { formDataEntrevistaPsicologica } = useFormDataStore();
const documentos = useDocumentosStore();
const { fechaDocumentoMax } = useSiresDocumentDateMax();

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

onMounted(() => {
  if (documentos.currentDocument) {
    fechaEntrevistaPsicologica.value = formatDateYYYYMMDD(documentos.currentDocument.fechaEntrevistaPsicologica || today);
  }

  // Establece idTrabajador en formData
  formDataEntrevistaPsicologica.idTrabajador = trabajadores.currentTrabajadorId;


  // Establece rutaPDF en formData cuando aun no se ha seleccionado la fecha
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataEntrevistaPsicologica.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

onUnmounted(() => {
  // Asegurar que formData tenga un valor inicial para fechaInicioControlPrenatal
  if (!formDataEntrevistaPsicologica.fechaEntrevistaPsicologica) {
    formDataEntrevistaPsicologica.fechaEntrevistaPsicologica = today;
  }
})

// Inicializar la referencia local sincronizada con formData
const fechaEntrevistaPsicologica = ref(today);

// Mantener sincronizados los valores
watch(fechaEntrevistaPsicologica, (newValue) => {
  formDataEntrevistaPsicologica.fechaEntrevistaPsicologica = newValue;
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Entrevista Psicológica</h1>
    <div class="mt-6">
      <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha de la entrevista psicológica</h2>
      <FormKit 
        type="date" 
        name="fechaEntrevistaPsicologica" 
        placeholder="Seleccione una fecha"
        :max="fechaDocumentoMax"
        v-model="fechaEntrevistaPsicologica" 
      />
    </div>
  </div>
</template>
