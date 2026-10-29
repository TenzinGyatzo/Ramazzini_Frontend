import { ref } from 'vue'
import { useModalResumenImportacionStore } from '@/stores/modalResumenImportacion'
import TrabajadoresAPI from '@/api/TrabajadoresAPI'
import type { ImportResumen } from '@/stores/modalResumenImportacion'
import { esErrorSinRespuesta } from '@/composables/useEstadoConexion'

/**
 * Por qué no se pudo importar: sin respuesta del servidor suele ser la conexión o un archivo
 * que el navegador no pudo enviar (p. ej. abierto en Excel); si el servidor explica, su mensaje.
 */
export function mensajeDeErrorDeImportacion(error: unknown): string {
  if (esErrorSinRespuesta(error)) {
    return 'No se pudo enviar el archivo. Revisa tu conexión; si el archivo está abierto en Excel u otro programa, ciérralo y vuelve a intentarlo.'
  }
  const mensaje = (error as { response?: { data?: { message?: unknown } } } | null)?.response?.data?.message
  if (typeof mensaje === 'string' && mensaje.trim() && !/^internal server error$/i.test(mensaje.trim())) {
    return mensaje
  }
  return 'Error inesperado en el sistema. Por favor, inténtalo de nuevo.'
}

/** Tras este tiempo, una conexión que se corta sin respuesta ya no es el envío del archivo. */
const MS_SIN_RESPUESTA_POR_TIEMPO = 20_000

/**
 * La conexión se cortó por tiempo mientras el servidor seguía registrando: nginx responde
 * 504 (o 408), o el navegador se queda sin respuesta tras esperar un buen rato. El resumen
 * no sabe cuántos se registraron, pero lo más probable es que sí se hayan registrado.
 */
export function esTiempoAgotadoDeImportacion(error: unknown, msEsperando: number): boolean {
  const estado = (error as { response?: { status?: number } } | null)?.response?.status
  if (estado === 504 || estado === 408) return true
  const codigo = (error as { code?: string } | null)?.code
  if (codigo === 'ECONNABORTED' || codigo === 'ETIMEDOUT') return true
  return esErrorSinRespuesta(error) && msEsperando >= MS_SIN_RESPUESTA_POR_TIEMPO
}

export const MENSAJE_TIEMPO_AGOTADO =
  'La carga tardó más de lo que el servidor espera una respuesta, pero es probable que los trabajadores sí se hayan registrado: el servidor sigue procesando el archivo. Espera unos minutos y revisa la lista antes de volver a subirlo, para no duplicar registros.'

export const useImportacionTrabajadores = () => {
  const modalStore = useModalResumenImportacionStore()
  const isImporting = ref(false)
  const importProgress = ref(0)

  // Importar trabajadores desde Excel
  // NOTA: El frontend solo envía el archivo Excel al backend.
  // El backend se encarga de:
  // - Parsear el Excel y mapear columnas a campos del modelo Trabajador
  // - Validar datos (NSS, CURP, códigos INEG para NOM-024, etc.)
  // - Aplicar reglas de negocio condicionales (MX vs no-MX)
  // - Retornar resumen de importación con éxitos/errores
  // 
  // Columnas esperadas en Excel (NOM-024):
  // - Entidad Nacimiento -> entidadNacimiento
  // - País de nacimiento -> paisNacimiento (CATALOG_KEY cat_pais)
  // - Entidad Residencia -> entidadResidencia
  // - Municipio Residencia -> municipioResidencia
  // - Localidad Residencia -> localidadResidencia
  const importarTrabajadores = async (
    file: File,
    idCentroTrabajo: string,
    idEmpresa: string,
    createdBy: string,
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    let progressInterval: ReturnType<typeof setInterval> | null = null
    const inicio = Date.now()
    try {
      isImporting.value = true
      importProgress.value = 0
      modalStore.showLoading()

      // Simular progreso de carga
      progressInterval = setInterval(() => {
        if (importProgress.value < 90) {
          importProgress.value += Math.random() * 10
          onProgress?.(importProgress.value)
        }
      }, 200)

      // Crear FormData para la importación
      const formData = new FormData()
      formData.append('file', file)
      formData.append('idCentroTrabajo', idCentroTrabajo)
      formData.append('createdBy', createdBy)
      formData.append('updatedBy', createdBy)

      // Realizar la importación
      const response = await TrabajadoresAPI.importTrabajadores(idEmpresa, idCentroTrabajo, formData)
      
      clearInterval(progressInterval)
      importProgress.value = 100
      onProgress?.(100)

      // Crear resumen y mostrar modal
      const resumen = modalStore.createResumenFromResponse(response.data)
      
      modalStore.showModal(resumen)

    } catch (error: any) {
      console.error('[DEBUG] Error inesperado en la importación:', error)

      // Las filas con errores vienen en una respuesta 200; aquí solo llegan fallos
      // de la petición completa
      const tiempoAgotado = esTiempoAgotadoDeImportacion(error, Date.now() - inicio)
      const errorResumen: ImportResumen = {
        message: tiempoAgotado ? MENSAJE_TIEMPO_AGOTADO : mensajeDeErrorDeImportacion(error),
        data: [],
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        sinRespuesta: tiempoAgotado ? 'tiempo-agotado' : 'error'
      }

      modalStore.showModal(errorResumen)

    } finally {
      if (progressInterval) clearInterval(progressInterval)
      isImporting.value = false
      modalStore.hideLoading()
    }
  }

  // Cerrar el modal
  const cerrarModal = () => {
    modalStore.hideModal()
  }

  return {
    // Estado
    isImporting,
    importProgress,
    isModalVisible: modalStore.isVisible,
    resumen: modalStore.resumen,
    
    // Acciones
    importarTrabajadores,
    cerrarModal
  }
}
