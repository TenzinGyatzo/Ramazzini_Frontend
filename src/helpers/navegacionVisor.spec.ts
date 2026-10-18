import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aperturaFallida,
  idVecino,
  irAlDocumento,
  montarTodosLosAnios,
  navegacionPendiente,
  posicionEnExpediente,
  registrarVisorAbierto,
  registrarVisorCerrado,
  reiniciarNavegacionVisor,
  visorSinAnimacion,
} from './navegacionVisor';

/** Expediente en pantalla: filas en el orden visible, cada una con su elemento que abre el documento. */
function expediente(ids: string[], alAbrir: (id: string) => void = () => {}) {
  const raiz = document.createElement('div');
  for (const id of ids) {
    const fila = document.createElement('div');
    fila.dataset.documento = id;
    const abrir = document.createElement('div');
    abrir.setAttribute('data-abrir-documento', '');
    abrir.addEventListener('click', () => alAbrir(id));
    fila.appendChild(abrir);
    raiz.appendChild(fila);
  }
  return raiz;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(0), 0));
  reiniciarNavegacionVisor();
});

afterEach(() => {
  reiniciarNavegacionVisor();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('posición y vecinos', () => {
  const raiz = expediente(['a', 'b', 'c']);

  it('cuenta en el orden de la pantalla', () => {
    expect(posicionEnExpediente('b', raiz)).toEqual({ indice: 2, total: 3 });
    expect(posicionEnExpediente('x', raiz)).toEqual({ indice: 0, total: 3 });
  });

  it('encuentra el vecino y no pasa de los extremos', () => {
    expect(idVecino('b', 1, raiz)).toBe('c');
    expect(idVecino('b', -1, raiz)).toBe('a');
    expect(idVecino('a', -1, raiz)).toBeNull();
    expect(idVecino('c', 1, raiz)).toBeNull();
    expect(idVecino('x', 1, raiz)).toBeNull();
  });
});

describe('irAlDocumento', () => {
  it('abre el vecino como si se le hiciera clic, sin animación, y cierra el anterior al abrirse', () => {
    const cerrarA = vi.fn();
    const raiz = expediente(['a', 'b', 'c'], (id) => registrarVisorAbierto(id, vi.fn()));
    registrarVisorAbierto('a', cerrarA);
    expect(montarTodosLosAnios.value).toBe(true);

    expect(irAlDocumento(1, raiz)).toBe(true);
    expect(cerrarA).toHaveBeenCalledTimes(1);
    expect(visorSinAnimacion.value).toBe(true);
    expect(navegacionPendiente()).toBeNull();

    vi.runOnlyPendingTimers();
    expect(visorSinAnimacion.value).toBe(false);
  });

  it('no hace nada en los extremos', () => {
    const raiz = expediente(['a', 'b']);
    registrarVisorAbierto('b', vi.fn());
    expect(irAlDocumento(1, raiz)).toBe(false);
    expect(visorSinAnimacion.value).toBe(false);
  });

  it('si el documento no abre, el siguiente intento parte de él y la animación vuelve sola', () => {
    const abiertos: string[] = [];
    const raiz = expediente(['a', 'b', 'c'], (id) => abiertos.push(id));
    registrarVisorAbierto('a', vi.fn());

    irAlDocumento(1, raiz);
    expect(navegacionPendiente()).toBe('b');
    irAlDocumento(1, raiz);
    expect(abiertos).toEqual(['b', 'c']);

    vi.advanceTimersByTime(4000);
    vi.runOnlyPendingTimers();
    expect(navegacionPendiente()).toBeNull();
    expect(visorSinAnimacion.value).toBe(false);
  });

  it('si el destino muestra otro aviso, se retira el visor anterior', () => {
    const cerrarA = vi.fn();
    const raiz = expediente(['a', 'b']);
    registrarVisorAbierto('a', cerrarA);
    irAlDocumento(1, raiz);

    aperturaFallida('a'); // no es el destino: se ignora
    expect(cerrarA).not.toHaveBeenCalled();
    aperturaFallida('b');
    expect(cerrarA).toHaveBeenCalledTimes(1);
    expect(navegacionPendiente()).toBeNull();
  });

  it('cerrar un visor que ya no es el actual no afecta al actual', () => {
    const cerrarB = vi.fn();
    registrarVisorAbierto('a', vi.fn());
    registrarVisorAbierto('b', cerrarB);
    registrarVisorCerrado('a');
    registrarVisorAbierto('c', vi.fn());
    expect(cerrarB).toHaveBeenCalledTimes(1);
  });
});
