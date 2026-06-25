<script setup>
import { inject, computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';
import { useProfessionalDataValidation } from '@/composables/useProfessionalDataValidation';
import { useNavigateWithTreatmentConsent } from '@/composables/useNavigateWithTreatmentConsent';
import { useEscapeToClose } from '@/composables/useEscapeToClose';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import ModalDatosProfesionales from '@/components/modals/ModalDatosProfesionales.vue';
import TreatmentConsentModal from '@/components/TreatmentConsentModal.vue';

const toast = inject('toast');

const emit = defineEmits(['closeModal', 'openSeguimientoProgramado']);
const router = useRouter();
const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const proveedorSaludStore = useProveedorSaludStore();
const { validateDocumentCreation, executeIfCanManageOtrosDocumentos } = usePermissionRestrictions();
const { validationResult, loadFirmanteData } = useProfessionalDataValidation();
const {
  navigateWithTreatmentConsent,
  showModal: showConsentModal,
  modalTrabajadorId,
  modalTrabajadorNombre,
  handleConsentRegistered,
  handleConsentCancel,
} = useNavigateWithTreatmentConsent();

const showProfessionalDataModal = ref(false);

const isMX = computed(() => {
  return proveedorSaludStore.isMX;
});

const notaAclaratoriaEnabled = computed(() => {
  return proveedorSaludStore.notaAclaratoriaEnabled;
});

onMounted(async () => {
  await loadFirmanteData();
});

const QUESTIONNAIRE_TIPO_MAP = {
  'receta': 'receta',
  'constancia-aptitud': 'constanciaAptitud',
  'certificado-expedito': 'certificadoExpedito',
  'control-prenatal': 'controlPrenatal',
  'historia-otologica': 'historiaOtologica',
  'previo-espirometria': 'previoEspirometria',
  'entrevista-psicologica': 'entrevistaPsicologica',
  'trastornos-estado-animo': 'trastornosEstadoAnimo',
  'cuestionario-prodromal-breve': 'cuestionarioProdromalBreve',
  'trastorno-limite-personalidad': 'trastornoLimitePersonalidad',
  'evento-seguimiento-cardiometabolico': 'eventoSeguimientoCardiometabolico',
  'informe-longitudinal-cardiometabolico': 'informeLongitudinalCardiometabolico',
};

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

const questionnaireToDocumentType = {
  'control-prenatal': 'controlPrenatal',
  'constancia-aptitud': 'constanciaAptitud',
  'receta': 'receta',
  'certificado-expedito': 'certificadoExpedito',
  'historia-otologica': 'historiaOtologica',
  'previo-espirometria': 'previoEspirometria',
  'nota-aclaratoria': 'notaAclaratoria',
  'entrevista-psicologica': 'entrevistaPsicologica',
  'trastornos-estado-animo': 'trastornosEstadoAnimo',
  'cuestionario-prodromal-breve': 'cuestionarioProdromalBreve',
  'trastorno-limite-personalidad': 'trastornoLimitePersonalidad',
  'evento-seguimiento-cardiometabolico': 'eventoSeguimientoCardiometabolico',
  'informe-longitudinal-cardiometabolico': 'informeLongitudinalCardiometabolico',
};

const openModalSeguimientosProgramados = () => {
  executeIfCanManageOtrosDocumentos(() => {
    emit('openSeguimientoProgramado');
    closeModal();
  }, 'acceder a cuestionarios adicionales');
};

// Función para manejar la selección de cuestionarios
const handleQuestionnaireSelect = async (questionnaireType) => {
  const documentType = questionnaireToDocumentType[questionnaireType];
  if (documentType && !validateDocumentCreation(documentType)) {
    return;
  }

  if (!validationResult.value.isValid) {
    showProfessionalDataModal.value = true;
    return;
  }

  if (questionnaireType === 'control-prenatal') {
    if (trabajadores.currentTrabajador?.sexo === 'Masculino') {
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
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'controlPrenatal'
        }
      },
    });
    closeModal();
  } else if (questionnaireType === 'constancia-aptitud') {
    await navigateWithTreatmentConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      to: {
        name: 'crear-documento',
        params: {
          idEmpresa: empresas.currentEmpresaId,
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'constanciaAptitud'
        }
      },
    });
    closeModal();
  } else if (questionnaireType === 'receta') {
    await navigateWithTreatmentConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      to: {
        name: 'crear-documento',
        params: {
          idEmpresa: empresas.currentEmpresaId,
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'receta'
        }
      },
    });
    closeModal();
  } else if (questionnaireType === 'certificado-expedito') {
    await navigateWithTreatmentConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      to: {
        name: 'crear-documento',
        params: {
          idEmpresa: empresas.currentEmpresaId,
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'certificadoExpedito'
        }
      },
    });
    closeModal();
  } else if (questionnaireType === 'historia-otologica') {
    await navigateWithTreatmentConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      to: {
        name: 'crear-documento',
        params: {
          idEmpresa: empresas.currentEmpresaId,
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'historiaOtologica'
        }
      },
    });
    closeModal();
  } else if (questionnaireType === 'previo-espirometria') {
    await navigateWithTreatmentConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      to: {
        name: 'crear-documento',
        params: {
          idEmpresa: empresas.currentEmpresaId,
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'previoEspirometria'
        }
      },
    });
    closeModal();
  } else if (questionnaireType === 'nota-aclaratoria') {
    await navigateWithTreatmentConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      to: {
        name: 'crear-documento',
        params: {
          idEmpresa: empresas.currentEmpresaId,
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'notaAclaratoria'
        }
      },
    });
    closeModal();
  } else if (questionnaireType === 'entrevista-psicologica') {
    await navigateWithTreatmentConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      to: {
        name: 'crear-documento',
        params: {
          idEmpresa: empresas.currentEmpresaId,
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'entrevistaPsicologica'
        }
      },
    });
    closeModal();
  } else if (questionnaireType === 'trastornos-estado-animo') {
    await navigateWithTreatmentConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      to: {
        name: 'crear-documento',
        params: {
          idEmpresa: empresas.currentEmpresaId,
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'trastornosEstadoAnimo'
        }
      },
    });
    closeModal();
  } else if (questionnaireType === 'cuestionario-prodromal-breve') {
    await navigateWithTreatmentConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      to: {
        name: 'crear-documento',
        params: {
          idEmpresa: empresas.currentEmpresaId,
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'cuestionarioProdromalBreve'
        }
      },
    });
    closeModal();
  } else if (questionnaireType === 'trastorno-limite-personalidad') {
    await navigateWithTreatmentConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      to: {
        name: 'crear-documento',
        params: {
          idEmpresa: empresas.currentEmpresaId,
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'trastornoLimitePersonalidad'
        }
      },
    });
    closeModal();
  } else if (questionnaireType === 'evento-seguimiento-cardiometabolico') {
    await navigateWithTreatmentConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      to: {
        name: 'crear-documento',
        params: {
          idEmpresa: empresas.currentEmpresaId,
          idCentroTrabajo: centrosTrabajo.currentCentroTrabajoId,
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'eventoSeguimientoCardiometabolico',
        },
      },
    });
    closeModal();
  } else if (questionnaireType === 'informe-longitudinal-cardiometabolico') {
    await navigateWithTreatmentConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      to: {
        name: 'crear-documento',
        params: {
          idEmpresa: empresas.currentEmpresaId,
          idCentroTrabajo: centrosTrabajo.currentCentroTrabajoId,
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'informeLongitudinalCardiometabolico',
        },
      },
    });
    closeModal();
  }
};
</script>

