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
const { formDataReceta } = useFormDataStore();
const documentos = useDocumentosStore();
const { fechaDocumentoMax } = useSiresDocumentDateMax();

// Valor local para la pregunta principal
const today = format(new Date(), 'yyyy-MM-dd');

// Inicializar la referencia local sincronizada con formData
const fechaReceta = ref(today);

onMounted(() => {
  if (documentos.currentDocument) {
    // Si se está editando un documento, usa los valores existentes
    fechaReceta.value = formatDateYYYYMMDD(documentos.currentDocument.fechaReceta || today);
  } else {
    // Si es un documento nuevo, usa valores predeterminados o lo que ya exista en formData
    fechaReceta.value = formatDateYYYYMMDD(formDataReceta.fechaReceta || today);

    // Configurar valores iniciales en formData si no existen
    if (!formDataReceta.idTrabajador) {
      formDataReceta.idTrabajador = trabajadores.currentTrabajadorId;
    }
  }
  
  
  // Establece rutaPDF en formData
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataReceta.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

onUnmounted(() => {
  // Guardar valores en formData antes de desmontar
  formDataReceta.fechaReceta = fechaReceta.value;
});

// Mantener sincronizados los valores
watch(fechaReceta, (newValue) => {
  formDataReceta.fechaReceta = newValue;
});
</script>

<template>
  <div>
    <!-- Jerarquía Visual Mejorada -->
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Receta Médica</h1>
    
    <!-- Sección de fecha con mejor espaciado -->
    <div class="mt-8">
      <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha de Prescripción</h2>
      <FormKit 
        type="date" 
        name="fechaReceta" 
        placeholder="Seleccione una fecha"
        :max="fechaDocumentoMax"
        v-model="fechaReceta" 
      />
    </div>
  </div>
</template>
