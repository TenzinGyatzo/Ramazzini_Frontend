import { computed, inject } from 'vue';
import { useUserStore } from '@/stores/user';
import { useUserPermissions } from './useUserPermissions';

// Definir el tipo del toast
interface Toast {
  open: (options: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    position?: string;
  }) => void;
}

export function usePermissionRestrictions() {
  const userStore = useUserStore();
  const { canAccessRiesgosTrabajo } = useUserPermissions();
  const toast = inject<Toast>('toast');

  // Computed para obtener el rol del usuario actual
  const userRole = computed(() => userStore.user?.role);

  // Función para verificar si un usuario puede gestionar empresas
  const canManageEmpresas = computed(() => {
    if (!userRole.value) return false;
    if (userRole.value === 'Principal' || userRole.value === 'Administrador') return true;
    return userStore.user?.permisos?.gestionarEmpresas || false;
  });

  // Función para verificar si un usuario puede gestionar centros de trabajo
  const canManageCentrosTrabajo = computed(() => {
    if (!userRole.value) return false;
    if (userRole.value === 'Principal' || userRole.value === 'Administrador') return true;
    return userStore.user?.permisos?.gestionarCentrosTrabajo || false;
  });

  // Función para verificar si un usuario puede gestionar trabajadores
  const canManageTrabajadores = computed(() => {
    if (!userRole.value) return false;
    if (userRole.value === 'Principal' || userRole.value === 'Administrador') return true;
    return userStore.user?.permisos?.gestionarTrabajadores || false;
  });

  // Función para verificar si un usuario puede gestionar documentos de diagnóstico
  const canManageDocumentosDiagnostico = computed(() => {
    if (!userRole.value) return false;
    if (userRole.value === 'Principal' || userRole.value === 'Administrador') return true;
    return userStore.user?.permisos?.gestionarDocumentosDiagnostico || false;
  });

  // Función para verificar si un usuario puede gestionar documentos de evaluación
  const canManageDocumentosEvaluacion = computed(() => {
    if (!userRole.value) return false;
    if (userRole.value === 'Principal' || userRole.value === 'Administrador') return true;
    return userStore.user?.permisos?.gestionarDocumentosEvaluacion || false;
  });

  const canManageDocumentosExternos = computed(() => {
    if (!userRole.value) return false;
    if (userRole.value === 'Principal' || userRole.value === 'Administrador') return true;
    return userStore.user?.permisos?.gestionarDocumentosExternos || false;
  });

  const canManageOtrosDocumentos = computed(() => {
    if (!userRole.value) return false;
    if (userRole.value === 'Principal' || userRole.value === 'Administrador') return true;
    const permisos = userStore.user?.permisos as Record<string, boolean> | undefined;
    return permisos?.gestionarOtrosDocumentos ?? permisos?.gestionarCuestionariosAdicionales ?? false;
  });

  // Función para verificar si un usuario puede acceder a una empresa específica
  const canAccessEmpresa = (empresaId: string) => {
    if (!userRole.value) return false;
    if (userRole.value === 'Principal') return true;
    return userStore.hasAccessToEmpresa(empresaId);
  };

  // Función para verificar si un usuario puede acceder a un centro de trabajo específico
  const canAccessCentro = (centroId: string) => {
    if (!userRole.value) return false;
    if (userRole.value === 'Principal') return true;
    return userStore.hasAccessToCentro(centroId);
  };

  // Tipos de documentos por categoría de permiso
  const documentosDiagnostico = ['aptitud', 'constanciaAptitud', 'certificado', 'certificadoExpedito', 'receta', 'notaMedica'];
  const documentosEvaluacion = ['historiaClinica', 'exploracionFisica', 'examenVista', 'audiometria', 'antidoping', 'deteccion'];
  const documentosExternos = ['documentoExterno'];
  const otrosDocumentos = [
    'controlPrenatal',
    'historiaOtologica',
    'previoEspirometria',
    'notaAclaratoria',
    'entrevistaPsicologica',
    'trastornosEstadoAnimo',
    'cuestionarioProdromalBreve',
    'trastornoLimitePersonalidad',
    'eventoSeguimientoCardiometabolico',
    'informeLongitudinalCardiometabolico',
  ];

  // Función para verificar si un usuario puede crear un tipo específico de documento
  const canCreateDocument = (documentType: string): boolean => {
    if (!userRole.value) return false;

    if (documentosDiagnostico.includes(documentType)) {
      return canManageDocumentosDiagnostico.value;
    }
    if (documentosEvaluacion.includes(documentType)) {
      return canManageDocumentosEvaluacion.value;
    }
    if (documentosExternos.includes(documentType)) {
      return canManageDocumentosExternos.value;
    }
    if (otrosDocumentos.includes(documentType)) {
      return canManageOtrosDocumentos.value;
    }

    return false;
  };

  // Función para verificar si un documento específico está restringido para el usuario actual
  const isDocumentRestricted = (documentType: string): boolean => {
    return !canCreateDocument(documentType);
  };

  // Función para obtener el mensaje de restricción apropiado
  const getRestrictionMessage = (documentType: string): string => {
    const documentNames: Record<string, string> = {
      'aptitud': 'Aptitud para el Puesto',
      'constanciaAptitud': 'Constancia de Aptitud',
      'certificado': 'Certificado Médico',
      'certificadoExpedito': 'Certificado Expedito',
      'receta': 'Receta',
      'notaMedica': 'Nota Médica',
      'historiaClinica': 'Historia Clínica',
      'exploracionFisica': 'Exploración Física',
      'examenVista': 'Examen de la Vista',
      'antidoping': 'Antidoping',
      'audiometria': 'Audiometría',
      'deteccion': 'Detección',
      'documentoExterno': 'Documento Externo',
      'controlPrenatal': 'Control Prenatal',
      'historiaOtologica': 'Historia Otológica',
      'previoEspirometria': 'Previo a Espirometría',
      'notaAclaratoria': 'Nota Aclaratoria',
      'entrevistaPsicologica': 'Entrevista Psicológica',
      'trastornosEstadoAnimo': 'Cuestionario Trastornos de Estado de Ánimo (MDQ)',
      'cuestionarioProdromalBreve': 'Cuestionario Prodromal Breve',
      'trastornoLimitePersonalidad': 'Cuestionario Trastorno Límite de la Personalidad',
      'eventoSeguimientoCardiometabolico': 'Evento de Seguimiento Cardiometabólico',
      'informeLongitudinalCardiometabolico': 'Informe Longitudinal Cardiometabólico',
    };

    const documentName = documentNames[documentType] || documentType;

    if (documentosDiagnostico.includes(documentType)) {
      return `No tienes permisos para gestionar documentos de diagnóstico y certificación.`;
    }
    if (documentosEvaluacion.includes(documentType)) {
      return `No tienes permisos para gestionar documentos de evaluación como ${documentName}.`;
    }
    if (documentosExternos.includes(documentType)) {
      return `No tienes permisos para gestionar documentos externos.`;
    }
    if (otrosDocumentos.includes(documentType)) {
      return `No tienes permisos para gestionar otros documentos como ${documentName}.`;
    }

    return `No tienes permisos para gestionar este tipo de documento.`;
  };


  // === FUNCIONES DE VALIDACIÓN CON TOAST ===

  // Validar gestión de empresas con toast
  const validateEmpresaManagement = (action: string = 'realizar esta acción'): boolean => {
    if (!canManageEmpresas.value) {
      toast?.open({
        message: `No tienes permisos para gestionar empresas. No puedes ${action}.`,
        type: 'warning',
        position: 'top-right'
      });
      return false;
    }
    return true;
  };

  // Validar gestión de centros de trabajo con toast
  const validateCentroTrabajoManagement = (action: string = 'realizar esta acción'): boolean => {
    if (!canManageCentrosTrabajo.value) {
      toast?.open({
        message: `No tienes permisos para gestionar centros de trabajo. No puedes ${action}.`,
        type: 'warning',
        position: 'top-right'
      });
      return false;
    }
    return true;
  };

  // Validar gestión de trabajadores con toast
  const validateTrabajadorManagement = (action: string = 'realizar esta acción'): boolean => {
    if (!canManageTrabajadores.value) {
      toast?.open({
        message: `No tienes permisos para gestionar trabajadores. No puedes ${action}.`,
        type: 'warning',
        position: 'top-right'
      });
      return false;
    }
    return true;
  };

  // Validar acceso a riesgos de trabajo con toast
  const validateRiesgosTrabajo = (action: string = 'acceder a riesgos de trabajo'): boolean => {
    if (!canAccessRiesgosTrabajo.value) {
      toast?.open({
        message: `No tienes permisos para acceder a riesgos de trabajo. No puedes ${action}.`,
        type: 'warning',
        position: 'top-right'
      });
      return false;
    }
    return true;
  };

  // Validar creación de documentos con toast
  const validateDocumentCreation = (documentType: string): boolean => {
    if (!canCreateDocument(documentType)) {
      toast?.open({
        message: getRestrictionMessage(documentType),
        type: 'error',
        position: 'top-right'
      });
      return false;
    }
    return true;
  };

  // Validar gestión de documentos externos con toast
  const validateDocumentosExternos = (action: string = 'gestionar documentos externos'): boolean => {
    if (!canManageDocumentosExternos.value) {
      toast?.open({
        message: `No tienes permisos para gestionar documentos externos.`,
        type: 'error',
        position: 'top-right'
      });
      return false;
    }
    return true;
  };

  // Validar gestión de otros documentos con toast
  const validateOtrosDocumentos = (action: string = 'gestionar otros documentos'): boolean => {
    if (!canManageOtrosDocumentos.value) {
      toast?.open({
        message: `No tienes permisos para gestionar otros documentos.`,
        type: 'warning',
        position: 'top-right'
      });
      return false;
    }
    return true;
  };

  // === FUNCIONES DE ACCIÓN CONDICIONAL ===

  // Ejecutar acción solo si tiene permisos para empresas
  const executeIfCanManageEmpresas = (callback: () => void, action: string = 'realizar esta acción') => {
    if (validateEmpresaManagement(action)) {
      callback();
    }
  };

  // Ejecutar acción solo si tiene permisos para centros de trabajo
  const executeIfCanManageCentrosTrabajo = (callback: () => void, action: string = 'realizar esta acción') => {
    if (validateCentroTrabajoManagement(action)) {
      callback();
    }
  };

  // Ejecutar acción solo si tiene permisos para trabajadores
  const executeIfCanManageTrabajadores = (callback: () => void, action: string = 'realizar esta acción') => {
    if (validateTrabajadorManagement(action)) {
      callback();
    }
  };

  // Ejecutar acción solo si tiene acceso a riesgos de trabajo
  const executeIfCanAccessRiesgosTrabajo = (callback: () => void, action: string = 'acceder a riesgos de trabajo') => {
    if (validateRiesgosTrabajo(action)) {
      callback();
    }
  };

  // Ejecutar acción solo si puede crear el documento
  const executeIfCanCreateDocument = (documentType: string, callback: () => void) => {
    if (validateDocumentCreation(documentType)) {
      callback();
    }
  };

  // Ejecutar acción solo si puede gestionar documentos externos
  const executeIfCanManageDocumentosExternos = (callback: () => void, action: string = 'gestionar documentos externos') => {
    if (validateDocumentosExternos(action)) {
      callback();
    }
  };

  // Ejecutar acción solo si puede gestionar otros documentos
  const executeIfCanManageOtrosDocumentos = (callback: () => void, action: string = 'gestionar otros documentos') => {
    if (validateOtrosDocumentos(action)) {
      callback();
    }
  };

  // Ejecutar acción solo si puede gestionar documentos de diagnóstico
  const executeIfCanManageDocumentosDiagnostico = (callback: () => void, action: string = 'gestionar documentos de diagnóstico') => {
    if (!canManageDocumentosDiagnostico.value) {
      toast?.open({
        message: `No tienes permisos para gestionar documentos de diagnóstico y certificación.`,
        type: 'warning',
        position: 'top-right'
      });
      return;
    }
    callback();
  };

  // Ejecutar acción solo si puede gestionar documentos de evaluación
  const executeIfCanManageDocumentosEvaluacion = (callback: () => void, action: string = 'gestionar documentos de evaluación') => {
    if (!canManageDocumentosEvaluacion.value) {
      toast?.open({
        message: `No tienes permisos para gestionar documentos de evaluación.`,
        type: 'warning',
        position: 'top-right'
      });
      return;
    }
    callback();
  };

  return {
    // Computed properties
    userRole,
    canManageEmpresas,
    canManageCentrosTrabajo,
    canManageTrabajadores,
    canManageDocumentosDiagnostico,
    canManageDocumentosEvaluacion,
    canManageDocumentosExternos,
    canManageOtrosDocumentos,

    // Funciones de verificación
    canCreateDocument,
    isDocumentRestricted,
    getRestrictionMessage,
    canAccessEmpresa,
    canAccessCentro,
    
    // Funciones de validación con toast
    validateEmpresaManagement,
    validateCentroTrabajoManagement,
    validateTrabajadorManagement,
    validateRiesgosTrabajo,
    validateDocumentCreation,
    validateDocumentosExternos,
    validateOtrosDocumentos,

    // Funciones de acción condicional
    executeIfCanManageEmpresas,
    executeIfCanManageCentrosTrabajo,
    executeIfCanManageTrabajadores,
    executeIfCanAccessRiesgosTrabajo,
    executeIfCanCreateDocument,
    executeIfCanManageDocumentosExternos,
    executeIfCanManageOtrosDocumentos,
    executeIfCanManageDocumentosDiagnostico,
    executeIfCanManageDocumentosEvaluacion
  };
}
