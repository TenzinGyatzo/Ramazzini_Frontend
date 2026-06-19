import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useSessionLockStore } from '@/stores/sessionLock';

let refreshPromise: Promise<void> | null = null;

function apiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || '';
}

function refreshUrl(): string {
  return `${apiBaseUrl()}/auth/users/refresh`;
}

function isAuthFlowRequest(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('/users/login') ||
    url.includes('/users/refresh') ||
    url.includes('/users/logout')
  );
}

function isSessionIdleResponse(error: unknown): boolean {
  if (!axios.isAxiosError(error) || error.response?.status !== 401) {
    return false;
  }
  const data = error.response.data as
    | { code?: string; message?: string | { code?: string } }
    | undefined;
  if (!data) return false;
  if (data.code === 'SESSION_IDLE') return true;
  const msg = data.message;
  if (typeof msg === 'object' && msg?.code === 'SESSION_IDLE') return true;
  return false;
}

async function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(refreshUrl(), {}, { withCredentials: true })
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  await refreshPromise;
}

export function configureAxiosAuth(instance: AxiosInstance): AxiosInstance {
  instance.defaults.withCredentials = true;

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (isSessionIdleResponse(error)) {
        try {
          useSessionLockStore().requestLock();
        } catch {
          // Pinia no inicializado (p. ej. fuera de la app)
        }
        return Promise.reject(error);
      }

      const original = error.config as InternalAxiosRequestConfig & {
        _authRetry?: boolean;
      };

      if (
        !original ||
        error.response?.status !== 401 ||
        original._authRetry ||
        isAuthFlowRequest(original.url)
      ) {
        return Promise.reject(error);
      }

      original._authRetry = true;

      try {
        await refreshSession();
        return instance(original);
      } catch (refreshError) {
        if (isSessionIdleResponse(refreshError)) {
          try {
            useSessionLockStore().requestLock();
          } catch {
            // ignore
          }
          return Promise.reject(refreshError);
        }
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    },
  );

  return instance;
}

/** @deprecated Use configureAxiosAuth */
export const attachAuthToken = configureAxiosAuth;

export function authRequestConfig(): Pick<
  AxiosRequestConfig,
  'withCredentials'
> {
  return { withCredentials: true };
}
