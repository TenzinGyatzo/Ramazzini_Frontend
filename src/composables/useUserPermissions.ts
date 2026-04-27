import { computed } from 'vue';
import { useUserStore } from '@/stores/user';

export function useUserPermissions() {
  const userStore = useUserStore();

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

  /** Mismo OR que `canManageOtrosDocumentos` en usePermissionRestrictions (NOM024 + legacy). */
  const canManageOtrosDocumentos = computed(() => {
    if (!userRole.value) return false;
    if (userRole.value === 'Principal' || userRole.value === 'Administrador') return true;
    const permisos = userStore.user?.permisos as Record<string, boolean> | undefined;
    return permisos?.gestionarOtrosDocumentos ?? permisos?.gestionarCuestionariosAdicionales ?? false;
  });

  // Función para verificar si un usuario tiene acceso completo a empresas y centros
  const canAccessCompletoEmpresasCentros = computed(() => {
    if (!userRole.value) return false;
    if (userRole.value === 'Principal' || userRole.value === 'Administrador') return true;
    return userStore.user?.permisos?.accesoCompletoEmpresasCentros || false;
  });

  // Función para verificar si un usuario puede acceder al dashboard de salud
  const canAccessDashboardSalud = computed(() => {
    if (!userRole.value) return false;
    if (userRole.value === 'Principal' || userRole.value === 'Administrador') return true;
    return userStore.user?.permisos?.accesoDashboardSalud || false;
  });

  // Función para verificar si un usuario puede acceder a riesgos de trabajo
  const canAccessRiesgosTrabajo = computed(() => {
    if (!userRole.value) return false;
    if (userRole.value === 'Principal' || userRole.value === 'Administrador') return true;
    return userStore.user?.permisos?.accesoRiesgosTrabajo || false;
  });

  // Tipos de documentos de diagnóstico y certificación
  const documentosDiagnostico = ['aptitud', 'certificado'];
  
  // Otros documentos / cuestionarios adicionales (incluye cuestionarios psicológicos)
  const cuestionariosAdicionales = [
    'controlPrenatal',
    'historiaOtologica',
    'previoEspirometria',
    'certificadoExpedito',
    'entrevistaPsicologica',
    'trastornosEstadoAnimo',
    'cuestionarioProdromalBreve',
    'trastornoLimitePersonalidad',
  ];

  // Función para verificar si un usuario puede crear un tipo específico de documento
  const canCreateDocument = (documentType: string): boolean => {
    if (!userRole.value) return false;
    
    // Verificar si es un documento de diagnóstico
    if (documentosDiagnostico.includes(documentType)) {
      return canManageDocumentosDiagnostico.value;
    }
    
    if (cuestionariosAdicionales.includes(documentType)) {
      return canManageOtrosDocumentos.value;
    }
    
    // Para otros documentos, verificar permiso de evaluación
    return canManageDocumentosEvaluacion.value;
  };

  // Función para verificar si un documento específico está restringido para el usuario actual
  const isDocumentRestricted = (documentType: string): boolean => {
    return !canCreateDocument(documentType);
  };

  // Función para obtener el mensaje de restricción apropiado
  const getRestrictionMessage = (documentType: string): string => {
    const documentNames: Record<string, string> = {
      'aptitud': 'Aptitud para el Puesto',
      'certificado': 'Certificado Médico',
      'certificadoExpedito': 'Certificado Expedito',
      'historiaClinica': 'Historia Clínica',
      'exploracionFisica': 'Exploración Física',
      'examenVista': 'Examen de la Vista',
      'antidoping': 'Antidoping',
      'audiometria': 'Audiometría',
      'documentoExterno': 'Documento Externo',
      'notaMedica': 'Nota Médica',
      'controlPrenatal': 'Control Prenatal',
      'historiaOtologica': 'Historia Otológica',
      'previoEspirometria': 'Previo Espirometría',
      'entrevistaPsicologica': 'Entrevista Psicológica',
      'trastornosEstadoAnimo': 'Cuestionario Trastornos de Estado de Ánimo (MDQ)',
      'cuestionarioProdromalBreve': 'Cuestionario Prodromal Breve',
      'trastornoLimitePersonalidad': 'Cuestionario Trastorno Límite de la Personalidad',
    };
    
    const documentName = documentNames[documentType] || documentType;
    
    if (documentosDiagnostico.includes(documentType)) {
      return `No tienes permisos para gestionar documentos de diagnóstico y certificación.`;
    } else if (cuestionariosAdicionales.includes(documentType)) {
      return `No tienes permisos para gestionar otros documentos o cuestionarios adicionales como ${documentName}.`;
    } else {
      return `No tienes permisos para gestionar documentos de evaluación como ${documentName}.`;
    }
  };

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
    // Mismo ref que canManageOtrosDocumentos (compat.: canManageCuestionariosAdicionales)
    canManageCuestionariosAdicionales: canManageOtrosDocumentos,
    canAccessCompletoEmpresasCentros,
    canAccessDashboardSalud,
    canAccessRiesgosTrabajo
  };
}
