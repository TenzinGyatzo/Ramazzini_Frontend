// @vitest-environment node
// Tests de funciones puras sobre píxeles; no requieren DOM (evita además el
// fallo preexistente de jsdom con ERR_REQUIRE_ESM en este proyecto).
import { describe, it, expect } from 'vitest';
import {
  hasTransparency,
  detectBackgroundColor,
  isBackgroundPixel,
  removeBackground,
  getContentBounds,
  LIGHT_PIXEL_THRESHOLD,
  type PixelData,
} from './processProviderLogo';

/** Crea un PixelData sintético relleno con un color sólido. */
function createPixels(width: number, height: number, r = 255, g = 255, b = 255, a = 255): PixelData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return { data, width, height };
}

/** Pinta un rectángulo de color sólido dentro del PixelData. */
function fillRect(
  pixels: PixelData,
  x0: number,
  y0: number,
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const idx = (y * pixels.width + x) * 4;
      pixels.data[idx] = r;
      pixels.data[idx + 1] = g;
      pixels.data[idx + 2] = b;
      pixels.data[idx + 3] = a;
    }
  }
}

function getAlpha(pixels: PixelData, x: number, y: number): number {
  return pixels.data[(y * pixels.width + x) * 4 + 3];
}

describe('hasTransparency', () => {
  it('devuelve false para una imagen completamente opaca', () => {
    expect(hasTransparency(createPixels(10, 10, 100, 100, 100))).toBe(false);
  });

  it('devuelve true si algún píxel tiene alpha menor a 255', () => {
    const pixels = createPixels(10, 10, 100, 100, 100);
    pixels.data[3] = 128;
    expect(hasTransparency(pixels)).toBe(true);
  });
});

describe('detectBackgroundColor', () => {
  it('promedia el color de las esquinas', () => {
    const pixels = createPixels(40, 40, 200, 210, 220);
    // Contenido central que no debe influir en la detección
    fillRect(pixels, 10, 10, 20, 20, 10, 20, 30);
    const bg = detectBackgroundColor(pixels);
    expect(bg).toEqual({ r: 200, g: 210, b: 220 });
  });
});

describe('isBackgroundPixel', () => {
  const background = { r: 200, g: 200, b: 200 };

  it('considera fondo los píxeles casi blancos aunque difieran del color de esquinas', () => {
    expect(
      isBackgroundPixel(LIGHT_PIXEL_THRESHOLD, LIGHT_PIXEL_THRESHOLD, LIGHT_PIXEL_THRESHOLD, background),
    ).toBe(true);
  });

  it('considera fondo los píxeles cercanos al color de esquinas', () => {
    expect(isBackgroundPixel(210, 195, 205, background)).toBe(true);
  });

  it('no considera fondo un color de contenido distinto', () => {
    expect(isBackgroundPixel(10, 60, 120, background)).toBe(false);
  });
});

describe('getContentBounds', () => {
  it('devuelve null si no hay píxeles con contenido', () => {
    expect(getContentBounds(createPixels(10, 10, 0, 0, 0, 0))).toBeNull();
  });

  it('calcula el bounding box de los píxeles opacos', () => {
    const pixels = createPixels(30, 30, 0, 0, 0, 0);
    fillRect(pixels, 5, 8, 10, 12, 50, 50, 50);
    expect(getContentBounds(pixels)).toEqual({ left: 5, top: 8, right: 14, bottom: 19 });
  });
});

describe('removeBackground + getContentBounds (integración sobre píxeles)', () => {
  it('elimina un fondo blanco dejando solo el contenido y sus bounds', () => {
    // Imagen 60x40 con fondo blanco y logo azul de 20x10 en (15, 20)
    const pixels = createPixels(60, 40, 255, 255, 255);
    fillRect(pixels, 15, 20, 20, 10, 0, 60, 150);

    const removedRatio = removeBackground(pixels);

    // El fondo (mayoría de la imagen) quedó transparente, pero no todo
    expect(removedRatio).toBeGreaterThan(0.5);
    expect(removedRatio).toBeLessThan(0.95);
    expect(getAlpha(pixels, 0, 0)).toBe(0);
    expect(getAlpha(pixels, 59, 39)).toBe(0);
    expect(getAlpha(pixels, 20, 25)).toBe(255);

    expect(getContentBounds(pixels)).toEqual({ left: 15, top: 20, right: 34, bottom: 29 });
  });

  it('reporta una proporción alta de eliminación cuando la imagen es solo fondo', () => {
    const pixels = createPixels(20, 20, 250, 250, 250);
    const removedRatio = removeBackground(pixels);
    expect(removedRatio).toBe(1);
    expect(getContentBounds(pixels)).toBeNull();
  });
});
