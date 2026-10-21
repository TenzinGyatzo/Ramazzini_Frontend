import {
  DOCUMENT_PERMISSION_KEYS,
  GRUPOS_PERMISOS_DOCUMENTOS,
  PERMISSION_KEYS,
  ROLE_DEFAULT_PERMISSIONS,
  getLegacyCategoryForDocumentPermission,
  isDocumentBlockedForFirmante,
  isPermissionBlockedByRole,
  resolveDocumentPermissions,
  type DocumentPermissions,
  type GrupoPermisosDocumentos,
  type PermissionKey,
  type UserPermissions,
} from '@/constants/rolePermissionPolicy';

/** Lo que la pantalla de permisos edita de cada usuario. */
export interface PermisosEditables {
  generales: UserPermissions;
  documentos: DocumentPermissions;
}

export interface OpcionesProveedor {
  /** Incapacidades solo existen para proveedores de México. */
  esMexico: boolean;
  controlPrenatalHabilitado: boolean;
  inventarioHabilitado: boolean;
}

export type EstadoGrupo = 'todos' | 'ninguno' | 'algunos' | 'bloqueado';

/** Permisos generales que la pantalla muestra, según lo que el proveedor tiene. */
export function permisosGeneralesVisibles(opciones: OpcionesProveedor): PermissionKey[] {
  return PERMISSION_KEYS.filter((key) => {
    if (key.startsWith('gestionarDocumentos') || key === 'gestionarOtrosDocumentos') return false;
    if (key === 'accesoRiesgosTrabajo') return opciones.esMexico;
    if (key === 'gestionarInventario') return opciones.inventarioHabilitado;
    return true;
  });
}

export function tiposVisiblesDeGrupo(
  grupo: GrupoPermisosDocumentos,
  opciones: OpcionesProveedor,
): string[] {
  return grupo.tipos.filter((tipo) => {
    if (tipo === 'controlPrenatal') return opciones.controlPrenatalHabilitado;
    return true;
  });
}

export function gruposVisibles(opciones: OpcionesProveedor) {
  return GRUPOS_PERMISOS_DOCUMENTOS.map((grupo) => ({
    ...grupo,
    tipos: tiposVisiblesDeGrupo(grupo, opciones),
  })).filter((grupo) => grupo.tipos.length > 0);
}

/** Por qué un documento no se le puede otorgar a este rol; null si se puede. */
export function motivoBloqueoDocumento(role: string, tipo: string): string | null {
  const categoria = getLegacyCategoryForDocumentPermission(tipo);
  if (categoria && isPermissionBlockedByRole(role, categoria)) {
    return `No disponible para el rol ${role}`;
  }
  if (isDocumentBlockedForFirmante(role, null, tipo)) {
    return 'Solo lo expide un médico';
  }
  return null;
}

/** Por qué un permiso general no se le puede otorgar a este rol; null si se puede. */
export function motivoBloqueoGeneral(role: string, key: PermissionKey): string | null {
  return isPermissionBlockedByRole(role, key) ? `No disponible para el rol ${role}` : null;
}

export function tiposEditables(role: string, tipos: readonly string[]): string[] {
  return tipos.filter((tipo) => !motivoBloqueoDocumento(role, tipo));
}

export function estadoGrupo(
  role: string,
  documentos: DocumentPermissions,
  tipos: readonly string[],
): EstadoGrupo {
  const editables = tiposEditables(role, tipos);
  if (editables.length === 0) return 'bloqueado';
  const otorgados = editables.filter((tipo) => documentos[tipo]).length;
  if (otorgados === 0) return 'ninguno';
  return otorgados === editables.length ? 'todos' : 'algunos';
}

/** Marca o desmarca de una vez los documentos del grupo que el rol puede tener. */
export function aplicarAGrupo(
  role: string,
  documentos: DocumentPermissions,
  tipos: readonly string[],
  valor: boolean,
): DocumentPermissions {
  const resultado = { ...documentos };
  for (const tipo of tiposEditables(role, tipos)) resultado[tipo] = valor;
  return resultado;
}

/** Estado con el que se edita a un usuario: lo que hoy puede hacer, guardado o heredado. */
export function permisosEditablesDe(
  role: string,
  permisos: UserPermissions & { documentos?: DocumentPermissions },
): PermisosEditables {
  const generales = Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, permisos[key] === true]),
  ) as UserPermissions;
  return { generales, documentos: resolveDocumentPermissions(role, permisos) };
}

export function predeterminadosDelRol(role: string): PermisosEditables {
  const base = ROLE_DEFAULT_PERMISSIONS[role] ?? permisosVacios();
  return permisosEditablesDe(role, base);
}

function permisosVacios(): UserPermissions {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, false])) as UserPermissions;
}

