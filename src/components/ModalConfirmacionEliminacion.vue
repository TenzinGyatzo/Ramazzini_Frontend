<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useVerificacionEliminacion } from '@/composables/useVerificacionEliminacion';
import { useEscapeToClose } from '@/composables/useEscapeToClose';

const props = defineProps({
  isVisible: {
    type: Boolean,
    required: true,
  },
  selectedCount: {
    type: Number,
    required: true,
  },
  selectedRoutes: {
    type: Array as () => string[],
    required: true,
  },
  nivel: {
    type: String as () => 'simple' | 'moderado',
    default: 'simple',
  },
});

const emit = defineEmits(['confirm', 'cancel']);

const isConfirming = ref(false);
const {
  password,
  error,
  verifying,
  verificar,
  reset,
} = useVerificacionEliminacion();

watch(
  () => props.isVisible,
  (visible) => {
    if (!visible) reset();
  },
);

const requierePassword = computed(() => props.nivel === 'moderado');
const isBusy = computed(() => isConfirming.value || verifying.value);

const handleConfirm = async () => {
  if (isBusy.value) return;

  if (requierePassword.value) {
    const passwordOk = await verificar();
    if (!passwordOk) return;
  }

  isConfirming.value = true;
  try {
    emit('confirm');
  } finally {
    isConfirming.value = false;
  }
};

const handleCancel = () => {
  if (isBusy.value) return;
  reset();
  emit('cancel');
};

useEscapeToClose(handleCancel, () => props.isVisible && !isBusy.value);

// Computed para mostrar información de los documentos seleccionados
const documentTypes = computed<Record<string, number>>(() => {
  const types: Record<string, number> = {};

  props.selectedRoutes.forEach(route => {
    if (route.includes('Nota Aclaratoria')) {
      types.notasAclaratorias = (types.notasAclaratorias || 0) + 1;
    }
    else if (route.includes('Constancia de Aptitud')) {
      types.constanciasAptitud = (types.constanciasAptitud || 0) + 1;
    }
    else if (route.includes('Aptitud')) {
      types.aptitudes = (types.aptitudes || 0) + 1;
    }
    else if (route.includes('Historia Clinica')) {
      types.historiasClinicas = (types.historiasClinicas || 0) + 1;
    }
    else if (route.includes('Exploracion Fisica')) {
      types.exploracionesFisicas = (types.exploracionesFisicas || 0) + 1;
    }
    else if (route.includes('Examen Vista')) {
      types.examenesVista = (types.examenesVista || 0) + 1;
    }
    else if (route.includes('Historia Otologica')) {
      types.historiaOtologica = (types.historiaOtologica || 0) + 1;
    }
    else if (route.includes('Audiometria')) {
      types.audiometrias = (types.audiometrias || 0) + 1;
    }
    else if (route.includes('Antidoping')) {
      types.antidopings = (types.antidopings || 0) + 1;
    }
    else if (route.includes('Certificado Expedito')) {
      types.certificadosExpedito = (types.certificadosExpedito || 0) + 1;
    }
    else if (route.includes('Certificado')) {
      types.certificados = (types.certificados || 0) + 1;
    }
    else if (route.includes('Receta')) {
      types.recetas = (types.recetas || 0) + 1;
    }
    else if (route.includes('Previo Espirometria')) {
      types.previoEspirometria = (types.previoEspirometria || 0) + 1;
    }
    else if (route.includes('Nota Medica')) {
      types.notasMedicas = (types.notasMedicas || 0) + 1;
    }
    else if (route.includes('Entrevista Psicologica')) {
      types.entrevistasPsicologicas = (types.entrevistasPsicologicas || 0) + 1;
    }
    else if (route.includes('Trastornos Estado Animo')) {
      types.trastornosEstadoAnimo = (types.trastornosEstadoAnimo || 0) + 1;
    }
    else if (route.includes('Cuestionario Prodromal Breve')) {
      types.cuestionarioProdromalBreve = (types.cuestionarioProdromalBreve || 0) + 1;
    }
    else if (route.includes('Trastorno Limite Personalidad')) {
      types.trastornoLimitePersonalidad = (types.trastornoLimitePersonalidad || 0) + 1;
    }
    else if (route.includes('Control Prenatal')) {
      types.controlPrenatal = (types.controlPrenatal || 0) + 1;
    }
    else if (route.includes('Evento Seguimiento Cardiometabolico')) {
      types.eventoSeguimientoCardiometabolico = (types.eventoSeguimientoCardiometabolico || 0) + 1;
    }
    else if (route.includes('Informe Longitudinal Cardiometabolico')) {
      types.informeLongitudinalCardiometabolico = (types.informeLongitudinalCardiometabolico || 0) + 1;
    }
    else if (route.includes('Documento Externo')) {
      types.documentosExternos = (types.documentosExternos || 0) + 1;
    }
    // Si la ruta no contiene ninguno de los tipos específicos pero tiene extensión, es un documento externo
    else if (!route.includes('Nota Aclaratoria') && !route.includes('Constancia de Aptitud') && !route.includes('Aptitud') && !route.includes('Historia Clinica')
            && !route.includes('Exploracion Fisica') && !route.includes('Examen Vista') && !route.includes('Historia Otologica') && !route.includes('Audiometria') && !route.includes('Antidoping')
            && !route.includes('Certificado') && !route.includes('Certificado Expedito') && !route.includes('Previo Espirometria') && !route.includes('Nota Medica') && !route.includes('Receta')
            && !route.includes('Entrevista Psicologica') && !route.includes('Trastornos Estado Animo') && !route.includes('Cuestionario Prodromal Breve') && !route.includes('Trastorno Limite Personalidad')
            && !route.includes('Control Prenatal') && !route.includes('Evento Seguimiento Cardiometabolico') && !route.includes('Informe Longitudinal Cardiometabolico')
            && (route.includes('.pdf') || route.includes('.png') || route.includes('.jpg') || route.includes('.jpeg') || route.includes('.doc') || route.includes('.docx'))) {
      types.documentosExternos = (types.documentosExternos || 0) + 1;
    }
  });

  return types;
});
</script>

