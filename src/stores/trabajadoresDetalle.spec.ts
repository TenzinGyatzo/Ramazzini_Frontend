import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const { getTrabajadorById } = vi.hoisted(() => ({ getTrabajadorById: vi.fn() }));
vi.mock('@/api/TrabajadoresAPI', () => ({ default: { getTrabajadorById } }));

import { useTrabajadoresStore } from './trabajadores';

describe('obtenerTrabajadorDetalle', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('trae el detalle sin tocar el trabajador actual ni mostrar «Cargando…»', async () => {
    getTrabajadorById.mockResolvedValue({ data: { _id: 't1', tieneDocumentoClinicoFinalizado: true } });
    const store = useTrabajadoresStore();
    store.hydrateCurrentTrabajadorFromListado({ _id: 't1', nombre: 'JUAN' } as any);
    const pendiente = store.obtenerTrabajadorDetalle('e1', 'c1', 't1');
    expect(store.loadingModal).toBe(false);
    const detalle = await pendiente;
    expect(detalle).toEqual({ _id: 't1', tieneDocumentoClinicoFinalizado: true });
    expect(store.currentTrabajador).toEqual({ _id: 't1', nombre: 'JUAN' });
    expect(store.loadingModal).toBe(false);
  });

  it('sigue al registro que se conservó si el trabajador fue fusionado', async () => {
    getTrabajadorById
      .mockRejectedValueOnce({ response: { status: 410, data: { redirectTo: 't2' } } })
      .mockResolvedValueOnce({ data: { _id: 't2' } });
    const store = useTrabajadoresStore();
    await expect(store.obtenerTrabajadorDetalle('e1', 'c1', 't1')).resolves.toEqual({ _id: 't2' });
    expect(getTrabajadorById).toHaveBeenLastCalledWith('e1', 'c1', 't2');
  });

  it('otros errores se propagan', async () => {
    getTrabajadorById.mockRejectedValue({ response: { status: 500 } });
    const store = useTrabajadoresStore();
    await expect(store.obtenerTrabajadorDetalle('e1', 'c1', 't1')).rejects.toBeTruthy();
  });
});
