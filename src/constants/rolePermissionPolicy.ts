export const PERMISSION_KEYS = [
  'gestionarEmpresas',
  'gestionarCentrosTrabajo',
  'gestionarTrabajadores',
  'gestionarDocumentosDiagnostico',
  'gestionarDocumentosEvaluacion',
  'gestionarDocumentosExternos',
  'gestionarOtrosDocumentos',
  'accesoCompletoEmpresasCentros',
  'accesoDashboardSalud',
  'accesoRiesgosTrabajo',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type UserPermissions = Record<PermissionKey, boolean>;

export type DocumentPermissionCategory =
  | 'gestionarDocumentosDiagnostico'
  | 'gestionarDocumentosEvaluacion'
  | 'gestionarDocumentosExternos'
  | 'gestionarOtrosDocumentos';

const ALL_TRUE: UserPermissions = {
  gestionarEmpresas: true,
  gestionarCentrosTrabajo: true,
  gestionarTrabajadores: true,
  gestionarDocumentosDiagnostico: true,
  gestionarDocumentosEvaluacion: true,
  gestionarDocumentosExternos: true,
  gestionarOtrosDocumentos: true,
  accesoCompletoEmpresasCentros: true,
  accesoDashboardSalud: true,
  accesoRiesgosTrabajo: true,
};

export const ROLE_DEFAULT_PERMISSIONS: Record<string, UserPermissions> = {
  Principal: { ...ALL_TRUE },
  Administrador: { ...ALL_TRUE },
  Médico: {
    gestionarEmpresas: false,
    gestionarCentrosTrabajo: false,
    gestionarTrabajadores: true,
    gestionarDocumentosDiagnostico: true,
    gestionarDocumentosEvaluacion: true,
    gestionarDocumentosExternos: true,
    gestionarOtrosDocumentos: true,
    accesoCompletoEmpresasCentros: false,
    accesoDashboardSalud: true,
    accesoRiesgosTrabajo: true,
  },
  'Enfermero/a': {
    gestionarEmpresas: false,
    gestionarCentrosTrabajo: false,
    gestionarTrabajadores: true,
    gestionarDocumentosDiagnostico: false,
    gestionarDocumentosEvaluacion: true,
    gestionarDocumentosExternos: true,
    gestionarOtrosDocumentos: true,
    accesoCompletoEmpresasCentros: false,
    accesoDashboardSalud: true,
    accesoRiesgosTrabajo: true,
  },
  Administrativo: {
    gestionarEmpresas: true,
    gestionarCentrosTrabajo: true,
    gestionarTrabajadores: true,
    gestionarDocumentosDiagnostico: false,
    gestionarDocumentosEvaluacion: false,
    gestionarDocumentosExternos: true,
    gestionarOtrosDocumentos: false,
    accesoCompletoEmpresasCentros: true,
    accesoDashboardSalud: true,
    accesoRiesgosTrabajo: false,
  },
  'Técnico Evaluador': {
    gestionarEmpresas: false,
    gestionarCentrosTrabajo: false,
    gestionarTrabajadores: true,
    gestionarDocumentosDiagnostico: false,
    gestionarDocumentosEvaluacion: true,
    gestionarDocumentosExternos: true,
    gestionarOtrosDocumentos: true,
    accesoCompletoEmpresasCentros: false,
    accesoDashboardSalud: true,
    accesoRiesgosTrabajo: false,
  },
};

export const ROLE_PERMISSION_CEILINGS: Partial<
  Record<string, readonly PermissionKey[]>
> = {
  Administrativo: [
    'gestionarDocumentosDiagnostico',
    'gestionarDocumentosEvaluacion',
    'gestionarOtrosDocumentos',
    'accesoRiesgosTrabajo',
  ],
  'Técnico Evaluador': [
    'gestionarDocumentosDiagnostico',
    'accesoRiesgosTrabajo',
  ],
};

export const PERMISSION_BLOCK_REASONS: Partial<
  Record<string, Partial<Record<PermissionKey, string>>>
> = {
  Administrativo: {
    gestionarDocumentosDiagnostico:
      'Los usuarios administrativos no pueden gestionar documentos de diagnóstico y certificación.',
    gestionarDocumentosEvaluacion:
      'Los usuarios administrativos no pueden gestionar documentos de evaluación.',
    gestionarOtrosDocumentos:
      'Los usuarios administrativos no pueden gestionar otros documentos clínicos.',
    accesoRiesgosTrabajo:
      'Los usuarios administrativos no tienen acceso al módulo de riesgos de trabajo.',
  },
  'Técnico Evaluador': {
    gestionarDocumentosDiagnostico:
      'Los usuarios técnicos no pueden gestionar documentos de diagnóstico y certificación.',
    accesoRiesgosTrabajo:
      'Los usuarios técnicos no tienen acceso al módulo de riesgos de trabajo.',
  },
};

export const DOCUMENT_TYPES_BY_PERMISSION: Record<
  DocumentPermissionCategory,
  readonly string[]
> = {
  gestionarDocumentosDiagnostico: [
    'aptitud',
    'constanciaAptitud',
    'certificado',
    'certificadoExpedito',
    'receta',
    'notaMedica',
  ],
  gestionarDocumentosEvaluacion: [
    'historiaClinica',
    'exploracionFisica',
    'examenVista',
    'audiometria',
    'antidoping',
    'deteccion',
  ],
  gestionarDocumentosExternos: ['documentoExterno'],
  gestionarOtrosDocumentos: [
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
    'informeLongitudinalAudiometrico',
    'seguimientoProgramadoCardiometabolico',
  ],
};

export const DOCUMENT_TYPE_TO_PERMISSION: Record<
  string,
  DocumentPermissionCategory
> = Object.fromEntries(
  Object.entries(DOCUMENT_TYPES_BY_PERMISSION).flatMap(
    ([permission, types]) =>
      types.map((type) => [type, permission as DocumentPermissionCategory]),
  ),
);

const BYPASS_ROLES = new Set(['Principal', 'Administrador']);

export function hasBypassRole(role: string | undefined | null): boolean {
  return !!role && BYPASS_ROLES.has(role);
}

export function isPermissionBlockedByRole(
  role: string,
  permissionKey: PermissionKey,
): boolean {
  const blocked = ROLE_PERMISSION_CEILINGS[role];
  return blocked?.includes(permissionKey) ?? false;
}

export function getPermissionBlockReason(
  role: string,
  permissionKey: PermissionKey,
): string | null {
  return PERMISSION_BLOCK_REASONS[role]?.[permissionKey] ?? null;
}

export function isPermissionEditableForRole(
  role: string,
  permissionKey: PermissionKey,
): boolean {
  return !isPermissionBlockedByRole(role, permissionKey);
}

export function sanitizePermissionsForRole(
  role: string,
  permisos: Partial<UserPermissions> & Record<string, boolean | undefined>,
): UserPermissions {
  const normalized = { ...permisos };
  if (
    normalized.gestionarOtrosDocumentos === undefined &&
    permisos.gestionarCuestionariosAdicionales !== undefined
  ) {
    normalized.gestionarOtrosDocumentos = permisos.gestionarCuestionariosAdicionales;
  }

  const defaults = ROLE_DEFAULT_PERMISSIONS[role] ?? PERMISSION_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: false }),
    {} as UserPermissions,
  );

  const merged = { ...defaults, ...normalized } as UserPermissions;

  for (const key of PERMISSION_KEYS) {
    if (isPermissionBlockedByRole(role, key)) {
      merged[key] = false;
    }
  }

  return merged;
}

