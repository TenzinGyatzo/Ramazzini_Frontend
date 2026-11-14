/**
 * Búsqueda sin acentos ni mayúsculas, igual que en el servidor (normalizarParaBuscar de
 * catalogs): «leon» encuentra «LEÓN DE LOS ALDAMA».
 */
export function normalizarParaBuscar(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** El código o la descripción contienen la búsqueda, sin distinguir acentos ni mayúsculas. */
export function coincideBusqueda(
  opcion: { code?: unknown; description?: unknown },
  consulta: string,
): boolean {
  const q = normalizarParaBuscar(consulta);
  if (!q) return true;
  return normalizarParaBuscar(opcion.code).includes(q) || normalizarParaBuscar(opcion.description).includes(q);
}
