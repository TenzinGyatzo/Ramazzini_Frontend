import { describe, expect, it, vi } from 'vitest';
import {
  debeRecargar,
  ESPERA_ENTRE_RECARGAS_MS,
  instalarRecargaPorDespliegue,
} from './recargaPorDespliegue';

function crearAlmacen(inicial: Record<string, string> = {}): Storage {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
    clear: () => datos.clear(),
    key: () => null,
    get length() {
      return datos.size;
    },
  };
}

function crearVentana() {
  const destino = new EventTarget();
  const reload = vi.fn();
  const ventana = Object.assign(destino, { location: { reload } }) as unknown as Window;
  return { ventana, reload };
}

function avisarArchivoFaltante(ventana: Window) {
  const evento = new Event('vite:preloadError', { cancelable: true });
  ventana.dispatchEvent(evento);
  return evento;
}

describe('debeRecargar', () => {
  it('recarga si nunca se había recargado', () => {
    expect(debeRecargar(1_000, null)).toBe(true);
  });

  it('no recarga dos veces dentro de la espera', () => {
    expect(debeRecargar(10_000, 10_000 - ESPERA_ENTRE_RECARGAS_MS + 1)).toBe(false);
  });

  it('vuelve a recargar pasada la espera', () => {
    expect(debeRecargar(10_000 + ESPERA_ENTRE_RECARGAS_MS, 10_000)).toBe(true);
  });
});

describe('instalarRecargaPorDespliegue', () => {
  it('recarga la página y evita el error cuando falta un archivo', () => {
    const { ventana, reload } = crearVentana();
    const almacen = crearAlmacen();
    instalarRecargaPorDespliegue(ventana, almacen, () => 5_000);

    const evento = avisarArchivoFaltante(ventana);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(evento.defaultPrevented).toBe(true);
    expect(almacen.getItem('ramazzini:recarga-por-despliegue')).toBe('5000');
  });

  it('si ya recargó hace poco, deja pasar el error sin recargar otra vez', () => {
    const { ventana, reload } = crearVentana();
    const almacen = crearAlmacen({ 'ramazzini:recarga-por-despliegue': '5000' });
    instalarRecargaPorDespliegue(ventana, almacen, () => 5_000 + 1_000);

    const evento = avisarArchivoFaltante(ventana);

    expect(reload).not.toHaveBeenCalled();
    expect(evento.defaultPrevented).toBe(false);
  });

  it('recarga aunque el almacenamiento de sesión no esté disponible', () => {
    const { ventana, reload } = crearVentana();
    const bloqueado = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    } as unknown as Storage;
    instalarRecargaPorDespliegue(ventana, bloqueado, () => 5_000);

    avisarArchivoFaltante(ventana);

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
