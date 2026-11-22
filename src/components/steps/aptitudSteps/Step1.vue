<script setup>
import { computed, onMounted, toRefs } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';

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
const formDataStore = useFormDataStore();
const { fechaDocumentoMax, fechaDocumentoMin } = useSiresDocumentDateMax();
// Por el store (al editar, el documento puede llegar después del primer dibujo)
const df = () => formDataStore.formDataAptitud;

const today = format(new Date(), 'yyyy-MM-dd');

// Punto 45: el paso no escribe al abrirse ni al cerrarse. Muestra la fecha del formulario o la
// de hoy, que escribe aptitudGuardado al revisar la sección; aquí solo lo que el usuario cambia.
const fechaAptitudPuesto = computed({
  get: () => (df().fechaAptitudPuesto ? formatDateYYYYMMDD(df().fechaAptitudPuesto) : today),
  set: (valor) => {
    // El campo devuelve la fecha que se ve al montarse: eso no es un cambio del usuario
    if (!df().fechaAptitudPuesto && valor === today) return;
    if (valor && valor !== formatDateYYYYMMDD(df().fechaAptitudPuesto || '')) df().fechaAptitudPuesto = valor;
  },
});

onMounted(() => {
  // Datos del expediente (no son respuestas): el trabajador y la carpeta del PDF
  df().idTrabajador = trabajadores.currentTrabajadorId;
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  df().rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Aptitud al Puesto</h1>
    <div data-campo="fechaAptitudPuesto" :class="variant === 'compact' ? 'mt-1' : 'mt-6'">
      <h2 :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-3 text-gray-800'">
        Fecha de Valoración
      </h2>
      <FormKit 
        type="date" 
        name="fechaAptitudPuesto" 
        placeholder="Seleccione una fecha"
        :min="fechaDocumentoMin"
        :max="fechaDocumentoMax"
        v-model="fechaAptitudPuesto" 
      />
    </div>
  </div>
</template>
