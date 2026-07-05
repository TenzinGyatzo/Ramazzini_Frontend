/**
 * Procesamiento de logotipos de proveedores de salud en el cliente (sin IA):
 * remueve fondos claros/uniformes, recorta márgenes vacíos, añade padding
 * y normaliza a un PNG de 500×500 px listo para usarse en los informes PDF.
 */

export const OUTPUT_SIZE = 500;
export const PADDING_RATIO = 0.1;
export const LIGHT_PIXEL_THRESHOLD = 240;
export const CORNER_SAMPLE_TOLERANCE = 35;
export const MIN_CONTENT_RATIO = 0.05;

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

export interface ProcessedProviderLogo {
  file: File;
  warnings: string[];
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

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen del logotipo'));
    };
    img.src = url;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('No se pudo exportar el logotipo procesado'));
      }
    }, 'image/png');
  });
}

/**
 * Procesa el logotipo: remueve fondo claro (solo si la imagen no tiene ya
 * transparencia), recorta márgenes vacíos, centra con padding y exporta un
 * PNG de 500×500 px. Los warnings informan resultados dudosos sin bloquear.
 */
export async function processProviderLogo(file: File): Promise<ProcessedProviderLogo> {
  const warnings: string[] = [];
  const image = await loadImage(file);

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) {
    throw new Error('La imagen del logotipo no tiene dimensiones válidas');
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
    warnings.push('El logotipo quedó muy pequeño tras el recorte; verifica la vista previa.');
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
  const scale = Math.min(availableSize / contentWidth, availableSize / contentHeight);
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

  const blob = await canvasToPngBlob(outputCanvas);
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'logotipo';
  const processedFile = new File([blob], `${baseName}.png`, { type: 'image/png' });

  return { file: processedFile, warnings };
}
