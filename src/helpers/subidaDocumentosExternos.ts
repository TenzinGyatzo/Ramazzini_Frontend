/**
 * Reglas de la subida de documentos externos (ModalCargaDocumentoExterno):
 * nombre sugerido a partir del archivo, validación por archivo, reducción de fotos para que
 * quepan en el límite y el motivo legible de un error del servidor.
 */

/** Límite por archivo (decisión del proveedor: se mantiene en 1 MB). */
export const LIMITE_BYTES_DOCUMENTO_EXTERNO = 1024 * 1024;
export const MAXIMO_ARCHIVOS_POR_CARGA = 10;
export const EXTENSIONES_PERMITIDAS = ['.pdf', '.jpg', '.jpeg', '.png'] as const;

export function extensionDe(nombreArchivo: string): string {
  const punto = nombreArchivo.lastIndexOf('.');
  return punto > 0 ? nombreArchivo.slice(punto).toLowerCase() : '';
}

export const esImagen = (nombreArchivo: string) => ['.jpg', '.jpeg', '.png'].includes(extensionDe(nombreArchivo));

/** Nombres que ponen cámaras, escáneres y apps; no dicen qué es el documento. */
const NOMBRE_AUTOMATICO =
  /^(img|image|imagen|pxl|dsc|dscn|dcim|photo|foto|screenshot|captura|scan|scanned|escaneo|escaneado|whatsapp image|cam|camscanner|document|documento|doc|file|archivo)?[\s_-]*[\d\s_.()-]*(at[\d\s_.()-]*)?$/i;

/**
 * Nombre que se propone para el documento: el del archivo sin extensión y con espacios en vez
 * de guiones bajos. Si es un nombre automático (IMG_20261017_1234, scan0001…), queda vacío para
 * que la persona escriba qué es.
 */
export function nombreSugerido(nombreArchivo: string): string {
  const extension = extensionDe(nombreArchivo);
  const base = (extension ? nombreArchivo.slice(0, -extension.length) : nombreArchivo).trim();
  if (!base || NOMBRE_AUTOMATICO.test(base)) return '';
  return base.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
}

export type MotivoRechazo = 'tipo' | 'tamano';

/** Por qué no se puede subir un archivo tal cual; las imágenes grandes se reducen, no se rechazan. */
export function motivoDeRechazo(archivo: { name: string; size: number }): MotivoRechazo | null {
  if (!(EXTENSIONES_PERMITIDAS as readonly string[]).includes(extensionDe(archivo.name))) return 'tipo';
  if (archivo.size > LIMITE_BYTES_DOCUMENTO_EXTERNO && !esImagen(archivo.name)) return 'tamano';
  return null;
}

export function textoDeRechazo(nombreArchivo: string, motivo: MotivoRechazo): string {
  return motivo === 'tipo'
    ? `${nombreArchivo}: solo se aceptan PDF, JPG y PNG`
    : `${nombreArchivo}: el PDF pesa más de 1 MB`;
}

export function tamanoLegible(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Codifica la imagen a cierta escala (0–1 del tamaño original) y calidad JPEG (0–1). */
export type CodificarImagen = (escala: number, calidad: number) => Promise<Blob | null>;

/** Lado mayor máximo de una foto reducida: de sobra para leer un formato o un estudio. */
export const LADO_MAXIMO_PX = 2400;

/**
 * Intenta escalas y calidades de mayor a menor hasta que la imagen quepa en el límite.
 * Devuelve null si ni la menor cabe.
 */
export async function reducirHastaLimite(
  codificar: CodificarImagen,
  escalaInicial: number,
  limite = LIMITE_BYTES_DOCUMENTO_EXTERNO,
): Promise<Blob | null> {
  const escalas = [1, 0.8, 0.65, 0.5, 0.4].map((f) => Math.min(1, escalaInicial * f));
  const calidades = [0.85, 0.75, 0.65];
  for (const escala of escalas) {
    for (const calidad of calidades) {
      const blob = await codificar(escala, calidad);
      if (blob && blob.size <= limite) return blob;
    }
  }
  return null;
}

/** Reduce una foto en el navegador (lado mayor ≤ LADO_MAXIMO_PX, JPEG) hasta caber en el límite. */
export async function reducirImagen(archivo: File, limite = LIMITE_BYTES_DOCUMENTO_EXTERNO): Promise<File | null> {
  const bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  try {
    const escalaInicial = Math.min(1, LADO_MAXIMO_PX / Math.max(bitmap.width, bitmap.height));
    const lienzo = document.createElement('canvas');
    const contexto = lienzo.getContext('2d');
    if (!contexto) return null;

    const codificar: CodificarImagen = (escala, calidad) => {
      lienzo.width = Math.max(1, Math.round(bitmap.width * escala));
      lienzo.height = Math.max(1, Math.round(bitmap.height * escala));
      // Fondo blanco: un PNG con transparencia no queda negro al pasar a JPEG
      contexto.fillStyle = '#ffffff';
      contexto.fillRect(0, 0, lienzo.width, lienzo.height);
      contexto.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
      return new Promise((resolver) => lienzo.toBlob(resolver, 'image/jpeg', calidad));
    };

    const blob = await reducirHastaLimite(codificar, escalaInicial, limite);
    if (!blob) return null;
    const extension = extensionDe(archivo.name);
    const base = extension ? archivo.name.slice(0, -extension.length) : archivo.name;
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: archivo.lastModified });
  } finally {
    bitmap.close();
  }
}

/** Motivo legible de un error al subir (el servidor explica conflictos y fechas fuera de rango). */
export function motivoDeError(error: unknown): string {
  const respuesta = (error as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  if (!respuesta) return 'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
  const mensaje = respuesta.data?.message;
  const texto = Array.isArray(mensaje) ? mensaje.join('. ') : typeof mensaje === 'string' ? mensaje : '';
  if (respuesta.status === 409) {
    return `${(texto || 'Ya existe un documento con el mismo nombre en esa fecha').replace(/\.$/, '')}. Cambia el nombre o la fecha.`;
  }
  if (respuesta.status === 413) return 'El archivo es demasiado grande.';
  if (respuesta.status === 403) return 'No tienes permiso para subir documentos externos.';
  return texto || 'No se pudo subir. Inténtalo de nuevo.';
}

/**
 * Procesa los elementos con a lo más `limite` tareas a la vez: cada «carril» toma el siguiente
 * pendiente al terminar el suyo. Los errores los atiende `tarea`.
 */
export async function procesarConLimite<T>(elementos: readonly T[], limite: number, tarea: (elemento: T) => Promise<void>) {
  let siguiente = 0;
  const carril = async () => {
    while (siguiente < elementos.length) {
      await tarea(elementos[siguiente++]);
    }
  };
  await Promise.all(Array.from({ length: Math.max(0, Math.min(limite, elementos.length)) }, carril));
}
