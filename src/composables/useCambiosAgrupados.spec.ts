import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCambiosAgrupados } from './useCambiosAgrupados';

describe('useCambiosAgrupados', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('manda todos los clics juntos un segundo después del último', async () => {
    const enviar = vi.fn(async () => {});
    const { cambiar } = useCambiosAgrupados(enviar);
    cambiar('a', true, false);
    vi.advanceTimersByTime(800);
    cambiar('b', true, false);
    vi.advanceTimersByTime(800);
    expect(enviar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(enviar).toHaveBeenCalledWith([
      { id: 'a', valor: true },
      { id: 'b', valor: true },
    ]);
  });

  it('una casilla que regresa a su valor original no se manda', async () => {
    const enviar = vi.fn(async () => {});
    const { cambiar, hayPendientes } = useCambiosAgrupados(enviar);
    cambiar('a', true, false);
    cambiar('a', false, true);
    expect(hayPendientes.value).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(enviar).not.toHaveBeenCalled();
  });

  it('enviarYa manda lo pendiente sin esperar', async () => {
    const enviar = vi.fn(async () => {});
    const { cambiar, enviarYa } = useCambiosAgrupados(enviar);
    cambiar('a', false, true);
    await enviarYa();
    expect(enviar).toHaveBeenCalledWith([{ id: 'a', valor: false }]);
    vi.advanceTimersByTime(2000);
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('lo que se marca durante un envío sale en el siguiente', async () => {
    let terminar!: () => void;
    const enviar = vi.fn(() => new Promise<void>((r) => (terminar = r)));
    const { cambiar, enviando } = useCambiosAgrupados(enviar);
    cambiar('a', true, false);
    vi.advanceTimersByTime(1000);
    expect(enviando.value).toBe(true);

    cambiar('b', true, false);
    vi.advanceTimersByTime(1000);
    // Sigue el primer envío: el segundo espera
    expect(enviar).toHaveBeenCalledTimes(1);
    terminar();
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(1000);
    expect(enviar).toHaveBeenCalledTimes(2);
    expect(enviar).toHaveBeenLastCalledWith([{ id: 'b', valor: true }]);
  });
});
