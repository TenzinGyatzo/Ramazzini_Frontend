<script setup>
import { inject, computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';
import { useProfessionalDataValidation } from '@/composables/useProfessionalDataValidation';
import { useNavigateWithDailyConsent } from '@/composables/useNavigateWithDailyConsent';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import ModalDatosProfesionales from '@/components/modals/ModalDatosProfesionales.vue';
import DailyConsentModal from '@/components/DailyConsentModal.vue';

const toast = inject('toast');

const emit = defineEmits(['closeModal']);
const router = useRouter();
const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const proveedorSaludStore = useProveedorSaludStore();
const { validateDocumentCreation } = usePermissionRestrictions();
const { validationResult, loadFirmanteData } = useProfessionalDataValidation();
const {
  navigateWithDailyConsent,
  showModal: showConsentModal,
  modalTrabajadorId,
  modalTrabajadorNombre,
  modalTrabajadorSexo,
  handleConsentRegistered,
  handleConsentCancel,
} = useNavigateWithDailyConsent();

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

const closeModal = () => {
  emit('closeModal');
};

const questionnaireToDocumentType = {
  'control-prenatal': 'controlPrenatal',
  'constancia-aptitud': 'constanciaAptitud',
  'receta': 'receta',
  'certificado-expedito': 'certificadoExpedito',
  'historia-otologica': 'historiaOtologica',
  'previo-espirometria': 'previoEspirometria',
  'nota-aclaratoria': 'notaAclaratoria',
  'lesion': 'lesion',
  'entrevista-psicologica': 'entrevistaPsicologica',
  'trastornos-estado-animo': 'trastornosEstadoAnimo',
  'cuestionario-prodromal-breve': 'cuestionarioProdromalBreve',
  'trastorno-limite-personalidad': 'trastornoLimitePersonalidad',
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
    await navigateWithDailyConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      trabajadorSexo: trabajadores.currentTrabajador?.sexo,
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
    await navigateWithDailyConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      trabajadorSexo: trabajadores.currentTrabajador?.sexo,
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
    await navigateWithDailyConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      trabajadorSexo: trabajadores.currentTrabajador?.sexo,
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
    await navigateWithDailyConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      trabajadorSexo: trabajadores.currentTrabajador?.sexo,
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
    await navigateWithDailyConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      trabajadorSexo: trabajadores.currentTrabajador?.sexo,
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
    await navigateWithDailyConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      trabajadorSexo: trabajadores.currentTrabajador?.sexo,
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
    await navigateWithDailyConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      trabajadorSexo: trabajadores.currentTrabajador?.sexo,
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
  } else if (questionnaireType === 'lesion') {
    await navigateWithDailyConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      trabajadorSexo: trabajadores.currentTrabajador?.sexo,
      to: {
        name: 'crear-documento',
        params: {
          idEmpresa: empresas.currentEmpresaId,
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'lesion'
        }
      },
    });
    closeModal();
  } else if (questionnaireType === 'entrevista-psicologica') {
    await navigateWithDailyConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      trabajadorSexo: trabajadores.currentTrabajador?.sexo,
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
    await navigateWithDailyConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      trabajadorSexo: trabajadores.currentTrabajador?.sexo,
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
    await navigateWithDailyConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      trabajadorSexo: trabajadores.currentTrabajador?.sexo,
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
    await navigateWithDailyConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      trabajadorSexo: trabajadores.currentTrabajador?.sexo,
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
  }
};
</script>

