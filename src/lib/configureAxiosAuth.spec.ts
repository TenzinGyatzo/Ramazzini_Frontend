import axios from 'axios';
import { describe, expect, it } from 'vitest';
import { configureAxiosAuth, authRequestConfig } from './configureAxiosAuth';

describe('configureAxiosAuth (H-10)', () => {
  it('configura withCredentials en la instancia', () => {
    const instance = configureAxiosAuth(axios.create());
    expect(instance.defaults.withCredentials).toBe(true);
  });

  it('authRequestConfig expone solo withCredentials (sin Bearer manual)', () => {
    const config = authRequestConfig();
    expect(config).toEqual({ withCredentials: true });
  });
});
