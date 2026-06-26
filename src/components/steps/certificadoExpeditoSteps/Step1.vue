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
const { formDataCertificadoExpedito } = useFormDataStore();
const documentos = useDocumentosStore();

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

// Inicializar la referencia local sincronizada con formData
const fechaCertificadoExpedito = ref(today);

onMounted(() => {
  if (documentos.currentDocument) {
    fechaCertificadoExpedito.value = formatDateYYYYMMDD(documentos.currentDocument.fechaCertificadoExpedito || today);
  }

  // Establece idTrabajador en formData
  formDataCertificadoExpedito.idTrabajador = trabajadores.currentTrabajadorId;

  // Establece usuario creador y/o actualizador en formData

  // Establece rutaPDF en formData cuando aun no se ha seleccionado la fecha
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataCertificadoExpedito.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

onUnmounted(() => {
  // Asegurar que formData tenga un valor inicial para fechaCertificado
  if (!formDataCertificadoExpedito.fechaCertificadoExpedito) {
    formDataCertificadoExpedito.fechaCertificadoExpedito = today;
  }
})

// Mantener sincronizados los valores
watch(fechaCertificadoExpedito, (newValue) => {
  formDataCertificadoExpedito.fechaCertificadoExpedito = newValue;
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Certificado Expedito</h1>
    <div class="mt-6">
      <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha del certificado</h2>
      <FormKit 
        type="date" 
        name="fechaCertificadoExpedito" 
        placeholder="Seleccione una fecha"
        v-model="fechaCertificadoExpedito" 
      />
    </div>
  </div>
</template>
