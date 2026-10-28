import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ImportResult {
  /** Renglón del Excel */
  fila?: number
  success: boolean
  worker?: any
  error?: string
  validationErrors?: string[]
  // Campos adicionales para normalizaciones
  sexoOriginal?: string
  escolaridadOriginal?: string
  estadoCivilOriginal?: string
  // ✅ ELIMINADO: No se maneja estado laboral en importaciones
  telefonoOriginal?: string
}

export interface ImportResumen {
  message: string
  data: ImportResult[]
  totalProcessed: number
  successful: number
  failed: number
  /**
   * La petición no trajo resumen: 'tiempo-agotado' si se cortó mientras el servidor
   * seguía registrando, 'error' si el archivo no se procesó.
   */
  sinRespuesta?: 'tiempo-agotado' | 'error'
}

export const useModalResumenImportacionStore = defineStore('modalResumenImportacion', () => {
  // Estado del modal
  const isVisible = ref(false)
  const resumen = ref<ImportResumen | null>(null)
  const isLoading = ref(false)

  // Mostrar el modal con el resumen
  const showModal = (resumenData: ImportResumen) => {
    resumen.value = resumenData
    isVisible.value = true
  }

  // Ocultar el modal
  const hideModal = () => {
    isVisible.value = false
    resumen.value = null
  }

  // Mostrar estado de carga
  const showLoading = () => {
    isLoading.value = true
  }

  // Ocultar estado de carga
  const hideLoading = () => {
    isLoading.value = false
  }

  // Crear resumen desde la respuesta del backend
  const createResumenFromResponse = (response: any): ImportResumen => {
    
    // ✅ SOLUCIÓN: Si la respuesta ya tiene el formato correcto, usarla directamente
    if (response.totalProcessed !== undefined && response.successful !== undefined && response.failed !== undefined) {
      return response
    }

    // ✅ SOLUCIÓN: Si la respuesta tiene un array de resultados (exitosos + fallidos)
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      
      // Verificar si los elementos tienen la estructura de ImportResult
      const firstItem = response.data[0]
      
      if (firstItem && typeof firstItem === 'object') {
        // Si tiene la estructura de ImportResult (success, worker, error)
        if ('success' in firstItem) {
          const successful = response.data.filter((r: ImportResult) => r.success).length
          const failed = response.data.filter((r: ImportResult) => !r.success).length
          
          const resumen = {
            message: response.message || 'Importación completada',
            data: response.data,
            totalProcessed: successful + failed,
            successful,
            failed
          }
          return resumen
        } else {
          // Si son trabajadores directos (importación exitosa sin errores)
          const resumen = {
            message: response.message || 'Trabajadores importados exitosamente',
            data: response.data.map((worker: any) => ({
              success: true,
              worker: worker
            })),
            totalProcessed: response.data.length,
            successful: response.data.length,
            failed: 0
          }
          return resumen
        }
      } else {
      }
    } else {
    }

    // ✅ SOLUCIÓN: Si es una respuesta de error o no tiene el formato esperado 
    return {
      message: response.message || 'Importación completada',
      data: [],
      totalProcessed: 0,
      successful: 0,
      failed: 0
    }
  }

  return {
    // Estado
    isVisible,
    resumen,
    isLoading,
    
    // Acciones
    showModal,
    hideModal,
    showLoading,
    hideLoading,
    createResumenFromResponse
  }
})
