import { describe, expect, it } from 'vitest';
import rt from './axiosRTs';
import pagos from './axiosPagos';
import api from './axios';

type InterceptorManagerWithHandlers = {
  handlers: Array<{ fulfilled: unknown; rejected: unknown }>;
};

function getResponseInterceptorCount(client: typeof rt): number {
  const manager = client.interceptors.response as unknown as InterceptorManagerWithHandlers;
  return manager.handlers?.length ?? 0;
}

describe('clientes Axios dedicados (H-12)', () => {
  it('axiosRTs envía cookies de sesión (withCredentials)', () => {
    expect(rt.defaults.withCredentials).toBe(true);
    expect(getResponseInterceptorCount(rt)).toBeGreaterThan(0);
  });

  it('axiosPagos envía cookies de sesión (withCredentials)', () => {
    expect(pagos.defaults.withCredentials).toBe(true);
    expect(getResponseInterceptorCount(pagos)).toBeGreaterThan(0);
  });

  it('axios principal comparte el mismo patrón de autenticación', () => {
    expect(api.defaults.withCredentials).toBe(true);
    expect(getResponseInterceptorCount(api)).toBeGreaterThan(0);
  });
});
