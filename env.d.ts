/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_CATALOG_ADMIN_ENABLED?: string;
  readonly VITE_SIRES_SESSION_INACTIVITY_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;
