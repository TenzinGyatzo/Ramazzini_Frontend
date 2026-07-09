<template>
  <div v-if="isVisible" class="modal-resumen-importacion fixed inset-0 z-50 overflow-y-auto">
    <!-- Overlay de fondo -->
    <div class="flex items-center justify-center min-h-screen px-4 text-center">
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>

      <!-- Modal -->
      <div class="modal-resumen-importacion-panel relative inline-block w-full max-w-2xl bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all">
        <!-- Header -->
        <div class="modal-resumen-importacion-header bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Resumen de Importación de Trabajadores
            </h3>
            <button
              @click="closeModal"
              class="modal-resumen-importacion-close text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Estadísticas Generales -->
          <div class="modal-resumen-importacion-stats grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="modal-resumen-importacion-stat bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-green-600">{{ resumen.totalProcessed }}</div>
              <div class="text-sm text-green-700">Total Procesados</div>
            </div>
            <div class="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-green-700">{{ resumen.successful }}</div>
              <div class="text-sm text-green-800">Importados Exitosamente</div>
            </div>
            <div class="bg-red-100 border border-red-300 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-red-700">{{ resumen.failed }}</div>
              <div class="text-sm text-red-800">Fallidos</div>
            </div>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-blue-600">{{ porcentajeExitoso }}%</div>
              <div class="text-sm text-blue-700">Tasa de Éxito</div>
            </div>
          </div>

          <!-- Mensaje Principal -->
          <div class="mb-2">
            <div v-if="resumen.successful === resumen.totalProcessed" class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-green-800 font-medium">{{ resumen.message }}</span>
              </div>
            </div>
            <div v-else class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-yellow-800 font-medium">{{ resumen.message }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Contenido del Modal -->
        <div class="modal-resumen-importacion-body bg-gray-50 px-4 py-3 sm:px-6">
          <!-- Tabs -->
          <div class="border-b border-gray-200 mb-4">
            <nav class="grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-4">
              <button
                @click="activeTab = 'resumen'"
                :class="[
                  activeTab === 'resumen'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                  'modal-resumen-importacion-tab whitespace-nowrap py-3 px-3 border-2 rounded-lg font-medium text-sm transition-all duration-200 text-center'
                ]"
              >
                Resumen General
              </button>
              <button
                v-if="resumen.failed > 0"
                @click="activeTab = 'errores'"
                :class="[
                  activeTab === 'errores'
                    ? 'border-red-500 text-red-600 bg-red-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                  'modal-resumen-importacion-tab whitespace-nowrap py-3 px-3 border-2 rounded-lg font-medium text-sm transition-all duration-200 text-center'
                ]"
              >
                Errores ({{ resumen.failed }})
              </button>
              <button
                v-if="resumen.successful > 0"
                @click="activeTab = 'exitosos'"
                :class="[
                  activeTab === 'exitosos'
                    ? 'border-green-500 text-green-600 bg-green-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                  'modal-resumen-importacion-tab whitespace-nowrap py-3 px-3 border-2 rounded-lg font-medium text-sm transition-all duration-200 text-center'
                ]"
              >
                Exitosos ({{ resumen.successful }})
              </button>
              <button
                v-if="trabajadoresConNormalizaciones.length > 0"
                @click="activeTab = 'normalizaciones'"
                :class="[
                  activeTab === 'normalizaciones'
                    ? 'border-purple-500 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                  'modal-resumen-importacion-tab whitespace-nowrap py-3 px-3 border-2 rounded-lg font-medium text-sm transition-all duration-200 text-center'
                ]"
              >
                Normalizaciones ({{ trabajadoresConNormalizaciones.length }})
              </button>
            </nav>
          </div>

          <!-- Tab: Resumen General -->
          <div v-if="activeTab === 'resumen'" class="space-y-4">
            <div class="modal-resumen-importacion-card bg-white rounded-lg border border-gray-200 p-4">
              <h4 class="text-lg font-medium text-gray-900 mb-3">Detalles de la Importación</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 md:w-3/5 gap-0">
                <div>
                  <span class="text-sm font-medium text-gray-500">Total procesados:</span>
                  <span class="ml-2 text-sm text-gray-900">{{ resumen.totalProcessed }}</span>
                </div>
                <div>
                  <span class="text-sm font-medium text-gray-500">Registros exitosos:</span>
                  <span class="ml-2 text-sm text-green-600 font-medium">{{ resumen.successful }}</span>
                </div>
                <div>
                  <span class="text-sm font-medium text-gray-500">Registros fallidos:</span>
                  <span class="ml-2 text-sm text-red-600 font-medium">{{ resumen.failed }}</span>
                </div>
                <div>
                  <span class="text-sm font-medium text-gray-500">Tasa de éxito:</span>
                  <span class="ml-2 text-sm text-blue-600 font-medium">{{ porcentajeExitoso }}%</span>
                </div>
              </div>
            </div>

            <div v-if="resumen.failed > 0" class="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 class="text-lg font-medium text-red-800 mb-2">⚠️ Atención</h4>
              <p class="text-red-700 text-sm">
                Se encontraron {{ resumen.failed }} registros con errores. Revisa la pestaña "Errores" para más detalles.
              </p>
            </div>

            <div v-if="resumen.successful > 0" class="bg-green-50 border border-green-300 rounded-lg p-4">
              <h4 class="text-lg font-medium text-green-800 mb-2">✅ Éxito</h4>
              <p class="text-green-700 text-sm">
                Se importaron exitosamente {{ resumen.successful }} trabajadores.
              </p>
            </div>

            <div
              v-if="duplicadosEnImportacion > 0"
              class="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <p class="text-sm text-amber-900">
                <strong>{{ duplicadosEnImportacion }}</strong> registro(s) importado(s) con posible duplicado detectado.
              </p>
              <button
                type="button"
                class="text-sm px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                @click="emit('revisar-duplicados')"
              >
                Revisar duplicados pendientes
              </button>
            </div>
          </div>

          <!-- Tab: Errores -->
          <div v-if="activeTab === 'errores' && resumen.failed > 0" class="space-y-4">
            <div class="modal-resumen-importacion-card bg-white rounded-lg border border-gray-200 p-4">
              <h4 class="text-lg font-medium text-red-800 mb-3">Detalle de Errores</h4>
              <div class="space-y-3">
                <div
                  v-for="(error, index) in resumen.data.filter(r => !r.success)"
                  :key="index"
                  class="border border-red-200 rounded-lg p-3 bg-red-50"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h5 class="text-sm font-medium text-red-800 mb-1">
                        {{ error.worker?.primerApellido + ' ' + error.worker?.segundoApellido + ' ' + error.worker?.nombre || 'Sin nombre' }}
                        <span class="text-xs text-gray-600 font-normal">({{ error.worker.sexo }})</span> 
                      </h5>

                      <p class="text-sm text-red-700 mb-2">{{ error.error }}</p>
                      
                      <!-- Datos del trabajador que falló -->
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                        <div v-if="error.worker?.fechaNacimiento">
                          <span class="font-medium">Fecha Nacimiento:</span> {{ formatDate(error.worker.fechaNacimiento) }}
                        </div>
                        <div v-else>
                          <span class="font-medium">Fecha Nacimiento:</span>
                        </div>
                        <div v-if="error.worker?.fechaIngreso">
                          <span class="font-medium">Fecha Ingreso:</span> {{ formatDate(error.worker.fechaIngreso) }}
                        </div>
                        <div v-else>
                          <span class="font-medium">Fecha Ingreso:</span>
                        </div>
                        <div v-if="error.worker?.escolaridad">
                          <span class="font-medium">Escolaridad:</span> {{ error.worker.escolaridad }}
                        </div>
                        <div v-else>
                          <span class="font-medium">Escolaridad:</span>
                        </div>
                        <div v-if="error.worker?.puesto">
                          <span class="font-medium">Puesto:</span> {{ error.worker.puesto }}
                        </div>
                        <div v-else>
                          <span class="font-medium">Puesto:</span>
                        </div>
                        <div v-if="error.worker?.estadoCivil">
                          <span class="font-medium">Estado Civil:</span> {{ error.worker.estadoCivil }}
                        </div>
                        <div v-else>
                          <span class="font-medium">Estado Civil:</span>
                        </div>
                        <div v-if="error.worker?.numeroEmpleado">
                          <span class="font-medium">Número Empleado:</span> {{ error.worker.numeroEmpleado }}
                        </div>
                        <div v-else>
                          <span class="font-medium">Número Empleado:</span> -
                        </div>
                        <div v-if="error.worker?.telefono">
                          <span class="font-medium">Teléfono:</span> {{ error.worker.telefono }}
                        </div>
                        <div v-else>
                          <span class="font-medium">Teléfono:</span> -
                        </div>
                        <div v-if="error.worker?.nss">
                          <span class="font-medium">NSS:</span> {{ error.worker.nss }}
                        </div>
                        <div v-else>
                          <span class="font-medium">NSS:</span> -
                        </div>
                      </div>

                      <!-- Errores de validación específicos -->
                      <div v-if="error.validationErrors && error.validationErrors.length > 0" class="mt-2">
                        <span class="text-xs font-medium text-red-600">Errores de validación:</span>
                        <ul class="mt-1 space-y-1">
                          <li
                            v-for="(validationError, vIndex) in error.validationErrors"
                            :key="vIndex"
                            class="text-xs text-red-600 ml-2"
                          >
                            • {{ validationError }}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Exitosos -->
          <div v-if="activeTab === 'exitosos' && resumen.successful > 0" class="space-y-4">
            <div class="modal-resumen-importacion-card bg-white rounded-lg border border-gray-200 p-4">
              <h4 class="text-lg font-medium text-green-800 mb-3">Trabajadores Importados Exitosamente</h4>
              <div class="space-y-3">
                <div
                  v-for="(success, index) in resumen.data.filter(r => r.success)"
                  :key="index"
                  class="border border-green-200 rounded-lg p-3 bg-green-50"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <h5 class="text-sm font-medium text-green-800">
                        {{ success.worker?.primerApellido + ' ' + success.worker?.segundoApellido + ' ' + success.worker?.nombre || 'Sin nombre' }} 
                        <span class="text-xs text-gray-600 font-normal">({{ success.worker.sexo }})</span> 
                      </h5>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 mt-2">
                        <div v-if="success.worker?.fechaNacimiento">
                          <span class="font-medium">Fecha Nacimiento:</span> {{ formatDate(success.worker.fechaNacimiento) }}
                        </div>
                        <div v-if="success.worker?.fechaIngreso">
                          <span class="font-medium">Fecha Ingreso:</span> {{ formatDate(success.worker.fechaIngreso) }}
                        </div>
                        <div v-if="success.worker?.escolaridad">
                          <span class="font-medium">Escolaridad:</span> {{ success.worker.escolaridad }}
                        </div>
                        <div v-if="success.worker?.puesto">
                          <span class="font-medium">Puesto:</span> {{ success.worker.puesto }}
                        </div>
                        <div v-if="success.worker?.estadoCivil">
                          <span class="font-medium">Estado Civil:</span> {{ success.worker.estadoCivil }}
                        </div>
                        <div v-if="success.worker?.numeroEmpleado">
                          <span class="font-medium">Número Empleado:</span> {{ success.worker.numeroEmpleado }}
                        </div>
                        <div v-else>
                          <span class="font-medium">Número Empleado:</span> -
                        </div>
                        <div v-if="success.worker?.telefono">
                          <span class="font-medium">Teléfono:</span> {{ success.worker.telefono }}
                        </div>
                        <div v-else>
                          <span class="font-medium">Teléfono:</span> -
                        </div>
                        <div v-if="success.worker?.nss">
                          <span class="font-medium">NSS:</span> {{ success.worker.nss }}
                        </div>
                        <div v-else>
                          <span class="font-medium">NSS:</span> -
                        </div>
                        <div v-if="success.posibleDuplicado" class="sm:col-span-2 mt-2 p-2 rounded bg-amber-100 text-amber-900">
                          <span class="font-medium">Posible duplicado ({{ success.posibleDuplicado.criterio }}):</span>
                          {{ success.posibleDuplicado.trabajador?.nombre }}
                          {{ success.posibleDuplicado.trabajador?.primerApellido }}
                        </div>
                      </div>
                    </div>
                    <div class="ml-4">
                      <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Normalizaciones -->
          <div v-if="activeTab === 'normalizaciones'" class="space-y-4">
            <div class="modal-resumen-importacion-card bg-white rounded-lg border border-gray-200 p-4">
              <h4 class="text-lg font-medium text-purple-800 mb-3">Datos Normalizados</h4>
              
              <div v-if="trabajadoresConNormalizaciones.length === 0" class="text-center py-8">
                <svg class="w-16 h-16 text-purple-200 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clip-rule="evenodd"></path>
                </svg>
                <h5 class="text-lg font-medium text-purple-800 mb-2">No se detectaron normalizaciones</h5>
                <p class="text-sm text-gray-600">
                  Todos los datos fueron importados sin necesidad de normalización.
                </p>
              </div>
              
              <div v-else class="space-y-3">
                <p class="text-sm text-gray-600 mb-4">
                  Los siguientes trabajadores tuvieron datos normalizados durante la importación para cumplir con los estándares del sistema.
                </p>
                
                <div
                  v-for="(trabajador, index) in trabajadoresConNormalizaciones"
                  :key="index"
                  class="border border-purple-200 rounded-lg p-3 bg-purple-50"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h5 class="text-sm font-medium text-purple-800 mb-2">
                        {{ trabajador.worker?.primerApellido + ' ' + trabajador.worker?.segundoApellido + ' ' + trabajador.worker?.nombre || 'Sin nombre' }}
                      </h5>
                      
                      <!-- Campos normalizados -->
                      <div class="space-y-2">
                        <div v-if="trabajador.worker?.sexoOriginal && trabajador.worker?.sexo && trabajador.worker.sexoOriginal !== trabajador.worker.sexo" class="flex items-center text-xs">
                          <span class="font-medium text-purple-700 w-20">Sexo:</span>
                          <span class="text-gray-500 line-through mr-2">{{ trabajador.worker.sexoOriginal }}</span>
                          <svg class="w-3 h-3 text-purple-500 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
                          </svg>
                          <span class="text-purple-700 font-medium">{{ trabajador.worker.sexo }}</span>
                        </div>
                        
                        <div v-if="trabajador.worker?.escolaridadOriginal && trabajador.worker?.escolaridad && trabajador.worker.escolaridadOriginal !== trabajador.worker.escolaridad" class="flex items-center text-xs">
                          <span class="font-medium text-purple-700 w-20">Escolaridad:</span>
                          <span class="text-gray-500 line-through mr-2">{{ trabajador.worker.escolaridadOriginal }}</span>
                          <svg class="w-3 h-3 text-purple-500 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
                          </svg>
                          <span class="text-purple-700 font-medium">{{ trabajador.worker.escolaridad }}</span>
                        </div>
                        
                        <div v-if="trabajador.worker?.estadoCivilOriginal && trabajador.worker?.estadoCivil && trabajador.worker.estadoCivilOriginal !== trabajador.worker.estadoCivil" class="flex items-center text-xs">
                          <span class="font-medium text-purple-700 w-20">Estado Civil:</span>
                          <span class="text-gray-500 line-through mr-2">{{ trabajador.worker.estadoCivilOriginal }}</span>
                          <svg class="w-3 h-3 text-purple-500 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
                          </svg>
                          <span class="text-purple-700 font-medium">{{ trabajador.worker.estadoCivil }}</span>
                        </div>
                        
                        <div v-if="trabajador.worker?.telefonoOriginal && trabajador.worker?.telefono && trabajador.worker.telefonoOriginal !== trabajador.worker.telefono" class="flex items-center text-xs">
                          <span class="font-medium text-purple-700 w-20">Teléfono:</span>
                          <span class="text-gray-500 line-through mr-2">{{ trabajador.worker.telefonoOriginal }}</span>
                          <svg class="w-3 h-3 text-purple-500 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
                          </svg>
                          <span class="text-purple-700 font-medium">{{ trabajador.worker.telefono }}</span>
                        </div>
                        
                        <div v-if="trabajador.worker?.numeroEmpleadoOriginal && trabajador.worker?.numeroEmpleado && trabajador.worker.numeroEmpleadoOriginal !== trabajador.worker.numeroEmpleado" class="flex items-center text-xs">
                          <span class="font-medium text-purple-700 w-20">Número Empleado:</span>
                          <span class="text-gray-500 line-through mr-2">{{ trabajador.worker.numeroEmpleadoOriginal }}</span>
                          <svg class="w-3 h-3 text-purple-500 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
                          </svg>
                          <span class="text-purple-700 font-medium">{{ trabajador.worker.numeroEmpleado }}</span>
                        </div>
                        
                        <div v-if="trabajador.worker?.nssOriginal && trabajador.worker?.nss && trabajador.worker.nssOriginal !== trabajador.worker.nss" class="flex items-center text-xs">
                          <span class="font-medium text-purple-700 w-20">NSS:</span>
                          <span class="text-gray-500 line-through mr-2">{{ trabajador.worker.nssOriginal }}</span>
                          <svg class="w-3 h-3 text-purple-500 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
                          </svg>
                          <span class="text-purple-700 font-medium">{{ trabajador.worker.nss }}</span>
                        </div>
                      </div>
                      
                      <!-- Información adicional del trabajador -->
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 mt-3 pt-2 border-t border-purple-200">
                        <div v-if="trabajador.worker?.numeroEmpleado">
                          <span class="font-medium">Número Empleado:</span> {{ trabajador.worker.numeroEmpleado }}
                        </div>
                        <div v-if="trabajador.worker?.puesto">
                          <span class="font-medium">Puesto:</span> {{ trabajador.worker.puesto }}
                        </div>
                      </div>
                    </div>
                    <div class="ml-4">
                      <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-resumen-importacion-footer bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            @click="closeModal"
            class="w-full flex items-center justify-center text-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-normal text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cerrar
          </button>
          <button
            v-if="resumen.failed > 0"
            @click="downloadErrorReport"
            class="modal-resumen-importacion-btn-secondary mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            📊 Descargar Reporte de Errores
          </button>
          <button
            v-if="trabajadoresConNormalizaciones.length > 0"
            @click="downloadNormalizationReport"
            class="modal-resumen-importacion-btn-purple mt-3 w-full inline-flex justify-center rounded-md border border-purple-300 shadow-sm px-4 py-2 bg-purple-50 text-base font-medium text-purple-700 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            🔄 Descargar Reporte de Normalizaciones
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'

