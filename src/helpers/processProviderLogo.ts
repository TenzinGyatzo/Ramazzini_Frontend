/**
 * Procesamiento de imágenes de marca (logotipos de proveedores y firmas de
 * firmantes) en el cliente (sin IA): remueve fondos claros/uniformes, recorta
 * márgenes vacíos, añade padding y normaliza a un PNG de 500×500 px listo para
 * usarse en los informes PDF.
 */

export const OUTPUT_SIZE = 500;
export const PADDING_RATIO = 0.1;
export const LIGHT_PIXEL_THRESHOLD = 240;
export const CORNER_SAMPLE_TOLERANCE = 35;
export const MIN_CONTENT_RATIO = 0.05;
/** Imágenes ya optimizadas por debajo de este peso pueden omitir el procesamiento. */
export const SKIP_PROCESSING_MAX_BYTES = 150 * 1024;

/** Alpha mínimo para considerar un píxel como contenido (y no fondo). */
const CONTENT_ALPHA_THRESHOLD = 20;

/** Interfaz mínima compatible con ImageData para facilitar tests sin canvas real. */
export interface PixelData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ContentBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ProcessedBrandingImage {
  file: File;
  warnings: string[];
}

/** Alias retrocompatible para el resultado del procesamiento de logotipos. */
export type ProcessedProviderLogo = ProcessedBrandingImage;

export interface ProcessBrandingImageOptions {
  /** Nombre base usado cuando el archivo original no aporta uno válido. */
  defaultBaseName?: string;
  /** Etiqueta de la entidad para adaptar los mensajes ("logotipo", "firma"). */
  entityLabel?: string;
}

