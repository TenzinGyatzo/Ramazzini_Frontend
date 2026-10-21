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
  'configurarOrdenDocumentos',
  'anularEliminarDocumentos',
  'eliminarFusionarTrabajadores',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type UserPermissions = Record<PermissionKey, boolean>;

/** Permiso por tipo de documento (`permisos.documentos`): la clave es el tipo. */
export type DocumentPermissions = Record<string, boolean>;

/** Permisos como se guardan: los generales y, si el Principal ya los ajustó, los de cada documento. */
export type StoredPermissions = UserPermissions & {
  documentos?: DocumentPermissions;
};

type PermisosEntrada =
  | (Partial<UserPermissions> & { documentos?: DocumentPermissions | null })
  | null
  | undefined;

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
  configurarOrdenDocumentos: true,
  anularEliminarDocumentos: true,
  eliminarFusionarTrabajadores: true,
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
    configurarOrdenDocumentos: false,
    anularEliminarDocumentos: true,
    eliminarFusionarTrabajadores: true,
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
    configurarOrdenDocumentos: false,
    anularEliminarDocumentos: true,
    eliminarFusionarTrabajadores: true,
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
    configurarOrdenDocumentos: false,
    anularEliminarDocumentos: true,
    eliminarFusionarTrabajadores: true,
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
    configurarOrdenDocumentos: false,
    anularEliminarDocumentos: true,
    eliminarFusionarTrabajadores: true,
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

/**
 * Captura de resultados clínicos (audiometría, espirometría, EKG, tipo de sangre). No es un
 * tipo de documento, pero se otorga junto con los estudios; antes usaba el permiso de evaluación.
 * Debe coincidir con la política del backend (role-permission-policy.ts).
 */
export const RESULTADO_CLINICO_PERMISSION = 'resultadoClinico';

/** La nota aclaratoria no se otorga por sí sola: sigue al documento que aclara. */
const NOTA_ACLARATORIA = 'notaAclaratoria';

/** Categoría anterior de cada permiso por documento: da los techos por rol y el valor de respaldo. */
const LEGACY_CATEGORY_BY_DOCUMENT_PERMISSION: Record<
  string,
  DocumentPermissionCategory
> = {
  ...DOCUMENT_TYPE_TO_PERMISSION,
  [RESULTADO_CLINICO_PERMISSION]: 'gestionarDocumentosEvaluacion',
};

/**
 * El origen de una nota aclaratoria se guarda a veces con el nombre de la colección
 * («historiasClinicas») o con la etiqueta («Documento Externo»); el permiso usa el tipo.
 */
const TIPO_POR_NOMBRE_ALTERNO: Record<string, string> = {
  antidopings: 'antidoping',
  aptitudes: 'aptitud',
  audiometrias: 'audiometria',
  certificados: 'certificado',
  certificadosExpedito: 'certificadoExpedito',
  constanciasAptitud: 'constanciaAptitud',
  documentosExternos: 'documentoExterno',
  'Documento Externo': 'documentoExterno',
  entrevistasPsicologicas: 'entrevistaPsicologica',
  examenesVista: 'examenVista',
  exploracionesFisicas: 'exploracionFisica',
  historiasClinicas: 'historiaClinica',
  notasAclaratorias: 'notaAclaratoria',
  notasMedicas: 'notaMedica',
  recetas: 'receta',
};

export function tipoDocumentoParaPermiso(tipo: string): string {
  return TIPO_POR_NOMBRE_ALTERNO[tipo] ?? tipo;
}

/** Claves que admite `permisos.documentos`. */
export const DOCUMENT_PERMISSION_KEYS: readonly string[] = Object.keys(
  LEGACY_CATEGORY_BY_DOCUMENT_PERMISSION,
).filter((key) => key !== NOTA_ACLARATORIA);

const DOCUMENT_CATEGORIES = Object.keys(
  DOCUMENT_TYPES_BY_PERMISSION,
) as DocumentPermissionCategory[];

export function getLegacyCategoryForDocumentPermission(
  key: string,
): DocumentPermissionCategory | null {
  return LEGACY_CATEGORY_BY_DOCUMENT_PERMISSION[key] ?? null;
}

export interface GrupoPermisosDocumentos {
  id: string;
  titulo: string;
  descripcion: string;
  tipos: readonly string[];
}

