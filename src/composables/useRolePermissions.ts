import { computed } from 'vue';
import { useUserStore } from '@/stores/user';
import {
  type PermissionKey,
  canCreateDocumentType,
  getDocumentRestrictionMessage,
  getPermissionBlockReason,
  hasBypassRole,
  isPermissionBlockedByRole,
  isPermissionEditableForRole,
  resolvePermissionFlag,
} from '@/constants/rolePermissionPolicy';

export function useRolePermissions() {
  const userStore = useUserStore();

  const userRole = computed(() => userStore.user?.role);
  const userPermisos = computed(() => userStore.user?.permisos);

  function canManagePermission(permissionKey: PermissionKey): boolean {
    return resolvePermissionFlag(
      userRole.value,
      userPermisos.value,
      permissionKey,
    );
  }

  function canCreateDocument(documentType: string): boolean {
    return canCreateDocumentType(
      userRole.value,
      userPermisos.value,
      documentType,
    );
  }

  function isDocumentRestricted(documentType: string): boolean {
    return !canCreateDocument(documentType);
  }

  function getRestrictionMessage(documentType: string): string {
    return getDocumentRestrictionMessage(documentType);
  }

  function canAccessEmpresa(empresaId: string): boolean {
    if (!userRole.value) return false;
    if (hasBypassRole(userRole.value)) return true;
    if (userStore.user?.permisos?.accesoCompletoEmpresasCentros) return true;
    return userStore.hasAccessToEmpresa(empresaId);
  }

  function canAccessCentro(centroId: string): boolean {
    if (!userRole.value) return false;
    if (hasBypassRole(userRole.value)) return true;
    if (userStore.user?.permisos?.accesoCompletoEmpresasCentros) return true;
    return userStore.hasAccessToCentro(centroId);
  }

  return {
    userRole,
    userPermisos,
    canManagePermission,
    canManageEmpresas: computed(() => canManagePermission('gestionarEmpresas')),
    canManageCentrosTrabajo: computed(() =>
      canManagePermission('gestionarCentrosTrabajo'),
    ),
    canManageTrabajadores: computed(() =>
      canManagePermission('gestionarTrabajadores'),
    ),
    canManageDocumentosDiagnostico: computed(() =>
      canManagePermission('gestionarDocumentosDiagnostico'),
    ),
    canManageDocumentosEvaluacion: computed(() =>
      canManagePermission('gestionarDocumentosEvaluacion'),
    ),
    canManageDocumentosExternos: computed(() =>
      canManagePermission('gestionarDocumentosExternos'),
    ),
    canManageOtrosDocumentos: computed(() =>
      canManagePermission('gestionarOtrosDocumentos'),
    ),
    canAccessCompletoEmpresasCentros: computed(() =>
      canManagePermission('accesoCompletoEmpresasCentros'),
    ),
    canAccessDashboardSalud: computed(() =>
      canManagePermission('accesoDashboardSalud'),
    ),
    canAccessRiesgosTrabajo: computed(() =>
      canManagePermission('accesoRiesgosTrabajo'),
    ),
    canCreateDocument,
    isDocumentRestricted,
    getRestrictionMessage,
    canAccessEmpresa,
    canAccessCentro,
    isPermissionEditableForRole,
    isPermissionBlockedByRole,
    getPermissionBlockReason,
  };
}
