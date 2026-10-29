import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const { getConfiguracion } = vi.hoisted(() => ({ getConfiguracion: vi.fn() }));
vi.mock('@/api/FormatosFirmadosAPI', () => ({ default: { getConfiguracion } }));

import { useFirmaEnPantallaStore } from './firmaEnPantalla';

describe('useFirmaEnPantallaStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    getConfiguracion.mockResolvedValue({ data: { firmaEnPantallaHabilitada: true } });
  });

  it('una sola petición por sesión, aunque se pida varias veces a la vez', async () => {
    const store = useFirmaEnPantallaStore();
    await Promise.all([store.cargarConfiguracion(), store.cargarConfiguracion()]);
    await store.cargarConfiguracion();
    expect(getConfiguracion).toHaveBeenCalledTimes(1);
    expect(store.habilitada).toBe(true);
    expect(store.cargado).toBe(true);
  });

  it('forzar vuelve a consultar (al iniciar sesión)', async () => {
    const store = useFirmaEnPantallaStore();
    await store.cargarConfiguracion();
    getConfiguracion.mockResolvedValue({ data: { firmaEnPantallaHabilitada: false } });
    await store.cargarConfiguracion(true);
    expect(getConfiguracion).toHaveBeenCalledTimes(2);
    expect(store.habilitada).toBe(false);
  });

  it('si falla la consulta queda solo el papel, sin volver a esperar', async () => {
    getConfiguracion.mockRejectedValue(new Error('sin red'));
    const store = useFirmaEnPantallaStore();
    await store.cargarConfiguracion();
    expect(store.habilitada).toBe(false);
    expect(store.cargado).toBe(true);
  });

  it('el cambio en «Módulos y funciones» se refleja sin volver a consultar', () => {
    const store = useFirmaEnPantallaStore();
    store.aplicar({ firmaEnPantallaHabilitada: true });
    expect(store.habilitada).toBe(true);
    store.aplicar({ firmaEnPantallaHabilitada: false });
    expect(store.habilitada).toBe(false);
    expect(getConfiguracion).not.toHaveBeenCalled();
  });
});