<template>
  <Transition name="modal-fade" appear>
    <div v-if="isVisible" class="fixed inset-0 z-50 overflow-y-auto">
      <!-- Overlay -->
      <div class="flex items-center justify-center min-h-screen px-4 py-6" @click.self="handleCancel">
        <div class="fixed inset-0 transition-opacity pointer-events-none" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <!-- Modal -->
        <div class="modal-confirmacion-eliminacion modal-eliminacion relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-lg mx-auto">
          <!-- Header -->
          <div class="bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3 sm:px-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  <i class="fas fa-exclamation-triangle text-white text-xl"></i>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">
                    Confirmar Eliminación Masiva
                  </h3>
                  <p class="text-red-100 text-sm">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <i class="fas fa-trash-alt text-red-600 text-lg"></i>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900">
                  ¿Estás seguro?
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    Estás a punto de eliminar <span class="font-semibold text-red-600">{{ selectedCount }} documento{{ selectedCount !== 1 ? 's' : '' }}</span> de forma permanente.
                  </p>

                  <!-- Detalles de documentos -->
                  <div v-if="Object.keys(documentTypes).length > 0" class="mt-4 bg-gray-50 rounded-lg p-3">
                    <p class="text-xs font-medium text-gray-700 mb-2">Documentos a eliminar:</p>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                      <div v-if="documentTypes.notasAclaratorias" class="flex items-center space-x-2">
                        <i class="fas fa-exclamation-triangle text-orange-600"></i>
                        <span>{{ documentTypes.notasAclaratorias }} Nota{{ documentTypes.notasAclaratorias !== 1 ? 's' : '' }} Aclaratoria{{ documentTypes.notasAclaratorias !== 1 ? 's' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.constanciasAptitud" class="flex items-center space-x-2">
                        <i class="fas fa-user-check text-green-600"></i>
                        <span>{{ documentTypes.constanciasAptitud }} Constancia{{ documentTypes.constanciasAptitud !== 1 ? 's' : '' }} de Aptitud{{ documentTypes.constanciasAptitud !== 1 ? 's' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.aptitudes" class="flex items-center space-x-2">
                        <i class="fas fa-user-check text-green-600"></i>
                        <span>{{ documentTypes.aptitudes }} Aptitud{{ documentTypes.aptitudes !== 1 ? 'es' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.historiasClinicas" class="flex items-center space-x-2">
                        <i class="fas fa-notes-medical text-teal-600"></i>
                        <span>{{ documentTypes.historiasClinicas }} Historia{{ documentTypes.historiasClinicas !== 1 ? 's' : '' }} Clínica{{ documentTypes.historiasClinicas !== 1 ? 's' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.exploracionesFisicas" class="flex items-center space-x-2">
                        <i class="fas fa-person text-indigo-600"></i>
                        <span>{{ documentTypes.exploracionesFisicas }} Exploración{{ documentTypes.exploracionesFisicas !== 1 ? 'es' : '' }} Física</span>
                      </div>
                      <div v-if="documentTypes.examenesVista" class="flex items-center space-x-2">
                        <i class="fas fa-eye text-yellow-600"></i>
                        <span>{{ documentTypes.examenesVista }} Examen{{ documentTypes.examenesVista !== 1 ? 'es' : '' }} Vista</span>
                      </div>
                      <div v-if="documentTypes.historiaOtologica" class="flex items-center space-x-2">
                        <i class="fas fa-ear-deaf text-purple-600"></i>
                        <span>{{ documentTypes.historiaOtologica }} Historia{{ documentTypes.historiaOtologica !== 1 ? 's' : '' }} Otológica{{ documentTypes.historiaOtologica !== 1 ? 's' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.audiometrias" class="flex items-center space-x-2">
                        <i class="fas fa-volume-up text-purple-600"></i>
                        <span>{{ documentTypes.audiometrias }} Audiometría{{ documentTypes.audiometrias !== 1 ? 's' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.antidopings" class="flex items-center space-x-2">
                        <i class="fas fa-flask text-red-600"></i>
                        <span>{{ documentTypes.antidopings }} Antidoping{{ documentTypes.antidopings !== 1 ? 's' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.certificados" class="flex items-center space-x-2">
                        <i class="fas fa-certificate text-blue-600"></i>
                        <span>{{ documentTypes.certificados }} Certificado{{ documentTypes.certificados !== 1 ? 's' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.recetas" class="flex items-center space-x-2">
                        <i class="fas fa-prescription-bottle-medical text-rose-600"></i>
                        <span>{{ documentTypes.recetas }} Receta{{ documentTypes.recetas !== 1 ? 's' : '' }} Médica{{ documentTypes.recetas !== 1 ? 's' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.documentosExternos" class="flex items-center space-x-2">
                        <i class="fas fa-file-alt text-purple-600"></i>
                        <span>{{ documentTypes.documentosExternos }} Documento{{ documentTypes.documentosExternos !== 1 ? 's' : '' }} Externo{{ documentTypes.documentosExternos !== 1 ? 's' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.notasMedicas" class="flex items-center space-x-2">
                        <i class="fas fa-stethoscope text-pink-600"></i>
                        <span>{{ documentTypes.notasMedicas }} Nota{{ documentTypes.notasMedicas !== 1 ? 's' : '' }} Médica{{ documentTypes.notasMedicas !== 1 ? 's' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.previoEspirometria" class="flex items-center space-x-2">
                        <i class="fas fa-lungs text-sky-600"></i>
                        <span>{{ documentTypes.previoEspirometria }} Previo{{ documentTypes.previoEspirometria !== 1 ? 's' : '' }} Espirometría{{ documentTypes.previoEspirometria !== 1 ? 's' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.controlPrenatal" class="flex items-center space-x-2">
                        <i class="fas fa-baby text-pink-600"></i>
                        <span>{{ documentTypes.controlPrenatal }} Control{{ documentTypes.controlPrenatal !== 1 ? 'es' : '' }} Prenatal</span>
                      </div>
                      <div v-if="documentTypes.certificadosExpedito" class="flex items-center space-x-2">
                        <i class="fas fa-certificate text-indigo-600"></i>
                        <span>{{ documentTypes.certificadosExpedito }} Certificado{{ documentTypes.certificadosExpedito !== 1 ? 's' : '' }} Expedito</span>
                      </div>
                      <div v-if="documentTypes.entrevistasPsicologicas" class="flex items-center space-x-2">
                        <i class="fa-regular fa-comments text-slate-600"></i>
                        <span>{{ documentTypes.entrevistasPsicologicas }} Entrevista{{ documentTypes.entrevistasPsicologicas !== 1 ? 's' : '' }} Psicológica{{ documentTypes.entrevistasPsicologicas !== 1 ? 's' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.trastornosEstadoAnimo" class="flex items-center space-x-2">
                        <i class="fas fa-wave-square text-purple-600"></i>
                        <span>{{ documentTypes.trastornosEstadoAnimo }} Trastornos{{ documentTypes.trastornosEstadoAnimo !== 1 ? 'es' : '' }} Estado{{ documentTypes.trastornosEstadoAnimo !== 1 ? 'es' : '' }} Animo{{ documentTypes.trastornosEstadoAnimo !== 1 ? 'es' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.cuestionarioProdromalBreve" class="flex items-center space-x-2">
                        <i class="fas fa-brain text-purple-600"></i>
                        <span>{{ documentTypes.cuestionarioProdromalBreve }} Cuestionario{{ documentTypes.cuestionarioProdromalBreve !== 1 ? 's' : '' }} Prodromal{{ documentTypes.cuestionarioProdromalBreve !== 1 ? 's' : '' }} Breve{{ documentTypes.cuestionarioProdromalBreve !== 1 ? 's' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.trastornoLimitePersonalidad" class="flex items-center space-x-2">
                        <i class="fas fa-heart-crack text-purple-600"></i>
                        <span>{{ documentTypes.trastornoLimitePersonalidad }} Trastorno{{ documentTypes.trastornoLimitePersonalidad !== 1 ? 'es' : '' }} Limite{{ documentTypes.trastornoLimitePersonalidad !== 1 ? 'es' : '' }} Personalidad{{ documentTypes.trastornoLimitePersonalidad !== 1 ? 'es' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.eventoSeguimientoCardiometabolico" class="flex items-center space-x-2">
                        <i class="fas fa-heartbeat text-purple-600"></i>
                        <span>{{ documentTypes.eventoSeguimientoCardiometabolico }} Evento{{ documentTypes.eventoSeguimientoCardiometabolico !== 1 ? 's' : '' }} Seguimiento{{ documentTypes.eventoSeguimientoCardiometabolico !== 1 ? 's' : '' }} Cardiometabolico{{ documentTypes.eventoSeguimientoCardiometabolico !== 1 ? 's' : '' }}</span>
                      </div>
                      <div v-if="documentTypes.informeLongitudinalCardiometabolico" class="flex items-center space-x-2">
                        <i class="fas fa-file-alt text-purple-600"></i>
                        <span>{{ documentTypes.informeLongitudinalCardiometabolico }} Informe{{ documentTypes.informeLongitudinalCardiometabolico !== 1 ? 's' : '' }} Longitudinal{{ documentTypes.informeLongitudinalCardiometabolico !== 1 ? 's' : '' }} Cardiometabolico{{ documentTypes.informeLongitudinalCardiometabolico !== 1 ? 's' : '' }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="requierePassword" class="mt-4 space-y-1">
                    <label class="block text-xs font-medium text-gray-700">
                      Confirma tu contraseña
                    </label>
                    <input
                      v-model="password"
                      type="password"
                      autocomplete="current-password"
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                      placeholder="Tu contraseña"
                      @keyup.enter="handleConfirm"
                    />
                    <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              @click="handleConfirm"
              :disabled="isBusy"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i v-if="isBusy" class="fas fa-spinner fa-spin mr-2"></i>
              <i v-else class="fas fa-trash-alt mr-2"></i>
              {{ isBusy ? 'Eliminando...' : 'Sí, eliminar' }}
            </button>
            <button
              type="button"
              @click="handleCancel"
              :disabled="isBusy"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>