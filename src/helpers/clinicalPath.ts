export function sanitizePathSegment(name: string): string {
  return name.replace(/[/\\]/g, '-').trim();
}

export function buildClinicalDirectoryPath(
  empresa: string,
  centro: string,
  trabajadorNombre: string,
  trabajadorId: string,
): string {
  const e = sanitizePathSegment(empresa);
  const c = sanitizePathSegment(centro);
  const t = sanitizePathSegment(trabajadorNombre);
  return `expedientes-medicos/${e}/${c}/${t}_${trabajadorId}`;
}
