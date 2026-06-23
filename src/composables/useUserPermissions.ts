import { useRolePermissions } from './useRolePermissions';

export function useUserPermissions() {
  const {
    userRole,
    canCreateDocument,
    isDocumentRestricted,
    getRestrictionMessage,
    canManageEmpresas,
    canManageCentrosTrabajo,
    canManageTrabajadores,
    canManageDocumentosDiagnostico,
    canManageDocumentosEvaluacion,
    canManageDocumentosExternos,
    canManageOtrosDocumentos,
    canAccessCompletoEmpresasCentros,
    canAccessDashboardSalud,
    canAccessRiesgosTrabajo,
  } = useRolePermissions();

  return {
    userRole,
    canCreateDocument,
    isDocumentRestricted,
    getRestrictionMessage,
    canManageEmpresas,
    canManageCentrosTrabajo,
    canManageTrabajadores,
    canManageDocumentosDiagnostico,
    canManageDocumentosEvaluacion,
    canManageDocumentosExternos,
    canManageOtrosDocumentos,
    canManageCuestionariosAdicionales: canManageOtrosDocumentos,
    canAccessCompletoEmpresasCentros,
    canAccessDashboardSalud,
    canAccessRiesgosTrabajo,
  };
}