/** Cuántos de los permisos visibles y editables difieren de lo predeterminado del rol. */
export function contarAjustesRespectoAlRol(
  role: string,
  actuales: PermisosEditables,
  opciones: OpcionesProveedor,
): number {
  const base = predeterminadosDelRol(role);
  const generales = permisosGeneralesVisibles(opciones).filter(
    (key) => !motivoBloqueoGeneral(role, key),
  );
  const documentos = gruposVisibles(opciones).flatMap((grupo) =>
    tiposEditables(role, grupo.tipos),
  );
  return (
    generales.filter((key) => actuales.generales[key] !== base.generales[key]).length +
    documentos.filter((tipo) => actuales.documentos[tipo] !== base.documentos[tipo]).length
  );
}

export function documentosCambiaron(
  antes: DocumentPermissions,
  despues: DocumentPermissions,
): boolean {
  return DOCUMENT_PERMISSION_KEYS.some((key) => antes[key] !== despues[key]);
}

export function generalesCambiaron(antes: UserPermissions, despues: UserPermissions): boolean {
  return PERMISSION_KEYS.some((key) => antes[key] !== despues[key]);
}

/**
 * Lo que se envía al guardar. Los permisos por documento solo se envían si el usuario ya
 * los tenía o si cambió alguno: así, quien solo cambia un permiso general conserva las
 * categorías de siempre.
 */
export function cargaParaGuardar(
  antes: PermisosEditables,
  despues: PermisosEditables,
  yaTeniaPorDocumento: boolean,
): Partial<UserPermissions> & { documentos?: DocumentPermissions } {
  const carga: Partial<UserPermissions> & { documentos?: DocumentPermissions } = {
    ...despues.generales,
  };
  if (yaTeniaPorDocumento || documentosCambiaron(antes.documentos, despues.documentos)) {
    carga.documentos = { ...despues.documentos };
  }
  return carga;
}

/** Resumen corto para la lista de usuarios: cuántos grupos de documentos elabora. */
export function resumenDocumentos(
  role: string,
  documentos: DocumentPermissions,
  opciones: OpcionesProveedor,
): { conAlguno: number; total: number } {
  const grupos = gruposVisibles(opciones);
  const conAlguno = grupos.filter((grupo) => {
    const estado = estadoGrupo(role, documentos, grupo.tipos);
    return estado === 'todos' || estado === 'algunos';
  }).length;
  return { conAlguno, total: grupos.length };
}

/** Empresas y centros asignados a un usuario que no ve todas las empresas. */
export interface Asignaciones {
  empresas: string[];
  centros: string[];
}

export function asignacionesDe(usuario: {
  empresasAsignadas?: unknown[];
  centrosTrabajoAsignados?: unknown[];
}): Asignaciones {
  return {
    empresas: (usuario.empresasAsignadas ?? []).map(String),
    centros: (usuario.centrosTrabajoAsignados ?? []).map(String),
  };
}

export function asignacionesCambiaron(antes: Asignaciones, despues: Asignaciones): boolean {
  const igual = (a: string[], b: string[]) =>
    a.length === b.length && [...a].sort().join() === [...b].sort().join();
  return !igual(antes.empresas, despues.empresas) || !igual(antes.centros, despues.centros);
}

/**
 * Agregar una empresa asigna también todos sus centros: el acceso se da por centro y una
 * empresa sin centros aparece en la lista del usuario pero no le deja entrar.
 */
export function agregarEmpresa(
  asignaciones: Asignaciones,
  empresaId: string,
  centrosDeLaEmpresa: readonly string[],
): Asignaciones {
  if (asignaciones.empresas.includes(empresaId)) return asignaciones;
  return {
    empresas: [...asignaciones.empresas, empresaId],
    centros: [...new Set([...asignaciones.centros, ...centrosDeLaEmpresa])],
  };
}

/** Quitar una empresa quita también sus centros. */
export function quitarEmpresa(
  asignaciones: Asignaciones,
  empresaId: string,
  centrosDeLaEmpresa: readonly string[],
): Asignaciones {
  return {
    empresas: asignaciones.empresas.filter((id) => id !== empresaId),
    centros: asignaciones.centros.filter((id) => !centrosDeLaEmpresa.includes(id)),
  };
}

export function alternarCentro(asignaciones: Asignaciones, centroId: string): Asignaciones {
  const centros = asignaciones.centros.includes(centroId)
    ? asignaciones.centros.filter((id) => id !== centroId)
    : [...asignaciones.centros, centroId];
  return { ...asignaciones, centros };
}

/** Marca o desmarca todos los centros de una empresa. */
export function marcarCentrosDeEmpresa(
  asignaciones: Asignaciones,
  centrosDeLaEmpresa: readonly string[],
  valor: boolean,
): Asignaciones {
  const sinEllos = asignaciones.centros.filter((id) => !centrosDeLaEmpresa.includes(id));
  return { ...asignaciones, centros: valor ? [...sinEllos, ...centrosDeLaEmpresa] : sinEllos };
}
