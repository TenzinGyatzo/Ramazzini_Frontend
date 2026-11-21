// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { conTransicionDeModo, transicionDisponible } from './transicionModoCaptura';

const documentoCon = (opciones: { transicion?: boolean; oculto?: boolean }) => {
  const llamadas: string[] = [];
  const doc = {
    visibilityState: opciones.oculto ? 'hidden' : 'visible',
    startViewTransition: opciones.transicion
      ? (actualizar: () => Promise<void>) => {
          llamadas.push('transicion');
          return { updateCallbackDone: Promise.resolve(actualizar()) };
        }
      : undefined,
  } as unknown as Document;
  return { doc, llamadas };
};

const conMovimientoReducido = (reducir: boolean) =>
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: reducir } as MediaQueryList);

afterEach(() => vi.restoreAllMocks());

describe('transición al cambiar de modo de captura (punto 41)', () => {
  it('con soporte, el cambio va dentro de la transición', async () => {
    conMovimientoReducido(false);
    const { doc, llamadas } = documentoCon({ transicion: true });
    const actualizar = vi.fn();
    await conTransicionDeModo(actualizar, doc as never);
    expect(llamadas).toEqual(['transicion']);
    expect(actualizar).toHaveBeenCalledTimes(1);
  });

  it('sin soporte, con movimiento reducido o con la pestaña oculta: cambio instantáneo', async () => {
    for (const [opciones, reducir] of [
      [{ transicion: false }, false],
      [{ transicion: true }, true],
      [{ transicion: true, oculto: true }, false],
    ] as const) {
      vi.restoreAllMocks();
      conMovimientoReducido(reducir);
      const { doc, llamadas } = documentoCon(opciones);
      expect(transicionDisponible(doc as never)).toBe(false);
      const actualizar = vi.fn();
      await conTransicionDeModo(actualizar, doc as never);
      expect(llamadas).toEqual([]);
      expect(actualizar).toHaveBeenCalledTimes(1);
    }
  });

  it('si la transición se interrumpe, el cambio ya quedó aplicado', async () => {
    conMovimientoReducido(false);
    const actualizar = vi.fn();
    const doc = {
      visibilityState: 'visible',
      startViewTransition: (fn: () => Promise<void>) => {
        fn();
        return { updateCallbackDone: Promise.reject(new Error('interrumpida')) };
      },
    };
    await expect(conTransicionDeModo(actualizar, doc as never)).resolves.toBeUndefined();
    expect(actualizar).toHaveBeenCalledTimes(1);
  });
});
