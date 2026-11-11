<script setup>
import { ref, computed } from 'vue';

const emit = defineEmits(['close', 'apply-suggestion']);

const respuestas = ref({
  usoInstitucional: null,
  trazabilidadCompleta: null,
  exigenciaContractual: null
});

const todasRespondidas = computed(() => {
  return respuestas.value.usoInstitucional !== null &&
         respuestas.value.trazabilidadCompleta !== null &&
         respuestas.value.exigenciaContractual !== null;
});

const sugerencia = computed(() => {
  if (!todasRespondidas.value) return null;
  
  const respuestasSi = [
    respuestas.value.usoInstitucional,
    respuestas.value.trazabilidadCompleta,
    respuestas.value.exigenciaContractual
  ].filter(r => r === true).length;
  
  if (respuestasSi >= 2) {
    return 'SIRES_NOM024';
  } else if (respuestasSi <= 1) {
    return 'SIN_REGIMEN';
  }
  return null;
});

const explicacionSugerencia = computed(() => {
  if (!sugerencia.value) return '';
  
  if (sugerencia.value === 'SIRES_NOM024') {
    return 'Basado en tus respuestas, tu operación requiere cumplimiento normativo estricto y trazabilidad completa. Se recomienda elegir «Cumplimiento normativo».';
  } else {
    return 'Basado en tus respuestas, puedes continuar sin aplicar un régimen regulatorio específico. El sistema operará como plataforma clínica general.';
  }
});

const porcentajeCoincidencia = computed(() => {
  if (!todasRespondidas.value) return 0;
  
  const respuestasSi = [
    respuestas.value.usoInstitucional,
    respuestas.value.trazabilidadCompleta,
    respuestas.value.exigenciaContractual
  ].filter(r => r === true).length;
  
  if (sugerencia.value === 'SIRES_NOM024') {
    // Si sugiere SIRES, calcula basado en respuestas "Sí"
    return Math.round((respuestasSi / 3) * 100);
  } else {
    // Si sugiere SIN_REGIMEN, calcula basado en respuestas "No"
    const respuestasNo = 3 - respuestasSi;
    return Math.round((respuestasNo / 3) * 100);
  }
});

const aplicarSugerencia = () => {
  if (sugerencia.value) {
    emit('apply-suggestion', sugerencia.value);
  }
};

const cerrar = () => {
  emit('close');
};

const responder = (pregunta, valor) => {
  respuestas.value[pregunta] = valor;
};

// Computed para calcular progreso
const preguntas = [
  { key: 'usoInstitucional', numero: 1 },
  { key: 'trazabilidadCompleta', numero: 2 },
  { key: 'exigenciaContractual', numero: 3 }
];

const preguntaActual = computed(() => {
  if (respuestas.value.usoInstitucional === null) return 1;
  if (respuestas.value.trazabilidadCompleta === null) return 2;
  if (respuestas.value.exigenciaContractual === null) return 3;
  return 3;
});

const preguntasCompletadas = computed(() => {
  return preguntas.filter(p => respuestas.value[p.key] !== null).length;
});

const porcentajeProgreso = computed(() => {
  return Math.round((preguntasCompletadas.value / 3) * 100);
});

const preguntaCompletada = (numero) => {
  if (numero === 1) return respuestas.value.usoInstitucional !== null;
  if (numero === 2) return respuestas.value.trazabilidadCompleta !== null;
  if (numero === 3) return respuestas.value.exigenciaContractual !== null;
  return false;
};
</script>

