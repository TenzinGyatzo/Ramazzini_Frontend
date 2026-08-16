export type WorkerPersonNameRegime = 'SIRES_NOM024' | 'SIN_REGIMEN';

export function collapsePersonNameWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

const ENYE_LOWER_PLACEHOLDER = '\uE000';
const ENYE_UPPER_PLACEHOLDER = '\uE001';

const DIERESIS_PLACEHOLDERS: Record<string, string> = {
  ä: '\uE002',
  ë: '\uE003',
  ï: '\uE004',
  ö: '\uE005',
  ü: '\uE006',
  Ä: '\uE007',
  Ë: '\uE008',
  Ï: '\uE009',
  Ö: '\uE00A',
  Ü: '\uE00B',
};

const DIERESIS_RESTORE: Record<string, string> = Object.fromEntries(
  Object.entries(DIERESIS_PLACEHOLDERS).map(([char, placeholder]) => [
    placeholder,
    char,
  ]),
);

/** Elimina acentos preservando ñ/Ñ y diéresis en vocales (SIRES_NOM024). */
export function stripPersonNameAccents(value: string): string {
  let protectedValue = value
    .replace(/ñ/g, ENYE_LOWER_PLACEHOLDER)
    .replace(/Ñ/g, ENYE_UPPER_PLACEHOLDER);

  for (const [char, placeholder] of Object.entries(DIERESIS_PLACEHOLDERS)) {
    protectedValue = protectedValue.split(char).join(placeholder);
  }

  let stripped = protectedValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const [placeholder, char] of Object.entries(DIERESIS_RESTORE)) {
    stripped = stripped.split(placeholder).join(char);
  }

  return stripped
    .split(ENYE_LOWER_PLACEHOLDER).join('ñ')
    .split(ENYE_UPPER_PLACEHOLDER).join('Ñ')
    .normalize('NFC');
}

/**
 * SIN_REGIMEN: solo capitaliza la primera letra de cada palabra.
 * El resto de cada palabra se conserva tal cual (CORONEL, CORonel, cOroNel, etc.).
 */
export function capitalizeFirstLetterOfEachWord(value: string): string {
  return collapsePersonNameWhitespace(value).replace(/\S+/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1),
  );
}

export function normalizeWorkerPersonName(
  value: string | null | undefined,
  regime: WorkerPersonNameRegime | null | undefined,
): string {
  if (!value) return '';

  const trimmed = collapsePersonNameWhitespace(String(value));
  if (!trimmed) return '';

  if (regime === 'SIN_REGIMEN') {
    return capitalizeFirstLetterOfEachWord(trimmed);
  }

  return stripPersonNameAccents(trimmed).toUpperCase();
}

export function resolveWorkerPersonNameRegime(
  isSires: boolean,
  isSinRegimen: boolean,
): WorkerPersonNameRegime {
  if (isSinRegimen) return 'SIN_REGIMEN';
  if (isSires) return 'SIRES_NOM024';
  return 'SIRES_NOM024';
}
