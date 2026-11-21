<script setup>
import { ref, watch, onMounted, computed, toRefs } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';
import NotasMedicasAPI from '@/api/NotasMedicasAPI';
import { DocumentoEstado } from '@/interfaces/nom024.interface';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import OpcionesSegmentadas from '@/components/steps/captura/OpcionesSegmentadas.vue';
import { CLASE_ETIQUETA, CLASE_AYUDA } from '@/components/steps/captura/estiloCaptura';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

// Punto 38: un solo diseño en los dos modos. En captura rápida, tipo y fecha en una fila;
// en el asistente angosto, uno debajo del otro.
const capturaRapida = enCapturaRapida();
const OPCIONES_TIPO_NOTA = [
  { valor: 'Inicial', etiqueta: 'Inicial' },
  { valor: 'Seguimiento', etiqueta: 'Seguimiento' },
  { valor: 'Alta', etiqueta: 'Alta' },
];
const OPCIONES_NO_SI = [
  { valor: 0, etiqueta: 'No' },
  { valor: 1, etiqueta: 'Sí' },
];

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();
const proveedorSaludStore = useProveedorSaludStore();
const { fechaDocumentoMax, fechaDocumentoMin, mensajeEdadEnFecha } = useSiresDocumentDateMax();
const showSiresUI = computed(() => proveedorSaludStore.showSiresUI);

// Valor local para la pregunta principal
const tipoNota = ref('Inicial');
const today = format(new Date(), 'yyyy-MM-dd');

// Inicializar la referencia local sincronizada con formData
const fechaNotaMedica = ref(today);

const establecimientoEspecializado = ref(false);
const esPrimeraVezAnio = ref(false);
const primeraVezUneme = ref(null);
const cargandoContextoCex = ref(false);

const muestraPrimeraVezUneme = computed(() =>
  showSiresUI.value &&
  establecimientoEspecializado.value &&
  esPrimeraVezAnio.value,
);

const documentoConcluido = computed(() => {
  const estado =
    documentos.currentDocument?.estado || formDataNotaMedica.estado;
  return (
    estado === DocumentoEstado.FINALIZADO || estado === DocumentoEstado.ANULADO
  );
});

const etiquetaPrimeraVezAnio = computed(() =>
  esPrimeraVezAnio.value ? 'Sí' : 'No',
);

function aplicarPrimeraVezAnioPersistidoSiConcluido() {
  if (!documentoConcluido.value) return;
  const persistido =
    documentos.currentDocument?.primeraVezAnio ??
    formDataNotaMedica.primeraVezAnio;
  esPrimeraVezAnio.value = persistido === 1;
}

const mensajeErrorFechaConsulta = computed(() => {
  if (!showSiresUI.value || !fechaDocumentoMax.value || !fechaNotaMedica.value) {
    return '';
  }
  if (fechaNotaMedica.value > fechaDocumentoMax.value) {
    return 'La fecha de consulta no puede ser posterior al día de hoy';
  }
  if (fechaDocumentoMin.value && fechaNotaMedica.value < fechaDocumentoMin.value) {
    return (
      mensajeEdadEnFecha(fechaNotaMedica.value) ||
      'La fecha de consulta no puede tener más de 30 días de antigüedad'
    );
  }
  return '';
});

const normalizePrimeraVezUneme = (value) => {
  const n = typeof value === 'string' ? Number(value) : value;
  return n === 0 || n === 1 ? n : null;
};

async function refreshContextoCex() {
  if (!showSiresUI.value || !trabajadores.currentTrabajadorId || !fechaNotaMedica.value) {
    establecimientoEspecializado.value = false;
    esPrimeraVezAnio.value = false;
    aplicarPrimeraVezAnioPersistidoSiConcluido();
    formDataNotaMedica.esPrimeraVezAnioPreview = esPrimeraVezAnio.value;
    return;
  }

  cargandoContextoCex.value = true;
  try {
    const { data } = await NotasMedicasAPI.getContextoCex({
      trabajadorId: trabajadores.currentTrabajadorId,
      fechaNotaMedica: fechaNotaMedica.value,
      excludeDocumentoId: documentos.currentDocument?._id,
    });
    establecimientoEspecializado.value = Boolean(data?.establecimientoEspecializado);
    esPrimeraVezAnio.value = Boolean(data?.esPrimeraVezAnio);
    aplicarPrimeraVezAnioPersistidoSiConcluido();
    formDataNotaMedica.esPrimeraVezAnioPreview = esPrimeraVezAnio.value;
  } catch (error) {
    console.error('Error al obtener contexto CEX:', error);
    establecimientoEspecializado.value = false;
    esPrimeraVezAnio.value = false;
    aplicarPrimeraVezAnioPersistidoSiConcluido();
    formDataNotaMedica.esPrimeraVezAnioPreview = esPrimeraVezAnio.value;
  } finally {
    cargandoContextoCex.value = false;
  }
}

