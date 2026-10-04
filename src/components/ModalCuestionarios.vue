<script setup>
import { inject, computed, ref, onMounted } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';
import { useProfessionalDataValidation } from '@/composables/useProfessionalDataValidation';
import { useNavigateWithTreatmentConsent } from '@/composables/useNavigateWithTreatmentConsent';
import { useEscapeToClose } from '@/composables/useEscapeToClose';
import { useRegulatoryPolicy } from '@/composables/useRegulatoryPolicy';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import ModalDatosProfesionales from '@/components/modals/ModalDatosProfesionales.vue';
import TreatmentConsentModal from '@/components/TreatmentConsentModal.vue';

const toast = inject('toast');

const emit = defineEmits(['closeModal', 'openInasistencias']);
const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const proveedorSaludStore = useProveedorSaludStore();
const { validateDocumentCreation, executeIfCanManageOtrosDocumentos } = usePermissionRestrictions();
const { validationResult, loadFirmanteData, ensureProfessionalDataReady } = useProfessionalDataValidation();
const {
  navigateWithTreatmentConsent,
  showModal: showConsentModal,
  modalTrabajadorId,
  modalTrabajadorNombre,
  handleConsentRegistered,
  handleConsentCancel,
} = useNavigateWithTreatmentConsent();
const { controlPrenatalEnabled } = useRegulatoryPolicy();

const showProfessionalDataModal = ref(false);
const busqueda = ref('');
const campoBusqueda = ref(null);

onMounted(async () => {
  campoBusqueda.value?.focus();
  await loadFirmanteData();
});

/**
 * Catálogo del modal. Cada opción crea un documento (`tipoDocumento`) o ejecuta una
 * acción (`accion`). `conCentroTrabajo` agrega el centro a la ruta, `visible` oculta
 * la opción según la configuración del proveedor y `claves` son palabras extra para
 * el buscador.
 */
const SECCIONES = [
  {
    clave: 'medicos',
    titulo: 'Documentos médicos',
    icono: 'fas fa-file-medical',
    opciones: [
      {
        tipoDocumento: 'receta',
        titulo: 'Receta médica',
        descripcion: 'Tratamiento e indicaciones',
        icono: 'fas fa-prescription-bottle-medical',
      },
      {
        tipoDocumento: 'constanciaAptitud',
        titulo: 'Constancia de aptitud',
        descripcion: 'Resultado para el puesto',
        icono: 'fas fa-file-circle-check',
      },
      {
        tipoDocumento: 'certificadoExpedito',
        titulo: 'Certificado expedito',
        descripcion: 'Certificado médico breve',
        icono: 'fas fa-file-signature',
      },
      {
        tipoDocumento: 'notaAclaratoria',
        titulo: 'Nota aclaratoria',
        descripcion: 'Aclara un documento finalizado',
        icono: 'fas fa-file-pen',
        visible: () => proveedorSaludStore.isMX && proveedorSaludStore.notaAclaratoriaEnabled,
      },
    ],
  },
  {
    clave: 'seguimiento',
    titulo: 'Seguimiento clínico',
    icono: 'fas fa-notes-medical',
    opciones: [
      {
        tipoDocumento: 'eventoSeguimientoCardiometabolico',
        titulo: 'Evento cardiometabólico',
        descripcion: 'Valoración de seguimiento',
        icono: 'fas fa-heartbeat',
        conCentroTrabajo: true,
        claves: 'seguimiento cardiometabolico control',
      },
      {
        accion: 'inasistencias',
        titulo: 'Inasistencia a seguimiento',
        descripcion: 'No acudió a su seguimiento cardiometabólico',
        icono: 'fas fa-calendar-xmark',
        claves: 'falta no asistio cardiometabolico',
      },
      {
        tipoDocumento: 'informeLongitudinalCardiometabolico',
        titulo: 'Informe longitudinal cardiometabólico',
        descripcion: 'Evolución entre valoraciones',
        icono: 'fas fa-chart-line',
        conCentroTrabajo: true,
      },
      {
        tipoDocumento: 'controlPrenatal',
        titulo: 'Control prenatal',
        descripcion: 'Embarazo y lactancia',
        icono: 'fas fa-baby',
        visible: () => controlPrenatalEnabled.value,
      },
    ],
  },
  {
    clave: 'auditivaRespiratoria',
    titulo: 'Salud auditiva y respiratoria',
    icono: 'fas fa-stethoscope',
    opciones: [
      {
        tipoDocumento: 'historiaOtologica',
        titulo: 'Historia otológica',
        descripcion: 'Previa a audiometría',
        icono: 'fas fa-ear-deaf',
        claves: 'oido',
      },
      {
        tipoDocumento: 'informeLongitudinalAudiometrico',
        titulo: 'Informe longitudinal audiométrico',
        descripcion: 'Evolución de audiometrías',
        icono: 'fas fa-chart-line',
        conCentroTrabajo: true,
        claves: 'audiometria seguimiento',
      },
      {
        tipoDocumento: 'previoEspirometria',
        titulo: 'Previo a espirometría',
        descripcion: 'Cuestionario de preparación',
        icono: 'fas fa-lungs',
      },
    ],
  },
  {
    clave: 'psicologica',
    titulo: 'Evaluación psicológica',
    icono: 'fas fa-brain',
    opciones: [
      {
        tipoDocumento: 'entrevistaPsicologica',
        titulo: 'Entrevista psicológica',
        descripcion: 'Entrevista clínica',
        icono: 'fa-regular fa-comments',
      },
      {
        tipoDocumento: 'trastornosEstadoAnimo',
        titulo: 'Trastornos del estado de ánimo',
        descripcion: 'MDQ',
        icono: 'fa-solid fa-wave-square',
      },
      {
        tipoDocumento: 'cuestionarioProdromalBreve',
        titulo: 'Cuestionario prodromal breve',
        descripcion: 'PQ-B',
        icono: 'fa-solid fa-clipboard-list',
      },
      {
        tipoDocumento: 'trastornoLimitePersonalidad',
        titulo: 'Trastorno límite de personalidad',
        descripcion: 'MSI-BPD',
        icono: 'fa-solid fa-heart-crack',
      },
    ],
  },
  {
    clave: 'ergonomiaSueno',
    titulo: 'Ergonomía, sueño y fatiga',
    icono: 'fas fa-person',
    opciones: [
      {
        tipoDocumento: 'cuestionarioNordico',
        titulo: 'Cuestionario Nórdico',
        descripcion: 'Síntomas musculoesqueléticos',
        icono: 'fa-solid fa-person',
        conCentroTrabajo: true,
        nuevo: true,
        claves: 'kuorinka ergonomia',
      },
      {
        tipoDocumento: 'evaluacionSuenoVigilia',
        titulo: 'Sueño y vigilia',
        descripcion: 'Calidad de sueño y somnolencia',
        icono: 'fa-solid fa-moon',
        conCentroTrabajo: true,
        nuevo: true,
        claves: 'fatiga evaluacion',
      },
    ],
  },
];

