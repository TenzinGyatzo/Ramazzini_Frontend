/**
 * Normaliza el código de país del proveedor (ISO 3166-1 alpha-2).
 */
export function normalizeProveedorPaisCode(
  pais: string | null | undefined,
): string {
  if (typeof pais !== 'string') {
    return '';
  }
  return pais.trim().toUpperCase();
}

/** true solo cuando el proveedor opera en México */
export function isMexicoProvider(pais: string | null | undefined): boolean {
  return normalizeProveedorPaisCode(pais) === 'MX';
}
