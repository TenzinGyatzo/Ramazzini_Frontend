import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { AxiosResponse } from 'axios';

vi.mock('@/api/ProveedorSaludAPI', () => ({
  default: {
    getProveedorById: vi.fn(),
  },
}));

import ProveedorSaludAPI from '@/api/ProveedorSaludAPI';
import { useProveedorSaludStore } from './proveedorSalud';

const mockProveedor = {
  _id: 'prov-1',
  nombre: 'Proveedor Test',
  pais: 'MX',
};

function mockAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as AxiosResponse<T>['config'],
  };
}

describe('useProveedorSaludStore (H-11)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loadProveedorSalud no persiste en localStorage', async () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem,
      removeItem: vi.fn(),
    });
    vi.mocked(ProveedorSaludAPI.getProveedorById).mockResolvedValue(
      mockAxiosResponse(mockProveedor),
    );

    const store = useProveedorSaludStore();
    await store.loadProveedorSalud('prov-1');

    expect(setItem).not.toHaveBeenCalledWith(
      'proveedorSalud',
      expect.anything(),
    );
    expect(store.proveedorSalud).toEqual(mockProveedor);
  });
});
