/** Valores alineados con backend `informe-longitudinal-cardiometabolico.enums.ts` */

export const GRAFICAS_LONGITUDINAL_CARDIOMETABOLICA = [
  'Tensión arterial',
  'Peso / IMC',
  'Glucosa / HbA1c',
  'Lípidos',
] as const;

export const NIVEL_RIESGO_LONGITUDINAL = [
  'Muy Bajo',
  'Bajo',
  'Moderado',
  'Alto',
  'Crítico',
  'No valorable',
] as const;

export const CONSISTENCIA_SEGUIMIENTO_LONGITUDINAL = [
  'Adecuado',
  'Irregular',
  'Insuficiente',
  'No valorable',
] as const;

/** Trayectoria agregada del informe (periodo); alineado con `TrayectoriaLongitudinalInforme` en backend. */
export const TENDENCIA_LONGITUDINAL_INFORME = [
  'Favorable',
  'Estable',
  'Desfavorable',
  'Mixta',
  'Insuficiente información',
] as const;
