import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useSessionLockStore } from '@/stores/sessionLock';
import { resetPostHogIdentity } from '@/utils/posthogIdentity';

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

/** Pantallas sin sesión. Un 401 aquí no es una sesión vencida. */
function isPublicAuthPage(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return (
    path === '/login' ||
    path.startsWith('/login/') ||
    path === '/auth' ||
    path.startsWith('/auth/')
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

/** Administrador de plataforma en la consola intentando usar datos de un tenant (409). */
export function isPlatformTenantRequiredResponse(error: unknown): boolean {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) {
    return false;
  }
  const data = error.response.data as { code?: string } | undefined;
  return data?.code === 'PLATFORM_TENANT_REQUIRED';
}

const PLATFORM_CONSOLE_PATH = '/panel-administrador';

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
      if (isPlatformTenantRequiredResponse(error)) {
        if (
          typeof window !== 'undefined' &&
          window.location.pathname !== PLATFORM_CONSOLE_PATH
        ) {
          window.location.assign(PLATFORM_CONSOLE_PATH);
        }
        return Promise.reject(error);
      }

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
        isAuthFlowRequest(original.url) ||
        isPublicAuthPage()
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
        resetPostHogIdentity();
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
