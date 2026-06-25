/**
 * Criterios canónicos de los tres tamizajes psicológicos.
 * Fuente única para visualizadores, dashboard, aptitud e informes.
 */
import {
  contarFrecuenciaPQB,
  esPositivoRiesgoPsicoticoPQB,
  sumarMalestarPQB,
} from '@/helpers/cuestionarioProdromalBreveSteps';
import { cumpleCriterioTriajePositivoMdq } from '@/helpers/trastornosEstadoAnimoSteps';

export { cumpleCriterioTriajePositivoMdq };

/** MDQ (trastornos del estado de ánimo): ≥7 «Sí» en P1, «Sí» en P2 y P3 moderado/serio. */
export function esPositivoTamizajeTrastornosEstadoAnimo(
  d: Record<string, unknown> | null | undefined,
): boolean {
  return cumpleCriterioTriajePositivoMdq(d);
}

/** PQ-B (prodromal breve): Frecuencia > 6 y Malestar > 13. */
export function esPositivoTamizajeProdromalBreve(
  d: Record<string, unknown> | null | undefined,
): boolean {
  if (!d || typeof d !== 'object') return false;
  return esPositivoRiesgoPsicoticoPQB(contarFrecuenciaPQB(d), sumarMalestarPQB(d));
}

/** MSI-BPD (TLP): mismos ítems que el visualizador e informe PDF. */
export const CAMPOS_MSI_BPD_TLP = [
  'relacionesCercanasDiscusionesRupturas',
  'autolesionIntentoSuicidio',
  'impulsividadOtrosDosProblemas',
  'extremadamenteMalHumor',
  'enojadoFrecuenteActuaEnojadoSarcastico',
  'desconfianzaOtrasPersonas',
  'sensacionIrrealidadEntornoIrreal',
  'vacioCronico',
  'faltaIdentidadQuienEs',
  'esfuerzosEvitarAbandono',
] as const;

export function puntajeTamizajeTrastornoLimitePersonalidad(
  d: Record<string, unknown> | null | undefined,
): number {
  if (!d || typeof d !== 'object') return 0;
  return CAMPOS_MSI_BPD_TLP.reduce((acc, k) => acc + (d[k] === 'Sí' ? 1 : 0), 0);
}

export type FranjaTamizajeTLP = 0 | 1 | 2;

/** Franjas MSI-BPD: ≤4 improbable, 5–6 posible, ≥7 probable. */
export function clasificarFranjaTamizajeTLP(puntaje: number): FranjaTamizajeTLP {
  if (puntaje <= 4) return 0;
  if (puntaje <= 6) return 1;
  return 2;
}

export const ETIQUETAS_FRANJAS_TAMIZAJE_TLP = [
  'Síntomas improbables',
  'Posibles síntomas',
  'Síntomas probables',
] as const;
