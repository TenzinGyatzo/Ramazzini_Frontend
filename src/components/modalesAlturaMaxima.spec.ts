/**
 * En pantallas anchas pero bajas, un modal sin altura máxima se corta y sus botones de acción
 * quedan fuera de la vista sin forma de desplazarse. Todo archivo con el fondo de un modal
 * (`fixed` con `inset-0` o `h-screen`) debe limitar la altura de su panel a la ventana
 * (`max-h-[calc(100dvh-2rem)]`, `max-h-[90vh]`, `max-h-screen`…) o usar un envoltorio fijo que
 * se desplace (`fixed inset-0 overflow-y-auto`). Una lista interna con `max-h-48` no cuenta.
 *
 * Las vistas que ocupan toda la pantalla a propósito y se desplazan por dentro (visor de
 * documentos, firma en pantalla, paneles laterales) llevan `data-pantalla-completa`.
 */
import { describe, expect, it } from 'vitest';

const archivos = import.meta.glob('/src/**/*.vue', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Etiquetas de apertura, con atributos entre comillas (que pueden tener «>»). */
const ETIQUETA = /<[a-zA-Z][\w-]*\b(?:[^>"']|"[^"]*"|'[^']*')*>/g;
const FONDO = /\bclass="[^"]*\bfixed\b[^"]*\b(?:inset-0|h-screen)\b[^"]*"/;
const ALTURA_DE_VENTANA =
  /max-h-(?:\[[^\]]*(?:vh|dvh)[^\]]*\]|screen)|max-height:\s*(?:calc\(\s*)?\d*d?vh|max-height:\s*calc\(100d?vh/;
const ENVOLTORIO_QUE_SE_DESPLAZA =
  /\bclass="(?=[^"]*\bfixed\b)(?=[^"]*\binset-0\b)(?=[^"]*\boverflow-y-auto\b)[^"]*"/;

export function modalesSinAlturaMaxima(fuentes: Record<string, string>): string[] {
  return Object.entries(fuentes)
    .filter(([, fuente]) => {
      const plantilla = fuente.split('<template>').slice(1).join('<template>');
      const fondos = (plantilla.match(ETIQUETA) ?? []).filter(
        (etiqueta) => FONDO.test(etiqueta) && !etiqueta.includes('data-pantalla-completa'),
      );
      if (fondos.length === 0) return false;
      return !ALTURA_DE_VENTANA.test(fuente) && !ENVOLTORIO_QUE_SE_DESPLAZA.test(plantilla);
    })
    .map(([ruta]) => ruta)
    .sort();
}

describe('modales en pantallas bajas', () => {
  it('se revisan los modales del proyecto', () => {
    expect(Object.keys(archivos).length).toBeGreaterThan(100);
  });

  it('todo modal limita su altura a la ventana o se desplaza', () => {
    expect(modalesSinAlturaMaxima(archivos)).toEqual([]);
  });

  it('la regla detecta un panel sin altura máxima y no se engaña con una lista interna', () => {
    const plantilla = (panel: string, extra = '') => `<template>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="${panel}"><ul class="max-h-48 overflow-y-auto"></ul>${extra}</div>
      </div>
    </template>`;
    expect(
      modalesSinAlturaMaxima({
        'Cortado.vue': plantilla('bg-white max-w-2xl w-full overflow-hidden'),
        'Bien.vue': plantilla('bg-white max-w-2xl w-full max-h-[calc(100dvh-2rem)] overflow-y-auto'),
        'Envoltorio.vue': `<template><div class="fixed inset-0 z-50 overflow-y-auto"><div class="min-h-full"></div></div></template>`,
        'Completa.vue': `<template><div data-pantalla-completa class="fixed inset-0 flex flex-col"></div></template>`,
      }),
    ).toEqual(['Cortado.vue']);
  });
});
