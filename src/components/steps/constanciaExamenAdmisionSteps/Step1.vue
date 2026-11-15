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
const { formDataConstanciaExamenAdmision } = useFormDataStore();
const documentos = useDocumentosStore();
const { fechaDocumentoMax, fechaDocumentoMin } = useSiresDocumentDateMax();

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

// Inicializar la referencia local sincronizada con formData
const fechaConstanciaExamenAdmision = ref(today);

onMounted(() => {
  if (documentos.currentDocument) {
    fechaConstanciaExamenAdmision.value = formatDateYYYYMMDD(documentos.currentDocument.fechaConstanciaExamenAdmision || today);
  } else if (formDataConstanciaExamenAdmision.fechaConstanciaExamenAdmision) {
    // Documento nuevo y se regresó al paso 1: conservar la fecha ya elegida
    fechaConstanciaExamenAdmision.value = formatDateYYYYMMDD(formDataConstanciaExamenAdmision.fechaConstanciaExamenAdmision);
  }
  // La fecha que se ve cuenta como capturada desde que se abre el paso (vista previa y
  // aviso al guardar); antes solo al cambiarla o salir del paso.
  formDataConstanciaExamenAdmision.fechaConstanciaExamenAdmision = fechaConstanciaExamenAdmision.value;

  // Establece idTrabajador en formData
  formDataConstanciaExamenAdmision.idTrabajador = trabajadores.currentTrabajadorId;

  // Establece usuario creador y/o actualizador en formData

  // Establece rutaPDF en formData cuando aun no se ha seleccionado la fecha
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataConstanciaExamenAdmision.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

onUnmounted(() => {
  // Asegurar que formData tenga un valor inicial para fechaConstanciaExamenAdmision
  if (!formDataConstanciaExamenAdmision.fechaConstanciaExamenAdmision) {
    formDataConstanciaExamenAdmision.fechaConstanciaExamenAdmision = today;
  }
})

// Mantener sincronizados los valores
watch(fechaConstanciaExamenAdmision, (newValue) => {
  formDataConstanciaExamenAdmision.fechaConstanciaExamenAdmision = newValue;
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Constancia de examen médico de admisión</h1>
    <div class="mt-6">
      <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha</h2>
      <FormKit 
        type="date" 
        name="fechaConstanciaExamenAdmision" 
        placeholder="Seleccione una fecha"
        :min="fechaDocumentoMin"
        :max="fechaDocumentoMax"
        v-model="fechaConstanciaExamenAdmision" 
      />
    </div>
  </div>
</template>