/** Minúsculas y sin acentos, para que «audiometria» encuentre «audiometría». */
const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const seccionesVisibles = computed(() => {
  const termino = normalizar(busqueda.value).trim();
  return SECCIONES.map((seccion) => ({
    ...seccion,
    opciones: seccion.opciones.filter((opcion) => {
      if (opcion.visible && !opcion.visible()) return false;
      if (!termino) return true;
      return normalizar(`${opcion.titulo} ${opcion.descripcion} ${opcion.claves ?? ''} ${seccion.titulo}`).includes(
        termino,
      );
    }),
  })).filter((seccion) => seccion.opciones.length > 0);
});

const claveOpcion = (opcion) => opcion.tipoDocumento ?? opcion.accion;

const trabajadorNombre = computed(() =>
  trabajadores.currentTrabajador ? formatNombreCompleto(trabajadores.currentTrabajador) : '',
);

const closeModal = () => {
  emit('closeModal');
};

const handleBackdropClose = () => {
  if (showProfessionalDataModal.value || showConsentModal.value) return;
  closeModal();
};

useEscapeToClose(
  closeModal,
  () => !showProfessionalDataModal.value && !showConsentModal.value,
);

const abrirInasistencias = () => {
  executeIfCanManageOtrosDocumentos(() => {
    emit('openInasistencias');
    closeModal();
  }, 'registrar inasistencias a seguimientos');
};

const crearDocumento = async (opcion) => {
  if (!validateDocumentCreation(opcion.tipoDocumento)) return;

  const professionalValidation = await ensureProfessionalDataReady();
  if (!professionalValidation.isValid) {
    showProfessionalDataModal.value = true;
    return;
  }

  if (opcion.tipoDocumento === 'controlPrenatal' && trabajadores.currentTrabajador?.sexo === 'Masculino') {
    toast.open({
      message: `No puedes hacer control prenatal al sexo masculino.`,
      type: 'error',
    });
    return;
  }

  await navigateWithTreatmentConsent({
    trabajadorId: trabajadores.currentTrabajadorId,
    trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
    to: {
      name: 'crear-documento',
      params: {
        idEmpresa: empresas.currentEmpresaId,
        ...(opcion.conCentroTrabajo ? { idCentroTrabajo: centrosTrabajo.currentCentroTrabajoId } : {}),
        idTrabajador: trabajadores.currentTrabajadorId,
        tipoDocumento: opcion.tipoDocumento,
      },
    },
  });
  closeModal();
};

