export interface GeoCatalogEntry {
  code: string;
  description?: string;
  municipioCode?: string;
  [key: string]: unknown;
}

/** NE (Renapo) va antes que códigos numéricos de entidad. */
export function getEstadoSortKey(code: string): number {
  const normalized = String(code ?? '')
    .trim()
    .toUpperCase();
  if (normalized === 'NE') return -1;
  const num = parseInt(normalized, 10);
  return Number.isNaN(num) ? Number.MAX_SAFE_INTEGER : num;
}

export function sortEstadosByCode<T extends GeoCatalogEntry>(entries: T[]): T[] {
  return [...entries].sort(
    (a, b) => getEstadoSortKey(a.code) - getEstadoSortKey(b.code),
  );
}

export function getMunicipioSortKey(entry: GeoCatalogEntry): number {
  const raw =
    entry.municipioCode ??
    String(entry.code ?? '')
      .split('-')
      .pop() ??
    '';
  const num = parseInt(String(raw).trim(), 10);
  return Number.isNaN(num) ? Number.MAX_SAFE_INTEGER : num;
}

export function sortMunicipiosByCode<T extends GeoCatalogEntry>(
  entries: T[],
): T[] {
  return [...entries].sort(
    (a, b) => getMunicipioSortKey(a) - getMunicipioSortKey(b),
  );
}

export function getMunicipioDisplayCode(entry: GeoCatalogEntry): string {
  if (entry.municipioCode) return String(entry.municipioCode);
  return entry.code.includes('-') ? entry.code.split('-')[1] : entry.code;
}
