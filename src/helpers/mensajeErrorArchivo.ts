import axios from 'axios';

/**
 * Mensaje para el usuario cuando falla abrir o descargar un archivo del expediente
 * (PDF, imagen o documento externo). Dice la causa en lugar de «Ocurrió un error».
 */

export type AccionArchivo = 'abrir' | 'descargar';

export interface OpcionesMensajeArchivo {
  accion: AccionArchivo;
  /** Cómo se nombra el archivo en el mensaje: «el documento», «la imagen», «el PDF». */
  objeto?: string;
  /** Texto para 404; por omisión, que el archivo ya no está en el servidor. */
  noEncontrado?: string;
}

export const MENSAJE_SIN_CONEXION_ARCHIVO =
  'No se pudo conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.';

export function mensajeErrorArchivo(error: unknown, opciones: OpcionesMensajeArchivo): string {
  const objeto = opciones.objeto ?? 'el documento';
  const verbo = opciones.accion === 'descargar' ? 'descargar' : 'abrir';

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (!error.response) return MENSAJE_SIN_CONEXION_ARCHIVO;
    if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.';
    if (status === 403) return `No tienes permiso para ${verbo} ${objeto}.`;
    if (status === 404) {
      return opciones.noEncontrado ?? `${capitalizar(objeto)} ya no está en el servidor.`;
    }
  } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return MENSAJE_SIN_CONEXION_ARCHIVO;
  }
  return `No se pudo ${verbo} ${objeto}. Intenta de nuevo.`;
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
