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
const { formDataExploracionFisica } = useFormDataStore();
const documentos = useDocumentosStore();

// Obtener la fecha actual en formato YYYY-MM-DD
const today = format(new Date(), 'yyyy-MM-dd');

// Inicializar la referencia local sincronizada con formData
const fechaExploracionFisica = ref(today);

onMounted(() => {
  if (documentos.currentDocument) {
    fechaExploracionFisica.value = formatDateYYYYMMDD(documentos.currentDocument.fechaExploracionFisica || today);
  }

  // Establece idTrabajador en formData
  formDataExploracionFisica.idTrabajador = trabajadores.currentTrabajadorId;

  // Establece usuario creador y/o actualizador en formData

  // Establece rutaPDF en formData cuando aun no se ha seleccionado la fecha
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataExploracionFisica.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

onUnmounted(() => {
  // Asegurar que formData tenga un valor inicial para fechaExploracionFisica
  if (!formDataExploracionFisica.fechaExploracionFisica) {
    formDataExploracionFisica.fechaExploracionFisica = today;
  }
})

// Mantener sincronizados los valores
watch(fechaExploracionFisica, (newValue) => {
  formDataExploracionFisica.fechaExploracionFisica = newValue;
});
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Exploración Física</h1>
    
    <div :class="variant === 'compact' ? 'mt-1' : 'mt-6'">
      <h2 :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-3 text-gray-800'">
        Fecha de Exploración Física
      </h2>
      <FormKit 
        type="date" 
        name="fechaExploracionFisica" 
        placeholder="Seleccione una fecha"
        v-model="fechaExploracionFisica" 
      />
    </div>
  </div>
</template>
