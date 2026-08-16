import type { CurpIssue, CurpRelatedField } from './curp-validation-catalog';

/** Posiciones RENAPO (1-based) → campo demográfico que las determina. */
const CURP_POSITION_TO_FIELD_BASE: Record<number, CurpRelatedField> = {
  1: 'primerApellido',
  2: 'primerApellido',
  3: 'segundoApellido',
  4: 'nombre',
  5: 'fechaNacimiento',
  6: 'fechaNacimiento',
  7: 'fechaNacimiento',
  8: 'fechaNacimiento',
  9: 'fechaNacimiento',
  10: 'fechaNacimiento',
  11: 'sexo',
  12: 'entidadNacimiento',
  13: 'entidadNacimiento',
  14: 'primerApellido',
  15: 'segundoApellido',
  16: 'nombre',
  17: 'fechaNacimiento',
};

export interface CurpFieldMessageOptions {
  /** true en trabajadores SIRES: pos. 11 → sexoCURP en lugar de sexo biológico */
  useSexoCurpForValidation?: boolean;
}

export function relatedFieldForPosition(
  position: number,
  options?: CurpFieldMessageOptions,
): CurpRelatedField | null {
  if (position === 11 && options?.useSexoCurpForValidation) {
    return 'sexoCURP';
  }
  return CURP_POSITION_TO_FIELD_BASE[position] ?? null;
}

export function buildRelatedFieldMessages(
  issues: CurpIssue[],
  options?: CurpFieldMessageOptions,
): Partial<Record<CurpRelatedField, string[]>> {
  const buckets = new Map<
    CurpRelatedField,
    Array<{ position: number; message: string }>
  >();

  for (const issue of issues) {
    if (issue.severity !== 'error') {
      continue;
    }

    for (const position of issue.positions) {
      const field = relatedFieldForPosition(position, options);
      if (!field) {
        continue;
      }

      if (!buckets.has(field)) {
        buckets.set(field, []);
      }

      const items = buckets.get(field)!;
      if (!items.some((item) => item.message === issue.message)) {
        items.push({ position, message: issue.message });
      }
    }
  }

  const result: Partial<Record<CurpRelatedField, string[]>> = {};
  for (const [field, items] of buckets) {
    result[field] = items
      .sort((a, b) => a.position - b.position)
      .map((item) => item.message);
  }

  return result;
}

/** Primer mensaje por campo (compatibilidad). */
export function buildRelatedFieldErrors(
  issues: CurpIssue[],
  options?: CurpFieldMessageOptions,
): Partial<Record<CurpRelatedField, string>> {
  const messages = buildRelatedFieldMessages(issues, options);
  const result: Partial<Record<CurpRelatedField, string>> = {};

  for (const [field, list] of Object.entries(messages) as Array<
    [CurpRelatedField, string[]]
  >) {
    if (list[0]) {
      result[field] = list[0];
    }
  }

  return result;
}