/**
 * Cómo se presentan los permisos por documento al Principal: por área de salud o tipo de
 * acto, aunque un grupo tenga un solo documento (ahí caerán los que se agreguen). Solo es
 * presentación; lo que se guarda es cada documento. Todo permiso por documento debe estar en
 * exactamente un grupo, salvo DOCUMENT_PERMISSION_KEYS_SIN_GRUPO.
 */
export const GRUPOS_PERMISOS_DOCUMENTOS: readonly GrupoPermisosDocumentos[] = [
  {
    id: 'dictamenes',
    titulo: 'Dictámenes y certificados',
    descripcion: 'Aptitud para el puesto, constancias y certificados médicos.',
    tipos: ['aptitud', 'constanciaAptitud', 'certificado', 'certificadoExpedito'],
  },
  {
    id: 'consulta',
    titulo: 'Consulta y prescripción',
    descripcion: 'Notas médicas de consulta y recetas.',
    tipos: ['notaMedica', 'receta'],
  },
  {
    id: 'evaluaciones',
    titulo: 'Evaluaciones clínicas',
    descripcion: 'La evaluación general del trabajador: historia clínica, exploración física y vista.',
    tipos: ['historiaClinica', 'exploracionFisica', 'examenVista'],
  },
  {
    id: 'auditiva',
    titulo: 'Salud auditiva',
    descripcion: 'Antecedentes otológicos, audiometrías y su seguimiento en el tiempo.',
    tipos: ['historiaOtologica', 'audiometria', 'informeLongitudinalAudiometrico'],
  },
  {
    id: 'respiratoria',
    titulo: 'Salud respiratoria',
    descripcion: 'Cuestionario previo a la espirometría.',
    tipos: ['previoEspirometria'],
  },
  {
    id: 'cardiometabolica',
    titulo: 'Salud cardiometabólica',
    descripcion: 'Eventos de seguimiento, inasistencias y el informe longitudinal.',
    tipos: [
      'eventoSeguimientoCardiometabolico',
      'seguimientoProgramadoCardiometabolico',
      'informeLongitudinalCardiometabolico',
    ],
  },
  {
    id: 'musculoesqueletica',
    titulo: 'Salud musculoesquelética',
    descripcion: 'Cuestionario Nórdico de molestias musculoesqueléticas.',
    tipos: ['cuestionarioNordico'],
  },
  {
    id: 'sueno',
    titulo: 'Sueño',
    descripcion: 'Evaluación de sueño y vigilia.',
    tipos: ['evaluacionSuenoVigilia'],
  },
  {
    id: 'saludMental',
    titulo: 'Cuestionarios de salud mental',
    descripcion: 'Entrevista psicológica y cuestionarios de tamizaje psicológico.',
    tipos: [
      'entrevistaPsicologica',
      'trastornosEstadoAnimo',
      'cuestionarioProdromalBreve',
      'trastornoLimitePersonalidad',
    ],
  },
  {
    id: 'materna',
    titulo: 'Salud materna',
    descripcion: 'Control prenatal.',
    tipos: ['controlPrenatal'],
  },
  {
    id: 'toxicologicas',
    titulo: 'Pruebas toxicológicas',
    descripcion: 'Pruebas antidoping.',
    tipos: ['antidoping'],
  },
  {
    id: 'resultadosExternos',
    titulo: 'Resultados clínicos y documentos externos',
    descripcion:
      'Captura de resultados de estudios y archivos que se suben al expediente; los resultados pueden vincularse a esos archivos.',
    tipos: [RESULTADO_CLINICO_PERMISSION, 'documentoExterno'],
  },
];

/** Permisos por documento que no se muestran: Detección (GIIS-B019) ya no se usa. */
export const DOCUMENT_PERMISSION_KEYS_SIN_GRUPO: readonly string[] = ['deteccion'];

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

/**
 * Permisos por documento válidos para el rol: solo claves conocidas con valor booleano y
 * en falso lo que el rol no puede tener. null si no trae ninguno (rigen las categorías).
 */
export function sanitizeDocumentPermissionsForRole(
  role: string,
  documentos: unknown,
): DocumentPermissions | null {
  if (!documentos || typeof documentos !== 'object' || Array.isArray(documentos)) {
    return null;
  }
  const entrada = documentos as Record<string, unknown>;
  const resultado: DocumentPermissions = {};
  for (const key of DOCUMENT_PERMISSION_KEYS) {
    if (typeof entrada[key] !== 'boolean') continue;
    const category = LEGACY_CATEGORY_BY_DOCUMENT_PERMISSION[key];
    resultado[key] = (entrada[key] as boolean) && !isPermissionBlockedByRole(role, category);
  }
  return Object.keys(resultado).length > 0 ? resultado : null;
}

