/**
 * Rangos canónicos de somatometría y signos vitales para Exploración Física
 * y Certificado Expedito.
 * Debe mantenerse alineado con backend/.../constants/somatometria-signos.ranges.ts
 * No reutilizar notaMedicaCexRanges.
 *
 * Altura se persiste en metros (1.00–2.20 ≡ 100–220 cm).
 */

export type SomatometriaSignosField =
  | 'peso'
  | 'altura'
  | 'circunferenciaCintura'
  | 'tensionArterialSistolica'
  | 'tensionArterialDiastolica'
  | 'frecuenciaCardiaca'
  | 'frecuenciaRespiratoria'
  | 'saturacionOxigeno'
  | 'temperaturaCorporal';

export const SOMATOMETRIA_SIGNOS_RANGES = {
  peso: { min: 30, max: 400, maxDecimalPlaces: 1 },
  altura: { min: 1.0, max: 2.2, maxDecimalPlaces: 2 },
  circunferenciaCintura: { min: 30, max: 300, maxDecimalPlaces: 0 },
  tensionArterialSistolica: { min: 50, max: 300, maxDecimalPlaces: 0 },
  tensionArterialDiastolica: { min: 20, max: 200, maxDecimalPlaces: 0 },
  frecuenciaCardiaca: { min: 40, max: 220, maxDecimalPlaces: 0 },
  frecuenciaRespiratoria: { min: 10, max: 99, maxDecimalPlaces: 0 },
  saturacionOxigeno: { min: 50, max: 100, maxDecimalPlaces: 0 },
  temperaturaCorporal: { min: 30, max: 44, maxDecimalPlaces: 1 },
} as const;

export const SOMATOMETRIA_SIGNOS_MESSAGES = {
  peso: {
    min: 'Debe ser mínimo 30 kg',
    max: 'Debe ser máximo 400 kg',
    format: 'Peso: máximo 1 decimal',
  },
  altura: {
    min: 'Debe ser mínimo 1.00 m',
    max: 'Debe ser máximo 2.20 m',
    format: 'Altura: máximo 2 decimales',
  },
  circunferenciaCintura: {
    min: 'Debe ser mínimo 30 cm',
    max: 'Debe ser máximo 300 cm',
    format: 'Circunferencia debe ser un entero',
  },
  tensionArterialSistolica: {
    min: 'Debe ser mínimo 50',
    max: 'Debe ser máximo 300',
    format: 'Sistólica debe ser un entero',
  },
  tensionArterialDiastolica: {
    min: 'Debe ser mínimo 20',
    max: 'Debe ser máximo 200',
    format: 'Diastólica debe ser un entero',
  },
  frecuenciaCardiaca: {
    min: 'Debe ser mínimo 40',
    max: 'Debe ser máximo 220',
    format: 'Frecuencia cardíaca debe ser un entero',
  },
  frecuenciaRespiratoria: {
    min: 'Debe ser mínimo 10',
    max: 'Debe ser máximo 99',
    format: 'Frecuencia respiratoria debe ser un entero',
  },
  saturacionOxigeno: {
    min: 'Debe ser mínimo 50',
    max: 'Debe ser máximo 100',
    format: 'Saturación debe ser un entero',
  },
  temperaturaCorporal: {
    min: 'Debe ser mínimo 30',
    max: 'Debe ser máximo 44',
    format: 'Temperatura: máximo 1 decimal',
  },
} as const;

function decimalPlaces(value: number): number {
  const raw = String(Math.abs(value));
  if (!raw.includes('.')) return 0;
  return raw.split('.')[1].length;
}

/** Vacío → no valida rango (la obligatoriedad la define validacionCampos). */
export function validateSomatometriaSignosField(
  field: SomatometriaSignosField,
  value: unknown,
): string | null {
  if (value === undefined || value === null || value === '') return null;

  const n = Number(value);
  if (!Number.isFinite(n)) {
    return SOMATOMETRIA_SIGNOS_MESSAGES[field].format;
  }

  const range = SOMATOMETRIA_SIGNOS_RANGES[field];
  const msgs = SOMATOMETRIA_SIGNOS_MESSAGES[field];

  if (decimalPlaces(n) > range.maxDecimalPlaces) return msgs.format;
  if (range.maxDecimalPlaces === 0 && !Number.isInteger(n)) return msgs.format;

  if (n < range.min) return msgs.min;
  if (n > range.max) return msgs.max;
  return null;
}

export function mensajeErrorSomatometriaSignosField(
  field: SomatometriaSignosField,
  value: unknown,
): string {
  return validateSomatometriaSignosField(field, value) ?? '';
}
