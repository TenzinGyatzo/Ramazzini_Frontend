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

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const { formDataHistoriaOtologica } = useFormDataStore();
const documentos = useDocumentosStore();

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

onMounted(() => {
  if(documentos.currentDocument) {
    fechaHistoriaOtologica.value = formatDateYYYYMMDD(documentos.currentDocument.fechaHistoriaOtologica || today);
  }

  // Establece idTrabajador en formData
  formDataHistoriaOtologica.idTrabajador = trabajadores.currentTrabajadorId;

  // Establece usuario creador y/o actualizador en formData

  // Establece rutaPDF en formData cuando aun no se ha seleccionado la fecha
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataHistoriaOtologica.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

onUnmounted(() => {
  // Asegurar que formData tenga un valor inicial para fechaHistoriaOtologica
  if (!formDataHistoriaOtologica.fechaHistoriaOtologica) {
    formDataHistoriaOtologica.fechaHistoriaOtologica = today;
  }
})

// Inicializar la referencia local sincronizada con formData
const fechaHistoriaOtologica = ref(today);

// Mantener sincronizados los valores
watch(fechaHistoriaOtologica, (newValue) => {
  formDataHistoriaOtologica.fechaHistoriaOtologica = newValue;
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Historia Otologica</h1>
    <div class="mt-6">
      <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha de valoración</h2>
      <FormKit 
        type="date" 
        name="fechaHistoriaOtologica" 
        placeholder="Seleccione una fecha"
        v-model="fechaHistoriaOtologica" 
      />
    </div>
  </div>
</template>
