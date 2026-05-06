/**
 * Interpretación orientativa de laboratorio (evento cardiometabólico).
 * Literales alineados con backend: expedientes/enums/clinical-categories.enum.ts
 *
 * No constituye diagnóstico; reglas simples V1 (adultos, sin stratificación).
 */

/** HbA1c: uso de límites comunes — prediabetes [5.7, 6.5), diabetes >= 6.5 (cierra hueco entre 6.4 y 6.5). */
export const NO_VALORABLE = 'No valorable' as const;

export type CategoriaGlucosaOrientativa =
  | 'Normal'
  | 'Alterada'
  | 'Elevada'
  | typeof NO_VALORABLE;

export type CategoriaHbA1cOrientativa =
  | 'Normal'
  | 'Prediabetes'
  | 'Compatible con diabetes'
  | typeof NO_VALORABLE;

export type CategoriaColesterolTotalOrientativa =
  | 'Deseable'
  | 'Límite alto'
  | 'Alto'
  | typeof NO_VALORABLE;

export type CategoriaLDLOrientativa =
  | 'Óptimo'
  | 'Cerca de óptimo'
  | 'Límite alto'
  | 'Alto'
  | 'Muy alto'
  | typeof NO_VALORABLE;

export type CategoriaHDLOrientativa =
  | 'Bajo'
  | 'Adecuado'
  | 'Alto'
  | typeof NO_VALORABLE;

export type CategoriaTrigliceridosOrientativa =
  | 'Normal'
  | 'Límite alto'
  | 'Alto'
  | 'Muy alto'
  | typeof NO_VALORABLE;

function noValorOrNum(v: number | undefined): number | undefined | typeof NO_VALORABLE {
  if (v === undefined || Number.isNaN(v)) return undefined;
  if (!Number.isFinite(v)) return NO_VALORABLE;
  return v;
}

export function clasificarGlucosa(
  valor: number | undefined,
): CategoriaGlucosaOrientativa | undefined {
  const x = noValorOrNum(valor);
  if (x === undefined) return undefined;
  if (x === NO_VALORABLE) return NO_VALORABLE;
  if (x < 70) return 'Alterada';
  if (x <= 99) return 'Normal';
  if (x <= 125) return 'Alterada';
  return 'Elevada';
}

export function clasificarHbA1c(
  valor: number | undefined,
): CategoriaHbA1cOrientativa | undefined {
  const x = noValorOrNum(valor);
  if (x === undefined) return undefined;
  if (x === NO_VALORABLE) return NO_VALORABLE;
  if (x < 5.7) return 'Normal';
  if (x < 6.5) return 'Prediabetes';
  return 'Compatible con diabetes';
}

export function clasificarColesterolTotal(
  valor: number | undefined,
): CategoriaColesterolTotalOrientativa | undefined {
  const x = noValorOrNum(valor);
  if (x === undefined) return undefined;
  if (x === NO_VALORABLE) return NO_VALORABLE;
  if (x < 200) return 'Deseable';
  if (x <= 239) return 'Límite alto';
  return 'Alto';
}

export function clasificarLDL(valor: number | undefined): CategoriaLDLOrientativa | undefined {
  const x = noValorOrNum(valor);
  if (x === undefined) return undefined;
  if (x === NO_VALORABLE) return NO_VALORABLE;
  if (x < 100) return 'Óptimo';
  if (x <= 129) return 'Cerca de óptimo';
  if (x <= 159) return 'Límite alto';
  if (x <= 189) return 'Alto';
  return 'Muy alto';
}

export function clasificarHDL(valor: number | undefined): CategoriaHDLOrientativa | undefined {
  const x = noValorOrNum(valor);
  if (x === undefined) return undefined;
  if (x === NO_VALORABLE) return NO_VALORABLE;
  if (x < 40) return 'Bajo';
  if (x <= 59) return 'Adecuado';
  return 'Alto';
}

export function clasificarTrigliceridos(
  valor: number | undefined,
): CategoriaTrigliceridosOrientativa | undefined {
  const x = noValorOrNum(valor);
  if (x === undefined) return undefined;
  if (x === NO_VALORABLE) return NO_VALORABLE;
  if (x < 150) return 'Normal';
  if (x <= 199) return 'Límite alto';
  if (x <= 499) return 'Alto';
  return 'Muy alto';
}
