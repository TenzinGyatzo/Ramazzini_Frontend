/** Activar solo durante verificación SIRES: VITE_CATALOG_ADMIN_ENABLED=true */
export const catalogAdminEnabled =
  import.meta.env.VITE_CATALOG_ADMIN_ENABLED === "true";