<template>
  <div class="modal modal-cuestionarios fixed top-0 left-0 z-10 p-8 h-screen w-full grid place-items-center">
    <!-- Fondo oscuro transparente -->
    <div class="absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm" @click="closeModal">
    </div>
    <Transition appear name="fade">
      <!-- Modal centrado con desplazamiento interno -->
      <div
        class="modal-inner relative bg-white text-gray-900 w-full sm:w-4/5 md:w-3/5 xl:w-2/5 2xl:w-1/3 p-10 rounded-lg shadow-md shadow-slate-900 max-h-[90vh] overflow-y-auto">
        <!-- Botón para cerrar el modal -->
        <div
          class="modal-close absolute h-16 w-16 flex justify-center items-center top-0 right-0 text-5xl text-gray-400 hover:text-gray-500 cursor-pointer"
          @click="closeModal">
          &times;
        </div>

        <h1 class="text-3xl mb-2">Otros documentos</h1>
        <p class="text-gray-600 mb-4">Selecciona el documento a crear</p>
        <hr class="mt-2 mb-6">

        <!-- Contenido del modal -->
        <div class="space-y-6">
          <!-- Trámites -->
          <div class="space-y-3">
            <div class="flex items-center text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
              <i class="fas fa-file text-emerald-500 mr-3"></i>
              Miscelaneos
            </div>
            <div class="space-y-2">
              <button
                v-if="isMX && notaAclaratoriaEnabled"
                @click="handleQuestionnaireSelect('nota-aclaratoria')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300"
              >
                <i class="fas fa-file-alt text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Nota Aclaratoria
              </button>
              <button
                @click="handleQuestionnaireSelect('lesion')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300"
              >
                <i class="fas fa-file-alt text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Lesión y/o Evento de Violencia
              </button>
              <button
                @click="handleQuestionnaireSelect('receta')"
                class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300"
                >
                <i class="fas fa-prescription-bottle-medical text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Receta Médica
              </button>
              <button
                @click="handleQuestionnaireSelect('constancia-aptitud')"
                class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300"
              >
                <i class="fas fa-file-alt text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Constancia de Aptitud
              </button>
              <button
                @click="handleQuestionnaireSelect('certificado-expedito')"
                class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300"
              >
                <i class="fas fa-file-alt text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Certificado Expedito
              </button>
            </div>
          </div>

          <!-- Cuestionarios previos a estudios de gabinete -->
          <div class="space-y-3">
            <div class="flex items-center text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
              <i class="fas fa-clipboard-question text-emerald-500 mr-3"></i>
              Cuestionarios previos a estudios de gabinete
            </div>
            <div class="space-y-2">
              <button
                @click="handleQuestionnaireSelect('historia-otologica')"
                class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300"
              >
                <i class="fas fa-ear-deaf text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Historia Otológica (Previo a Audiometría)
              </button>
              <button
                @click="handleQuestionnaireSelect('previo-espirometria')"
                class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300"
              >
                <i class="fas fa-lungs text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Cuestionario Previo a Espirometría
              </button>
            </div>
          </div>

          <!-- Cuestionarios Psicologicos -->
          <div class="space-y-3">
            <div class="flex items-center text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
              <i class="fas fa-exclamation-triangle text-emerald-500 mr-3"></i>
              Cuestionarios Psicologicos
            </div>
            <div class="space-y-2">
              <button
                @click="handleQuestionnaireSelect('entrevista-psicologica')"
                class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300"
              >
                <i class="fa-regular fa-comments text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Entrevista Psicologica
              </button>
              <button
                @click="handleQuestionnaireSelect('trastornos-estado-animo')"
                class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300"
              >
                <i class="fa-solid fa-wave-square text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Trastornos del Estado de Ánimo (MDQ)
              </button>
              <button
                @click="handleQuestionnaireSelect('cuestionario-prodromal-breve')"
                class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300"
              >
                <i class="fa-solid fa-brain text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Cuestionario Prodromal Breve (PQ-B)
              </button>
              <button
                @click="handleQuestionnaireSelect('trastorno-limite-personalidad')"
                class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300"
              >
                <i class="fa-solid fa-heart-crack text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Prueba del trastorno límite de personalidad (MSI-BPD)
              </button>
            </div>
          </div>

          <!-- Vigilancia médica por condición personal -->
          <div class="space-y-3">
            <div class="flex items-center text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
              <i class="fas fa-user-circle text-emerald-500 mr-3"></i>
              Condición Personal
            </div>
            <div class="space-y-2">
              <button
                @click="handleQuestionnaireSelect('control-prenatal')"
                class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300"
              >
                <i class="fas fa-baby text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Control Prenatal (Embarazo y Lactancia)
              </button>
              <button
                @click="handleQuestionnaireSelect('enfermedades-cronicas')"
                class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-heartbeat text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Enfermedades Crónicas
              </button>
              <button
                @click="handleQuestionnaireSelect('condiciones-muscoesqueleticas')"
                class="questionnaire-option w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-bone text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Condiciones muscoesqueléticas
              </button>
            </div>
          </div>

          <!-- Vigilancia médica por tipo de actividad o entorno laboral -->
          <!-- <div class="space-y-3">
            <div class="flex items-center text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
              <i class="fas fa-hard-hat text-emerald-500 mr-3"></i>
              Actividad/Entorno Laboral
            </div>
            <div class="space-y-2">
              <button
                @click="handleQuestionnaireSelect('trabajos-altura')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-warning text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Control de salud para POE a Trabajos en Altura
              </button>
              <button
                @click="handleQuestionnaireSelect('espacios-confinados')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-box text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Control de salud para POE a Espacios Confinados
              </button>
              <button
                @click="handleQuestionnaireSelect('temperaturas-extremas')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-thermometer-half text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Control de Salud para POE a Temperaturas Extremas
              </button>
              <button
                @click="handleQuestionnaireSelect('sustancias-peligrosas')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-flask text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Control de salud para POE a Manipulación de Sustancias Peligrosas
              </button>
              <button
                @click="handleQuestionnaireSelect('maquinaria-pesada')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-truck text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Control para POE a Conducción y Operación de Maquinaria Pesada
              </button>
            </div>
          </div> -->

          <!-- Vigilancia médica por riesgo específico -->
          <!-- <div class="space-y-3">
            <div class="flex items-center text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
              <i class="fas fa-exclamation-triangle text-emerald-500 mr-3"></i>
              Riesgo Específico
            </div>
            <div class="space-y-2">
              <button
                @click="handleQuestionnaireSelect('salud-auditiva')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-deaf text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Monitoreo de la Salud Auditiva
              </button>
              <button
                @click="handleQuestionnaireSelect('salud-respiratoria')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-lungs text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Monitoreo de la Salud Respiratoria
              </button>
              <button
                @click="handleQuestionnaireSelect('agentes-quimicos')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-atom text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Monitoreo por Exposición a Agentes Químicos
              </button>
              <button
                @click="handleQuestionnaireSelect('agentes-biologicos')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-bacteria text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Seguimiento Médico por Contacto con Agentes Biológicos
              </button>
            </div>
          </div> -->

          <!-- Vigilancia médica por ergonomía y carga física -->
          <!-- <div class="space-y-3">
            <div class="flex items-center text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
              <i class="fas fa-running text-emerald-500 mr-3"></i>
              Ergonomía y Carga Física
            </div>
            <div class="space-y-2">
              <button
                @click="handleQuestionnaireSelect('riesgos-ergonomicos')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-user-injured text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Riesgos por Posturas Prolongadas y Movimientos Repetitivos
              </button>
              <button
                @click="handleQuestionnaireSelect('manipulacion-cargas')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-dumbbell text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Riesgos por Manipulación Manual de Cargas
              </button>
            </div>
          </div> -->

          <!-- Vigilancia médica por factores psicosociales -->
          <!-- <div class="space-y-3">
            <div class="flex items-center text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
              <i class="fas fa-brain text-emerald-500 mr-3"></i>
              Factores Psicosociales
            </div>
            <div class="space-y-2">
              <button
                @click="handleQuestionnaireSelect('riesgo-psicosocial')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-chart-line text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Evaluación de Factores de Riesgo Psicosocial
              </button>
              <button
                @click="handleQuestionnaireSelect('estres-laboral')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 transition-colors duration-150 flex items-center group border border-gray-200 hover:border-emerald-300 disabled"
                disabled
              >
                <i class="fas fa-tired text-emerald-500 mr-3 text-sm group-hover:text-emerald-600"></i>
                Seguimiento de Estrés Laboral y Fatiga Mental
              </button>
            </div>
          </div> -->
        </div>

        <!-- Botón de cerrar -->
        <div class="mt-8">
          <button
            class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            @click="closeModal">
            Cerrar
          </button>
        </div>
      </div>
    </Transition>

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
      <DailyConsentModal
        v-if="showConsentModal"
        :trabajadorId="modalTrabajadorId"
        :trabajadorNombre="modalTrabajadorNombre"
        :trabajadorSexo="modalTrabajadorSexo"
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