export function sanitizePermissionsForRole(
  role: string,
  permisos: Partial<UserPermissions> & Record<string, unknown>,
): StoredPermissions {
  const { documentos, ...normalized } = { ...permisos } as Record<string, unknown>;
  if (
    normalized.gestionarOtrosDocumentos === undefined &&
    permisos.gestionarCuestionariosAdicionales !== undefined
  ) {
    normalized.gestionarOtrosDocumentos = permisos.gestionarCuestionariosAdicionales;
  }
  delete normalized.gestionarCuestionariosAdicionales;

  const defaults = ROLE_DEFAULT_PERMISSIONS[role] ?? PERMISSION_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: false }),
    {} as UserPermissions,
  );

  const merged = { ...defaults, ...normalized } as StoredPermissions;

  for (const key of PERMISSION_KEYS) {
    if (isPermissionBlockedByRole(role, key)) {
      merged[key] = false;
    }
  }

  const porDocumento = sanitizeDocumentPermissionsForRole(role, documentos);
  if (porDocumento) {
    merged.documentos = porDocumento;
    // Con permisos por documento, cada categoría anterior dice si puede elaborar alguno de ella
    for (const category of DOCUMENT_CATEGORIES) {
      merged[category] = DOCUMENT_PERMISSION_KEYS.some(
        (key) =>
          LEGACY_CATEGORY_BY_DOCUMENT_PERMISSION[key] === category &&
          canManageDocumentPermission(role, merged, key),
      );
    }
  }

  return merged;
}

/**
 * ¿Puede elaborar, editar y finalizar este tipo de documento? Quien ya tiene permisos por
 * documento se rige por ellos (lo que falte vale lo de su rol) y la nota aclaratoria sigue
 * al documento que aclara. Sin permisos por documento rigen las categorías de siempre.
 * No incluye la regla de firmante (certificados solo médico): ver canCreateDocumentType.
 */
export function canManageDocumentPermission(
  role: string | undefined | null,
  permisos: PermisosEntrada,
  documentType: string,
  perfilProfesional?: string | null,
  documentoOrigenTipo?: string | null,
): boolean {
  if (!role) return false;
  const documentos = permisos?.documentos;
  const tienePorDocumento = !!documentos && typeof documentos === 'object';
  const origen = documentoOrigenTipo ? tipoDocumentoParaPermiso(documentoOrigenTipo) : null;
  if (
    documentType === NOTA_ACLARATORIA &&
    tienePorDocumento &&
    origen &&
    origen !== NOTA_ACLARATORIA &&
    LEGACY_CATEGORY_BY_DOCUMENT_PERMISSION[origen]
  ) {
    return canManageDocumentPermission(role, permisos, origen, perfilProfesional);
  }

  const category = LEGACY_CATEGORY_BY_DOCUMENT_PERMISSION[documentType];
  if (!category) return false;
  if (!tienePorDocumento) {
    return resolvePermissionFlag(role, permisos, category, perfilProfesional);
  }

  const clinical = principalClinicalPermission(role, perfilProfesional, category);
  if (clinical !== null) return clinical;
  if (hasBypassRole(role)) return true;
  if (isPermissionBlockedByRole(role, category)) return false;
  const stored = documentos[documentType];
  return typeof stored === 'boolean'
    ? stored
    : ROLE_DEFAULT_PERMISSIONS[role]?.[category] === true;
}

/** Valor de cada permiso por documento que hoy tiene el usuario, guardado o heredado. */
export function resolveDocumentPermissions(
  role: string,
  permisos: PermisosEntrada,
): DocumentPermissions {
  return Object.fromEntries(
    DOCUMENT_PERMISSION_KEYS.map((key) => [
      key,
      canManageDocumentPermission(role, permisos, key),
    ]),
  );
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
  permisos: PermisosEntrada,
  documentType: string,
  perfilProfesional?: string | null,
  documentoOrigenTipo?: string | null,
): boolean {
  if (!getLegacyCategoryForDocumentPermission(documentType)) return false;
  if (isDocumentBlockedForFirmante(role, perfilProfesional, documentType)) {
    return false;
  }
  return canManageDocumentPermission(
    role,
    permisos,
    documentType,
    perfilProfesional,
    documentoOrigenTipo,
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
  resultadoClinico: 'Resultados clínicos',
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
