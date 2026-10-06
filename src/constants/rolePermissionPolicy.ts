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
  'gestionarInventario',
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
  gestionarInventario: true,
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
    gestionarInventario: true,
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
    gestionarInventario: true,
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
    gestionarInventario: true,
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
    gestionarInventario: true,
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
    'cuestionarioNordico',
    'evaluacionSuenoVigilia',
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

/**
 * Perfil profesional del Principal: separa «dueño del tenant» de la profesión.
 * Un Principal sin el campo (registros anteriores) se lee como Médico.
 * Debe coincidir con la política del backend (role-permission-policy.ts).
 */
export const PERFILES_PROFESIONALES = [
  'Médico',
  'Enfermero/a',
  'Técnico Evaluador',
  'Administrativo',
] as const;

export type PerfilProfesional = (typeof PERFILES_PROFESIONALES)[number];

export const PERFIL_PROFESIONAL_DEFAULT: PerfilProfesional = 'Médico';

export type FirmanteTipo = 'medico' | 'enfermera' | 'tecnico';

/** Perfiles con los que el Principal conserva todos los permisos, clínicos incluidos. */
const PERFILES_CON_ACCESO_CLINICO_TOTAL: readonly PerfilProfesional[] = [
  'Médico',
  'Enfermero/a',
];

/** Permisos que en el Principal dependen de su perfil profesional y no del rol. */
const CLINICAL_PERMISSION_KEYS: readonly PermissionKey[] = [
  'gestionarDocumentosDiagnostico',
  'gestionarDocumentosEvaluacion',
  'gestionarOtrosDocumentos',
  'accesoRiesgosTrabajo',
];

/** Documentos que solo puede expedir un médico, aun con permiso de diagnóstico. */
export const DOCUMENT_TYPES_SOLO_MEDICO: readonly string[] = [
  'certificado',
  'certificadoExpedito',
];

/** Perfil profesional vigente del Principal; null para cualquier otro rol. */
export function resolvePerfilProfesional(
  role: string | undefined | null,
  perfilProfesional?: string | null,
): PerfilProfesional | null {
  if (role !== 'Principal') return null;
  return (PERFILES_PROFESIONALES as readonly string[]).includes(
    perfilProfesional ?? '',
  )
    ? (perfilProfesional as PerfilProfesional)
    : PERFIL_PROFESIONAL_DEFAULT;
}

/** Principal técnico o administrativo: lo clínico vale lo que trae su perfil por defecto. */
function principalClinicalPermission(
  role: string,
  perfilProfesional: string | null | undefined,
  permissionKey: PermissionKey,
): boolean | null {
  const perfil = resolvePerfilProfesional(role, perfilProfesional);
  if (
    !perfil ||
    PERFILES_CON_ACCESO_CLINICO_TOTAL.includes(perfil) ||
    !CLINICAL_PERMISSION_KEYS.includes(permissionKey)
  ) {
    return null;
  }
  return ROLE_DEFAULT_PERMISSIONS[perfil][permissionKey] === true;
}

/** Tipo de perfil de firmante que le corresponde al usuario; null si no firma. */
export function resolveFirmanteTipo(
  role: string | undefined | null,
  perfilProfesional?: string | null,
): FirmanteTipo | null {
  const profesion = resolvePerfilProfesional(role, perfilProfesional) ?? role;
  switch (profesion) {
    case 'Médico':
    case 'Administrador':
      return 'medico';
    case 'Enfermero/a':
      return 'enfermera';
    case 'Técnico Evaluador':
      return 'tecnico';
    default:
      return null;
  }
}

export function isDocumentBlockedForFirmante(
  role: string | undefined | null,
  perfilProfesional: string | null | undefined,
  documentType: string,
): boolean {
  return (
    DOCUMENT_TYPES_SOLO_MEDICO.includes(documentType) &&
    resolveFirmanteTipo(role, perfilProfesional) === 'enfermera'
  );
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
  perfilProfesional?: string | null,
): boolean {
  if (!role) return false;
  const clinical = principalClinicalPermission(
    role,
    perfilProfesional,
    permissionKey,
  );
  if (clinical !== null) return clinical;
  if (hasBypassRole(role)) return true;
  if (isPermissionBlockedByRole(role, permissionKey)) return false;
  // Un permiso que el usuario aún no tiene guardado vale lo que su rol trae por defecto
  const stored = permisos?.[permissionKey];
  return (stored ?? ROLE_DEFAULT_PERMISSIONS[role]?.[permissionKey]) === true;
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
  perfilProfesional?: string | null,
): boolean {
  const permissionKey = getPermissionForDocumentType(documentType);
  if (!permissionKey) return false;
  if (isDocumentBlockedForFirmante(role, perfilProfesional, documentType)) {
    return false;
  }
  return resolvePermissionFlag(
    role,
    permisos,
    permissionKey,
    perfilProfesional,
  );
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
  cuestionarioNordico: 'Cuestionario Nórdico',
  evaluacionSuenoVigilia: 'Evaluación de sueño y vigilia',
  eventoSeguimientoCardiometabolico: 'Evento de Seguimiento Cardiometabólico',
  informeLongitudinalCardiometabolico: 'Informe Longitudinal Cardiometabólico',
  informeLongitudinalAudiometrico: 'Informe longitudinal de seguimiento audiométrico',
  seguimientoProgramadoCardiometabolico: 'Inasistencia a Seguimiento Cardiometabólico',
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
