import { inject } from 'vue';
import { useRolePermissions } from './useRolePermissions';

interface Toast {
  open: (options: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    position?: string;
  }) => void;
}

export function usePermissionRestrictions() {
  const toast = inject<Toast>('toast');
  const {
    userRole,
    canManageEmpresas,
    canManageCentrosTrabajo,
    canManageTrabajadores,
    canManageDocumentosDiagnostico,
    canManageDocumentosEvaluacion,
    canManageDocumentosExternos,
    canManageOtrosDocumentos,
    canAccessRiesgosTrabajo,
    canCreateDocument,
    isDocumentRestricted,
    getRestrictionMessage,
    canAccessEmpresa,
    canAccessCentro,
  } = useRolePermissions();

  const validateEmpresaManagement = (action: string = 'realizar esta acción'): boolean => {
    if (!canManageEmpresas.value) {
      toast?.open({
        message: `No tienes permisos para gestionar empresas. No puedes ${action}.`,
        type: 'warning',
        position: 'top-right',
      });
      return false;
    }
    return true;
  };

  const validateCentroTrabajoManagement = (action: string = 'realizar esta acción'): boolean => {
    if (!canManageCentrosTrabajo.value) {
      toast?.open({
        message: `No tienes permisos para gestionar centros de trabajo. No puedes ${action}.`,
        type: 'warning',
        position: 'top-right',
      });
      return false;
    }
    return true;
  };

  const validateTrabajadorManagement = (action: string = 'realizar esta acción'): boolean => {
    if (!canManageTrabajadores.value) {
      toast?.open({
        message: `No tienes permisos para gestionar trabajadores. No puedes ${action}.`,
        type: 'warning',
        position: 'top-right',
      });
      return false;
    }
    return true;
  };

  const validateRiesgosTrabajo = (action: string = 'acceder a riesgos de trabajo'): boolean => {
    if (!canAccessRiesgosTrabajo.value) {
      toast?.open({
        message: `No tienes permisos para acceder a riesgos de trabajo. No puedes ${action}.`,
        type: 'warning',
        position: 'top-right',
      });
      return false;
    }
    return true;
  };

  const validateDocumentCreation = (documentType: string): boolean => {
    if (!canCreateDocument(documentType)) {
      toast?.open({
        message: getRestrictionMessage(documentType),
        type: 'error',
        position: 'top-right',
      });
      return false;
    }
    return true;
  };

  const validateDocumentosExternos = (action: string = 'gestionar documentos externos'): boolean => {
    if (!canManageDocumentosExternos.value) {
      toast?.open({
        message: 'No tienes permisos para gestionar documentos externos.',
        type: 'error',
        position: 'top-right',
      });
      return false;
    }
    return true;
  };

  const validateOtrosDocumentos = (action: string = 'gestionar otros documentos'): boolean => {
    if (!canManageOtrosDocumentos.value) {
      toast?.open({
        message: 'No tienes permisos para gestionar otros documentos.',
        type: 'warning',
        position: 'top-right',
      });
      return false;
    }
    return true;
  };

  const executeIfCanManageEmpresas = (callback: () => void, action: string = 'realizar esta acción') => {
    if (validateEmpresaManagement(action)) callback();
  };

  const executeIfCanManageCentrosTrabajo = (callback: () => void, action: string = 'realizar esta acción') => {
    if (validateCentroTrabajoManagement(action)) callback();
  };

  const executeIfCanManageTrabajadores = (callback: () => void, action: string = 'realizar esta acción') => {
    if (validateTrabajadorManagement(action)) callback();
  };

  const executeIfCanAccessRiesgosTrabajo = (callback: () => void, action: string = 'acceder a riesgos de trabajo') => {
    if (validateRiesgosTrabajo(action)) callback();
  };

  const executeIfCanCreateDocument = (documentType: string, callback: () => void) => {
    if (validateDocumentCreation(documentType)) callback();
  };

  const executeIfCanManageDocumentosExternos = (callback: () => void, action: string = 'gestionar documentos externos') => {
    if (validateDocumentosExternos(action)) callback();
  };

  const executeIfCanManageOtrosDocumentos = (callback: () => void, action: string = 'gestionar otros documentos') => {
    if (validateOtrosDocumentos(action)) callback();
  };

  const executeIfCanManageDocumentosDiagnostico = (callback: () => void, action: string = 'gestionar documentos de diagnóstico') => {
    if (!canManageDocumentosDiagnostico.value) {
      toast?.open({
        message: 'No tienes permisos para gestionar documentos de diagnóstico y certificación.',
        type: 'warning',
        position: 'top-right',
      });
      return;
    }
    callback();
  };

  const executeIfCanManageDocumentosEvaluacion = (callback: () => void, action: string = 'gestionar documentos de evaluación') => {
    if (!canManageDocumentosEvaluacion.value) {
      toast?.open({
        message: 'No tienes permisos para gestionar documentos de evaluación.',
        type: 'warning',
        position: 'top-right',
      });
      return;
    }
    callback();
  };

  return {
    userRole,
    canManageEmpresas,
    canManageCentrosTrabajo,
    canManageTrabajadores,
    canManageDocumentosDiagnostico,
    canManageDocumentosEvaluacion,
    canManageDocumentosExternos,
    canManageOtrosDocumentos,
    canCreateDocument,
    isDocumentRestricted,
    getRestrictionMessage,
    canAccessEmpresa,
    canAccessCentro,
    validateEmpresaManagement,
    validateCentroTrabajoManagement,
    validateTrabajadorManagement,
    validateRiesgosTrabajo,
    validateDocumentCreation,
    validateDocumentosExternos,
    validateOtrosDocumentos,
    executeIfCanManageEmpresas,
    executeIfCanManageCentrosTrabajo,
    executeIfCanManageTrabajadores,
    executeIfCanAccessRiesgosTrabajo,
    executeIfCanCreateDocument,
    executeIfCanManageDocumentosExternos,
    executeIfCanManageOtrosDocumentos,
    executeIfCanManageDocumentosDiagnostico,
    executeIfCanManageDocumentosEvaluacion,
  };
}