export function resolvePermissionFlag(
  role: string | undefined | null,
  permisos: Partial<UserPermissions> | null | undefined,
  permissionKey: PermissionKey,
): boolean {
  if (!role) return false;
  if (hasBypassRole(role)) return true;
  if (isPermissionBlockedByRole(role, permissionKey)) return false;
  return permisos?.[permissionKey] === true;
}

export function getPermissionForDocumentType(
  documentType: string,
): DocumentPermissionCategory | null {
  return DOCUMENT_TYPE_TO_PERMISSION[documentType] ?? null;
}

export function canCreateDocumentType(
  role: string | undefined | null,
  permisos: Partial<UserPermissions> | null | undefined,
  documentType: string,
): boolean {
  const permissionKey = getPermissionForDocumentType(documentType);
  if (!permissionKey) return false;
  return resolvePermissionFlag(role, permisos, permissionKey);
}

export const DOCUMENT_DISPLAY_NAMES: Record<string, string> = {
  aptitud: 'Aptitud para el Puesto',
  constanciaAptitud: 'Constancia de Aptitud',
  certificado: 'Certificado Médico',
  certificadoExpedito: 'Certificado Expedito',
  receta: 'Receta',
  notaMedica: 'Nota Médica',
  historiaClinica: 'Historia Clínica',
  exploracionFisica: 'Exploración Física',
  examenVista: 'Examen de la Vista',
  antidoping: 'Antidoping',
  audiometria: 'Audiometría',
  deteccion: 'Detección',
  documentoExterno: 'Documento Externo',
  controlPrenatal: 'Control Prenatal',
  historiaOtologica: 'Historia Otológica',
  previoEspirometria: 'Previo a Espirometría',
  notaAclaratoria: 'Nota Aclaratoria',
  entrevistaPsicologica: 'Entrevista Psicológica',
  trastornosEstadoAnimo: 'Cuestionario Trastornos de Estado de Ánimo (MDQ)',
  cuestionarioProdromalBreve: 'Cuestionario Prodromal Breve',
  trastornoLimitePersonalidad: 'Cuestionario Trastorno Límite de la Personalidad',
  eventoSeguimientoCardiometabolico: 'Evento de Seguimiento Cardiometabólico',
  informeLongitudinalCardiometabolico: 'Informe Longitudinal Cardiometabólico',
  informeLongitudinalAudiometrico: 'Informe longitudinal de seguimiento audiométrico',
  seguimientoProgramadoCardiometabolico: 'Seguimiento Programado Cardiometabólico',
};

export function getDocumentRestrictionMessage(documentType: string): string {
  const permissionKey = getPermissionForDocumentType(documentType);
  const documentName = DOCUMENT_DISPLAY_NAMES[documentType] || documentType;

  if (permissionKey === 'gestionarDocumentosDiagnostico') {
    return 'No tienes permisos para gestionar documentos de diagnóstico y certificación.';
  }
  if (permissionKey === 'gestionarDocumentosEvaluacion') {
    return `No tienes permisos para gestionar documentos de evaluación como ${documentName}.`;
  }
  if (permissionKey === 'gestionarDocumentosExternos') {
    return 'No tienes permisos para gestionar documentos externos.';
  }
  if (permissionKey === 'gestionarOtrosDocumentos') {
    return `No tienes permisos para gestionar otros documentos como ${documentName}.`;
  }

  return 'No tienes permisos para gestionar este tipo de documento.';
}