/** Detecta si la imagen ya usa transparencia (PNG con canal alpha real). */
export function hasTransparency(pixels: PixelData): boolean {
  const { data } = pixels;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

/** Promedia el color de las 4 esquinas para estimar el color de fondo. */
export function detectBackgroundColor(pixels: PixelData): RGB {
  const { data, width, height } = pixels;
  // Muestrea un parche pequeño en cada esquina para tolerar ruido de compresión JPG
  const patch = Math.max(1, Math.min(5, Math.floor(Math.min(width, height) / 20)));
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  const corners: Array<[number, number]> = [
    [0, 0],
    [width - patch, 0],
    [0, height - patch],
    [width - patch, height - patch],
  ];

  for (const [startX, startY] of corners) {
    for (let y = startY; y < startY + patch; y++) {
      for (let x = startX; x < startX + patch; x++) {
        const idx = (y * width + x) * 4;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        count++;
      }
    }
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

/** Determina si un píxel pertenece al fondo (similar al color de esquinas o casi blanco). */
export function isBackgroundPixel(r: number, g: number, b: number, background: RGB): boolean {
  if (r >= LIGHT_PIXEL_THRESHOLD && g >= LIGHT_PIXEL_THRESHOLD && b >= LIGHT_PIXEL_THRESHOLD) {
    return true;
  }
  const dr = r - background.r;
  const dg = g - background.g;
  const db = b - background.b;
  return Math.sqrt(dr * dr + dg * dg + db * db) <= CORNER_SAMPLE_TOLERANCE;
}

/**
 * Hace transparentes los píxeles de fondo (muta los datos en sitio).
 * Devuelve la proporción de píxeles que quedaron transparentes.
 */
export function removeBackground(pixels: PixelData): number {
  const { data } = pixels;
  const background = detectBackgroundColor(pixels);
  const totalPixels = data.length / 4;
  let removed = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (isBackgroundPixel(data[i], data[i + 1], data[i + 2], background)) {
      data[i + 3] = 0;
      removed++;
    }
  }

  return removed / totalPixels;
}

/** Calcula el bounding box de los píxeles con contenido (alpha > umbral). */
export function getContentBounds(pixels: PixelData): ContentBounds | null {
  const { data, width, height } = pixels;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > CONTENT_ALPHA_THRESHOLD) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  if (right < left || bottom < top) return null;
  return { left, top, right, bottom };
}

/** Construye el nombre del archivo procesado, siempre con extensión .png. */
export function buildProcessedFileName(originalName: string, defaultBaseName: string): string {
  const baseName = (originalName || '').replace(/\.[^.]+$/, '') || defaultBaseName;
  return `${baseName}.png`;
}

/** Indica si el archivo subido es PNG (por MIME o extensión). */
export function isPngFile(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (type === 'image/png') return true;
  return (file.name || '').toLowerCase().endsWith('.png');
}

/** Indica si el archivo subido es JPEG/JPG (por MIME o extensión). */
export function isJpegFile(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (type === 'image/jpeg' || type === 'image/jpg') return true;
  const name = (file.name || '').toLowerCase();
  return name.endsWith('.jpg') || name.endsWith('.jpeg');
}

/**
 * Omite el procesamiento cuando la imagen ya es apta para PDF:
 * - PNG con transparencia, dimensiones acotadas, peso razonable y contenido
 *   que cabe sin upscale dentro del área útil del lienzo normalizado.
 * - JPEG/JPG ya optimizado (peso razonable y lado mayor ≤ OUTPUT_SIZE), para
 *   no convertirlo a PNG más pesado sin beneficio.
 */
export function shouldSkipBrandingProcessing(
  file: File,
  width: number,
  height: number,
  pixels: PixelData,
): boolean {
  if (file.size > SKIP_PROCESSING_MAX_BYTES) return false;
  if (Math.max(width, height) > OUTPUT_SIZE) return false;

  if (isJpegFile(file)) {
    return true;
  }

  if (!isPngFile(file)) return false;
  if (!hasTransparency(pixels)) return false;

  const bounds = getContentBounds(pixels);
  if (!bounds) return false;

  const contentWidth = bounds.right - bounds.left + 1;
  const contentHeight = bounds.bottom - bounds.top + 1;
  const availableSize = OUTPUT_SIZE * (1 - 2 * PADDING_RATIO);

  return Math.max(contentWidth, contentHeight) <= availableSize;
}

/** Conserva el original si el resultado procesado no reduce el peso. */
export function shouldKeepOriginalOverProcessed(original: File, processed: File): boolean {
  return processed.size >= original.size;
}

function loadImage(file: File, entityLabel: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo cargar la imagen ${entityLabel === 'firma' ? 'de la firma' : 'del logotipo'}`));
    };
    img.src = url;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement, entityLabel: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error(`No se pudo exportar ${entityLabel === 'firma' ? 'la firma procesada' : 'el logotipo procesado'}`));
      }
    }, 'image/png');
  });
}

/**
 * Procesa una imagen de marca: remueve fondo claro (solo si la imagen no tiene
 * ya transparencia), recorta márgenes vacíos, centra con padding y exporta un
 * PNG de 500×500 px. Omite el procesamiento en PNG/JPEG ya optimizados, y si
 * el PNG resultante no reduce el peso, conserva el archivo original.
 */
export async function processBrandingImage(
  file: File,
  options: ProcessBrandingImageOptions = {},
): Promise<ProcessedBrandingImage> {
  const { defaultBaseName = 'logotipo', entityLabel = 'logotipo' } = options;
  const warnings: string[] = [];
  const image = await loadImage(file, entityLabel);

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) {
    throw new Error(`La imagen ${entityLabel === 'firma' ? 'de la firma' : 'del logotipo'} no tiene dimensiones válidas`);
  }

  // Canvas intermedio al tamaño original para manipular píxeles
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceCtx) {
    throw new Error('El navegador no soporta el procesamiento de imágenes');
  }
  sourceCtx.drawImage(image, 0, 0);

  const imageData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight);

  if (shouldSkipBrandingProcessing(file, sourceWidth, sourceHeight, imageData)) {
    return { file, warnings: [] };
  }

  // Si el PNG ya trae transparencia, respetamos sus píxeles opacos;
  // si no (típico JPG), removemos el fondo claro/uniforme.
  if (!hasTransparency(imageData)) {
    const removedRatio = removeBackground(imageData);
    if (removedRatio > 0.9) {
      warnings.push(
        'El fondo no pudo eliminarse correctamente; se recomienda subir un PNG sin fondo.',
      );
    }
    sourceCtx.putImageData(imageData, 0, 0);
  }

  let bounds = getContentBounds(imageData);
  if (!bounds) {
    warnings.push(
      'El fondo no pudo eliminarse correctamente; se recomienda subir un PNG sin fondo.',
    );
    bounds = { left: 0, top: 0, right: sourceWidth - 1, bottom: sourceHeight - 1 };
  }

  const contentWidth = bounds.right - bounds.left + 1;
  const contentHeight = bounds.bottom - bounds.top + 1;
  const contentRatio = (contentWidth * contentHeight) / (sourceWidth * sourceHeight);
  if (contentRatio < MIN_CONTENT_RATIO) {
    warnings.push(
      `${entityLabel === 'firma' ? 'La firma quedó muy pequeña' : 'El logotipo quedó muy pequeño'} tras el recorte; verifica la vista previa.`,
    );
  }

  // Canvas final 500×500 con el contenido centrado y padding uniforme
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = OUTPUT_SIZE;
  outputCanvas.height = OUTPUT_SIZE;
  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) {
    throw new Error('El navegador no soporta el procesamiento de imágenes');
  }

  const availableSize = OUTPUT_SIZE * (1 - 2 * PADDING_RATIO);
  // Nunca agrandar: solo reducir o mantener escala cuando haga falta normalizar.
  const scale = Math.min(availableSize / contentWidth, availableSize / contentHeight, 1);
  const targetWidth = contentWidth * scale;
  const targetHeight = contentHeight * scale;
  const offsetX = (OUTPUT_SIZE - targetWidth) / 2;
  const offsetY = (OUTPUT_SIZE - targetHeight) / 2;

  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = 'high';
  outputCtx.drawImage(
    sourceCanvas,
    bounds.left,
    bounds.top,
    contentWidth,
    contentHeight,
    offsetX,
    offsetY,
    targetWidth,
    targetHeight,
  );

  const blob = await canvasToPngBlob(outputCanvas, entityLabel);
  const processedFile = new File([blob], buildProcessedFileName(file.name, defaultBaseName), {
    type: 'image/png',
  });

  // Solo conservar el PNG procesado si realmente reduce el peso del archivo.
  if (shouldKeepOriginalOverProcessed(file, processedFile)) {
    return { file, warnings: [] };
  }

  return { file: processedFile, warnings };
}

/**
 * Procesa el logotipo de un proveedor de salud (wrapper de processBrandingImage).
 */
export function processProviderLogo(file: File): Promise<ProcessedBrandingImage> {
  return processBrandingImage(file, { defaultBaseName: 'logotipo', entityLabel: 'logotipo' });
}

/**
 * Procesa la firma de un firmante (médico, enfermera o técnico).
 */
export function processSignatorySignature(file: File): Promise<ProcessedBrandingImage> {
  return processBrandingImage(file, { defaultBaseName: 'firma', entityLabel: 'firma' });
}
