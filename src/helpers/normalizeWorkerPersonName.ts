export type WorkerPersonNameRegime = 'SIRES_NOM024' | 'SIN_REGIMEN';

/**
 * SIN_REGIMEN: solo capitaliza la primera letra de cada palabra.
 * El resto de cada palabra se conserva tal cual (CORONEL, CORonel, cOroNel, etc.).
 */
export function capitalizeFirstLetterOfEachWord(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

export function normalizeWorkerPersonName(
  value: string | null | undefined,
  regime: WorkerPersonNameRegime | null | undefined,
): string {
  if (!value) return '';

  const trimmed = String(value).trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  if (regime === 'SIN_REGIMEN') {
    return capitalizeFirstLetterOfEachWord(trimmed);
  }

  return trimmed.toUpperCase();
}

export function resolveWorkerPersonNameRegime(
  isSires: boolean,
  isSinRegimen: boolean,
): WorkerPersonNameRegime {
  if (isSinRegimen) return 'SIN_REGIMEN';
  if (isSires) return 'SIRES_NOM024';
  return 'SIRES_NOM024';
}
