/**
 * Lee un archivo elegido por el usuario antes de enviarlo.
 *
 * En Windows, un Excel abierto suele quedar bloqueado y el navegador no puede leerlo: el envío
 * fallaba sin respuesta del servidor y sin explicación. Leerlo antes permite avisar con claridad,
 * y enviar la copia leída evita que falle si Excel guarda el archivo a mitad del envío.
 */
export const MENSAJE_ARCHIVO_NO_LEGIBLE =
  'No se pudo leer el archivo. Si lo tienes abierto en Excel u otro programa, ciérralo y vuelve a seleccionarlo.';

export class ArchivoNoLegibleError extends Error {
  constructor() {
    super(MENSAJE_ARCHIVO_NO_LEGIBLE);
    this.name = 'ArchivoNoLegibleError';
  }
}

function leerConFileReader(archivo: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result as ArrayBuffer);
    lector.onerror = () => reject(lector.error);
    lector.readAsArrayBuffer(archivo);
  });
}

/** Copia en memoria del archivo; lanza `ArchivoNoLegibleError` si no se puede leer. */
export async function leerArchivoParaSubir(archivo: File): Promise<File> {
  let contenido: ArrayBuffer;
  try {
    contenido =
      typeof archivo.arrayBuffer === 'function' ? await archivo.arrayBuffer() : await leerConFileReader(archivo);
  } catch {
    throw new ArchivoNoLegibleError();
  }
  return new File([contenido], archivo.name, {
    type: archivo.type,
    lastModified: archivo.lastModified,
  });
}