/* Efectos de hover mejorados para los botones */
button:hover:not(.disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
}

/* Transiciones suaves */
button {
  transition: all 0.2s ease-in-out;
}

/* Efecto de escala en hover */
button:hover:not(.disabled) i {
  transform: scale(1.1);
}

button i {
  transition: transform 0.2s ease-in-out;
}

/* Estilos para botones deshabilitados */
button.disabled {
  opacity: 0.8;
  /* cursor: not-allowed; */
  background-color: #f3f4f6;
  color: #9ca3af;
  border-color: #d1d5db;
}

button.disabled:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  transform: none;
  box-shadow: none;
}

button.disabled i {
  color: #9ca3af;
}

button.disabled:hover i {
  transform: none;
  color: #9ca3af;
}

/* Dark mode: mantener contraste en botones deshabilitados */
:global(html.dark-mode) button.disabled,
:global(html.dark-mode) button:disabled {
  background-color: #1e293b !important;
  color: #94a3b8 !important;
  border-color: #475569 !important;
  opacity: 1 !important;
}

:global(html.dark-mode) button.disabled i,
:global(html.dark-mode) button:disabled i {
  color: #94a3b8 !important;
}

:global(html.dark-mode) button.disabled .text-emerald-700,
:global(html.dark-mode) button:disabled .text-emerald-700,
:global(html.dark-mode) button.disabled .text-emerald-600,
:global(html.dark-mode) button:disabled .text-emerald-600,
:global(html.dark-mode) button.disabled .text-emerald-500,
:global(html.dark-mode) button:disabled .text-emerald-500 {
  color: #94a3b8 !important;
}

