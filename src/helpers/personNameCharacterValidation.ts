import { collapsePersonNameWhitespace } from '@/helpers/normalizeWorkerPersonName';

export type PersonNameValidationRegime = 'SIRES_NOM024' | 'SIN_REGIMEN';

export const PERSON_NAME_SEPARATOR_SPECIALS = new Set([
  '-',
  '.',
  '/',
  "'",
]);

export const PERSON_NAME_DIERESIS_MARK = '\u00A8';

const COMBINING_DIERESIS = '\u0308';

export const PERSON_NAME_DIERESIS_VOWELS = new Set(['Ä', 'Ë', 'Ï', 'Ö', 'Ü']);

const ACCENTED_VOWELS = new Set([
  'Á',
  'É',
  'Í',
  'Ó',
  'Ú',
  'á',
  'é',
  'í',
  'ó',
  'ú',
]);

const DIERESIS_VOWELS_SIN_REGIMEN = new Set([
  ...PERSON_NAME_DIERESIS_VOWELS,
  'ä',
  'ë',
  'ï',
  'ö',
  'ü',
]);

export const PERSON_NAME_CHARACTERS_VALIDATION_MESSAGE =
  'Solo se permiten letras A-Z incluyendo Ñ en mayúsculas, espacios y los caracteres especiales - . / \' y diéresis solo en vocales (Ä, Ë, Ï, Ö, Ü). No se permiten acentos ni caracteres especiales consecutivos.';

export const PERSON_NAME_CHARACTERS_SIN_REGIMEN_VALIDATION_MESSAGE =
  'Solo se permiten letras (incluyendo acentos y Ñ), espacios y los caracteres especiales - . / \' y diéresis solo en vocales (ä, ë, ï, ö, ü y mayúsculas). No se permiten caracteres especiales consecutivos.';

export function resolvePersonNameValidationRegime(
  regime?: string | null,
): PersonNameValidationRegime {
  return regime === 'SIN_REGIMEN' ? 'SIN_REGIMEN' : 'SIRES_NOM024';
}

export function isPersonNameSpecialChar(char: string): boolean {
  return PERSON_NAME_SEPARATOR_SPECIALS.has(char);
}

function isPersonNameVowelBase(
  char: string,
  regime: PersonNameValidationRegime,
): boolean {
  if (!char) {
    return false;
  }

  if (regime === 'SIN_REGIMEN') {
    return /^[AEIOUaeiou]$/.test(char) || ACCENTED_VOWELS.has(char);
  }

  return /^[AEIOU]$/.test(char);
}

/**
 * Diéresis suelta (¨) o marca combinatoria sobre no-vocal → inválido.
 * Vocales precompuestas (Ä, Ü, …) son válidas vía NFD (vocal + U+0308).
 */
export function validatePersonNameDieresisPlacement(
  value: string,
  regime: PersonNameValidationRegime = 'SIRES_NOM024',
): boolean {
  const decomposed = value.normalize('NFD');

  for (let i = 0; i < decomposed.length; i++) {
    const char = decomposed[i];

    if (char === PERSON_NAME_DIERESIS_MARK) {
      return false;
    }

    if (char === COMBINING_DIERESIS) {
      const base = decomposed[i - 1];
      if (!isPersonNameVowelBase(base, regime)) {
        return false;
      }
    }
  }

  return true;
}

export function isPersonNameLetter(
  char: string,
  regime: PersonNameValidationRegime = 'SIRES_NOM024',
): boolean {
  if (regime === 'SIN_REGIMEN') {
    return (
      /^[A-Za-zÑñ]$/.test(char) ||
      ACCENTED_VOWELS.has(char) ||
      DIERESIS_VOWELS_SIN_REGIMEN.has(char)
    );
  }

  return /^[A-ZÑ]$/.test(char) || PERSON_NAME_DIERESIS_VOWELS.has(char);
}

export function isAllowedPersonNameChar(
  char: string,
  regime: PersonNameValidationRegime = 'SIRES_NOM024',
): boolean {
  if (char === ' ') {
    return true;
  }

  if (char === COMBINING_DIERESIS) {
    return false;
  }

  if (isPersonNameSpecialChar(char)) {
    return true;
  }

  return isPersonNameLetter(char, regime);
}

export function validatePersonNameCharacters(
  value: string | undefined | null,
  fieldLabel = 'El campo',
  regime?: string | null,
): { isValid: boolean; errors: string[] } {
  if (!value || String(value).trim() === '') {
    return { isValid: true, errors: [] };
  }

  const validationRegime = resolvePersonNameValidationRegime(regime);
  const collapsed = collapsePersonNameWhitespace(String(value));
  const normalized =
    validationRegime === 'SIRES_NOM024' ? collapsed.toUpperCase() : collapsed;
  const errors: string[] = [];
  const invalidChars = new Set<string>();
  let previousWasSpecial = false;
  const hint =
    validationRegime === 'SIN_REGIMEN'
      ? PERSON_NAME_CHARACTERS_SIN_REGIMEN_VALIDATION_MESSAGE
      : PERSON_NAME_CHARACTERS_VALIDATION_MESSAGE;

  for (const char of normalized) {
    if (!isAllowedPersonNameChar(char, validationRegime)) {
      invalidChars.add(char);
      previousWasSpecial = false;
      continue;
    }

    if (isPersonNameSpecialChar(char)) {
      if (previousWasSpecial) {
        return {
          isValid: false,
          errors: [
            `${fieldLabel} no permite más de un carácter especial consecutivo.`,
          ],
        };
      }
      previousWasSpecial = true;
      continue;
    }

    if (char !== ' ') {
      previousWasSpecial = false;
    }
  }

  if (invalidChars.size > 0) {
    errors.push(
      `${fieldLabel} contiene caracteres no permitidos: ${[...invalidChars].join(', ')}. ${hint}`,
    );
  }

  if (
    errors.length === 0 &&
    !validatePersonNameDieresisPlacement(normalized, validationRegime)
  ) {
    errors.push(`${fieldLabel}: ${hint}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePersonNameCharactersRule(
  value: string | undefined | null,
  regime?: string | null,
): boolean {
  return validatePersonNameCharacters(value, 'El campo', regime).isValid;
}
