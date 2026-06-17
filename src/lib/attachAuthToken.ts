import type { AxiosInstance, AxiosRequestConfig } from 'axios';

export function attachAuthToken(instance: AxiosInstance): AxiosInstance {
  instance.interceptors.request.use((config) => {
    try {
      const token = localStorage.getItem('AUTH_TOKEN');
      if (token) {
        config.headers = config.headers || {};
        (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore storage errors
    }
    return config;
  });
  return instance;
}

export function authRequestConfig(): Pick<AxiosRequestConfig, 'headers'> {
  const token = localStorage.getItem('AUTH_TOKEN');
  if (!token) {
    return { headers: {} };
  }
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}
