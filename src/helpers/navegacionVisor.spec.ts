import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aperturaFallida,
  atenderTeclaUnaVez,
  avisoDeDestinoRebasado,
  enModoPrecarga,
  escalaParaAbrir,
  guardarPrecarga,
  hayPrecarga,
  navegandoHacia,
  precargarVecinos,
  tomarPrecarga,
  visorEntrante,
  visorListo,
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

describe('teclado', () => {
  it('un mismo evento se atiende una sola vez', () => {
    const evento = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    expect(atenderTeclaUnaVez(evento)).toBe(true);
    expect(atenderTeclaUnaVez(evento)).toBe(false);
  });
});

describe('precarga', () => {
  it('hace clic en los vecinos en modo precarga, sin abrirlos', () => {
    const vistos: Array<[string, boolean]> = [];
    const raiz = expediente(['a', 'b', 'c'], (id) => vistos.push([id, enModoPrecarga()]));
    precargarVecinos('b', raiz);
    expect(vistos).toEqual([['c', true], ['a', true]]);
    expect(enModoPrecarga()).toBe(false);
  });

  it('se precarga al abrir un visor y se entrega una sola vez', () => {
    const vistos: string[] = [];
    const raiz = expediente(['a', 'b'], (id) => vistos.push(id));
    document.body.appendChild(raiz);
    registrarVisorAbierto('a', vi.fn());
    vi.advanceTimersByTime(300);
    expect(vistos).toEqual(['b']);
    raiz.remove();

    const descarga = Promise.resolve('pdf');
    guardarPrecarga('/x.pdf', descarga);
    expect(hayPrecarga('/x.pdf')).toBe(true);
    expect(tomarPrecarga('/x.pdf')).toBe(descarga);
    expect(tomarPrecarga('/x.pdf')).toBeNull();
  });

  it('al cerrar el visor por completo se descartan las precargas', () => {
    guardarPrecarga('/x.pdf', Promise.resolve('pdf'));
    registrarVisorAbierto('a', vi.fn());
    registrarVisorCerrado('a');
    expect(hayPrecarga('/x.pdf')).toBe(false);
  });
});

describe('irAlDocumento', () => {
  it('abre el vecino como clic, lo prepara oculto y cambia cuando está listo', () => {
    const cerrarA = vi.fn();
    const raiz = expediente(['a', 'b', 'c'], (id) => registrarVisorAbierto(id, vi.fn()));
    registrarVisorAbierto('a', cerrarA);
    expect(montarTodosLosAnios.value).toBe(true);

    expect(irAlDocumento(1, raiz)).toBe(true);
    expect(navegandoHacia.value).toBe('b');
    expect(visorEntrante.value).toBe('b');
    expect(cerrarA).not.toHaveBeenCalled();
    expect(visorSinAnimacion.value).toBe(true);

    visorListo('b');
    expect(cerrarA).toHaveBeenCalledTimes(1);
    expect(visorEntrante.value).toBeNull();
    expect(navegandoHacia.value).toBeNull();
    expect(navegacionPendiente()).toBeNull();

    vi.advanceTimersByTime(0);
    expect(visorSinAnimacion.value).toBe(false);
  });

  it('si el visor nuevo no avisa, se muestra de todos modos', () => {
    const cerrarA = vi.fn();
    const raiz = expediente(['a', 'b'], (id) => registrarVisorAbierto(id, vi.fn()));
    registrarVisorAbierto('a', cerrarA);
    irAlDocumento(1, raiz);
    vi.advanceTimersByTime(1500);
    expect(cerrarA).toHaveBeenCalledTimes(1);
    expect(visorEntrante.value).toBeNull();
  });

  it('si se avanza otra vez mientras uno se prepara, ese se descarta', () => {
    const cerrar: Record<string, ReturnType<typeof vi.fn>> = { a: vi.fn(), b: vi.fn(), c: vi.fn() };
    const raiz = expediente(['a', 'b', 'c'], (id) => registrarVisorAbierto(id, cerrar[id]));
    registrarVisorAbierto('a', cerrar.a);
    irAlDocumento(1, raiz);
    irAlDocumento(1, raiz);
    expect(cerrar.b).toHaveBeenCalledTimes(1);
    expect(visorEntrante.value).toBe('c');
    visorListo('c');
    expect(cerrar.a).toHaveBeenCalledTimes(1);
    expect(cerrar.c).not.toHaveBeenCalled();
  });

  it('si el destino rebasado abre tarde, se cierra solo y no corta el paso siguiente', () => {
    const abrir: Record<string, () => void> = {};
    const cerrar: Record<string, ReturnType<typeof vi.fn>> = { a: vi.fn(), b: vi.fn(), c: vi.fn() };
    const raiz = expediente(['a', 'b', 'c'], (id) => { abrir[id] = () => registrarVisorAbierto(id, cerrar[id]); });
    registrarVisorAbierto('a', cerrar.a, () => ({ tipo: 'pdf', valor: 1.25 }));
    irAlDocumento(1, raiz);
    irAlDocumento(1, raiz);
    abrir.b(); // llega tarde
    expect(cerrar.b).toHaveBeenCalledTimes(1);
    expect(cerrar.a).not.toHaveBeenCalled();
    expect(navegacionPendiente()).toBe('c');
    expect(escalaParaAbrir('c', 'pdf')).toBe(1.25);
    expect(avisoDeDestinoRebasado('b')).toBe(false);
  });

  it('el zoom elegido a mano pasa al documento siguiente, solo del mismo tipo de visor', () => {
    const raiz = expediente(['a', 'b', 'c'], (id) => {
      escalas.push([id, escalaParaAbrir(id, 'pdf'), escalaParaAbrir(id, 'imagen')]);
      registrarVisorAbierto(id, vi.fn());
    });
    const escalas: unknown[] = [];
    registrarVisorAbierto('a', vi.fn(), () => ({ tipo: 'pdf', valor: 1.6 }));
    irAlDocumento(1, raiz);
    expect(escalas).toEqual([['b', 1.6, null]]);
    // Fuera de la navegación no hay zoom heredado
    visorListo('b');
    expect(escalaParaAbrir('b', 'pdf')).toBeNull();
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
