/**
 * Contrato canónico GIIS-B015 / CEX para cantidades de Nota Médica.
 * Debe mantenerse alineado con backend/.../constants/nota-medica-cex.ranges.ts
 */

export type NotaMedicaCexField =
  | 'peso'
  | 'talla'
  | 'circunferenciaCintura'
  | 'tensionArterialSistolica'
  | 'tensionArterialDiastolica'
  | 'frecuenciaCardiaca'
  | 'frecuenciaRespiratoria'
  | 'temperatura'
  | 'saturacionOxigeno'
  | 'glucemia';

export const NOTA_MEDICA_CEX_SENTINEL = {
  peso: 999,
  talla: 999,
  circunferenciaCintura: 0,
  tensionArterialSistolica: 0,
  tensionArterialDiastolica: 0,
  frecuenciaCardiaca: 0,
  frecuenciaRespiratoria: 0,
  temperatura: 0,
  saturacionOxigeno: 0,
  glucemia: 0,
} as const;

export const NOTA_MEDICA_CEX_RANGES = {
  peso: {
    min: 1,
    max: 400,
    maxIntegerDigits: 3,
    maxDecimalPlaces: 3,
    maxChars: 7,
  },
  talla: { min: 30, max: 220, maxIntegerDigits: 3, maxDecimalPlaces: 0 },
  circunferenciaCintura: {
    min: 20,
    max: 300,
    maxIntegerDigits: 3,
    maxDecimalPlaces: 0,
  },
  tensionArterialSistolica: {
    min: 50,
    max: 300,
    maxIntegerDigits: 3,
    maxDecimalPlaces: 0,
  },
  tensionArterialDiastolica: {
    min: 20,
    max: 200,
    maxIntegerDigits: 3,
    maxDecimalPlaces: 0,
  },
  frecuenciaCardiaca: {
    min: 40,
    max: 220,
    maxIntegerDigits: 3,
    maxDecimalPlaces: 0,
  },
  frecuenciaRespiratoria: {
    min: 10,
    max: 99,
    maxIntegerDigits: 2,
    maxDecimalPlaces: 0,
  },
  temperatura: {
    min: 30,
    max: 44,
    maxIntegerDigits: 2,
    maxDecimalPlaces: 1,
    maxChars: 4,
  },
  saturacionOxigeno: {
    min: 1,
    max: 100,
    maxIntegerDigits: 3,
    maxDecimalPlaces: 0,
  },
  glucemia: { min: 20, max: 999, maxIntegerDigits: 3, maxDecimalPlaces: 0 },
} as const;

export const NOTA_MEDICA_CEX_MESSAGES = {
  peso: {
    min: 'Peso mínimo 1 kg',
    max: 'Peso máximo 400 kg',
    format: 'Peso formato ###.### (máx. 3 enteros y 3 decimales)',
  },
  talla: {
    min: 'Talla mínima 30 cm',
    max: 'Talla máxima 220 cm',
    format: 'Talla debe ser un entero de máximo 3 dígitos',
  },
  circunferenciaCintura: {
    min: 'Circunferencia cintura mínima 20 cm',
    max: 'Circunferencia cintura máxima 300 cm',
    format: 'Circunferencia debe ser un entero de máximo 3 dígitos',
  },
  tensionArterialSistolica: {
    min: 'Sistólica mínimo 50 mmHg',
    max: 'Sistólica máximo 300 mmHg',
    format: 'Sistólica debe ser un entero de máximo 3 dígitos',
  },
  tensionArterialDiastolica: {
    min: 'Diastólica mínimo 20 mmHg',
    max: 'Diastólica máximo 200 mmHg',
    format: 'Diastólica debe ser un entero de máximo 3 dígitos',
  },
  frecuenciaCardiaca: {
    min: 'Mínimo 40 lpm',
    max: 'Máximo 220 lpm',
    format: 'Frecuencia cardíaca debe ser un entero de máximo 3 dígitos',
  },
  frecuenciaRespiratoria: {
    min: 'Mínimo 10 rpm',
    max: 'Máximo 99 rpm',
    format: 'Frecuencia respiratoria debe ser un entero de máximo 2 dígitos',
  },
  temperatura: {
    min: 'Mínimo 30 °C',
    max: 'Máximo 44 °C',
    format: 'Temperatura formato ##.# (máx. 2 enteros y 1 decimal)',
  },
  saturacionOxigeno: {
    min: 'Mínimo 1 %',
    max: 'Máximo 100 %',
    format: 'Saturación debe ser un entero de máximo 3 dígitos',
  },
  glucemia: {
    min: 'Glucemia mínima 20 mg/dl',
    max: 'Glucemia máxima 999 mg/dl',
    format: 'Glucemia debe ser un entero de máximo 3 dígitos',
  },
  taRelacion: 'La presión sistólica debe ser mayor o igual a la diastólica',
  taPareja:
    'Si sistólica o diastólica es 0 (se desconoce), ambas deben ser 0',
  tipoMedicion: 'Seleccione si la medición fue en ayunas',
  resultadoObtenidoaTravesde:
    'Seleccione cómo se obtuvo el resultado de glucemia',
} as const;

export function isCexUnknown(
  field: NotaMedicaCexField,
  value: unknown,
): boolean {
  if (value === undefined || value === null || value === '') return true;
  const n = Number(value);
  if (Number.isNaN(n)) return false;
  return n === NOTA_MEDICA_CEX_SENTINEL[field];
}

