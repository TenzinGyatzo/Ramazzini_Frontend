import { beforeEach, describe, expect, it, vi } from 'vitest';

const getHistoriasClinicasDelMes = vi.fn();
vi.mock('@/api/ProveedorSaludAPI', () => ({
  default: { getHistoriasClinicasDelMes: (...a: unknown[]) => getHistoriasClinicasDelMes(...a) },
}));

const { verificarLimiteHistoriasDelMes, esLimiteHistoriasAlcanzado } = await import('./limiteHistoriasDelMes');

describe('verificarLimiteHistoriasDelMes', () => {
  beforeEach(() => getHistoriasClinicasDelMes.mockReset());

  it('vuelve a contar: otro usuario llenó el cupo desde que se abrió el expediente', async () => {
    getHistoriasClinicasDelMes.mockResolvedValue({ data: 125 });
    await expect(
      verificarLimiteHistoriasDelMes({ idProveedor: 'p1', limite: 125, conteoAnterior: 124 }),
    ).resolves.toEqual({ conteo: 125, alcanzado: true });
    expect(getHistoriasClinicasDelMes).toHaveBeenCalledWith('p1');
  });

  it('por debajo del límite deja continuar', async () => {
    getHistoriasClinicasDelMes.mockResolvedValue({ data: 80 });
    await expect(
      verificarLimiteHistoriasDelMes({ idProveedor: 'p1', limite: 125, conteoAnterior: 79 }),
    ).resolves.toEqual({ conteo: 80, alcanzado: false });
  });

  it('si la consulta falla usa el último conteo conocido (como antes)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getHistoriasClinicasDelMes.mockRejectedValue(new Error('red'));
    await expect(
      verificarLimiteHistoriasDelMes({ idProveedor: 'p1', limite: 125, conteoAnterior: 125 }),
    ).resolves.toEqual({ conteo: 125, alcanzado: true });
    getHistoriasClinicasDelMes.mockResolvedValue({ data: [] });
    await expect(
      verificarLimiteHistoriasDelMes({ idProveedor: 'p1', limite: 125, conteoAnterior: 10 }),
    ).resolves.toEqual({ conteo: 10, alcanzado: false });
  });

  it('sin límite no consulta ni bloquea', async () => {
    await expect(
      verificarLimiteHistoriasDelMes({ idProveedor: 'p1', limite: null, conteoAnterior: 999 }),
    ).resolves.toEqual({ conteo: 999, alcanzado: false });
    expect(getHistoriasClinicasDelMes).not.toHaveBeenCalled();
  });
});

describe('esLimiteHistoriasAlcanzado', () => {
  it('reconoce el rechazo del servidor por cupo lleno, y nada más', () => {
    expect(esLimiteHistoriasAlcanzado({ response: { status: 403, data: { code: 'LIMITE_HISTORIAS_ALCANZADO' } } })).toBe(true);
    expect(esLimiteHistoriasAlcanzado({ response: { status: 403, data: { message: 'Sin permisos' } } })).toBe(false);
    expect(esLimiteHistoriasAlcanzado(new Error('red'))).toBe(false);
    expect(esLimiteHistoriasAlcanzado(null)).toBe(false);
  });
});
