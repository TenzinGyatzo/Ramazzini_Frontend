/** Facilidades de captura — tratamiento actual ESC (fase 1). */

export const AVISO_LEGAL_TRATAMIENTO_ESC =
  'Registro informativo del tratamiento referido; no sustituye prescripción médica.';

export const SUGERENCIAS_MEDICAMENTOS_FRECUENTES = [
  'Metformina',
  'Losartán',
  'Enalapril',
  'Amlodipino',
  'Atorvastatina',
  'Simvastatina',
  'Insulina NPH',
  'Insulina glargina',
  'Empagliflozina',
  'Glibenclamida',
  'Hidroclorotiazida',
  'Aspirina',
] as const;

export const CHIPS_FRECUENCIA_TRATAMIENTO = [
  'Cada 24 h',
  'Cada 12 h',
  'Mañana',
  'Noche',
  'Según glucemia',
  'Según indicación médica',
] as const;

export const CHIPS_MOTIVO_USO = [
  'DM2',
  'Hipertensión arterial',
  'Dislipidemia',
  'Protección renal',
  'Control glucémico',
  'Control de presión arterial',
  'Obesidad',
] as const;

export type TratamientoActualFilaEsc = {
  medicamento?: string;
  dosis?: string;
  frecuencia?: string;
  motivoUso?: string;
};

export function filaTratamientoTieneContenido(row: TratamientoActualFilaEsc | null | undefined): boolean {
  if (!row || typeof row !== 'object') return false;
  return (
    String(row.medicamento ?? '').trim() !== '' ||
    String(row.dosis ?? '').trim() !== '' ||
    String(row.frecuencia ?? '').trim() !== '' ||
    String(row.motivoUso ?? '').trim() !== ''
  );
}

export function normalizarFilaTratamiento(row: TratamientoActualFilaEsc): TratamientoActualFilaEsc {
  const out: TratamientoActualFilaEsc = {};
  for (const k of ['medicamento', 'dosis', 'frecuencia', 'motivoUso'] as const) {
    const v = String(row[k] ?? '').trim();
    if (v) out[k] = v;
  }
  return out;
}

export function sanitizarTratamientoActualArray(
  arr: TratamientoActualFilaEsc[] | undefined | null,
): TratamientoActualFilaEsc[] | undefined {
  if (!Array.isArray(arr)) return undefined;
  const out = arr.map(normalizarFilaTratamiento).filter(filaTratamientoTieneContenido);
  return out.length ? out : undefined;
}
