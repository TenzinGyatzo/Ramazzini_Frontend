import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const { getIncapacidades } = vi.hoisted(() => ({ getIncapacidades: vi.fn() }));
vi.mock('@/api/ModulosFuncionesAPI', () => ({ default: { getIncapacidades } }));

import { useIncapacidadesStore } from './incapacidades';

describe('useIncapacidadesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('solo la empresa elegida, con el módulo encendido, gestiona incapacidades', async () => {
    getIncapacidades.mockResolvedValue({
      data: { incapacidadesDisponible: true, incapacidadesHabilitado: true, empresasConIncapacidades: ['e1'] },
    });
    const store = useIncapacidadesStore();
    await store.cargarConfiguracion();
    expect(store.gestionaEnEmpresa('e1')).toBe(true);
    expect(store.gestionaEnEmpresa('e2')).toBe(false);
    expect(store.gestionaEnEmpresa(undefined)).toBe(false);
  });

  it('con el módulo apagado o fuera de México, ninguna empresa', () => {
    const store = useIncapacidadesStore();
    store.aplicar({ incapacidadesDisponible: true, incapacidadesHabilitado: false, empresasConIncapacidades: ['e1'] });
    expect(store.gestionaEnEmpresa('e1')).toBe(false);
    store.aplicar({ incapacidadesDisponible: false, incapacidadesHabilitado: true, empresasConIncapacidades: ['e1'] });
    expect(store.gestionaEnEmpresa('e1')).toBe(false);
  });

  it('si la consulta falla se trata como apagado, y consulta una sola vez', async () => {
    getIncapacidades.mockRejectedValue(new Error('caída'));
    const store = useIncapacidadesStore();
    await store.cargarConfiguracion();
    expect(store.habilitado).toBe(false);
    getIncapacidades.mockResolvedValue({
      data: { incapacidadesDisponible: true, incapacidadesHabilitado: true, empresasConIncapacidades: [] },
    });
    await store.cargarConfiguracion(true);
    await store.cargarConfiguracion();
    expect(getIncapacidades).toHaveBeenCalledTimes(2);
  });
});