onMounted(async () => {
  if (documentos.currentDocument) {
    // Si se está editando un documento, usa los valores existentes
    tipoNota.value = documentos.currentDocument.tipoNota || 'Inicial';
    fechaNotaMedica.value = formatDateYYYYMMDD(documentos.currentDocument.fechaNotaMedica || today);
    primeraVezUneme.value = normalizePrimeraVezUneme(
      formDataNotaMedica.primeraVezUneme ?? documentos.currentDocument.primeraVezUneme,
    );
  } else {
    // Si es un documento nuevo, usa valores predeterminados o lo que ya exista en formData
    tipoNota.value = formDataNotaMedica.tipoNota || 'Inicial';
    fechaNotaMedica.value = formatDateYYYYMMDD(formDataNotaMedica.fechaNotaMedica || today);
    primeraVezUneme.value = normalizePrimeraVezUneme(formDataNotaMedica.primeraVezUneme);

    // Configurar valores iniciales en formData si no existen
    if (!formDataNotaMedica.idTrabajador) {
      formDataNotaMedica.idTrabajador = trabajadores.currentTrabajadorId;
    }
  }
  // La fecha que se ve cuenta como capturada desde que se abre el paso (vista previa y
  // aviso al guardar); antes solo al cambiarla o salir del paso.
  formDataNotaMedica.fechaNotaMedica = fechaNotaMedica.value;
  // El tipo de nota también: antes solo llegaba al formulario al salir del paso
  formDataNotaMedica.tipoNota = tipoNota.value;

  
  // Establece rutaPDF en formData
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataNotaMedica.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);

  await refreshContextoCex();
});

// Sincronizar tipoNota con formData
watch(tipoNota, (newValue) => {
  formDataNotaMedica.tipoNota = newValue;
});

// Mantener sincronizados los valores
watch(fechaNotaMedica, async (newValue) => {
  formDataNotaMedica.fechaNotaMedica = newValue;
  await refreshContextoCex();
});

watch(muestraPrimeraVezUneme, (visible) => {
  formDataNotaMedica.primeraVezUnemeAplica = visible;
  if (!visible) {
    primeraVezUneme.value = null;
    delete formDataNotaMedica.primeraVezUneme;
  }
}, { immediate: true });

watch(primeraVezUneme, (newValue) => {
  if (!muestraPrimeraVezUneme.value) {
    delete formDataNotaMedica.primeraVezUneme;
    return;
  }
  const n = typeof newValue === 'string' ? Number(newValue) : newValue;
  formDataNotaMedica.primeraVezUneme =
    n === 0 || n === 1 ? n : undefined;
});
</script>

<template>
  <div class="nota-medica-dark-inputs">
    <h1
      v-if="variant !== 'compact'"
      class="text-2xl font-bold mb-4 text-gray-900"
    >
      Nota Médica
    </h1>

    <div
      :class="[
        'grid grid-cols-1 gap-y-4 items-start',
        capturaRapida ? 'sm:grid-cols-[auto_minmax(0,15rem)] gap-x-8' : '',
      ]"
    >
      <div data-campo="tipoNota">
        <p :class="[CLASE_ETIQUETA, 'mb-1']">Tipo de consulta <span class="text-red-500">*</span></p>
        <OpcionesSegmentadas
          v-model="tipoNota"
          name="tipoNota"
          etiqueta="Tipo de consulta"
          :opciones="OPCIONES_TIPO_NOTA"
        />
      </div>
      <div data-campo="fechaNotaMedica" class="captura-fecha">
        <p :class="[CLASE_ETIQUETA, 'mb-1']">Fecha de consulta <span class="text-red-500">*</span></p>
        <FormKit
          type="date"
          name="fechaNotaMedica"
          :min="fechaDocumentoMin"
          :max="fechaDocumentoMax"
          v-model="fechaNotaMedica"
        />
        <p v-if="mensajeErrorFechaConsulta" class="text-red-500 text-xs mt-1 flex items-start gap-1.5">
          <i class="fas fa-exclamation-triangle mt-0.5" aria-hidden="true"></i>
          <span>{{ mensajeErrorFechaConsulta }}</span>
        </p>
      </div>
    </div>

    <p v-if="showSiresUI" :class="[CLASE_AYUDA, 'mt-3 flex items-start gap-1.5']">
      <i class="fas fa-info-circle text-emerald-600 mt-0.5" aria-hidden="true"></i>
      <span>
        Primera consulta del año en este establecimiento:
        <span class="font-semibold text-gray-700">{{ etiquetaPrimeraVezAnio }}</span>
        ({{ etiquetaPrimeraVezAnio === 'Sí' ? 'primera atención del año' : 'ya existía otra consulta finalizada en el año' }}).
        Lo determina el sistema al concluir la nota.
      </span>
    </p>

    <div v-if="muestraPrimeraVezUneme" data-campo="primeraVezUneme" class="mt-4">
      <p :class="CLASE_ETIQUETA">Primera vez UNEME <span class="text-red-500">*</span></p>
      <p :class="[CLASE_AYUDA, 'mb-1.5']">¿Es la primera consulta del año en una Unidad de Especialidades Médicas?</p>
      <OpcionesSegmentadas
        v-model="primeraVezUneme"
        name="primeraVezUneme"
        etiqueta="Primera vez UNEME"
        :opciones="OPCIONES_NO_SI"
      />
    </div>
  </div>
</template>
