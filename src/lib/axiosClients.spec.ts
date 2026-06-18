import { describe, expect, it } from 'vitest';
import rt from './axiosRTs';
import pagos from './axiosPagos';
import api from './axios';

describe('clientes Axios dedicados (H-12)', () => {
  it('axiosRTs envía cookies de sesión (withCredentials)', () => {
    expect(rt.defaults.withCredentials).toBe(true);
    expect(rt.interceptors.response.handlers.length).toBeGreaterThan(0);
  });

  it('axiosPagos envía cookies de sesión (withCredentials)', () => {
    expect(pagos.defaults.withCredentials).toBe(true);
    expect(pagos.interceptors.response.handlers.length).toBeGreaterThan(0);
  });

  it('axios principal comparte el mismo patrón de autenticación', () => {
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.interceptors.response.handlers.length).toBeGreaterThan(0);
  });
});
