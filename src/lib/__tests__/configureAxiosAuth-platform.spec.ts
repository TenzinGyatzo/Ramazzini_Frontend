import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, type AxiosInstance } from 'axios';
import { configureAxiosAuth } from '../configureAxiosAuth';

vi.mock('@/utils/posthogIdentity', () => ({ resetPostHogIdentity: vi.fn() }));
vi.mock('@/stores/sessionLock', () => ({
  useSessionLockStore: () => ({ requestLock: vi.fn() }),
}));

function errorWith(status: number, data: unknown, config: Record<string, unknown>) {
  return new AxiosError('error', 'ERR_BAD_REQUEST', config as never, undefined, {
    status,
    statusText: '',
    data,
    headers: {},
    config: config as never,
  });
}

function setLocation(pathname: string) {
  const assign = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: `http://localhost${pathname}`, pathname, assign },
  });
  return assign;
}

describe('configureAxiosAuth: 409 PLATFORM_TENANT_REQUIRED', () => {
  let instance: AxiosInstance;

  beforeEach(() => {
    instance = configureAxiosAuth(axios.create({ baseURL: 'http://localhost' }));
  });

  it('lleva a la consola de plataforma y rechaza la petición', async () => {
    const assign = setLocation('/inicio');
    instance.defaults.adapter = async (config) => {
      throw errorWith(409, { code: 'PLATFORM_TENANT_REQUIRED' }, config);
    };
    await expect(instance.get('/api/inicio/resumen')).rejects.toBeTruthy();
    expect(assign).toHaveBeenCalledWith('/panel-administrador');
  });

  it('si ya está en la consola no vuelve a navegar', async () => {
    const assign = setLocation('/panel-administrador');
    instance.defaults.adapter = async (config) => {
      throw errorWith(409, { code: 'PLATFORM_TENANT_REQUIRED' }, config);
    };
    await expect(instance.get('/api/x')).rejects.toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });

  it('otros 409 no redirigen', async () => {
    const assign = setLocation('/trabajadores');
    instance.defaults.adapter = async (config) => {
      throw errorWith(409, { message: 'duplicado' }, config);
    };
    await expect(instance.get('/api/x')).rejects.toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });
});
