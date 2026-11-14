/**
 * Valor de partida de las flechas en un campo de medición vacío. Un campo numérico vacío
 * arranca en su mínimo (peso 30, saturación 50); con esto la primera flecha pone un valor
 * típico y desde ahí se sube o baja. No es un valor por defecto: mientras nadie toque el
 * campo sigue vacío y no se guarda nada (docs/mediciones-sin-valores-por-defecto-propuesta.md).
 */

type Sexo = string | null | undefined;
type PorSexo = { hombre: number; mujer: number };

/** Valores aprobados por el usuario (2026-11-14). Peso, altura y cintura, según el sexo. */
export const VALORES_DE_PARTIDA = {
  peso: { hombre: 80, mujer: 68 },
  /** Metros (exploración física, certificado expedito, seguimiento cardiometabólico). */
  altura: { hombre: 1.7, mujer: 1.6 },
  /** Centímetros (talla de la nota médica). */
  tallaCm: { hombre: 170, mujer: 160 },
  circunferenciaCintura: { hombre: 90, mujer: 82 },
  tensionArterialSistolica: 120,
  tensionArterialDiastolica: 80,
  frecuenciaCardiaca: 75,
  frecuenciaRespiratoria: 16,
  saturacionOxigeno: 98,
  temperatura: 36.5,
  glucosa: 100,
} satisfies Record<string, number | PorSexo>;

export type CampoConValorDePartida = keyof typeof VALORES_DE_PARTIDA;

export function valorDePartida(campo: CampoConValorDePartida, sexo?: Sexo): number {
  const valor: number | PorSexo = VALORES_DE_PARTIDA[campo];
  if (typeof valor === 'number') return valor;
  return sexo === 'Femenino' ? valor.mujer : valor.hombre;
}
