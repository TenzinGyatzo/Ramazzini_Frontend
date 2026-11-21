<script setup>
import { ref, watch, onMounted, toRefs } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import OpcionesSegmentadas from '@/components/steps/captura/OpcionesSegmentadas.vue';
import { CLASE_ETIQUETA } from '@/components/steps/captura/estiloCaptura';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

// Punto 39: mismo diseño que la nota médica en los dos modos (motivo y fecha en una fila en la
// captura rápida; uno debajo del otro en el asistente)
const capturaRapida = enCapturaRapida();
const OPCIONES_MOTIVO = [
  { valor: 'Ingreso', etiqueta: 'Ingreso' },
  { valor: 'Inicial', etiqueta: 'Inicial' },
  { valor: 'Periódico', etiqueta: 'Periódico' },
];

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const { formDataHistoriaClinica } = useFormDataStore();
const documentos = useDocumentosStore();
const { fechaDocumentoMax, fechaDocumentoMin } = useSiresDocumentDateMax();

// Valor local para la pregunta principal
const motivoExamen = ref('Ingreso');
const today = format(new Date(), 'yyyy-MM-dd');

// Inicializar la referencia local sincronizada con formData
const fechaHistoriaClinica = ref(today);

onMounted(() => {
  if (documentos.currentDocument) {
    // Si se está editando un documento, usa los valores existentes
    motivoExamen.value = documentos.currentDocument.motivoExamen || 'Ingreso';
    fechaHistoriaClinica.value = formatDateYYYYMMDD(documentos.currentDocument.fechaHistoriaClinica || today);
  } else {
    // Si es un documento nuevo, usa valores predeterminados o lo que ya exista en formData
    motivoExamen.value = formDataHistoriaClinica.motivoExamen || 'Ingreso';
    fechaHistoriaClinica.value = formatDateYYYYMMDD(formDataHistoriaClinica.fechaHistoriaClinica || today);

    // Configurar valores iniciales en formData si no existen
    if (!formDataHistoriaClinica.idTrabajador) {
      formDataHistoriaClinica.idTrabajador = trabajadores.currentTrabajadorId;
    }
  }
  // La fecha que se ve cuenta como capturada desde que se abre el paso (vista previa y
  // aviso al guardar); antes solo al cambiarla o salir del paso.
  formDataHistoriaClinica.fechaHistoriaClinica = fechaHistoriaClinica.value;
  // El motivo también: antes solo llegaba al formulario al salir del paso
  formDataHistoriaClinica.motivoExamen = motivoExamen.value;
  
  
  // Establece rutaPDF en formData
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataHistoriaClinica.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

// Si el formulario se vacía después de abrir el paso (la vista lo reinicia al montarse), lo que
// se ve vuelve a quedar en el formulario; antes lo reponía el cierre del paso.
watch(
  () => [formDataHistoriaClinica.motivoExamen, formDataHistoriaClinica.fechaHistoriaClinica],
  ([motivo, fecha]) => {
    if (!motivo && motivoExamen.value) formDataHistoriaClinica.motivoExamen = motivoExamen.value;
    if (!fecha && fechaHistoriaClinica.value) formDataHistoriaClinica.fechaHistoriaClinica = fechaHistoriaClinica.value;
  },
);

// Sincronizar motivoExamen con formData
watch(motivoExamen, (newValue) => {
  formDataHistoriaClinica.motivoExamen = newValue;
});

// Mantener sincronizados los valores
watch(fechaHistoriaClinica, (newValue) => {
  formDataHistoriaClinica.fechaHistoriaClinica = newValue;
});
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Historia Clínica</h1>
    <div
      :class="[
        'grid grid-cols-1 gap-y-4 items-start',
        capturaRapida ? 'sm:grid-cols-[auto_minmax(0,15rem)] gap-x-8' : '',
      ]"
    >
      <div data-campo="motivoExamen">
        <p :class="[CLASE_ETIQUETA, 'mb-1']">Motivo del examen <span class="text-red-500">*</span></p>
        <OpcionesSegmentadas
          v-model="motivoExamen"
          name="motivoExamen"
          etiqueta="Motivo del examen"
          :opciones="OPCIONES_MOTIVO"
        />
      </div>
      <div data-campo="fechaHistoriaClinica" class="captura-fecha">
        <p :class="[CLASE_ETIQUETA, 'mb-1']">Fecha de la historia clínica <span class="text-red-500">*</span></p>
        <FormKit
          type="date"
          name="fechaHistoriaClinica"
          :min="fechaDocumentoMin"
          :max="fechaDocumentoMax"
          v-model="fechaHistoriaClinica"
        />
      </div>
    </div>
  </div>
</template>