:global(html.dark-mode) button.disabled:hover,
:global(html.dark-mode) button:disabled:hover {
  background-color: #1e293b !important;
  border-color: #475569 !important;
  transform: none;
  box-shadow: none;
}

:global(html.dark-mode) button.disabled:hover i,
:global(html.dark-mode) button:disabled:hover i {
  transform: none;
  color: #94a3b8 !important;
}

/* Dark mode: opciones del listado (no disabled) con hover más legible */
:global(html.dark-mode) .modal-inner .questionnaire-option:not(.disabled):not(:disabled) {
  background-color: #0f172a !important;
  border-color: #334155 !important;
  color: #a7f3d0 !important;
}

:global(html.dark-mode) .modal-inner .questionnaire-option:not(.disabled):not(:disabled) i {
  color: #34d399 !important;
}

:global(html.dark-mode) .modal-inner .questionnaire-option:not(.disabled):not(:disabled):hover {
  background-color: #1e293b !important;
  border-color: #10b981 !important;
  color: #d1fae5 !important;
}

:global(html.dark-mode) .modal-inner .questionnaire-option:not(.disabled):not(:disabled):hover i {
  color: #6ee7b7 !important;
}

/* Dark mode: opciones deshabilitadas del listado */
:global(html.dark-mode) .modal-inner .questionnaire-option.disabled,
:global(html.dark-mode) .modal-inner .questionnaire-option:disabled {
  background-color: #111827 !important;
  border-color: #334155 !important;
  color: #64748b !important;
  opacity: 1 !important;
}

:global(html.dark-mode) .modal-inner .questionnaire-option.disabled i,
:global(html.dark-mode) .modal-inner .questionnaire-option:disabled i {
  color: #64748b !important;
}
</style>