<template>
  <div class="modal modal-cuestionarios fixed top-0 left-0 z-10 p-8 h-screen w-full grid place-items-center">
    <div class="modal-work-overlay absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm" @click="handleBackdropClose" />
    <div
      class="modal-work-panel modal-inner relative bg-white text-gray-900 w-full sm:w-4/5 md:w-3/5 xl:w-2/5 2xl:w-1/3 p-10 rounded-lg shadow-md shadow-slate-900 max-h-[90vh] overflow-y-auto">
        <div
          class="modal-close absolute h-16 w-16 flex justify-center items-center top-0 right-0 text-5xl text-gray-400 hover:text-gray-500 cursor-pointer"
          @click="closeModal">
          &times;
        </div>

        <h1 class="text-3xl mb-2">Otros documentos</h1>
        <p class="text-gray-600 mb-4">Selecciona el documento a crear</p>
        <hr class="mt-2 mb-6">

        <div class="space-y-6">
          <div class="space-y-3">
            <div class="flex items-center text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
              <i class="fas fa-file text-emerald-500 mr-3"></i>
              Miscelaneos
            </div>
            <div class="space-y-2">
              <button
                v-if="isMX && notaAclaratoriaEnabled"
                type="button"
                @click="handleQuestionnaireSelect('nota-aclaratoria')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300"
              >
                <i class="fas fa-file-alt text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Nota Aclaratoria
              </button>
              <button type="button" @click="handleQuestionnaireSelect('receta')" class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300">
                <i class="fas fa-prescription-bottle-medical text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Receta Médica
              </button>
              <button type="button" @click="handleQuestionnaireSelect('constancia-aptitud')" class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300">
                <i class="fas fa-file-alt text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Constancia de Aptitud
              </button>
              <button type="button" @click="handleQuestionnaireSelect('certificado-expedito')" class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300">
                <i class="fas fa-file-alt text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Certificado Expedito
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
              <i class="fas fa-user-circle text-emerald-500 mr-3"></i>
              Condición Personal
            </div>
            <div class="space-y-2">
              <div class="flex flex-col sm:flex-row gap-2">
                <button type="button" @click="handleQuestionnaireSelect('evento-seguimiento-cardiometabolico')" class="questionnaire-option flex-1 min-w-0 text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center gap-2 group border border-gray-200 hover:border-emerald-300">
                  <i class="fas fa-heartbeat text-emerald-500 text-sm group-hover:text-emerald-600 shrink-0" />
                  <span class="min-w-0">Evento Seguimiento Cardiometabólico</span>
                </button>
                <button
                  type="button"
                  class="questionnaire-option shrink-0 sm:w-40 px-4 py-3 rounded-lg hover:bg-slate-50 text-sm text-slate-700 transition-colors duration-150 flex flex-col sm:flex-row items-center justify-center gap-2 border border-gray-200 hover:border-slate-400"
                  title="Citas y estados sin valoración clínica PDF"
                  @click="openModalSeguimientosProgramados">
                  <i class="fas fa-calendar-check text-slate-600 text-base" />
                  <span class="text-center leading-tight">Citas</span>
                </button>
              </div>
              <button type="button" @click="handleQuestionnaireSelect('informe-longitudinal-cardiometabolico')" class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300">
                <i class="fas fa-file-alt text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                <span class="min-w-0">Informe Longitudinal Cardiometabólico</span>
              </button>
              <button type="button" @click="handleQuestionnaireSelect('control-prenatal')" class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300">
                <i class="fas fa-baby text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Control Prenatal (Embarazo y Lactancia)
              </button>
              <button
                type="button"
                disabled
                class="questionnaire-option questionnaire-option--disabled w-full text-left px-4 py-3 rounded-lg text-sm flex items-center group border border-gray-200">
                <i class="fas fa-bone mr-3 text-sm"></i>
                Condiciones muscoesqueléticas
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
              <i class="fas fa-clipboard-question text-emerald-500 mr-3"></i>
              Cuestionarios previos a estudios de gabinete
            </div>
            <div class="space-y-2">
              <button type="button" @click="handleQuestionnaireSelect('historia-otologica')" class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300">
                <i class="fas fa-ear-deaf text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Historia Otológica (Previo a Audiometría)
              </button>
              <button type="button" @click="handleQuestionnaireSelect('previo-espirometria')" class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300">
                <i class="fas fa-lungs text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Cuestionario Previo a Espirometría
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
              <i class="fas fa-exclamation-triangle text-emerald-500 mr-3"></i>
              Cuestionarios Psicologicos
            </div>
            <div class="space-y-2">
              <button type="button" @click="handleQuestionnaireSelect('entrevista-psicologica')" class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300">
                <i class="fa-regular fa-comments text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Entrevista Psicologica
              </button>
              <button type="button" @click="handleQuestionnaireSelect('trastornos-estado-animo')" class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300">
                <i class="fa-solid fa-wave-square text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Trastornos del Estado de Ánimo (MDQ)
              </button>
              <button type="button" @click="handleQuestionnaireSelect('cuestionario-prodromal-breve')" class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300">
                <i class="fa-solid fa-brain text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Cuestionario Prodromal Breve (PQ-B)
              </button>
              <button type="button" @click="handleQuestionnaireSelect('trastorno-limite-personalidad')" class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300">
                <i class="fa-solid fa-heart-crack text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Prueba del trastorno límite de personalidad (MSI-BPD)
              </button>
            </div>
          </div>
        </div>

        <div class="mt-8">
          <button
            type="button"
            class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            @click="closeModal">
            Cerrar
          </button>
        </div>
      </div>

    <Transition appear name="fade">
      <ModalDatosProfesionales
        v-if="showProfessionalDataModal"
        :missingFields="validationResult.missingFields"
        :routeName="validationResult.routeName"
        :firmanteTypeLabel="validationResult.firmanteTypeLabel"
        @closeModal="showProfessionalDataModal = false"
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
.questionnaire-option--disabled,
.questionnaire-option:disabled {
  background-color: #f9fafb;
  border-color: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.65;
  pointer-events: none;
}

.questionnaire-option--disabled i,
.questionnaire-option:disabled i {
  color: #9ca3af;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>