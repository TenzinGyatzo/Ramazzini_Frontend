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
const { formDataNotaAclaratoria } = useFormDataStore();
const documentos = useDocumentosStore();

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

onMounted(() => {
  if(documentos.currentDocument) {
    fechaNotaAclaratoria.value = formatDateYYYYMMDD(documentos.currentDocument.fechaNotaAclaratoria || today);
  } else {
    // Si no hay currentDocument (nuevo documento), usar fecha de hoy
    fechaNotaAclaratoria.value = today;
  }
  
  // Sincronizar con formData
  formDataNotaAclaratoria.fechaNotaAclaratoria = fechaNotaAclaratoria.value;

  // Establece idTrabajador en formData
  formDataNotaAclaratoria.idTrabajador = trabajadores.currentTrabajadorId;

  // Establece usuario creador y/o actualizador en formData

  // Establece rutaPDF en formData cuando aun no se ha seleccionado la fecha
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataNotaAclaratoria.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

onUnmounted(() => {
  // Asegurar que formData tenga un valor inicial para fechaNotaAclaratoria
  if (!formDataNotaAclaratoria.fechaNotaAclaratoria) {
    formDataNotaAclaratoria.fechaNotaAclaratoria = today;
  }
})

// Inicializar la referencia local sincronizada con formData
const fechaNotaAclaratoria = ref(today);

// Mantener sincronizados los valores
watch(fechaNotaAclaratoria, (newValue) => {
  formDataNotaAclaratoria.fechaNotaAclaratoria = newValue;
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Nota Aclaratoria</h1>
    <div class="mt-6">
      <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha de realización de la aclaración</h2>
      <FormKit 
        type="date" 
        name="fechaNotaAclaratoria" 
        placeholder="Seleccione una fecha"  
        v-model="fechaNotaAclaratoria" 
      />
    </div>
  </div>
</template>