<template>
  <Transition name="modal">
    <div class="fixed inset-0 z-50 overflow-y-auto" @click.self="cerrar">
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <!-- Overlay -->
        <Transition name="fade">
          <div
            v-if="true"
            class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
            @click="cerrar"
          ></div>
        </Transition>

        <!-- Modal -->
        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto"
          @click.stop
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          @keydown.esc="cerrar"
        >
          <!-- Header -->
          <div class="bg-emerald-600 px-4 py-3 sm:px-6">
            <div class="flex items-center justify-between mb-3">
              <h3 id="modal-title" class="text-lg font-medium text-white">
                ¿Debo aplicar un régimen regulatorio?
              </h3>
              <button
                @click="cerrar"
                class="text-white hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600 rounded"
                aria-label="Cerrar modal"
              >
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <!-- Barra de progreso -->
            <div class="mb-2">
              <div class="flex items-center justify-between text-sm text-emerald-100 mb-1">
                <span>Pregunta {{ preguntaActual }} de 3</span>
                <span>{{ porcentajeProgreso }}%</span>
              </div>
              <div class="w-full bg-emerald-700 rounded-full h-2 overflow-hidden">
                <div 
                  class="bg-white h-2 rounded-full transition-all duration-500 ease-out"
                  :style="{ width: `${porcentajeProgreso}%` }"
                ></div>
              </div>
            </div>
            
            <!-- Indicadores de preguntas -->
            <div class="flex gap-2 mt-2">
              <div 
                v-for="pregunta in preguntas" 
                :key="pregunta.numero"
                class="flex-1 flex items-center justify-center"
              >
                <div 
                  class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                  :class="preguntaCompletada(pregunta.numero) 
                    ? 'bg-emerald-500 text-white' 
                    : preguntaActual === pregunta.numero
                    ? 'bg-white text-emerald-600 ring-2 ring-white'
                    : 'bg-emerald-700 text-emerald-200'"
                >
                  <i v-if="preguntaCompletada(pregunta.numero)" class="fas fa-check text-xs"></i>
                  <span v-else>{{ pregunta.numero }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6">
            <p class="text-sm text-gray-600 mb-6">
              Responde estas preguntas para determinar si tu operación requiere aplicar un régimen regulatorio específico:
            </p>

            <!-- Pregunta 1 -->
            <div 
              class="mb-6 transition-all duration-300"
              :class="preguntaActual === 1 ? 'ring-2 ring-emerald-200 rounded-lg p-3 -m-3' : ''"
            >
              <div class="flex items-center gap-2 mb-3">
                <p class="text-sm font-medium text-gray-800 flex-1">
                  1. ¿Tu operación requiere cumplir con la normativa oficial vigente para registros electrónicos de salud?
                </p>
                <Transition name="check-fade">
                  <i 
                    v-if="preguntaCompletada(1)" 
                    class="fas fa-check-circle text-emerald-600 text-lg"
                  ></i>
                </Transition>
              </div>
              <div class="flex gap-3">
                <button
                  @click="responder('usoInstitucional', true)"
                  :class="respuestas.usoInstitucional === true 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500'"
                  class="flex-1 px-4 py-3 sm:py-2 border-2 rounded-lg font-medium transition-all min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  type="button"
                >
                  <span>Sí</span>
                </button>
                <button
                  @click="responder('usoInstitucional', false)"
                  :class="respuestas.usoInstitucional === false 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500'"
                  class="flex-1 px-4 py-3 sm:py-2 border-2 rounded-lg font-medium transition-all min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  type="button"
                >
                  <span>No</span>
                </button>
              </div>
            </div>

            <!-- Pregunta 2 -->
            <div 
              class="mb-6 transition-all duration-300"
              :class="preguntaActual === 2 ? 'ring-2 ring-emerald-200 rounded-lg p-3 -m-3' : ''"
            >
              <div class="flex items-center gap-2 mb-3">
                <p class="text-sm font-medium text-gray-800 flex-1">
                  2. ¿Necesitas trazabilidad completa y controles normativos (inalterabilidad, auditoría, validaciones estrictas)?
                </p>
                <Transition name="check-fade">
                  <i 
                    v-if="preguntaCompletada(2)" 
                    class="fas fa-check-circle text-emerald-600 text-lg"
                  ></i>
                </Transition>
              </div>
              <div class="flex gap-3">
                <button
                  @click="responder('trazabilidadCompleta', true)"
                  :class="respuestas.trazabilidadCompleta === true 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500'"
                  class="flex-1 px-4 py-3 sm:py-2 border-2 rounded-lg font-medium transition-all min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  type="button"
                >
                  <span>Sí</span>
                </button>
                <button
                  @click="responder('trazabilidadCompleta', false)"
                  :class="respuestas.trazabilidadCompleta === false 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500'"
                  class="flex-1 px-4 py-3 sm:py-2 border-2 rounded-lg font-medium transition-all min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  type="button"
                >
                  <span>No</span>
                </button>
              </div>
            </div>

            <!-- Pregunta 3 -->
            <div 
              class="mb-6 transition-all duration-300"
              :class="preguntaActual === 3 ? 'ring-2 ring-emerald-200 rounded-lg p-3 -m-3' : ''"
            >
              <div class="flex items-center gap-2 mb-3">
                <p class="text-sm font-medium text-gray-800 flex-1">
                  3. ¿Existe una exigencia contractual o institucional que requiera operar bajo un régimen regulatorio?
                </p>
                <Transition name="check-fade">
                  <i 
                    v-if="preguntaCompletada(3)" 
                    class="fas fa-check-circle text-emerald-600 text-lg"
                  ></i>
                </Transition>
              </div>
              <div class="flex gap-3">
                <button
                  @click="responder('exigenciaContractual', true)"
                  :class="respuestas.exigenciaContractual === true 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500'"
                  class="flex-1 px-4 py-3 sm:py-2 border-2 rounded-lg font-medium transition-all min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  type="button"
                >
                  <span>Sí</span>
                </button>
                <button
                  @click="responder('exigenciaContractual', false)"
                  :class="respuestas.exigenciaContractual === false 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500'"
                  class="flex-1 px-4 py-3 sm:py-2 border-2 rounded-lg font-medium transition-all min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  type="button"
                >
                  <span>No</span>
                </button>
              </div>
            </div>

            <!-- Sugerencia -->
            <Transition name="fade">
              <div 
                v-if="todasRespondidas && sugerencia" 
                class="mb-6 p-4 rounded-lg shadow-md"
                :class="sugerencia === 'SIRES_NOM024' 
                  ? 'bg-blue-50 border-l-4 border-blue-500' 
                  : 'bg-amber-50 border-l-4 border-amber-500'"
              >
                <div class="flex items-start gap-3 mb-3">
                  <div 
                    class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                    :class="sugerencia === 'SIRES_NOM024' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-amber-100 text-amber-600'"
                  >
                    <i 
                      :class="sugerencia === 'SIRES_NOM024' 
                        ? 'fas fa-hospital' 
                        : 'fas fa-clipboard-list'"
                      class="text-lg"
                    ></i>
                  </div>
                  <div class="flex-1">
                    <p 
                      class="text-sm font-semibold mb-2"
                      :class="sugerencia === 'SIRES_NOM024' 
                        ? 'text-blue-800' 
                        : 'text-amber-800'"
                    >
                      <i class="fas fa-lightbulb mr-2"></i>
                      {{ sugerencia === 'SIRES_NOM024' ? 'Se recomienda aplicar un régimen regulatorio' : 'Puedes continuar sin régimen regulatorio' }}
                    </p>
                    <p 
                      class="text-sm mb-3"
                      :class="sugerencia === 'SIRES_NOM024' 
                        ? 'text-blue-700' 
                        : 'text-amber-700'"
                    >
                      {{ explicacionSugerencia }}
                    </p>
                    <div class="flex gap-2">
                      <button
                        v-if="sugerencia === 'SIRES_NOM024'"
                        @click="aplicarSugerencia"
                        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Aplicar cumplimiento normativo
                      </button>
                      <button
                        v-else
                        @click="aplicarSugerencia"
                        class="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                      >
                        Continuar sin régimen
                      </button>
                    </div>
                    <div class="mt-2 text-xs" :class="sugerencia === 'SIRES_NOM024' ? 'text-blue-600' : 'text-amber-600'">
                      <span class="font-medium">{{ porcentajeCoincidencia }}%</span> de coincidencia con tus respuestas
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Footer -->
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
            <button
              @click="cerrar"
              class="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-3 sm:py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:text-sm transition-colors min-h-[44px]"
              aria-label="Cerrar modal"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.check-fade-enter-active,
.check-fade-leave-active {
  transition: all 0.3s ease;
}

.check-fade-enter-from {
  opacity: 0;
  transform: scale(0.5);
}

.check-fade-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>