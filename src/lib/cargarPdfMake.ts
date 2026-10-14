/**
 * pdfmake bajo demanda. Antes se cargaba desde cdnjs en el <head> de index.html (≈2.2 MB que
 * bloqueaban la primera pantalla en cada visita); ahora sale del paquete instalado y solo se
 * descarga cuando se genera un PDF en el navegador (informes del tablero, declaración de
 * veracidad).
 *
 * Abrir el PDF en otra pestaña (`.open()`) debe ocurrir dentro del clic para que el navegador
 * no lo bloquee: las pantallas que lo usan llaman a `precargarPdfMake()` al montarse y en el
 * clic usan `pdfMakeCargado()` si ya está listo.
 */

export type PdfMake = typeof import('pdfmake/build/pdfmake') & {
  vfs?: Record<string, string>;
  fonts?: Record<string, { normal: string; bold: string; italics: string; bolditalics: string }>;
};

let carga: Promise<PdfMake> | null = null;
let instancia: PdfMake | null = null;

export function cargarPdfMake(): Promise<PdfMake> {
  if (!carga) {
    carga = Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')])
      .then(([moduloPdf, moduloFuentes]) => {
        const pdfMake = ((moduloPdf as { default?: unknown }).default ?? moduloPdf) as PdfMake;
        // vfs_fonts exporta las fuentes Roboto que pdfmake usa por omisión
        const vfs = ((moduloFuentes as { default?: unknown }).default ?? moduloFuentes) as Record<
          string,
          string
        >;
        pdfMake.vfs = { ...vfs, ...(pdfMake.vfs ?? {}) };
        // createPdf toma `vfs` y `fonts` de window.pdfMake (lo que antes creaba el script del CDN);
        // así siguen valiendo las fuentes que se agregan después, como Kanit.
        // No se usa addVirtualFileSystem: haría que createPdf ignorara esas fuentes agregadas.
        (globalThis as { pdfMake?: PdfMake }).pdfMake = pdfMake;
        instancia = pdfMake;
        return pdfMake;
      })
      .catch((error) => {
        carga = null;
        throw error;
      });
  }
  return carga;
}

/** La instancia si ya terminó de cargar; si no, null (para usarla sin esperar dentro de un clic). */
export function pdfMakeCargado(): PdfMake | null {
  return instancia;
}

/** Empieza a cargar pdfmake sin esperar; los errores se reintentan en el siguiente uso. */
export function precargarPdfMake(): void {
  cargarPdfMake().catch(() => {});
}
