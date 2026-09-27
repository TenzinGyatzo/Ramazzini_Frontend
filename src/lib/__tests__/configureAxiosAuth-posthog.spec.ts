import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, type AxiosInstance } from 'axios';
import { configureAxiosAuth } from '../configureAxiosAuth';
import { resetPostHogIdentity } from '@/utils/posthogIdentity';

vi.mock('@/utils/posthogIdentity', () => ({
  resetPostHogIdentity: vi.fn(),
}));

vi.mock('@/stores/sessionLock', () => ({
  useSessionLockStore: () => ({
    requestLock: vi.fn(),
  }),
}));

function createUnauthorizedError(config: Record<string, unknown>) {
  return new AxiosError(
    'Unauthorized',
    'ERR_BAD_REQUEST',
    config as never,
    undefined,
    {
      status: 401,
      statusText: 'Unauthorized',
      data: {},
      headers: {},
      config: config as never,
    },
  );
}

describe('configureAxiosAuth y PostHog', () => {
  let instance: AxiosInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    instance = configureAxiosAuth(
      axios.create({ baseURL: 'http://localhost' }),
    );
    vi.spyOn(axios, 'post').mockRejectedValue(
      createUnauthorizedError({ url: '/auth/users/refresh' }),
    );
  });

  it('resetea identidad PostHog cuando el refresh falla de forma definitiva', async () => {
    instance.defaults.adapter = async (config) => {
      throw createUnauthorizedError(config);
    };

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost/empresas', pathname: '/empresas' },
    });

    await expect(instance.get('/api/recurso')).rejects.toBeTruthy();
    expect(resetPostHogIdentity).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/login');
  });

  it('no redirige al login cuando el 401 ocurre en el onboarding', async () => {
    instance.defaults.adapter = async (config) => {
      throw createUnauthorizedError(config);
    };

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        href: 'http://localhost/auth/onboarding',
        pathname: '/auth/onboarding',
      },
    });

    await expect(instance.get('/proveedores-salud/algo')).rejects.toBeTruthy();
    expect(window.location.href).toBe('http://localhost/auth/onboarding');
    expect(resetPostHogIdentity).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('no resetea identidad cuando el 401 es SESSION_IDLE (bloqueo, no logout)', async () => {
    instance.defaults.adapter = async (config) => {
      const error = createUnauthorizedError(config);
      error.response = {
        ...error.response!,
        data: { code: 'SESSION_IDLE' },
      };
      throw error;
    };

    await expect(instance.get('/api/recurso')).rejects.toBeTruthy();
    expect(resetPostHogIdentity).not.toHaveBeenCalled();
  });
});
