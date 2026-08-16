export const TRABAJADOR_SEXO_CURP_VALUES = [1, 2, 3] as const;

export type TrabajadorSexoCurp = (typeof TRABAJADOR_SEXO_CURP_VALUES)[number];

export const TRABAJADOR_SEXO_CURP_LABELS: Record<TrabajadorSexoCurp, string> = {
  1: 'Hombre',
  2: 'Mujer',
  3: 'No binario',
};

export const TRABAJADOR_SEXO_CURP_OPTIONS = TRABAJADOR_SEXO_CURP_VALUES.map(
  (value) => ({
    value,
    label: TRABAJADOR_SEXO_CURP_LABELS[value],
  }),
);

export type CurpSexoCode = 'H' | 'M' | 'X';

export function isTrabajadorSexoCurp(value: unknown): value is TrabajadorSexoCurp {
  return value === 1 || value === 2 || value === 3;
}

export function normalizeSexoCurpToCurpCode(
  sexoCURP: TrabajadorSexoCurp,
): CurpSexoCode {
  if (sexoCURP === 1) return 'H';
  if (sexoCURP === 2) return 'M';
  return 'X';
}

export function parseSexoCurpValue(value: unknown): TrabajadorSexoCurp | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && isTrabajadorSexoCurp(value)) return value;
  const num = Number(value);
  return isTrabajadorSexoCurp(num) ? num : null;
}

export interface FirmanteSexoPieInput {
  sexo?: string | null;
  sexoCURP?: number | null;
}

export function hasFirmanteSexoForPie(
  input?: FirmanteSexoPieInput | null,
): boolean {
  if (!input) return false;
  return (
    isTrabajadorSexoCurp(parseSexoCurpValue(input.sexoCURP)) ||
    Boolean(input.sexo?.trim())
  );
}

export function resolveEnfermeraPiePaginaText(
  input?: FirmanteSexoPieInput | null,
): string | null {
  if (!hasFirmanteSexoForPie(input)) return null;
  const sexoCURP = parseSexoCurpValue(input?.sexoCURP);
  if (isTrabajadorSexoCurp(sexoCURP)) {
    if (sexoCURP === 2) return 'Enfermera responsable de evaluación';
    if (sexoCURP === 3) return 'Enfermera/o responsable de evaluación';
    return 'Enfermero responsable de evaluación';
  }
  return input!.sexo === 'Femenino'
    ? 'Enfermera responsable de evaluación'
    : 'Enfermero responsable de evaluación';
}
