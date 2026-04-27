<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const { formDataCuestionarioProdromalBreve } = useFormDataStore();
const documentos = useDocumentosStore();

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

onMounted(() => {
  if (documentos.currentDocument) {
    fechaCuestionarioProdromalBreve.value = formatDateYYYYMMDD(documentos.currentDocument.fechaCuestionarioProdromalBreve || today);
  }

  // Establece idTrabajador en formData
  formDataCuestionarioProdromalBreve.idTrabajador = trabajadores.currentTrabajadorId;


  // Establece rutaPDF en formData cuando aun no se ha seleccionado la fecha
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataCuestionarioProdromalBreve.rutaPDF = `expedientes-medicos/${empresa}/${centroTrabajo}/${trabajadorNombre}_${trabajadorId}`;
});

onUnmounted(() => {
  // Asegurar que formData tenga un valor inicial para fechaInicioControlPrenatal
  if (!formDataCuestionarioProdromalBreve.fechaCuestionarioProdromalBreve) {
    formDataCuestionarioProdromalBreve.fechaCuestionarioProdromalBreve = today;
  }
})

// Inicializar la referencia local sincronizada con formData
const fechaCuestionarioProdromalBreve = ref(today);

// Mantener sincronizados los valores
watch(fechaCuestionarioProdromalBreve, (newValue) => {
  formDataCuestionarioProdromalBreve.fechaCuestionarioProdromalBreve = newValue;
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Cuestionario Prodromal Breve</h1>
    <p class="text-xs italic text-gray-500">Prodromal Brief Questionnaire.</p>
    <div class="mt-6">
      <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha de aplicación de instrumento (PQ-B)</h2>
      <FormKit 
        type="date" 
        name="fechaCuestionarioProdromalBreve" 
        placeholder="Seleccione una fecha"
        v-model="fechaCuestionarioProdromalBreve" 
      />
    </div>
  </div>
</template>
