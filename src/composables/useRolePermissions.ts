import { computed } from 'vue';
import { useUserStore } from '@/stores/user';
import {
  type PermissionKey,
  DOCUMENT_PERMISSION_KEYS,
  DOCUMENT_TYPES_SOLO_ENFERMERIA,
  RESULTADO_CLINICO_PERMISSION,
  canCreateDocumentType,
  canManageDocumentPermission,
  getDocumentRestrictionMessage,
  getPermissionBlockReason,
  hasBypassRole,
  isPermissionBlockedByRole,
  mensajeBloqueoPorPerfil,
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

  /** La nota aclaratoria se revisa contra el documento que aclara (documentoOrigenTipo). */
  function canCreateDocument(
    documentType: string,
    documentoOrigenTipo?: string | null,
  ): boolean {
    return canCreateDocumentType(
      userRole.value,
      userPermisos.value,
      documentType,
      userPerfilProfesional.value,
      documentoOrigenTipo,
    );
  }

  function canManageDocumentKey(key: string): boolean {
    return canManageDocumentPermission(
      userRole.value,
      userPermisos.value,
      key,
      userPerfilProfesional.value,
    );
  }

  function isDocumentRestricted(documentType: string): boolean {
    return !canCreateDocument(documentType);
  }

  /**
   * Anular o eliminar: el permiso del documento y el de anular. Los documentos solo de
   * enfermería no exigen además el perfil (los anula quien tenga el permiso, como en el servidor).
   */
  function canAnularEliminarDocument(
    documentType: string,
    documentoOrigenTipo?: string | null,
  ): boolean {
    const gestiona = DOCUMENT_TYPES_SOLO_ENFERMERIA.includes(documentType)
      ? canManageDocumentPermission(
          userRole.value,
          userPermisos.value,
          documentType,
          userPerfilProfesional.value,
          documentoOrigenTipo,
        )
      : canCreateDocument(documentType, documentoOrigenTipo);
    return gestiona && canManagePermission('anularEliminarDocumentos');
  }

  function getRestrictionMessage(documentType: string): string {
    return (
      mensajeBloqueoPorPerfil(
        userRole.value,
        userPerfilProfesional.value,
        documentType,
      ) || getDocumentRestrictionMessage(documentType)
    );
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
    canConfigurarOrdenDocumentos: computed(() =>
      canManagePermission('configurarOrdenDocumentos'),
    ),
    canAnularEliminarDocumentos: computed(() =>
      canManagePermission('anularEliminarDocumentos'),
    ),
    canEliminarFusionarTrabajadores: computed(
      () =>
        canManagePermission('gestionarTrabajadores') &&
        canManagePermission('eliminarFusionarTrabajadores'),
    ),
    canManageResultadosClinicos: computed(() =>
      canManageDocumentKey(RESULTADO_CLINICO_PERMISSION),
    ),
    canManageAnyDocumentType: computed(() =>
      DOCUMENT_PERMISSION_KEYS.some(canManageDocumentKey),
    ),
    canManageAllDocumentTypes: computed(() =>
      DOCUMENT_PERMISSION_KEYS.every(canManageDocumentKey),
    ),
    canCreateDocument,
    canAnularEliminarDocument,
    isDocumentRestricted,
    getRestrictionMessage,
    canAccessEmpresa,
    canAccessCentro,
    isPermissionEditableForRole,
    isPermissionBlockedByRole,
    getPermissionBlockReason,
  };
}