/** Vacío o 0 → al desmontar el step se persiste como “Se desconoce”. */
export function isBlankOrZero(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  const n = Number(value);
  return !Number.isNaN(n) && n === 0;
}

/**
 * Sentinel CEX ya persistido (p. ej. 0 o 999).
 * Distinto de “nunca capturado” (undefined/null/'') para no precargar el checkbox.
 */
export function isExplicitCexUnknown(
  field: NotaMedicaCexField,
  value: unknown,
): boolean {
  if (value === undefined || value === null || value === '') return false;
  const n = Number(value);
  if (Number.isNaN(n)) return false;
  return n === NOTA_MEDICA_CEX_SENTINEL[field];
}

/** Parseo de input number que permite vacío real (sin convertir '' → 0). */
export function parseOptionalNumber(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function shouldValidateCexValue(
  field: NotaMedicaCexField,
  value: unknown,
): boolean {
  if (value === undefined || value === null || value === '') return false;
  return !isCexUnknown(field, value);
}

function digitParts(value: number): {
  integerDigits: number;
  decimalPlaces: number;
  charLength: number;
} {
  const abs = Math.abs(value);
  const intDigits = String(Math.floor(abs)).length;
  const raw = String(abs);
  const decPart = raw.includes('.') ? raw.split('.')[1] : '';
  return {
    integerDigits: intDigits,
    decimalPlaces: decPart.length,
    charLength: raw.length,
  };
}

export function validateNotaMedicaCexField(
  field: NotaMedicaCexField,
  value: unknown,
): string | null {
  if (!shouldValidateCexValue(field, value)) return null;

  const n = Number(value);
  if (Number.isNaN(n)) {
    return NOTA_MEDICA_CEX_MESSAGES[field].format;
  }

  const range = NOTA_MEDICA_CEX_RANGES[field];
  const msgs = NOTA_MEDICA_CEX_MESSAGES[field];
  const parts = digitParts(n);

  if (parts.integerDigits > range.maxIntegerDigits) return msgs.format;
  if (parts.decimalPlaces > range.maxDecimalPlaces) return msgs.format;
  if ('maxChars' in range && parts.charLength > (range as { maxChars: number }).maxChars) {
    return msgs.format;
  }
  if (range.maxDecimalPlaces === 0 && !Number.isInteger(n)) return msgs.format;

  if (n < range.min) return msgs.min;
  if (n > range.max) return msgs.max;
  return null;
}

export type NotaMedicaCexPayload = {
  tensionArterialSistolica?: number | null;
  tensionArterialDiastolica?: number | null;
  frecuenciaCardiaca?: number | null;
  frecuenciaRespiratoria?: number | null;
  temperatura?: number | null;
  saturacionOxigeno?: number | null;
  peso?: number | null;
  talla?: number | null;
  circunferenciaCintura?: number | null;
  glucemia?: number | null;
  tipoMedicion?: number | null;
  resultadoObtenidoaTravesde?: number | null;
};

export function validateNotaMedicaCexQuantities(
  data: NotaMedicaCexPayload,
  options?: { includeSomatometriaGlucemia?: boolean },
): string | null {
  const includeSoma = options?.includeSomatometriaGlucemia !== false;

  const s =
    data.tensionArterialSistolica == null
      ? null
      : Number(data.tensionArterialSistolica);
  const d =
    data.tensionArterialDiastolica == null
      ? null
      : Number(data.tensionArterialDiastolica);

  if (s != null && d != null && !Number.isNaN(s) && !Number.isNaN(d)) {
    const sUnknown = s === 0;
    const dUnknown = d === 0;
    if (sUnknown !== dUnknown) {
      return NOTA_MEDICA_CEX_MESSAGES.taPareja;
    }
    if (!sUnknown && !dUnknown && s < d) {
      return NOTA_MEDICA_CEX_MESSAGES.taRelacion;
    }
  }

  const fields: NotaMedicaCexField[] = [
    'tensionArterialSistolica',
    'tensionArterialDiastolica',
    'frecuenciaCardiaca',
    'frecuenciaRespiratoria',
    'temperatura',
    'saturacionOxigeno',
  ];
  if (includeSoma) {
    fields.push('peso', 'talla', 'circunferenciaCintura', 'glucemia');
  }

  for (const field of fields) {
    const err = validateNotaMedicaCexField(field, data[field]);
    if (err) return err;
  }

  if (includeSoma) {
    const g = data.glucemia;
    if (g != null && Number(g) !== 0 && !Number.isNaN(Number(g))) {
      if (data.tipoMedicion !== 0 && data.tipoMedicion !== 1) {
        return NOTA_MEDICA_CEX_MESSAGES.tipoMedicion;
      }
      if (
        data.resultadoObtenidoaTravesde !== 1 &&
        data.resultadoObtenidoaTravesde !== 2
      ) {
        return NOTA_MEDICA_CEX_MESSAGES.resultadoObtenidoaTravesde;
      }
    }
  }

  return null;
}

/** Mensaje de error inline para un campo (Steps). */
export function mensajeErrorCexField(
  field: NotaMedicaCexField,
  value: unknown,
  seDesconoce = false,
): string {
  if (seDesconoce) return '';
  return validateNotaMedicaCexField(field, value) ?? '';
}
