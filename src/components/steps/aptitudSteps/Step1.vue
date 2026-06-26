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
const { formDataAptitud } = useFormDataStore();
const documentos = useDocumentosStore();

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

// Inicializar la referencia local sincronizada con formData
const fechaAptitudPuesto = ref(today);

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
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Aptitud al Puesto</h1>
    <div class="mt-6">
      <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha de Valoración</h2>
      <FormKit 
        type="date" 
        name="fechaAptitudPuesto" 
        placeholder="Seleccione una fecha"
        v-model="fechaAptitudPuesto" 
      />
    </div>
  </div>
</template>
