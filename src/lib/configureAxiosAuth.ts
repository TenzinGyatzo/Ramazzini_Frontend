import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

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
