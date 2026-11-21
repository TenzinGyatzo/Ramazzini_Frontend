/**
 * Punto 41 (captura rápida en la exploración física): los dos modos usan los mismos pasos, así que un paso no puede
 * depender de cerrarse. Al cerrarse solo puede limpiar temporizadores y escuchas; lo que se
 * guarda lo deciden los watch (en el momento) y completarRespuestasPorDefecto / prepararExploracionFisicaParaGuardar (al guardar).
 */
import { describe, expect, it } from 'vitest';

const fuentes = import.meta.glob('./*.vue', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

/** Cuerpos de onUnmounted / onBeforeUnmount de un componente. */
function cuerposAlCerrar(src: string): string[] {
  const cuerpos: string[] = [];
  const re = /on(?:Before)?Unmount(?:ed)?\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let depth = 1;
    let j = m.index + m[0].length;
    for (; j < src.length && depth > 0; j++) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')') depth--;
    }
    cuerpos.push(src.slice(m.index, j));
  }
  return cuerpos;
}

describe('pasos de la exploración física: nada se escribe al cerrarse', () => {
  it('encuentra los pasos', () => {
    expect(Object.keys(fuentes).length).toBeGreaterThan(30);
  });

  for (const [archivo, src] of Object.entries(fuentes)) {
    it(archivo, () => {
      for (const cuerpo of cuerposAlCerrar(src)) {
        // Ni escribir en el formulario ni llamar a funciones que lo hagan
        expect(cuerpo).not.toMatch(/formDataExploracionFisica/);
        expect(cuerpo).not.toMatch(/syncFormData|finalize|limpiarComorbilidad|escribirEnFormulario/);
        // Forma corta onUnmounted(fn): solo se permite si fn no es una sincronización
        expect(cuerpo).not.toMatch(/^on(?:Before)?Unmount(?:ed)?\(\s*\w+\s*\)$/);
      }
    });
  }
});
