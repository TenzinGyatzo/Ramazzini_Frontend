import { computed } from 'vue';
import { useUserStore } from '@/stores/user';
import {
  type PermissionKey,
  canCreateDocumentType,
  getDocumentRestrictionMessage,
  getPermissionBlockReason,
  hasBypassRole,
  isDocumentBlockedForFirmante,
  isPermissionBlockedByRole,
  isPermissionEditableForRole,
  resolvePermissionFlag,
} from '@/constants/rolePermissionPolicy';

export function useRolePermissions() {
  const userStore = useUserStore();

  const userRole = computed(() => userStore.user?.role);
  const userPermisos = computed(() => userStore.user?.permisos);
  const userPerfilProfesional = computed(
    () => userStore.user?.perfilProfesional,
  );

  function canManagePermission(permissionKey: PermissionKey): boolean {
    return resolvePermissionFlag(
      userRole.value,
      userPermisos.value,
      permissionKey,
      userPerfilProfesional.value,
    );
  }

  function canCreateDocument(documentType: string): boolean {
    return canCreateDocumentType(
      userRole.value,
      userPermisos.value,
      documentType,
      userPerfilProfesional.value,
    );
  }

  function isDocumentRestricted(documentType: string): boolean {
    return !canCreateDocument(documentType);
  }

  function getRestrictionMessage(documentType: string): string {
    if (
      isDocumentBlockedForFirmante(
        userRole.value,
        userPerfilProfesional.value,
        documentType,
      )
    ) {
      return 'Los certificados médicos solo puede expedirlos un médico.';
    }
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
    canManageInventario: computed(() =>
      canManagePermission('gestionarInventario'),
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
