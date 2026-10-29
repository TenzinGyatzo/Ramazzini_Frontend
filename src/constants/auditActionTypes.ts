/**
 * Tipos de evento de la bitácora de auditoría del proveedor, con su nombre en español.
 * De aquí salen las opciones del filtro y el texto de la columna «Acción».
 * Al agregar un tipo en backend (audit-action-type.ts) que vea el tenant, agregarlo aquí.
 * Los PLATFORM_* y ADMIN_CATALOG_* van a la bitácora de plataforma, no a esta.
 */
export interface GrupoEventosAuditoria {
  grupo: string;
  eventos: { valor: string; etiqueta: string }[];
}

export const GRUPOS_EVENTOS_AUDITORIA: GrupoEventosAuditoria[] = [
  {
    grupo: "Documentos",
    eventos: [
      { valor: "DOC_CREATE_DRAFT", etiqueta: "Doc. borrador creado" },
      { valor: "DOC_UPDATE_DRAFT", etiqueta: "Doc. borrador actualizado" },
      { valor: "DOC_FINALIZE", etiqueta: "Doc. finalizado" },
      { valor: "DOC_ANULATE", etiqueta: "Doc. anulado" },
      { valor: "CONSENT_CREATED", etiqueta: "Consentimiento registrado" },
      { valor: "SIGNED_FORM_CREATED", etiqueta: "Formato firmado en pantalla" },
      { valor: "SIGNED_FORM_DELETED", etiqueta: "Formato firmado en pantalla eliminado" },
    ],
  },
  {
    grupo: "Accesos",
    eventos: [
      { valor: "LOGIN_SUCCESS", etiqueta: "Login exitoso" },
      { valor: "LOGIN_FAIL", etiqueta: "Login fallido" },
      { valor: "LOGIN_BLOCKED", etiqueta: "Login bloqueado por intentos fallidos" },
      { valor: "SESSION_UNLOCK_SUCCESS", etiqueta: "Sesión desbloqueada" },
      { valor: "SESSION_UNLOCK_FAIL", etiqueta: "Sesión desbloqueo fallido" },
      { valor: "ACUERDO_CONFIDENCIALIDAD_ACEPTADO", etiqueta: "Acuerdo de confidencialidad aceptado" },
    ],
  },
  {
    grupo: "Admin / asignaciones",
    eventos: [
      { valor: "ADMIN_ROLES_PERMISSIONS", etiqueta: "Roles/permisos" },
      { valor: "ADMIN_USER_ASSIGNMENTS", etiqueta: "Asignaciones usuario" },
    ],
  },
  {
    grupo: "Módulos y funciones",
    eventos: [
      { valor: "SIGNED_FORM_CONFIG_UPDATED", etiqueta: "Firma en pantalla activada o desactivada" },
      { valor: "RESULTS_SEMAPHORE_UPDATED", etiqueta: "Semaforización de resultados activada o desactivada" },
      { valor: "DISABILITY_CONFIG_UPDATED", etiqueta: "Configuración de incapacidades modificada" },
      { valor: "VIGENCIAS_CONFIG_UPDATED", etiqueta: "Vigencias activadas o desactivadas" },
      { valor: "REPORT_COLOR_UPDATED", etiqueta: "Color de los informes modificado" },
    ],
  },
  {
    grupo: "Trabajadores",
    eventos: [
      { valor: "WORKER_DELETED", etiqueta: "Trabajador eliminado" },
      { valor: "WORKER_DELETE_DENIED", etiqueta: "Eliminación de trabajador rechazada" },
      { valor: "WORKER_TRANSFER", etiqueta: "Transferencia de trabajador" },
      { valor: "WORKER_FUSION_MANUAL", etiqueta: "Fusión de trabajadores" },
      { valor: "WORKER_DUPLICATE_DISMISSED", etiqueta: "Duplicado descartado" },
    ],
  },
  {
    grupo: "Empresas y centros de trabajo",
    eventos: [
      { valor: "EMPRESA_UPDATED", etiqueta: "Empresa modificada" },
      { valor: "EMPRESA_DELETED", etiqueta: "Empresa eliminada" },
      { valor: "EMPRESA_DELETE_DENIED", etiqueta: "Eliminación de empresa rechazada" },
      { valor: "CENTRO_UPDATED", etiqueta: "Centro de trabajo modificado" },
      { valor: "CENTRO_DELETED", etiqueta: "Centro de trabajo eliminado" },
      { valor: "CENTRO_DELETE_DENIED", etiqueta: "Eliminación de centro rechazada" },
      { valor: "DELETION_AUTH_FAIL", etiqueta: "Eliminación no autorizada (contraseña incorrecta)" },
      { valor: "VIGENCIAS_EMPRESAS_ACTUALIZADAS", etiqueta: "Empresas en seguimiento de vigencias modificadas" },
    ],
  },
  {
    grupo: "Inventario",
    eventos: [
      { valor: "INVENTORY_ADJUSTED", etiqueta: "Ajuste de inventario" },
      { valor: "INVENTORY_WRITE_OFF", etiqueta: "Baja de inventario" },
      { valor: "INVENTORY_CATALOG_UPDATED", etiqueta: "Catálogo de insumos modificado" },
      { valor: "INVENTORY_CONFIG_UPDATED", etiqueta: "Configuración del inventario modificada" },
    ],
  },
  {
    grupo: "Descargas y exportaciones",
    eventos: [
      { valor: "CLINICAL_FILE_DOWNLOAD", etiqueta: "Descarga de archivo clínico" },
      { valor: "CLINICAL_FILES_MERGED_DOWNLOAD", etiqueta: "Descarga de documentos combinados" },
      { valor: "WORKERS_EXPORT_EXCEL", etiqueta: "Export Excel trabajadores" },
      { valor: "DASHBOARD_REPORT_EXPORTED", etiqueta: "Informe dashboard exportado" },
    ],
  },
  {
    grupo: "GIIS / sistema",
    eventos: [
      { valor: "GIIS_EXPORT_FILE_GENERATED", etiqueta: "GIIS archivo generado" },
      { valor: "GIIS_EXPORT_DOWNLOADED", etiqueta: "GIIS descargado" },
      { valor: "AUDIT_EXPORT_DOWNLOAD", etiqueta: "Export auditoría descargado" },
    ],
  },
  {
    grupo: "Gestión de usuarios",
    eventos: [
      { valor: "USER_INVITATION_SENT", etiqueta: "Invitación enviada" },
      { valor: "USER_ACTIVATED", etiqueta: "Usuario activado" },
      { valor: "USER_SUSPENDED", etiqueta: "Cuenta suspendida" },
      { valor: "USER_REACTIVATED", etiqueta: "Cuenta reactivada" },
      { valor: "USER_DELETED", etiqueta: "Usuario eliminado" },
      { valor: "USER_PASSWORD_CHANGED", etiqueta: "Contraseña cambiada" },
    ],
  },
  {
    grupo: "Perfiles de firmantes",
    eventos: [
      { valor: "SIGNER_PROFILE_CREATED", etiqueta: "Perfil firmante creado" },
      { valor: "SIGNER_PROFILE_UPDATED", etiqueta: "Perfil firmante actualizado" },
    ],
  },
];

// Pueden aparecer en la bitácora aunque no se ofrezcan en el filtro
const ETIQUETAS_SIN_FILTRO: Record<string, string> = {
  ADMIN_CONFIG_SIRES: "Config SIRES",
};

const ETIQUETAS: Record<string, string> = {
  ...ETIQUETAS_SIN_FILTRO,
  ...Object.fromEntries(
    GRUPOS_EVENTOS_AUDITORIA.flatMap((g) => g.eventos.map((e) => [e.valor, e.etiqueta]))
  ),
};

/** Nombre en español de un tipo de evento; si no se conoce, el código tal cual. */
export function etiquetaEventoAuditoria(actionType: string | null | undefined): string {
  if (!actionType) return "—";
  return ETIQUETAS[actionType] ?? actionType;
}
