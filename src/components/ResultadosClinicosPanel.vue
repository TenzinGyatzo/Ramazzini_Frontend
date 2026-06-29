<template>
  <Teleport to="body">
    <!-- Overlay -->
    <Transition appear name="panel-overlay">
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black bg-opacity-50 z-20"
        :class="{ 'modal-backdrop-pulse': dismissPulse }"
        @click="handleDismiss"
      ></div>
    </Transition>

    <!-- Drawer -->
    <Transition appear name="slide-right">
      <div
        v-if="isOpen"
        ref="drawerRef"
        class="resultados-clinicos-panel fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-30 flex flex-col"
        :class="{ 'modal-dismiss-pulse': dismissPulse }"
      >
        <!-- Header -->
        <div ref="drawerHeaderRef" class="flex items-center justify-between h-14 md:h-auto p-3 md:p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-green-50">
          <h2 class="text-xl md:text-2xl font-bold text-gray-800">
            {{ isEditing ? 'Editar Resultado Clínico' : 'Registrar Resultado Clínico' }}
          </h2>
          <button
            @click="handleDismiss"
            class="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <i class="fas fa-times text-gray-600 text-xl"></i>
          </button>
        </div>

        <!-- Content -->
        <div ref="contentRef" class="flex-1 overflow-y-auto p-4 sm:p-5">
          <div class="px-1 pb-3 text-xs leading-tight text-gray-600 md:px-3 md:text-sm">
            Resultados de evaluaciones adicionales que enriquecen el seguimiento y la estadística, no generan documentos en PDF, pero pueden vincularse a documentos externos.
          </div>
          <!-- Paso 1: Selector de tipo -->
          <div v-if="currentStep === 'select'" class="space-y-6">
            <div>
              <h3 class="text-lg font-semibold text-gray-700 mb-4">Seleccione el tipo de estudio</h3>
              
              <!-- Categorías -->
              <div class="space-y-4">
                <!-- Gabinete -->
                <div class="border border-gray-200 rounded-lg p-4">
                  <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
                    <i class="fas fa-x-ray text-blue-500 mr-2"></i>
                    Gabinete
                  </h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      @click="selectTipo('ESPIROMETRIA')"
                      class="p-3 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left flex items-center gap-3"
                    >
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0"
                        :style="{ backgroundColor: getIconBackground('ESPIROMETRIA') }"
                      >
                        <i
                          :class="getTipoIcon('ESPIROMETRIA')"
                          class="text-lg"
                          :style="{ color: getIconColor('ESPIROMETRIA') }"
                        ></i>
                      </div>
                      <div>
                        <div class="font-medium text-gray-800">Espirometría</div>
                        <div class="text-sm text-gray-500">Función pulmonar</div>
                      </div>
                    </button>
                    <button
                      @click="selectTipo('EKG')"
                      class="p-3 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left flex items-center gap-3"
                    >
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0"
                        :style="{ backgroundColor: getIconBackground('EKG') }"
                      >
                        <i
                          :class="getTipoIcon('EKG')"
                          class="text-lg"
                          :style="{ color: getIconColor('EKG') }"
                        ></i>
                      </div>
                      <div>
                        <div class="font-medium text-gray-800">EKG</div>
                        <div class="text-sm text-gray-500">Electrocardiograma</div>
                      </div>
                    </button>
                    <button
                      @click="selectTipo('RAYOS_X')"
                      class="p-3 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left flex items-center gap-3"
                    >
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0"
                        :style="{ backgroundColor: getIconBackground('RAYOS_X') }"
                      >
                        <i
                          :class="getTipoIcon('RAYOS_X')"
                          class="text-lg"
                          :style="{ color: getIconColor('RAYOS_X') }"
                        ></i>
                      </div>
                      <div>
                        <div class="font-medium text-gray-800">Rayos X</div>
                        <div class="text-sm text-gray-500">Estudio de imagen</div>
                      </div>
                    </button>
                  </div>
                </div>

                <!-- Laboratorio -->
                <div class="border border-gray-200 rounded-lg p-4">
                  <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
                    <i class="fas fa-flask text-red-500 mr-2"></i>
                    Laboratorio
                  </h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      @click="selectTipo('TIPO_SANGRE')"
                      class="p-3 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left flex items-center gap-3"
                    >
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0"
                        :style="{ backgroundColor: getIconBackground('TIPO_SANGRE') }"
                      >
                        <i
                          :class="getTipoIcon('TIPO_SANGRE')"
                          class="text-lg"
                          :style="{ color: getIconColor('TIPO_SANGRE') }"
                        ></i>
                      </div>
                      <div>
                        <div class="font-medium text-gray-800">Tipo de Sangre</div>
                        <div class="text-sm text-gray-500">Grupo sanguíneo</div>
                      </div>
                    </button>
                    <button
                      @click="selectTipo('ANALISIS_LABORATORIO')"
                      class="p-3 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left flex items-center gap-3"
                    >
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0"
                        :style="{ backgroundColor: getIconBackground('ANALISIS_LABORATORIO') }"
                      >
                        <i
                          :class="getTipoIcon('ANALISIS_LABORATORIO')"
                          class="text-lg"
                          :style="{ color: getIconColor('ANALISIS_LABORATORIO') }"
                        ></i>
                      </div>
                      <div>
                        <div class="font-medium text-gray-800">Análisis de laboratorio</div>
                        <div class="text-sm text-gray-500">Resultados de laboratorio</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Paso 2: Formulario -->
          <div v-if="currentStep === 'form'" class="space-y-6">
          <div class="flex items-center gap-4 mb-5">
            <button
              @click="handleBackToSelect"
              class="text-emerald-600 hover:text-emerald-700 p-1 rounded-full hover:bg-emerald-50 transition-colors"
              type="button"
              aria-label="Volver a selección"
            >
              <i class="fas fa-arrow-left text-lg"></i>
            </button>
            <div
              class="text-3xl leading-none flex-shrink-0"
              :style="{ color: getIconColor(formData.tipoEstudio) }"
            >
              <i :class="getTipoIcon(formData.tipoEstudio)"></i>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <span>{{ getTipoLabel(formData.tipoEstudio) }}</span>
                <span
                  v-if="isEditing"
                  class="text-emerald-600 font-semibold"
                  >(Editando)</span
                >
              </div>
            </div>
            <button
              v-if="isEditing"
              @click="handleDeleteFromEdit"
              type="button"
              class="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors flex-shrink-0"
              aria-label="Eliminar resultado"
              title="Eliminar resultado"
            >
              <i class="fas fa-trash text-lg"></i>
            </button>
          </div>

            <form @submit.prevent="handleSubmit" class="space-y-4">
              <!-- Fecha del estudio -->
              <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ getFechaFieldLabel(formData.tipoEstudio) }} <span class="text-red-500">*</span>
              </label>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 items-end">
                  <div class="sm:col-span-1">
                    <input
                      v-model="formData.fechaEstudio"
                      type="date"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    @click="setFechaHoy"
                    class="w:full md:w-1/2 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100 transition-colors"
                  >
                    Usar fecha de hoy
                  </button>
                </div>
              </div>

              <!-- Resultado Global -->
              <div v-if="formData.tipoEstudio !== 'TIPO_SANGRE'">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Resultado Global <span class="text-red-500">*</span>
                    </label>
                    <select
                      v-model="formData.resultadoGlobal"
                      required
                      @change="handleResultadoGlobalChange"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Seleccione...</option>
                      <option
                        v-for="option in store.resultadoGlobalOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </div>

                  <div>
                    <template v-if="formData.resultadoGlobal === 'ANORMAL'">
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        {{
                          formData.tipoEstudio === 'EKG'
                            ? 'Tipo de Alteración Principal'
                            : formData.tipoEstudio === 'RAYOS_X' ||
                                formData.tipoEstudio === 'ANALISIS_LABORATORIO'
                              ? 'Categorías de alteración'
                              : 'Tipo de Alteración'
                        }}
                        <span class="text-red-500">*</span>
                      </label>
                      <select
                        v-if="formData.tipoEstudio === 'ESPIROMETRIA'"
                        v-model="formData.tipoAlteracionEspirometria"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">Seleccione...</option>
                        <option
                          v-for="option in store.tipoAlteracionEspirometriaOptions"
                          :key="option.value"
                          :value="option.value"
                        >
                          {{ option.label }}
                        </option>
                      </select>
                      <select
                        v-else-if="formData.tipoEstudio === 'EKG'"
                        v-model="formData.tipoAlteracionEKG"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">Seleccione...</option>
                        <option
                          v-for="option in store.tipoAlteracionEKGOptions"
                          :key="option.value"
                          :value="option.value"
                        >
                          {{ option.label }}
                        </option>
                      </select>
                      <div
                        v-else-if="formData.tipoEstudio === 'RAYOS_X'"
                        class="max-h-52 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-1.5"
                      >
                        <label
                          v-for="option in store.tipoAlteracionRayosXOptions"
                          :key="option.value"
                          class="flex items-start gap-2 text-sm text-gray-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            class="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            :checked="(formData.tipoAlteracionRayosX || []).includes(option.value)"
                            @change="toggleTipoAlteracionRayosX(option.value)"
                          />
                          <span>{{ option.label }}</span>
                        </label>
                      </div>
                      <div
                        v-else-if="formData.tipoEstudio === 'ANALISIS_LABORATORIO'"
                        class="max-h-52 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-1.5"
                      >
                        <label
                          v-for="option in store.tipoAlteracionAnalisisLaboratorioOptions"
                          :key="option.value"
                          class="flex items-start gap-2 text-sm text-gray-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            class="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            :checked="(formData.tipoAlteracionAnalisisLaboratorio || []).includes(option.value)"
                            @change="toggleTipoAlteracionAnalisisLaboratorio(option.value)"
                          />
                          <span>{{ option.label }}</span>
                        </label>
                      </div>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Campos condicionales si resultadoGlobal = ANORMAL -->
              <template v-if="formData.resultadoGlobal === 'ANORMAL'">
                <!-- Hallazgo Específico -->
                <div class="mb-0">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Hallazgo Específico
                  </label>
                  <input
                    v-model="formData.hallazgoEspecifico"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    list="hallazgo-especifico-sugerencias"
                    placeholder="Describa el hallazgo específico..."
                  />
                  <datalist id="hallazgo-especifico-sugerencias">
                    <option
                      v-for="sugerencia in hallazgoEspecificoSugerencias"
                      :key="sugerencia"
                      :value="sugerencia"
                    >
                      {{ sugerencia }}
                    </option>
                  </datalist>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Relevancia Clínica
                    </label>
                    <select
                      v-model="formData.relevanciaClinica"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Seleccione...</option>
                      <option
                        v-for="option in store.relevanciaClinicaOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Recomendación
                    </label>
                    <input
                      v-model="formData.recomendacion"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Ej: Seguimiento, Repetir estudio, Valoración especializada..."
                    />
                  </div>
                </div>

              </template>

              <!-- Texto libre para resultado Normal (mismo hallazgoEspecifico que en ANORMAL) -->
              <template
                v-if="
                  formData.resultadoGlobal === 'NORMAL' &&
                  esTipoConEspecificarNormal(formData.tipoEstudio)
                "
              >
                <div class="mb-0 mt-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Especificar
                  </label>
                  <input
                    v-model="formData.hallazgoEspecifico"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    list="hallazgo-especifico-sugerencias"
                    :placeholder="getDefaultEspecificarNormal(formData.tipoEstudio)"
                  />
                  <datalist id="hallazgo-especifico-sugerencias">
                    <option
                      v-for="sugerencia in hallazgoEspecificoSugerencias"
                      :key="sugerencia"
                      :value="sugerencia"
                    >
                      {{ sugerencia }}
                    </option>
                  </datalist>
                </div>
              </template>

              <!-- Campo específico para Tipo de Sangre (siempre requerido) -->
              <div v-if="formData.tipoEstudio === 'TIPO_SANGRE'">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Sangre <span class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-4 gap-3">
                  <label
                    v-for="option in store.tipoSangreOptions"
                    :key="option.value"
                    :class="[
                      'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out text-sm font-semibold',
                      formData.tipoSangre === option.value
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-md'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                  >
                    <input
                      type="radio"
                      class="sr-only"
                      :value="option.value"
                      v-model="formData.tipoSangre"
                    />
                    <span>{{ option.label }}</span>
                    <div
                      v-if="formData.tipoSangre === option.value"
                      class="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Documento de respaldo (opcional) -->
              <div class="border-t border-gray-200 pt-3 mt-4 sm:pt-4 sm:mt-6">
                <div class="mb-3">
                  <h4 class="text-sm font-semibold text-gray-700 flex items-center">
                    <i class="fas fa-paperclip text-gray-500 mr-2"></i>
                    Documento de respaldo
                    <span class="ml-2 text-xs font-normal text-gray-500">(Opcional)</span>
                  </h4>
                  <p class="text-xs text-gray-500 mt-1">
                    Vincula un documento externo como respaldo de este resultado
                  </p>
                </div>

                <!-- Si tiene documento seleccionado o vinculado -->
                <div v-if="formData.idDocumentoExterno && documentoVinculado" class="relative">
                  <!-- Badge de estado pendiente -->
                  <Transition name="fade">
                    <div v-if="estadoVinculacion === 'desvinculacion-pendiente' || estadoVinculacion === 'vinculacion-pendiente'" class="absolute -top-2 -right-2 z-10">
                      <div 
                        :class="[
                          'text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse',
                          estadoVinculacion === 'desvinculacion-pendiente' ? 'bg-amber-500' : 'bg-blue-500'
                        ]"
                      >
                        <i class="fas fa-exclamation-triangle"></i>
                        Pendiente
                      </div>
                    </div>
                  </Transition>
                  
                  <!-- Card de documento con transición de estado -->
                  <div 
                    :class="[
                      'rounded-lg transition-all duration-300 overflow-hidden cursor-pointer',
                      estadoVinculacion === 'desvinculacion-pendiente' 
                        ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 shadow-lg' 
                        : estadoVinculacion === 'vinculacion-pendiente'
                        ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 shadow-lg'
                        : 'bg-emerald-50 border border-emerald-200 shadow-sm'
                    ]"
                    @click="abrirDocumentoExterno(documentoVinculado)"
                  >
                    <!-- Header del documento -->
                    <div class="flex items-center gap-3 p-3">
                      <div class="flex-shrink-0">
                        <i :class="getDocExtensionIcon(documentoVinculado.extension)" class="text-2xl"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-0.5">
                          <i 
                            :class="[
                              'text-xs',
                              estadoVinculacion === 'desvinculacion-pendiente' ? 'fas fa-unlink text-amber-600' :
                              estadoVinculacion === 'vinculacion-pendiente' ? 'fas fa-clock text-blue-600' :
                              'fas fa-link text-emerald-600'
                            ]"
                          ></i>
                          <span 
                            :class="[
                              'text-xs font-medium',
                              estadoVinculacion === 'desvinculacion-pendiente' ? 'text-amber-700' :
                              estadoVinculacion === 'vinculacion-pendiente' ? 'text-blue-700' :
                              'text-emerald-700'
                            ]"
                          >
                            {{ 
                              estadoVinculacion === 'desvinculacion-pendiente' ? 'Vinculación a remover' :
                              estadoVinculacion === 'vinculacion-pendiente' ? 'Vinculación pendiente' :
                              'Documento vinculado' 
                            }}
                          </span>
                        </div>
                        <p class="text-sm font-semibold text-gray-800 truncate">
                          {{ documentoVinculado.nombreDocumento }}
                        </p>
                        <p class="text-xs text-gray-500">
                          {{ formatDate(documentoVinculado.fechaDocumento) }}
                        </p>
                      </div>
                      <div class="flex-shrink-0">
                        <button
                          v-if="estadoVinculacion !== 'vinculacion-pendiente'"
                          type="button"
                          @click.stop="estadoVinculacion === 'desvinculacion-pendiente' ? cancelarPendingDesvincularDocumento() : handleDesvincularDocumento()"
                          :disabled="store.loading"
                          :class="[
                            'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1',
                            estadoVinculacion === 'desvinculacion-pendiente'
                              ? 'text-amber-700 bg-white hover:bg-amber-50 border-2 border-amber-300 hover:border-amber-400 shadow-sm'
                              : 'text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300',
                            store.loading ? 'opacity-50 cursor-not-allowed' : ''
                          ]"
                          :title="estadoVinculacion === 'desvinculacion-pendiente' ? 'Cancelar desvinculación' : 'Desvincular documento'"
                        >
                          <i :class="estadoVinculacion === 'desvinculacion-pendiente' ? 'fas fa-undo' : 'fas fa-unlink'"></i>
                          <span class="hidden sm:inline">
                            {{ estadoVinculacion === 'desvinculacion-pendiente' ? 'Cancelar' : 'Desvincular' }}
                          </span>
                        </button>
                        <button
                          v-else
                          type="button"
                          @click.stop="cancelarPendingVincularDocumento"
                          :disabled="store.loading"
                          :class="[
                            'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200',
                            'text-blue-700 bg-white hover:bg-blue-50 border-2 border-blue-300 hover:border-blue-400 shadow-sm',
                            store.loading ? 'opacity-50 cursor-not-allowed' : ''
                          ]"
                          title="Cancelar vinculación pendiente"
                        >
                          <i class="fas fa-times mr-1"></i>
                          Cancelar
                        </button>
                      </div>
                    </div>
                    <div v-if="documentoPreview" class="px-3 pb-3">
                      <div
                        ref="previewWrapperRef"
                        class="rounded-lg border border-gray-200 bg-white overflow-hidden"
                        :style="previewContainerStyle"
                      >
                        <img
                          v-if="documentoPreview.type === 'image'"
                          :src="documentoPreview.src"
                          alt="Vista previa"
                          class="w-full h-full object-cover"
                        />
                        <iframe
                          v-else
                          class="w-full h-full"
                          :src="documentoPreview.src"
                          title="Vista previa PDF"
                          scrolling="no"
                        ></iframe>
                      </div>
                    </div>
                    
                    <!-- Mensaje contextual según estado -->
                    <Transition name="slide-down">
                      <div ref="contextualMessageRef" v-if="estadoVinculacion === 'desvinculacion-pendiente' || estadoVinculacion === 'vinculacion-pendiente'" class="px-3 pb-3 pt-0">
                        <div 
                          :class="[
                            'pt-2',
                            estadoVinculacion === 'desvinculacion-pendiente' ? 'border-t border-amber-200' : 'border-t border-blue-200'
                          ]"
                        >
                          <p 
                            :class="[
                              'text-xs leading-relaxed flex items-start gap-2',
                              estadoVinculacion === 'desvinculacion-pendiente' ? 'text-amber-800' : 'text-blue-800'
                            ]"
                          >
                            <i class="fas fa-info-circle mt-0.5 flex-shrink-0"></i>
                            <span>
                              {{ 
                                estadoVinculacion === 'desvinculacion-pendiente' 
                                  ? 'El documento se desvinculará al guardar el resultado clínico'
                                  : 'El documento se vinculará al guardar el resultado clínico'
                              }}
                            </span>
                          </p>
                        </div>
                      </div>
                    </Transition>
                  </div>
                </div>

                <!-- Si no tiene documento vinculado -->
                <div v-else>
                  <button
                    type="button"
                    @click="showSelectorDocumento = true"
                    class="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                  >
                    <i class="fas fa-plus-circle"></i>
                    <span class="font-medium">Vincular documento</span>
                  </button>
                </div>
              </div>

              <!-- Botones -->
              <div ref="buttonsContainerRef" class="flex gap-3">
                <button
                  type="button"
                  @click="handleDismiss"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  :disabled="store.loading"
                  class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span v-if="store.loading">
                    <i class="fas fa-spinner fa-spin mr-2"></i>
                    Guardando...
                  </span>
                  <span v-else>
                    {{ isEditing ? 'Actualizar' : 'Guardar' }}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Sección Resultados (Permanente) -->
        <div v-if="hasResults" class="border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div class="px-4 py-1.5 border-b border-gray-200">
            <h3 class="text-sm font-semibold text-gray-700">Resultados Registrados</h3>
          </div>
          <div class="h-32 sm:h-44 overflow-y-auto p-2 sm:p-2">
            <div class="space-y-3">
              <div v-for="year in sortedYears" :key="year" class="space-y-2">
                <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                  {{ year }}
                </div>
                <div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  <div
                    v-for="item in sortedResultsByYear(year)"
                    :key="item._id"
                    class="flex items-center justify-between py-2 px-3 bg-white border border-gray-200 rounded-lg hover:border-emerald-500 transition-colors cursor-pointer"
                    @click="handleEdit(item)"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <div
                          class="text-sm"
                          :style="{ color: getIconColor(item.tipoEstudio) }"
                        >
                          <i :class="getTipoIcon(item.tipoEstudio)"></i>
                        </div>
                        <span class="font-medium text-sm text-gray-800 truncate">
                          {{ getTipoLabel(item.tipoEstudio) }}
                        </span>
                      </div>
                      <div class="text-xs text-gray-600 truncate">
                        {{ formatDate(item.fechaEstudio) }}
                        <span v-if="item.tipoEstudio !== 'TIPO_SANGRE' && item.resultadoGlobal" class="ml-1">
                          - <span :class="getResultadoColor(item.resultadoGlobal)">
                            {{ getResultadoLabel(item.resultadoGlobal) }}
                          </span>
                        </span>
                        <span v-else-if="item.tipoEstudio === 'TIPO_SANGRE' && item.tipoSangre" class="ml-1">
                          - <span class="text-red-600 font-semibold">{{ getTipoSangreLabel(item.tipoSangre) }}</span>
                        </span>
                      </div>
                      <div
                        v-if="joinAlteracionesLinea(item)"
                        class="text-[10px] text-amber-800/90 truncate mt-0.5 pl-7"
                      >
                        {{ joinAlteracionesLinea(item) }}
                      </div>
                    </div>
                    <div class="flex gap-1 ml-2 flex-shrink-0">
                      <button
                        @click.stop="handleDelete(item)"
                        class="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <i class="fas fa-trash text-sm"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

      <SelectorDocumentoExterno
        :is-open="showSelectorDocumento"
        :trabajador-id="trabajadorId"
        :documento-vinculado-id="formData.idDocumentoExterno"
        @close="showSelectorDocumento = false"
        @seleccionar="handleSeleccionarDocumento"
      />

      <!-- Visor de PDF -->
      <Teleport to="body">
        <Transition name="modal-fade" appear>
          <div v-if="showPdfViewer"
            class="resultados-clinicos-panel-viewer fixed top-0 left-0 w-full h-full bg-black bg-opacity-90 backdrop-blur-sm flex justify-center items-center z-[60]"
            @click.self="cerrarPdf">
            
            <!-- Header del visor -->
            <div class="absolute top-0 left-0 right-0 bg-white bg-opacity-95 backdrop-blur-sm border-b border-gray-200 z-10">
              <div class="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
                <div class="flex items-center space-x-2 sm:space-x-4">
                  <button @click="cerrarPdf" 
                    class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                    <i class="fas fa-times text-xs sm:text-sm"></i>
                    <span class="font-medium hidden sm:inline">Cerrar</span>
                  </button>
                  <div class="flex items-center space-x-1 sm:space-x-2">
                    <i class="fas fa-file-pdf text-red-500 text-sm sm:text-lg"></i>
                    <span class="text-gray-700 font-medium text-xs sm:text-sm">Visor de PDF</span>
                  </div>
                </div>
                
                <div class="flex items-center space-x-1 sm:space-x-3">
                  <button @click="descargarPdfActual" 
                    class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                    <i class="fas fa-download text-xs sm:text-sm"></i>
                    <span class="font-medium hidden sm:inline">Descargar</span>
                  </button>
                  <button @click="imprimirPdfActual" 
                    class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                    <i class="fas fa-print text-xs sm:text-sm"></i>
                    <span class="font-medium hidden sm:inline">Imprimir</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Contenedor principal del visor -->
            <div class="relative w-full h-full flex flex-col">
              <div class="flex-1 mt-16 sm:mt-20 mx-2 sm:mx-4 mb-4 bg-white rounded-xl shadow-2xl overflow-hidden">
                <VPdfViewer 
                  :src="pdfUrl" 
                  :initialThumbnails-visible="initialThumbnailsVisible" 
                  :initialScale="initialScale"
                  locale="customLang" 
                  :localization="localization" 
                />
              </div>
            </div>

            <!-- Indicador de ayuda -->
            <div class="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm">
                <i class="fas fa-keyboard mr-1 sm:mr-2"></i>
                <span class="hidden sm:inline">Presiona</span> <kbd class="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-700 rounded text-xs">ESC</kbd> <span class="hidden sm:inline">para cerrar</span>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Visor de Imágenes -->
      <Teleport to="body">
        <Transition name="modal-fade" appear>
          <div v-if="showImageViewer"
            class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-90 backdrop-blur-sm flex justify-center items-center z-[60]"
            @click.self="cerrarImagen">
            
            <div class="absolute top-0 left-0 right-0 bg-white bg-opacity-95 backdrop-blur-sm border-b border-gray-200 z-10">
              <div class="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
                <div class="flex items-center space-x-2 sm:space-x-4">
                  <button @click="cerrarImagen" 
                    class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                    <i class="fas fa-times text-xs sm:text-sm"></i>
                    <span class="font-medium hidden sm:inline">Cerrar</span>
                  </button>
                  <div class="flex items-center space-x-1 sm:space-x-2">
                    <i class="fas fa-image text-blue-500 text-sm sm:text-lg"></i>
                    <span class="text-gray-700 font-medium text-xs sm:text-sm">Visor de Imagen</span>
                  </div>
                </div>
                
                <div class="flex items-center space-x-1 sm:space-x-3">
                  <button @click="rotarImagen" 
                    class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                    <i class="fas fa-redo text-xs sm:text-sm"></i>
                    <span class="font-medium hidden sm:inline">Rotar</span>
                  </button>
                  <button @click="descargarImagenActual" 
                    class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                    <i class="fas fa-download text-xs sm:text-sm"></i>
                    <span class="font-medium hidden sm:inline">Descargar</span>
                  </button>
                  <button @click="resetImagePosition" 
                    class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                    <i class="fas fa-crosshairs text-xs sm:text-sm"></i>
                    <span class="font-medium hidden sm:inline">Centrar</span>
                  </button>
                  <button @click="zoomIn" 
                    class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                    <i class="fas fa-search-plus text-xs sm:text-sm"></i>
                    <span class="font-medium hidden sm:inline">Zoom +</span>
                  </button>
                  <button @click="zoomOut" 
                    class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                    <i class="fas fa-search-minus text-xs sm:text-sm"></i>
                    <span class="font-medium hidden sm:inline">Zoom -</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="relative w-full h-full flex flex-col image-viewer">
              <div class="flex-1 mt-16 sm:mt-20 mx-2 sm:mx-4 mb-4 bg-white rounded-xl shadow-2xl overflow-hidden flex items-center justify-center">
                <img 
                  :src="imageUrl" 
                  :style="{ 
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) rotate(${rotationAngle}deg) scale(${imageZoom})`,
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }"
                  alt="Vista previa" 
                  class="max-w-full max-h-full object-contain select-none"
                  draggable="false"
                  @wheel="handleImageWheel"
                  @mousedown="startDrag"
                />
              </div>
            </div>

            <!-- Indicador de zoom -->
            <div v-if="imageZoom !== 0.8" class="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 bg-black bg-opacity-75 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-full text-xs sm:text-sm">
                <i class="fas fa-search mr-1 sm:mr-2"></i>
                {{ Math.round(imageZoom * 100) }}%
            </div>

            <!-- Indicador de ayuda -->
            <div class="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm">
                <i class="fas fa-mouse mr-1 sm:mr-2"></i>
                <span class="hidden sm:inline">Rueda del mouse para zoom •</span> 
                <span class="hidden sm:inline">Arrastra para mover •</span>
                <kbd class="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-700 rounded text-xs">ESC</kbd> <span class="hidden sm:inline">para cerrar</span>
            </div>
          </div>
        </Transition>
      </Teleport>

  </Teleport>

  <ModalDiscardConfirmDialog
    :open="showDiscardConfirm"
    @continue-editing="continueEditing"
    @discard="confirmDiscard"
  />
</template>

<script setup lang="ts">
import { ref, watch, computed, inject, nextTick, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { authRequestConfig } from '@/lib/attachAuthToken';
import {
  buildClinicalFileUrl,
  headClinicalFile,
} from '@/lib/clinicalFiles';
import { VPdfViewer, Locales, useLicense } from '@vue-pdf-viewer/viewer';
import { useResultadosClinicosStore, type ResultadoClinico } from '@/stores/resultadosClinicos';
import type { DocumentoExterno } from '@/interfaces/documentos.inteface';
import { useDocumentosStore } from '@/stores/documentos';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { convertirFechaISOaDDMMYYYY, formatDateYYYYMMDD } from '@/helpers/dates';
import { validarFechaDocumentoNoFutura } from '@/helpers/validacionCampos';
import SelectorDocumentoExterno from '@/components/SelectorDocumentoExterno.vue';
import { useHtmlDarkMode } from '@/composables/useHtmlDarkMode';
import { useDirtySnapshot } from '@/composables/useDirtySnapshot';
import { useModalDirtyGuard } from '@/composables/useModalDirtyGuard';
import ModalDiscardConfirmDialog from '@/components/ModalDiscardConfirmDialog.vue';
import type { EliminacionRequest } from '@/composables/useEliminacion';

const props = defineProps<{
  isOpen: boolean;
  trabajadorId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const toast: any = inject('toast');
const requestEliminacion = inject<(request: EliminacionRequest) => void>('requestEliminacion');
const store = useResultadosClinicosStore();
const documentos = useDocumentosStore();
const proveedorSaludStore = useProveedorSaludStore();
const isHtmlDark = useHtmlDarkMode();

const currentStep = ref<'select' | 'form'>('select');
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const formData = ref<Partial<ResultadoClinico>>({
  tipoEstudio: undefined,
  fechaEstudio: '',
  resultadoGlobal: undefined,
  hallazgoEspecifico: '',
  relevanciaClinica: undefined,
  recomendacion: '',
  tipoAlteracionEspirometria: undefined,
  tipoAlteracionEKG: undefined,
  tipoAlteracionRayosX: [],
  tipoAlteracionAnalisisLaboratorio: [],
  tipoSangre: undefined,
  idDocumentoExterno: undefined,
  documentoExterno: undefined,
});

const showSelectorDocumento = ref(false);
const previousDocumentoId = ref<string | undefined>(undefined);
const pendingDesvincularDocumento = ref(false);
const pendingVincularDocumento = ref(false);

/** Para transiciones del select Resultado global (defaults al pasar a NORMAL). */
const prevResultadoGlobal = ref<string | undefined>(undefined);

const TIPOS_CON_ESPECIFICAR_NORMAL = [
  'ESPIROMETRIA',
  'EKG',
  'RAYOS_X',
  'ANALISIS_LABORATORIO',
] as const;

type HallazgoSugerenciasPorResultado = { normal: string[]; anormal: string[] };

const HALLAZGO_ESPECIFICO_SUGERENCIAS_POR_TIPO: Record<
  (typeof TIPOS_CON_ESPECIFICAR_NORMAL)[number],
  HallazgoSugerenciasPorResultado
> = {
  ANALISIS_LABORATORIO: {
    normal: [
      'Resultados de laboratorio sin hallazgos patológicos',
      'Perfil bioquímico sin alteraciones relevantes',
      'Todos los parámetros analizados se encuentran dentro de rangos de referencia',
  ],
    anormal: [
      'Hipertrigliceridemia e hipercolesterolemia, resto de parámetros dentro de rango',
      'Alteraciones en el perfil lipídico (colesterol total, LDL, HDL y triglicéridos)',
      'Alteraciones en el metabolismo de la glucosa (glucemia y/o hemoglobina glucosilada elevadas), con o sin dislipidemia asociada',
      'Perfil lipídico y glucémico con valores fuera de rango',
      'Alteraciones aisladas en uno o más parámetros bioquímicos de relevancia clínica',
    ],
  },
  RAYOS_X: {
    normal: [
      'Radiografías sin evidencia de alteraciones óseas, articulares ni parenquimatosas',
      'Estudios radiográficos dentro de parámetros normales para las proyecciones realizadas',
      'Sin hallazgos radiográficos patológicos en las imágenes evaluadas',
      'Tórax dentro de límites normales. Columna AP y Lateral dentro de límites normales',
      'Columna vertebral en proyecciones AP y lateral dentro de límites normales',
      'Tórax dentro de límites normales',
    ],
    anormal: [
      'Hallazgos radiográficos sugestivos de proceso infeccioso o inflamatorio pulmonar',
      'Patrón intersticial o alveolar anormal en campos pulmonares',
      'Alteraciones en la silueta cardiomediastinal',
      'Datos radiográficos compatibles con enfermedad pulmonar crónica',
      'Rectificación de la curvatura fisiológica de la columna',
      'Escoliosis en columna vertebral',
      'Cambios degenerativos en columna vertebral (espondilosis)',
      'Disminución de espacios intervertebrales',
      'Alteraciones en la alineación vertebral',
      'Hallazgos sugestivos de hernia discal',
      'Lesiones óseas o articulares identificadas en estructuras evaluadas',
      'Hallazgos radiográficos que requieren correlación clínica y/o estudios complementarios',
    ],
  },
  ESPIROMETRIA: {
    normal: [
      'Dentro de parámetros normales, sin alteraciones ventilatorias',
      'Función pulmonar conservada, sin evidencia de patrón obstructivo ni restrictivo',
      'Valores dentro de rangos de referencia',
    ],
    anormal: [
      'Patrón obstructivo leve, sugestivo de limitación al flujo aéreo',
      'Patrón obstructivo moderado, sugestivo de limitación al flujo aéreo',
      'Patrón obstructivo severo, sugestivo de limitación al flujo aéreo',
      'Patrón restrictivo, con disminución de la capacidad pulmonar',
      'Alteración ventilatoria mixta (obstructiva y restrictiva)',
      'Disminución de la función pulmonar en parámetros espirométricos (FEV1, FVC y relación FEV1/FVC)',
      'Respuesta broncodilatadora positiva, sugestiva de reversibilidad de la obstrucción',
    ],
  },
  EKG: {
    normal: [
      'Ritmo sinusal, sin alteraciones electrocardiográficas significativas',
      'Ritmo sinusal, sin criterios de dilatación de cavidades o de isquemia miocárdica',
      'Electrocardiograma dentro de parámetros normales',
      'Actividad eléctrica cardíaca dentro de rangos normales',
    ],
    anormal: [
      'Arritmia cardíaca identificada',
      'Trastorno de la conducción auriculoventricular',
      'Trastorno de la conducción intraventricular (bloqueo de rama)',
      'Cambios electrocardiográficos sugestivos de isquemia miocárdica',
      'Alteraciones en el segmento ST y/o onda T',
      'Crecimiento o sobrecarga de cavidades cardíacas',
      'Bradicardia sinusal fuera de parámetros normales',
      'Taquicardia sinusal fuera de parámetros normales',
    ],
  },
};

const hallazgoEspecificoSugerencias = computed(() => {
  const tipo = formData.value.tipoEstudio;
  const resultado = formData.value.resultadoGlobal;
  if (!tipo || !(tipo in HALLAZGO_ESPECIFICO_SUGERENCIAS_POR_TIPO)) return [];

  const entry = HALLAZGO_ESPECIFICO_SUGERENCIAS_POR_TIPO[tipo as keyof typeof HALLAZGO_ESPECIFICO_SUGERENCIAS_POR_TIPO];
  if (resultado === 'NORMAL') return entry.normal;
  if (resultado === 'ANORMAL') return entry.anormal;
  return [];
});

function getDefaultEspecificarNormal(tipo?: string): string {
  switch (tipo) {
    case 'ESPIROMETRIA':
      return 'Dentro de parámetros normales, sin alteraciones ventilatorias';
    case 'EKG':
      return 'Ritmo sinusal, sin alteraciones electrocardiográficas significativas';
    case 'RAYOS_X':
      return 'Dentro de límites normales';
    case 'ANALISIS_LABORATORIO':
      return 'Resultados dentro de parámetros normales';
    default:
      return '';
  }
}

function esTipoConEspecificarNormal(tipo?: string): boolean {
  return TIPOS_CON_ESPECIFICAR_NORMAL.includes(tipo as (typeof TIPOS_CON_ESPECIFICAR_NORMAL)[number]);
}

// Computed para obtener el documento vinculado
const documentoVinculado = computed(() => {
  const id = formData.value.idDocumentoExterno;
  if (!id) return null;

  // Intentar encontrarlo en el store de documentos para tener el objeto completo (con rutaDocumento)
  const docs = documentos.documentsByYear;
  for (const yearData of Object.values(docs)) {
    if (yearData.documentosExternos) {
      const found = yearData.documentosExternos.find(doc => doc._id === id);
      if (found) return found;
    }
  }

  // Si no se encuentra en el store, usar el que tenemos en formData (puede estar incompleto)
  if (formData.value.documentoExterno) {
    return formData.value.documentoExterno;
  }

  return null;
});

const documentoPreview = computed(() => {
  const doc = documentoVinculado.value;
  if (!doc) return null;

  const extension = obtenerExtensionArchivo(doc);
  const isImage = ['png', 'jpg', 'jpeg'].includes(extension);
  if (isImage) {
    const src = construirRutaCompleta(doc);
    return src ? { type: 'image', src } : null;
  }

  if (!doc.rutaDocumento || !doc.nombreDocumento || !doc.fechaDocumento) return null;
  const documentoConMeta = doc as DocumentoExterno & { updatedAt?: string | number | Date };
  const updatedAt = documentoConMeta.updatedAt ? new Date(documentoConMeta.updatedAt).getTime() : null;
  const nombrePDF = `${doc.nombreDocumento} ${convertirFechaISOaDDMMYYYY(doc.fechaDocumento)}.pdf`;
  const src = buildPdfUrl(doc.rutaDocumento, nombrePDF, updatedAt, { useCacheBuster: true, fallbackToNow: false });
  return { type: 'pdf', src };
});

// Computed para determinar el estado de vinculación del documento
const estadoVinculacion = computed(() => {
  if (pendingDesvincularDocumento.value) return 'desvinculacion-pendiente';
  if (pendingVincularDocumento.value) return 'vinculacion-pendiente';
  if (previousDocumentoId.value && formData.value.idDocumentoExterno) return 'vinculado';
  return 'sin-vincular';
});

// Observar cuando se abre el drawer
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    // Esperar un tick para asegurar que current esté establecido si se estableció antes de abrir
    await nextTick();
    
    // Si hay un resultado en current, cargarlo para edición
    if (store.current) {
      handleEdit(store.current);
    } else {
      // Modo nuevo: resetear todo
      currentStep.value = 'select';
      isEditing.value = false;
      editingId.value = null;
      resetForm();
    }
    await store.fetchByTrabajador(props.trabajadorId);
    await store.fetchResultadosAgrupados(props.trabajadorId);
    calculatePreviewHeight();
    setupDrawerObserver();
  } else {
    teardownDrawerObserver();
  }
}, { immediate: true });

watch(documentoPreview, () => {
  calculatePreviewHeight();
});

// Observar cambios en current del store (para edición desde fuera)
// Esto maneja el caso cuando current se establece después de que el drawer ya está abierto
watch(() => store.current, (newCurrent, oldCurrent) => {
  // Solo procesar si hay un nuevo current y el drawer está abierto
  if (newCurrent && props.isOpen) {
    // Si había un current anterior y es diferente, o si no había, cargar el nuevo
    if (!oldCurrent || (oldCurrent._id && newCurrent._id && oldCurrent._id !== newCurrent._id)) {
      handleEdit(newCurrent);
    }
  }
});

watch(
  () => formData.value.resultadoGlobal,
  () => {
    calculatePreviewHeight();
  },
  { flush: 'post' }
);

watch(
  estadoVinculacion,
  async () => {
    await nextTick();
    setTimeout(() => {
      if (contextualMessageRef.value && drawerResizeObserver) {
        drawerResizeObserver.observe(contextualMessageRef.value);
      }
      calculatePreviewHeight();
    }, 350);
  },
  { flush: 'post' }
);

const toggleTipoAlteracionRayosX = (value: string) => {
  const cur = formData.value.tipoAlteracionRayosX ?? [];
  const set = new Set(cur);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  formData.value.tipoAlteracionRayosX = Array.from(set);
};

const toggleTipoAlteracionAnalisisLaboratorio = (value: string) => {
  const cur = formData.value.tipoAlteracionAnalisisLaboratorio ?? [];
  const set = new Set(cur);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  formData.value.tipoAlteracionAnalisisLaboratorio = Array.from(set);
};

const selectTipo = (
  tipo: 'ESPIROMETRIA' | 'EKG' | 'TIPO_SANGRE' | 'RAYOS_X' | 'ANALISIS_LABORATORIO',
) => {
  // Entrar en modo "Registrar" (nuevo)
  isEditing.value = false;
  editingId.value = null;
  store.setCurrent(null); // Limpiar current para asegurar modo nuevo
  
  // Resetear formulario y establecer tipo de estudio
  resetForm();
  formData.value.tipoEstudio = tipo;
  formData.value.resultadoGlobal = undefined;
  
  // Ir al formulario
  currentStep.value = 'form';
};

const handleBackToSelect = () => {
  // Si estamos en modo edición, resetear a modo nuevo
  if (isEditing.value) {
    isEditing.value = false;
    editingId.value = null;
    store.setCurrent(null);
  }
  // Resetear formulario y volver al selector
  resetForm();
  currentStep.value = 'select';
};

const setFechaHoy = () => {
  const hoy = new Date().toISOString().split('T')[0];
  formData.value.fechaEstudio = hoy;
};

const handleResultadoGlobalChange = () => {
  const prev = prevResultadoGlobal.value;
  const cur = formData.value.resultadoGlobal;
  const tipo = formData.value.tipoEstudio;

  if (cur === 'ANORMAL') {
    formData.value.hallazgoEspecifico = '';
  } else if (cur === 'NORMAL' && esTipoConEspecificarNormal(tipo)) {
    if (prev === 'ANORMAL' || prev === 'NO_CONCLUYENTE' || prev === undefined) {
      formData.value.hallazgoEspecifico = getDefaultEspecificarNormal(tipo);
    }
  } else if (cur === 'NO_CONCLUYENTE') {
    formData.value.hallazgoEspecifico = '';
  }

  if (cur !== 'ANORMAL') {
    formData.value.relevanciaClinica = undefined;
    formData.value.recomendacion = '';
    formData.value.tipoAlteracionEspirometria = undefined;
    formData.value.tipoAlteracionEKG = undefined;
    formData.value.tipoAlteracionRayosX = [];
    formData.value.tipoAlteracionAnalisisLaboratorio = [];
  }

  prevResultadoGlobal.value = cur;
};

const handleEdit = (item: ResultadoClinico) => {
  // Entrar en modo "Editar"
  isEditing.value = true;
  editingId.value = item._id || null;
  store.setCurrent(item); // Establecer current para mantener consistencia
  
  // Convertir fecha a formato YYYY-MM-DD para el input
  let fecha = '';
  if (item.fechaEstudio) {
    if (item.fechaEstudio instanceof Date) {
      fecha = formatDateYYYYMMDD(item.fechaEstudio.toISOString());
    } else {
      // Si es string, intentar formatearlo
      try {
        fecha = formatDateYYYYMMDD(item.fechaEstudio);
      } catch {
        // Si falla, usar la fecha directamente si ya está en formato YYYY-MM-DD
        fecha = item.fechaEstudio.split('T')[0];
      }
    }
  }
  
  // Cargar datos del resultado en el formulario
  const documentFromItem = item.documentoExterno || (typeof item.idDocumentoExterno === 'object' ? item.idDocumentoExterno : undefined);
  const documentIdFromItem = typeof item.idDocumentoExterno === 'string' ? item.idDocumentoExterno : documentFromItem?._id;

  let hallazgo = item.hallazgoEspecifico || '';
  if (
    item.resultadoGlobal === 'NORMAL' &&
    esTipoConEspecificarNormal(item.tipoEstudio) &&
    !String(hallazgo).trim()
  ) {
    hallazgo = getDefaultEspecificarNormal(item.tipoEstudio);
  }

  formData.value = {
    tipoEstudio: item.tipoEstudio,
    fechaEstudio: fecha,
    resultadoGlobal: item.resultadoGlobal,
    hallazgoEspecifico: hallazgo,
    relevanciaClinica: item.relevanciaClinica,
    recomendacion: item.recomendacion || '',
    tipoAlteracionEspirometria: item.tipoAlteracionEspirometria,
    tipoAlteracionEKG: item.tipoAlteracionEKG,
    tipoAlteracionRayosX: item.tipoAlteracionRayosX ? [...item.tipoAlteracionRayosX] : [],
    tipoAlteracionAnalisisLaboratorio: item.tipoAlteracionAnalisisLaboratorio
      ? [...item.tipoAlteracionAnalisisLaboratorio]
      : [],
    tipoSangre: item.tipoSangre,
    idDocumentoExterno: documentIdFromItem,
    documentoExterno: documentFromItem,
  };
  previousDocumentoId.value = documentIdFromItem;
  pendingDesvincularDocumento.value = false;
  pendingVincularDocumento.value = false;

  prevResultadoGlobal.value = item.resultadoGlobal;
  
  // Ir directamente al formulario (no mostrar selector)
  currentStep.value = 'form';
};

const ejecutarEliminacionResultado = async (item: ResultadoClinico) => {
  if (!item._id) return;
  await store.deleteResultado(item._id);
  await store.fetchResultadosAgrupados(props.trabajadorId);
  toast.open({
    message: 'Resultado eliminado correctamente',
    type: 'success',
  });

  if (isEditing.value && editingId.value === item._id) {
    isEditing.value = false;
    editingId.value = null;
    store.setCurrent(null);
    resetForm();
    currentStep.value = 'select';
    forceClose();
  }
};

const solicitarEliminacionResultado = (item: ResultadoClinico) => {
  requestEliminacion?.({
    entidad: 'resultadoClinico',
    identificacion: getTipoLabel(item.tipoEstudio),
    detalleContexto: {
      tipoEstudioLabel: getTipoLabel(item.tipoEstudio),
      fecha: item.fechaEstudio ? formatDate(item.fechaEstudio) : '',
      resultado: item.resultadoGlobal ? getResultadoLabel(item.resultadoGlobal) : '',
      tipoSangre: item.tipoSangre ? getTipoSangreLabel(item.tipoSangre) : '',
    },
    onConfirm: async () => {
      try {
        await ejecutarEliminacionResultado(item);
      } catch {
        toast.open({
          message: 'Error al eliminar el resultado',
          type: 'error',
        });
        throw new Error('delete-failed');
      }
    },
  });
};

const handleDelete = (item: ResultadoClinico) => {
  solicitarEliminacionResultado(item);
};

const handleDeleteFromEdit = async () => {
  if (store.current && store.current._id) {
    solicitarEliminacionResultado(store.current);
    return;
  }

  if (editingId.value) {
    try {
      const resultado = await store.fetchResultadoById(editingId.value);
      if (resultado) {
        solicitarEliminacionResultado(resultado);
      } else {
        toast.open({
          message: 'No se puede eliminar: resultado no encontrado',
          type: 'error',
        });
      }
    } catch {
      toast.open({
        message: 'Error al obtener el resultado para eliminar',
        type: 'error',
      });
    }
  } else {
    toast.open({
      message: 'No se puede eliminar: resultado no encontrado',
      type: 'error',
    });
  }
};

const handleSubmit = async () => {
  try {
    const validacionFecha = validarFechaDocumentoNoFutura(
      formData.value.fechaEstudio,
      proveedorSaludStore.showSiresUI,
    );
    if (!validacionFecha.valido) {
      toast.open({
        message: validacionFecha.mensaje,
        type: 'error',
      });
      return;
    }

    // Validaciones adicionales
    if (formData.value.tipoEstudio !== 'TIPO_SANGRE' && formData.value.resultadoGlobal === 'ANORMAL') {
      if (formData.value.tipoEstudio === 'ESPIROMETRIA' && !formData.value.tipoAlteracionEspirometria) {
        toast.open({
          message: 'Por favor seleccione el tipo de alteración',
          type: 'error',
        });
        return;
      }
      
      if (formData.value.tipoEstudio === 'EKG' && !formData.value.tipoAlteracionEKG) {
        toast.open({
          message: 'Por favor seleccione el tipo de alteración principal',
          type: 'error',
        });
        return;
      }
      if (
        formData.value.tipoEstudio === 'RAYOS_X' &&
        !(formData.value.tipoAlteracionRayosX && formData.value.tipoAlteracionRayosX.length > 0)
      ) {
        toast.open({
          message: 'Seleccione al menos una categoría de alteración en Rayos X',
          type: 'error',
        });
        return;
      }
      if (
        formData.value.tipoEstudio === 'ANALISIS_LABORATORIO' &&
        !(
          formData.value.tipoAlteracionAnalisisLaboratorio &&
          formData.value.tipoAlteracionAnalisisLaboratorio.length > 0
        )
      ) {
        toast.open({
          message: 'Seleccione al menos una categoría de alteración en análisis de laboratorio',
          type: 'error',
        });
        return;
      }
    }
    
    if (formData.value.tipoEstudio === 'TIPO_SANGRE' && !formData.value.tipoSangre) {
      toast.open({
        message: 'Por favor seleccione el tipo de sangre',
        type: 'error',
      });
      return;
    }
    
    // Preparar payload
    const payload: any = {
      idTrabajador: props.trabajadorId,
      tipoEstudio: formData.value.tipoEstudio,
      fechaEstudio: new Date(formData.value.fechaEstudio as string).toISOString(),
    };

    if (formData.value.tipoEstudio !== 'TIPO_SANGRE') {
      payload.resultadoGlobal = formData.value.resultadoGlobal;

      if (formData.value.resultadoGlobal !== 'ANORMAL') {
        payload.relevanciaClinica = null;
        payload.recomendacion = '';
        if (formData.value.resultadoGlobal === 'NO_CONCLUYENTE') {
          payload.hallazgoEspecifico = '';
        } else if (
          formData.value.resultadoGlobal === 'NORMAL' &&
          esTipoConEspecificarNormal(formData.value.tipoEstudio)
        ) {
          payload.hallazgoEspecifico = formData.value.hallazgoEspecifico ?? '';
        }
      }
    }

    // Agregar campos condicionales
    if (formData.value.resultadoGlobal === 'ANORMAL') {
      payload.hallazgoEspecifico = formData.value.hallazgoEspecifico;
      payload.relevanciaClinica = formData.value.relevanciaClinica;
      payload.recomendacion = formData.value.recomendacion;
      
      if (formData.value.tipoEstudio === 'ESPIROMETRIA') {
        payload.tipoAlteracionEspirometria = formData.value.tipoAlteracionEspirometria;
      } else if (formData.value.tipoEstudio === 'EKG') {
        payload.tipoAlteracionEKG = formData.value.tipoAlteracionEKG;
      } else if (formData.value.tipoEstudio === 'RAYOS_X') {
        payload.tipoAlteracionRayosX = [...(formData.value.tipoAlteracionRayosX || [])];
      } else if (formData.value.tipoEstudio === 'ANALISIS_LABORATORIO') {
        payload.tipoAlteracionAnalisisLaboratorio = [
          ...(formData.value.tipoAlteracionAnalisisLaboratorio || []),
        ];
      }
    }
    
    if (formData.value.tipoEstudio === 'TIPO_SANGRE') {
      payload.tipoSangre = formData.value.tipoSangre;
    }
    
    let savedResult: ResultadoClinico | null = null;

    if (isEditing.value && editingId.value) {
      savedResult = await store.updateResultado(editingId.value, payload);
      toast.open({
        message: 'Resultado actualizado correctamente',
        type: 'success',
      });
    } else {
      savedResult = await store.createResultado(payload);
      toast.open({
        message: 'Resultado creado correctamente',
        type: 'success',
      });
    }

    // Manejar vinculación/desvinculación de documentos
    const selectedDocumentoId = formData.value.idDocumentoExterno;
    
    // Determinar si necesitamos vincular un documento nuevo
    const shouldLinkDocumento = 
      savedResult?._id && 
      pendingVincularDocumento.value && 
      selectedDocumentoId;
    
    // Determinar si necesitamos desvincular
    const shouldDesvincular =
      savedResult?._id &&
      previousDocumentoId.value &&
      pendingDesvincularDocumento.value;

    if (shouldLinkDocumento && savedResult?._id) {
      await store.vincularDocumento(savedResult._id, selectedDocumentoId as string);
      previousDocumentoId.value = selectedDocumentoId;
    } else if (shouldDesvincular && savedResult?._id) {
      await store.desvincularDocumento(savedResult._id);
      previousDocumentoId.value = undefined;
    }
    
    // Refrescar resultados agrupados después de crear/actualizar
    await store.fetchResultadosAgrupados(props.trabajadorId);
    
    // Esperar un tick adicional para asegurar que Vue detecte los cambios reactivos
    await nextTick();
    
    pendingDesvincularDocumento.value = false;
    pendingVincularDocumento.value = false;
    forceClose();
  } catch (error: any) {
    toast.open({
      message: error.response?.data?.message || 'Error al guardar el resultado',
      type: 'error',
    });
  }
};

const handleClose = () => {
  resetForm();
  currentStep.value = 'select';
  isEditing.value = false;
  editingId.value = null;
  store.setCurrent(null);
  emit('close');
};

const buildFormState = () => ({
  step: currentStep.value,
  editingId: editingId.value,
  form: { ...formData.value },
  pendingDesvincular: pendingDesvincularDocumento.value,
  pendingVincular: pendingVincularDocumento.value,
});

const { isDirty } = useDirtySnapshot(buildFormState, {
  resetTrigger: () => props.isOpen,
});

const dismissNestedLayer = () => {
  if (showImageViewer.value) {
    cerrarImagen();
    return true;
  }

  if (showPdfViewer.value) {
    cerrarPdf();
    return true;
  }

  if (showSelectorDocumento.value) {
    showSelectorDocumento.value = false;
    return true;
  }

  return false;
};

const {
  showDiscardConfirm,
  dismissPulse,
  requestDismiss,
  forceClose,
  continueEditing,
  confirmDiscard,
} = useModalDirtyGuard({
  isDirty,
  onClose: handleClose,
  escapeActive: () => props.isOpen,
  enabled: () =>
    props.isOpen &&
    !showImageViewer.value &&
    !showPdfViewer.value &&
    !showSelectorDocumento.value,
  onEscapeWhenDisabled: () => {
    dismissNestedLayer();
  },
});

const handleDismiss = () => {
  if (dismissNestedLayer()) return;

  if (props.isOpen) {
    requestDismiss();
  }
};

const resetForm = () => {
  formData.value = {
    tipoEstudio: undefined,
    fechaEstudio: '',
    resultadoGlobal: undefined,
    hallazgoEspecifico: '',
    relevanciaClinica: undefined,
    recomendacion: '',
    tipoAlteracionEspirometria: undefined,
    tipoAlteracionEKG: undefined,
    tipoAlteracionRayosX: [],
    tipoAlteracionAnalisisLaboratorio: [],
    tipoSangre: undefined,
    idDocumentoExterno: undefined,
    documentoExterno: undefined,
  };
  previousDocumentoId.value = undefined;
  pendingDesvincularDocumento.value = false;
  pendingVincularDocumento.value = false;
  prevResultadoGlobal.value = undefined;
};

const hasResults = computed(() => {
  const results = store.resultsByYear;
  return Object.keys(results).length > 0 && 
    Object.values(results).some(yearResults => yearResults.length > 0);
});

const sortedYears = computed(() => {
  const years = Object.keys(store.resultsByYear || {});
  return years.sort((a, b) => Number(b) - Number(a));
});

const sortedResultsByYear = (year: string) => {
  const results = store.resultsByYear[year] || [];
  return [...results].sort((a, b) => {
    const timeA = new Date(a.fechaEstudio).getTime();
    const timeB = new Date(b.fechaEstudio).getTime();
    return timeB - timeA; // Más reciente primero
  });
};

const getTipoLabel = (tipo?: string) => {
  const option = store.tipoEstudioOptions.find(opt => opt.value === tipo);
  return option?.label || tipo || '';
};

const getResultadoLabel = (resultado?: string) => {
  const option = store.resultadoGlobalOptions.find(opt => opt.value === resultado);
  return option?.label || resultado || '';
};

const getResultadoColor = (resultado?: string) => {
  if (resultado === 'NORMAL') return 'text-green-600 font-semibold';
  if (resultado === 'ANORMAL') return 'text-red-600 font-semibold';
  return 'text-yellow-600 font-semibold';
};

const getDocExtensionIcon = (extension: string) => {
  if (extension === '.pdf') return 'fas fa-file-pdf text-red-500';
  if (['.jpg', '.jpeg', '.png'].includes(extension)) return 'fas fa-file-image text-blue-500';
  return 'fas fa-file text-gray-500';
};

const handleSeleccionarDocumento = (documento: DocumentoExterno) => {
  formData.value.idDocumentoExterno = documento._id;
  formData.value.documentoExterno = documento;
  pendingVincularDocumento.value = true;
  pendingDesvincularDocumento.value = false;
  showSelectorDocumento.value = false;
};

const handleDesvincularDocumento = () => {
  pendingDesvincularDocumento.value = true;
};

const cancelarPendingDesvincularDocumento = () => {
  pendingDesvincularDocumento.value = false;
};

const cancelarPendingVincularDocumento = () => {
  formData.value.idDocumentoExterno = undefined;
  formData.value.documentoExterno = undefined;
  pendingVincularDocumento.value = false;
};

const licenseKey = import.meta.env.VITE_VPV_LICENSE;
useLicense({ licenseKey });

const localization = {
    customLang: {
        ...Locales.en_US,
        documentPropertiesLabel: 'Propiedades del documento',
        documentPropertiesTooltip: 'Mostrar propiedades del documento',
        downloadFileLabel: 'Descargar',
        downloadFileTooltip: 'Descargar archivo',
        dragDropFileMessage: 'Arrastra y suelta un archivo aquí para abrirlo',
        dualPageLabel: 'Página doble',
        firstPageTooltip: 'Ir a la primera página',
        fullScreenLabel: 'Pantalla completa',
        fullScreenTooltip: 'Ver en pantalla completa',
        handToolLabel: 'Herramienta de mano',
        handToolTooltip: 'Mover página con herramienta de mano',
        horizontalScrollingLabel: 'Desplazamiento horizontal',
        lastPageLabel: 'Última página',
        lastPageTooltip: 'Ir a la última página',
        moreOptionTooltip: 'Más opciones',
        nextPageTooltip: 'Página siguiente',
        openLocalFileLabel: 'Abrir archivo local',
        openLocalFileTooltip: 'Seleccionar un archivo local para abrir',
        pageScrollingLabel: 'Desplazamiento por página',
        passwordConfirmLabel: 'Confirmar',
        passwordError: 'Contraseña incorrecta',
        passwordModalMessage: 'Este documento está protegido con contraseña. Introduce la contraseña para continuar.',
        passwordModalTitle: 'Contraseña requerida',
        passwordPlaceholder: 'Introducir contraseña',
        previousPageTooltip: 'Página anterior',
        printCancelLabel: 'Cancelar impresión',
        printLabel: 'Imprimir',
        printLoadingMessage: 'Preparando para imprimir...',
        printTooltip: 'Imprimir archivo',
        propertiesAuthorLabel: 'Autor',
        propertiesCreateOnLabel: 'Creado el',
        propertiesCreatorLabel: 'Creador',
        propertiesFilenameLabel: 'Nombre del archivo',
        propertiesFileSizeLabel: 'Tamaño del archivo',
        propertiesKeywordLabel: 'Palabras clave',
        propertiesModifiedOnLabel: 'Modificado el',
        propertiesPageCountLabel: 'Cantidad de páginas',
        propertiesPDFProducerLabel: 'Productor PDF',
        propertiesPDFVersionLabel: 'Versión de PDF',
        propertiesSubjectLabel: 'Asunto',
        propertiesTitleLabel: 'Título',
        rotateClockwiseLabel: 'Girar a la derecha',
        rotateClockwiseTooltip: 'Girar en sentido horario',
        rotateCounterclockwiseLabel: 'Girar a la izquierda',
        rotateCounterclockwiseTooltip: 'Girar en sentido antihorario',
        searchButtonTooltip: 'Buscar',
        searchCloseButtonTooltip: 'Cerrar búsqueda',
        searchInputPlaceholder: 'Buscar...',
        searchNextTooltip: 'Siguiente resultado',
        searchPrevTooltip: 'Resultado anterior',
        singlePageLabel: 'Página única',
        textSelectionLabel: 'Seleccionar texto',
        textSelectionTooltip: 'Activar herramienta de selección de texto',
        themeEnableDarkTooltip: 'Activar modo oscuro',
        themeEnableLightTooltip: 'Activar modo claro',
        thumbnailTooltip: 'Miniaturas',
        verticalScrollingLabel: 'Desplazamiento vertical',
        wrappedScrollingLabel: 'Desplazamiento envuelto',
        zoomActualSize: 'Tamaño real',
        zoomInTooltip: 'Acercar',
        zoomOutTooltip: 'Alejar',
        zoomPageFit: 'Ajustar a la página',
        zoomPageWidth: 'Ajustar al ancho de la página',
        zoomSelectTooltip: 'Seleccionar nivel de zoom'
    }
};

const joinClinicalPath = (ruta: string, nombreArchivo: string) =>
  `${ruta}/${nombreArchivo}`.replace(/\/+/g, '/');

// Estado para el visor de PDF
const showPdfViewer = ref(false);
const pdfUrl = ref('');
const currentPdfUrl = ref('');

// Estado para el visor de imágenes
const showImageViewer = ref(false);
const imageUrl = ref('');
const currentImageUrl = ref('');
const imageZoom = ref(0.8);
const rotationAngle = ref(0);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const imagePosition = ref({ x: 0, y: 0 });
const lastImagePosition = ref({ x: 0, y: 0 });

const drawerRef = ref<HTMLElement | null>(null);
const drawerHeaderRef = ref<HTMLElement | null>(null);
const buttonsContainerRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const previewWrapperRef = ref<HTMLElement | null>(null);
const contextualMessageRef = ref<HTMLElement | null>(null);
const previewHeight = ref(240);
let drawerResizeObserver: ResizeObserver | null = null;

function calculatePreviewHeight() {
  const content = contentRef.value;
  const preview = previewWrapperRef.value;
  if (!content || !preview) return;
  const contentRect = content.getBoundingClientRect();
  const previewRect = preview.getBoundingClientRect();
  const buttonsHeight = buttonsContainerRef.value?.offsetHeight ?? 0;
  const contextualMessageHeight = contextualMessageRef.value?.offsetHeight ?? 0;
  const offsetTop = previewRect.top - contentRect.top;
  const bottomGap = 49;
  const available = content.clientHeight - offsetTop - buttonsHeight - contextualMessageHeight - bottomGap - 1;
  previewHeight.value = Math.max(114, Math.min(480, available));
}

const previewContainerStyle = computed(() => ({
  height: `${previewHeight.value}px`,
  maxHeight: `${previewHeight.value}px`,
  minHeight: '114'
}));

function setupDrawerObserver() {
  if (typeof ResizeObserver === 'undefined') return;
  if (drawerResizeObserver) {
    drawerResizeObserver.disconnect();
  }
  drawerResizeObserver = new ResizeObserver(() => {
    calculatePreviewHeight();
  });
  if (drawerRef.value) {
    drawerResizeObserver.observe(drawerRef.value);
  }
  if (contentRef.value) {
    drawerResizeObserver.observe(contentRef.value);
  }
  if (previewWrapperRef.value) {
    drawerResizeObserver.observe(previewWrapperRef.value);
  }
  if (contextualMessageRef.value) {
    drawerResizeObserver.observe(contextualMessageRef.value);
  }
}

function teardownDrawerObserver() {
  if (!drawerResizeObserver) return;
  drawerResizeObserver.disconnect();
  drawerResizeObserver = null;
}

const windowWidth = ref(window.innerWidth);
const updateWindowWidth = () => { 
  windowWidth.value = window.innerWidth;
  calculatePreviewHeight();
};

/// Computed para las condiciones responsivas
const isExtraLargeScreen = computed(() => windowWidth.value >= 1280);
const isLargeScreen = computed(() => windowWidth.value >= 1024 && windowWidth.value < 1280);
const isMediumScreen = computed(() => windowWidth.value >= 768 && windowWidth.value < 1024);
const isSmallScreen = computed(() => windowWidth.value < 768);

// Valores dinámicos para initialThumbnails-visible y initialScale
const initialThumbnailsVisible = computed(() => isLargeScreen.value || isExtraLargeScreen.value);
const initialScale = computed(() => {
  if (isExtraLargeScreen.value) return 2; // >= 1280px
  if (isLargeScreen.value) return 1.75;   // 1024px - 1279px
  if (isMediumScreen.value) return 1.4;   // 768px - 1023px
  return 0.8;                               // < 768px
});

const abrirPdf = async (ruta: string, nombre: string, updatedAt: number | null) => {
  const relativePath = joinClinicalPath(ruta, nombre);
  const fullPath = new URL(buildClinicalFileUrl(relativePath));
  if (updatedAt) {
    fullPath.searchParams.append('t', updatedAt.toString());
  }

  try {
    const response = await axios.get(buildClinicalFileUrl(relativePath), {
      responseType: 'blob',
      ...authRequestConfig(),
    });
    const contentType = response.headers['content-type'];

    if (response.status === 200 && contentType === 'application/pdf') {
      pdfUrl.value = URL.createObjectURL(response.data);
      currentPdfUrl.value = fullPath.href;
      showPdfViewer.value = true;
      nextTick(() => {
        window.focus();
      });
    } else {
      alert('El archivo PDF no existe o no es válido.');
    }
  } catch (error) {
    console.error('Error al cargar el PDF:', error);
    alert('Ocurrió un error al intentar cargar el archivo PDF.');
  }
};

const cerrarPdf = () => {
  showPdfViewer.value = false;
  pdfUrl.value = '';
};

const obtenerExtensionArchivo = (documento: any) => {
  if (!documento) return '';
  const nombreArchivo = `${documento.nombreDocumento} ${convertirFechaISOaDDMMYYYY(documento.fechaDocumento)}${documento.extension}`;
  const archivo = (documento.rutaDocumento && documento.rutaDocumento.includes('.')) 
    ? documento.rutaDocumento.split('/').pop() 
    : nombreArchivo;
  return archivo.split('.').pop().toLowerCase();
};

const construirRutaCompleta = (documento: any) => {
  if (!documento || !documento.rutaDocumento) return '';
  const nombreArchivo = `${documento.nombreDocumento} ${convertirFechaISOaDDMMYYYY(documento.fechaDocumento)}${documento.extension}`;
  if (documento.rutaDocumento.endsWith(nombreArchivo)) {
    return buildClinicalFileUrl(documento.rutaDocumento);
  }
  return buildClinicalFileUrl(joinClinicalPath(documento.rutaDocumento, nombreArchivo));
};

const abrirImagen = async (rutaCompleta: string) => {
  try {
    const relativePath = rutaCompleta.startsWith('http')
      ? new URL(rutaCompleta).pathname.replace(/^\//, '')
      : rutaCompleta.replace(/^\//, '');
    const exists = await headClinicalFile(relativePath, { contentType: 'image/' });
    if (exists) {
      const response = await axios.get(buildClinicalFileUrl(relativePath), {
        responseType: 'blob',
        ...authRequestConfig(),
      });
      const blobUrl = URL.createObjectURL(response.data);
      imageUrl.value = blobUrl;
      currentImageUrl.value = blobUrl;
      showImageViewer.value = true;

      nextTick(() => {
        window.focus();
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
      });
    } else {
      alert('El archivo no es una imagen válida.');
    }
  } catch (error) {
    console.error('Error al cargar la imagen:', error);
    alert('Ocurrió un error al intentar cargar la imagen.');
  }
};

const cerrarImagen = () => {
  showImageViewer.value = false;
  imageUrl.value = '';
  imageZoom.value = 0.8;
  rotationAngle.value = 0;
  imagePosition.value = { x: 0, y: 0 };
  lastImagePosition.value = { x: 0, y: 0 };
  isDragging.value = false;
  
  document.removeEventListener('mousemove', handleGlobalMouseMove);
  document.removeEventListener('mouseup', handleGlobalMouseUp);
};

const abrirDocumentoExterno = async (documento: any) => {
  if (!documento) return;
  
  const extension = obtenerExtensionArchivo(documento);
  const isImage = ['png', 'jpg', 'jpeg'].includes(extension);
  const rutaCompleta = construirRutaCompleta(documento);

  if (!rutaCompleta && documento.rutaDocumento) {
    // Si no hay ruta completa pero hay rutaDocumento, es un PDF de informe (no externo)
    // Pero aquí estamos tratando con documentos externos mayormente
  }

  if (isImage && rutaCompleta) {
    abrirImagen(rutaCompleta);
  } else if (documento.rutaDocumento) {
    const updatedAt = documento.updatedAt ? new Date(documento.updatedAt).getTime() : null;
    abrirPdf(documento.rutaDocumento, `${documento.nombreDocumento} ${convertirFechaISOaDDMMYYYY(documento.fechaDocumento)}.pdf`, updatedAt);
  } else {
    alert('No se puede abrir el documento: faltan datos de la ruta del archivo.');
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return;

  event.preventDefault();
  handleDismiss();
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', updateWindowWidth);
  window.addEventListener('resize', calculatePreviewHeight);
  setupDrawerObserver();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('resize', updateWindowWidth);
  window.removeEventListener('resize', calculatePreviewHeight);
  teardownDrawerObserver();
});

const handleGlobalMouseMove = (event: MouseEvent) => {
  if (isDragging.value) {
    imagePosition.value = {
      x: event.clientX - dragStart.value.x,
      y: event.clientY - dragStart.value.y
    };
  }
};

const handleGlobalMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false;
    lastImagePosition.value = { ...imagePosition.value };
  }
};

const startDrag = (event: MouseEvent) => {
  event.preventDefault();
  isDragging.value = true;
  dragStart.value = {
    x: event.clientX - imagePosition.value.x,
    y: event.clientY - imagePosition.value.y
  };
};

const handleImageWheel = (event: WheelEvent) => {
  event.preventDefault();
  if (event.deltaY < 0) zoomIn();
  else zoomOut();
};

const zoomIn = () => { imageZoom.value = Math.min(imageZoom.value * 1.2, 5); };
const zoomOut = () => { imageZoom.value = Math.max(imageZoom.value / 1.2, 0.4); };
const rotarImagen = () => { rotationAngle.value += 90; };
const resetImagePosition = () => {
  imagePosition.value = { x: 0, y: 0 };
  imageZoom.value = 0.8;
};

const descargarPdfActual = async () => {
  if (!currentPdfUrl.value) return;
  const response = await axios.get(currentPdfUrl.value, { responseType: 'blob' });
  const blob = response.data;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'documento.pdf';
  link.click();
};

const imprimirPdfActual = () => {
  if (currentPdfUrl.value) window.open(currentPdfUrl.value, '_blank')?.print();
};

const descargarImagenActual = async () => {
  if (!currentImageUrl.value) return;
  const response = await axios.get(currentImageUrl.value, { responseType: 'blob' });
  const blob = response.data;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'imagen.jpg';
  link.click();
};

const getTipoSangreLabel = (tipo?: string) => {
  const option = store.tipoSangreOptions.find(opt => opt.value === tipo);
  return option?.label || tipo || '';
};

const joinAlteracionesLinea = (item: ResultadoClinico) => {
  if (item.resultadoGlobal !== 'ANORMAL') return '';
  if (item.tipoEstudio === 'RAYOS_X' && item.tipoAlteracionRayosX?.length) {
    return item.tipoAlteracionRayosX
      .map(
        (v) =>
          store.tipoAlteracionRayosXOptions.find((o) => o.value === v)?.label || v,
      )
      .join(', ');
  }
  if (
    item.tipoEstudio === 'ANALISIS_LABORATORIO' &&
    item.tipoAlteracionAnalisisLaboratorio?.length
  ) {
    return item.tipoAlteracionAnalisisLaboratorio
      .map(
        (v) =>
          store.tipoAlteracionAnalisisLaboratorioOptions.find((o) => o.value === v)
            ?.label || v,
      )
      .join(', ');
  }
  return '';
};

const getTipoIcon = (tipo?: string) => {
  if (tipo === 'ESPIROMETRIA') return 'fas fa-lungs';
  if (tipo === 'EKG') return 'fas fa-heartbeat';
  if (tipo === 'TIPO_SANGRE') return 'fas fa-tint';
  if (tipo === 'RAYOS_X') return 'fas fa-x-ray';
  if (tipo === 'ANALISIS_LABORATORIO') return 'fas fa-vial';
  return 'fas fa-notes-medical';
};

const getIconColor = (tipo?: string) => {
  const dark = isHtmlDark.value;
  if (tipo === 'ESPIROMETRIA') return dark ? '#93c5fd' : '#1d4ed8';
  if (tipo === 'EKG') return dark ? '#fca5a5' : '#dc2626';
  if (tipo === 'TIPO_SANGRE') return dark ? '#fecaca' : '#991b1b';
  if (tipo === 'RAYOS_X') return dark ? '#5eead4' : '#0f766e';
  if (tipo === 'ANALISIS_LABORATORIO') return dark ? '#ddd6fe' : '#7c3aed';
  return dark ? '#cbd5e1' : '#475569';
};

const getIconBackground = (tipo?: string) => {
  const dark = isHtmlDark.value;
  if (tipo === 'ESPIROMETRIA') return dark ? 'rgba(37,99,235,0.48)' : 'rgba(30,64,175,0.12)';
  if (tipo === 'EKG') return dark ? 'rgba(220,38,38,0.45)' : 'rgba(220,38,38,0.12)';
  if (tipo === 'TIPO_SANGRE') return dark ? 'rgba(185,28,28,0.5)' : 'rgba(153,27,27,0.12)';
  if (tipo === 'RAYOS_X') return dark ? 'rgba(13,148,136,0.5)' : 'rgba(15,118,110,0.12)';
  if (tipo === 'ANALISIS_LABORATORIO') return dark ? 'rgba(139,92,246,0.48)' : 'rgba(124,58,237,0.12)';
  return dark ? 'rgba(148,163,184,0.35)' : 'rgba(71,85,105,0.08)';
};

const getFechaFieldLabel = (tipo?: string) => {
  if (tipo === 'TIPO_SANGRE') return 'Fecha de determinación';
  if (tipo === 'ESPIROMETRIA' || tipo === 'EKG' || tipo === 'RAYOS_X') return 'Fecha del estudio';
  if (tipo === 'ANALISIS_LABORATORIO') return 'Fecha de toma de muestra';
  return 'Fecha del estudio';
};

const formatDate = (date: string | Date) => {
  if (!date) return '';
  const dateStr = date instanceof Date ? date.toISOString() : date;
  return convertirFechaISOaDDMMYYYY(dateStr);
};

const buildPdfUrl = (ruta: string, nombrePDF: string, updatedAt: number | null = null, options: { useCacheBuster?: boolean; fallbackToNow?: boolean } = {}) => {
  const { useCacheBuster = true, fallbackToNow = false } = options;
  const relativePath = joinClinicalPath(ruta, nombrePDF);
  const fullPath = new URL(buildClinicalFileUrl(relativePath));

  if (useCacheBuster) {
    const cacheBuster = updatedAt || (fallbackToNow ? Date.now() : null);
    if (cacheBuster) {
      fullPath.searchParams.set('t', cacheBuster.toString());
    }
  }

  return fullPath.href;
};








</script>

<style scoped>
.panel-overlay-enter-active,
.panel-overlay-leave-active {
  transition: opacity 90ms ease;
}

.panel-overlay-enter-from,
.panel-overlay-leave-to {
  opacity: 0;
}

.slide-right-enter-active {
  transition: transform 120ms ease-out;
}

.slide-right-leave-active {
  transition: transform 90ms ease-in;
  pointer-events: none;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .panel-overlay-enter-active,
  .panel-overlay-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active {
    transition: none !important;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Transición para el mensaje de desvinculación */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.slide-down-enter-to {
  opacity: 1;
  transform: translateY(0);
  max-height: 100px;
}

.slide-down-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 100px;
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}
</style>