interface ImportResult {
  success: boolean
  worker?: any
  error?: string
  validationErrors?: string[]
  posibleDuplicado?: {
    trabajadorId: string
    criterio: string
    trabajador?: { nombre?: string; primerApellido?: string }
  }
}

interface ImportResumen {
  message: string
  data: ImportResult[]
  totalProcessed: number
  successful: number
  failed: number
}

interface TrabajadorConNormalizacion {
  worker: {
    primerApellido?: string
    segundoApellido?: string
    nombre?: string
    sexoOriginal?: string
    sexo?: string
    escolaridadOriginal?: string
    escolaridad?: string
    estadoCivilOriginal?: string
    estadoCivil?: string
    estadoLaboralOriginal?: string
    estadoLaboral?: string
    telefonoOriginal?: string
    telefono?: string
    numeroEmpleadoOriginal?: string
    numeroEmpleado?: string
    nssOriginal?: string
    nss?: string
    puesto?: string
  }
}

interface Props {
  isVisible: boolean
  resumen: ImportResumen
}

interface Emits {
  (e: 'close'): void
  (e: 'revisar-duplicados'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeTab = ref<'resumen' | 'errores' | 'exitosos' | 'normalizaciones'>('resumen')

const porcentajeExitoso = computed(() => {
  if (props.resumen.totalProcessed === 0) return 0
  return Math.round((props.resumen.successful / props.resumen.totalProcessed) * 100)
})

const duplicadosEnImportacion = computed(
  () => props.resumen.data.filter((r) => r.success && r.posibleDuplicado).length,
)

const trabajadoresConNormalizaciones = computed((): TrabajadorConNormalizacion[] => {  
  const trabajadoresExitosos = props.resumen.data.filter(r => r.success);
  
  const trabajadoresConCambios = trabajadoresExitosos.filter(r => {
    const worker = r.worker;
    
    const tieneCambios = (
      (worker?.sexoOriginal && worker?.sexo && worker.sexoOriginal !== worker.sexo) ||
      (worker?.escolaridadOriginal && worker?.escolaridad && worker.escolaridadOriginal !== worker.escolaridad) ||
      (worker?.estadoCivilOriginal && worker?.estadoCivil && worker.estadoCivilOriginal !== worker.estadoCivil) ||
      // ✅ ELIMINADO: No se considera estado laboral en normalizaciones
      (worker?.telefonoOriginal && worker?.telefono && worker.telefonoOriginal !== worker.telefono) ||
      (worker?.numeroEmpleadoOriginal && worker?.numeroEmpleado && worker.numeroEmpleadoOriginal !== worker.numeroEmpleado) ||
      (worker?.nssOriginal && worker?.nss && worker.nssOriginal !== worker.nss)
    );
    
    return tieneCambios;
  });
        
  return trabajadoresConCambios.map(r => ({ 
    worker: {
      primerApellido: r.worker?.primerApellido,
      segundoApellido: r.worker?.segundoApellido,
      nombre: r.worker?.nombre,
      numeroEmpleadoOriginal: r.worker?.numeroEmpleadoOriginal,
      numeroEmpleado: r.worker?.numeroEmpleado,
      sexoOriginal: r.worker?.sexoOriginal,
      sexo: r.worker?.sexo,
      escolaridadOriginal: r.worker?.escolaridadOriginal,
      escolaridad: r.worker?.escolaridad,
      estadoCivilOriginal: r.worker?.estadoCivilOriginal,
      estadoCivil: r.worker?.estadoCivil,
      // ✅ ELIMINADO: No se incluyen campos de estado laboral
      telefonoOriginal: r.worker?.telefonoOriginal,
      telefono: r.worker?.telefono,
      nssOriginal: r.worker?.nssOriginal,
      nss: r.worker?.nss,
      puesto: r.worker?.puesto
    }
  }))
})

const closeModal = () => {
  emit('close')
}

const formatDate = (date: string | Date) => {
  if (!date) return 'N/A'
  try {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return String(date)
  }
}

const downloadErrorReport = () => {
  const errors = props.resumen.data.filter(r => !r.success)
  
  // ✅ SOLUCIÓN: Crear archivo Excel en lugar de CSV
  // Preparar datos para Excel
  const excelData = errors.map(error => {
    const worker = error.worker || {}
    return {
      'Error': error.error || '',
      'Número Empleado': worker.numeroEmpleado || '',
      'Primer Apellido': worker.primerApellido || '',
      'Segundo Apellido': worker.segundoApellido || '',
      'Nombre': worker.nombre || 'Sin nombre',
      'Fecha Nacimiento': worker.fechaNacimiento ? formatDate(worker.fechaNacimiento) : '',
      'Sexo': worker.sexo || '',
      'Escolaridad': worker.escolaridad || '',
      'Puesto': worker.puesto || '',
      'Fecha Ingreso': worker.fechaIngreso ? formatDate(worker.fechaIngreso) : '',
      'Teléfono': worker.telefono || '',
      'Estado Civil': worker.estadoCivil || '',
      'NSS': worker.nss || '',
      'Errores de Validación': error.validationErrors ? error.validationErrors.join('; ') : ''
    }
  })
  
  // Crear workbook y worksheet
  const workbook = {
    SheetNames: ['Errores de Importación'],
    Sheets: {
      'Errores de Importación': {
        '!ref': `A1:N${excelData.length + 1}`, // 14 columnas
        'A1': { v: 'Error', t: 's' },
        'B1': { v: 'Número Empleado', t: 's' },
        'C1': { v: 'Primer Apellido', t: 's' },
        'D1': { v: 'Segundo Apellido', t: 's' },
        'E1': { v: 'Nombre', t: 's' },
        'F1': { v: 'Fecha Nacimiento', t: 's' },
        'G1': { v: 'Sexo', t: 's' },
        'H1': { v: 'Escolaridad', t: 's' },
        'I1': { v: 'Puesto', t: 's' },
        'J1': { v: 'Fecha Ingreso', t: 's' },
        'K1': { v: 'Teléfono', t: 's' },
        'L1': { v: 'Estado Civil', t: 's' },
        'M1': { v: 'Errores de Validación', t: 's' }
      }
    }
  }
  
  // Agregar datos
  excelData.forEach((row, index) => {
    const rowNum = index + 2
    workbook.Sheets['Errores de Importación'][`A${rowNum}`] = { v: row.Error, t: 's' }
    workbook.Sheets['Errores de Importación'][`B${rowNum}`] = { v: row['Número Empleado'], t: 's' }
    workbook.Sheets['Errores de Importación'][`C${rowNum}`] = { v: row['Primer Apellido'], t: 's' }
    workbook.Sheets['Errores de Importación'][`D${rowNum}`] = { v: row['Segundo Apellido'], t: 's' }
    workbook.Sheets['Errores de Importación'][`E${rowNum}`] = { v: row.Nombre, t: 's' }
    workbook.Sheets['Errores de Importación'][`F${rowNum}`] = { v: row['Fecha Nacimiento'], t: 's' }
    workbook.Sheets['Errores de Importación'][`G${rowNum}`] = { v: row.Sexo, t: 's' }
    workbook.Sheets['Errores de Importación'][`H${rowNum}`] = { v: row.Escolaridad, t: 's' }
    workbook.Sheets['Errores de Importación'][`I${rowNum}`] = { v: row.Puesto, t: 's' }
    workbook.Sheets['Errores de Importación'][`J${rowNum}`] = { v: row['Fecha Ingreso'], t: 's' }
    workbook.Sheets['Errores de Importación'][`K${rowNum}`] = { v: row.Teléfono, t: 's' }
    workbook.Sheets['Errores de Importación'][`L${rowNum}`] = { v: row['Estado Civil'], t: 's' }
    workbook.Sheets['Errores de Importación'][`M${rowNum}`] = { v: row['Errores de Validación'], t: 's' }
  })
  
  // Convertir a buffer y descargar
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `errores_importacion_${new Date().toISOString().split('T')[0]}.xlsx`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const downloadNormalizationReport = () => {
  const normalizationData = trabajadoresConNormalizaciones.value.map(trabajador => {
    const worker = trabajador.worker || {}
    return {
      'Nombre': worker.nombre || 'Sin nombre',
      'Número Empleado': worker.numeroEmpleado || '',
      'Sexo Original': worker.sexoOriginal || '',
      'Sexo Normalizado': worker.sexo || '',
      'Escolaridad Original': worker.escolaridadOriginal || '',
      'Escolaridad Normalizado': worker.escolaridad || '',
      'Estado Civil Original': worker.estadoCivilOriginal || '',
      'Estado Civil Normalizado': worker.estadoCivil || '',
      'Teléfono Original': worker.telefonoOriginal || '',
      'Teléfono Normalizado': worker.telefono || '',
      'Número Empleado Original': worker.numeroEmpleadoOriginal || '',
      'Número Empleado Normalizado': worker.numeroEmpleado || '',
      'NSS Original': worker.nssOriginal || '',
      'NSS Normalizado': worker.nss || ''
    }
  })

  const workbook = {
    SheetNames: ['Normalizaciones'],
    Sheets: {
      'Normalizaciones': {
        '!ref': `A1:N${normalizationData.length + 1}`, // 14 columnas
        'A1': { v: 'Nombre', t: 's' },
        'B1': { v: 'Número Empleado', t: 's' },
        'C1': { v: 'Sexo Original', t: 's' },
        'D1': { v: 'Sexo Normalizado', t: 's' },
        'E1': { v: 'Escolaridad Original', t: 's' },
        'F1': { v: 'Escolaridad Normalizado', t: 's' },
        'G1': { v: 'Estado Civil Original', t: 's' },
        'H1': { v: 'Estado Civil Normalizado', t: 's' },
        'I1': { v: 'Teléfono Original', t: 's' },
        'J1': { v: 'Teléfono Normalizado', t: 's' },
        'K1': { v: 'Número Empleado Original', t: 's' },
        'L1': { v: 'Número Empleado Normalizado', t: 's' },
        'M1': { v: 'NSS Original', t: 's' },
        'N1': { v: 'NSS Normalizado', t: 's' }
      }
    }
  }

  normalizationData.forEach((row, index) => {
    const rowNum = index + 2
    workbook.Sheets['Normalizaciones'][`A${rowNum}`] = { v: row.Nombre, t: 's' }
    workbook.Sheets['Normalizaciones'][`B${rowNum}`] = { v: row['Número Empleado'], t: 's' }
    workbook.Sheets['Normalizaciones'][`C${rowNum}`] = { v: row['Sexo Original'], t: 's' }
    workbook.Sheets['Normalizaciones'][`D${rowNum}`] = { v: row['Sexo Normalizado'], t: 's' }
    workbook.Sheets['Normalizaciones'][`E${rowNum}`] = { v: row['Escolaridad Original'], t: 's' }
    workbook.Sheets['Normalizaciones'][`F${rowNum}`] = { v: row['Escolaridad Normalizado'], t: 's' }
    workbook.Sheets['Normalizaciones'][`G${rowNum}`] = { v: row['Estado Civil Original'], t: 's' }
    workbook.Sheets['Normalizaciones'][`H${rowNum}`] = { v: row['Estado Civil Normalizado'], t: 's' }
    workbook.Sheets['Normalizaciones'][`I${rowNum}`] = { v: row['Teléfono Original'], t: 's' }
    workbook.Sheets['Normalizaciones'][`J${rowNum}`] = { v: row['Teléfono Normalizado'], t: 's' }
    workbook.Sheets['Normalizaciones'][`K${rowNum}`] = { v: row['Número Empleado Original'], t: 's' }
    workbook.Sheets['Normalizaciones'][`L${rowNum}`] = { v: row['Número Empleado Normalizado'], t: 's' }
    workbook.Sheets['Normalizaciones'][`M${rowNum}`] = { v: row['NSS Original'], t: 's' }
    workbook.Sheets['Normalizaciones'][`N${rowNum}`] = { v: row['NSS Normalizado'], t: 's' }
  })

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `normalizaciones_importacion_${new Date().toISOString().split('T')[0]}.xlsx`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style scoped>
/* Estilos adicionales si son necesarios */
</style>