const seleccionar = (opcion) => {
  if (opcion.accion === 'inasistencias') {
    abrirInasistencias();
    return;
  }
  return crearDocumento(opcion);
};

/** Enter en el buscador abre el primer resultado. */
const seleccionarPrimerResultado = () => {
  if (!busqueda.value.trim()) return;
  const primera = seccionesVisibles.value[0]?.opciones[0];
  if (primera) seleccionar(primera);
};
</script>

<template>
  <div class="modal modal-cuestionarios fixed top-0 left-0 z-10 p-4 sm:p-8 h-screen w-full grid place-items-center">
    <div class="modal-work-overlay absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm" @click="handleBackdropClose" />
    <div
      class="modal-work-panel modal-inner relative bg-white text-gray-900 w-full max-w-3xl rounded-lg shadow-md shadow-slate-900 max-h-[90vh] flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cuestionarios-titulo"
    >
      <div class="modal-cuestionarios-encabezado shrink-0 px-5 sm:px-7 pt-5 pb-4 border-b border-gray-200">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h1 id="modal-cuestionarios-titulo" class="text-2xl font-medium leading-tight">Otros documentos</h1>
            <p v-if="trabajadorNombre" class="modal-cuestionarios-trabajador mt-1 text-sm text-gray-600 truncate" data-trabajador>
              <i class="fas fa-user text-emerald-600 text-xs mr-1" aria-hidden="true"></i>
              Para <span class="font-medium text-gray-800">{{ trabajadorNombre }}</span>
              <template v-if="trabajadores.currentTrabajador?.puesto"> · {{ trabajadores.currentTrabajador.puesto }}</template>
            </p>
            <p v-else class="mt-1 text-sm text-gray-600">Selecciona el documento a crear</p>
          </div>
          <button
            type="button"
            class="modal-close shrink-0 -mt-1 -mr-2 h-10 w-10 flex justify-center items-center rounded-full text-3xl leading-none text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Cerrar"
            @click="closeModal"
          >
            &times;
          </button>
        </div>

        <div class="relative mt-4">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" aria-hidden="true"></i>
          <input
            ref="campoBusqueda"
            v-model="busqueda"
            type="search"
            class="modal-cuestionarios-busqueda w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            placeholder="Buscar documento, por ejemplo: audiometría"
            aria-label="Buscar documento"
            @keydown.enter.prevent="seleccionarPrimerResultado"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5">
        <section v-for="seccion in seccionesVisibles" :key="seccion.clave" :data-seccion="seccion.clave">
          <h2 class="flex items-center text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
            <i :class="seccion.icono" class="text-emerald-500 mr-2" aria-hidden="true"></i>
            {{ seccion.titulo }}
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              v-for="opcion in seccion.opciones"
              :key="claveOpcion(opcion)"
              type="button"
              class="questionnaire-option group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors duration-150 hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              :data-opcion="claveOpcion(opcion)"
              @click="seleccionar(opcion)"
            >
              <span
                class="questionnaire-option-icono flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                :class="
                  opcion.accion
                    ? 'bg-amber-100 text-amber-700 group-hover:bg-amber-200'
                    : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200'
                "
              >
                <i :class="opcion.icono" aria-hidden="true"></i>
              </span>
              <span class="min-w-0">
                <span class="questionnaire-option-titulo flex flex-wrap items-center gap-x-2 text-sm font-medium leading-snug text-gray-900">
                  {{ opcion.titulo }}
                  <span
                    v-if="opcion.nuevo"
                    class="questionnaire-option-nuevo rounded-full bg-emerald-100 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-emerald-700"
                  >
                    Nuevo
                  </span>
                </span>
                <span class="questionnaire-option-descripcion block text-xs leading-snug text-gray-500">
                  {{ opcion.descripcion }}
                </span>
              </span>
            </button>
          </div>
        </section>

        <p v-if="seccionesVisibles.length === 0" class="py-8 text-center text-sm text-gray-500" data-sin-resultados>
          Ningún documento coincide con «{{ busqueda.trim() }}».
        </p>
      </div>
    </div>

    <Transition appear name="fade">
        <ModalDatosProfesionales
        v-if="showProfessionalDataModal"
        :missingFields="validationResult.missingFields"
        :routeName="validationResult.routeName"
        :firmanteTypeLabel="validationResult.firmanteTypeLabel"
        @closeModal="showProfessionalDataModal = false"
        @navigateToConfig="() => { showProfessionalDataModal = false; closeModal(); }"
      />
    </Transition>

    <Transition appear name="fade">
      <TreatmentConsentModal
        v-if="showConsentModal"
        :trabajadorId="modalTrabajadorId"
        :trabajadorNombre="modalTrabajadorNombre"
        :open="showConsentModal"
        @registered="handleConsentRegistered"
        @cancel="handleConsentCancel"
      />
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
