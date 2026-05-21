import { cumpleCriterioTriajePositivoMdq } from '@/helpers/trastornosEstadoAnimoSteps';
import {
  contarFrecuenciaPQB,
  sumarMalestarPQB,
  textoInterpretacionPQB,
} from '@/helpers/cuestionarioProdromalBreveSteps';

/** MSI-BPD: misma lista que DocumentoItem.vue / VisualizadorTrastornoLimitePersonalidad. */
const CAMPOS_MSI_BPD_TLP = [
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

export function textoResumenTrastornosEstadoAnimo(
  d: Record<string, unknown> | null | undefined,
): string {
  if (!d || typeof d !== 'object') return '';
  return cumpleCriterioTriajePositivoMdq(d)
    ? 'Positivo para riesgo de trastorno bipolar'
    : 'Negativo para riesgo de trastorno bipolar';
}

export function textoResumenCuestionarioProdromalBreve(
  d: Record<string, unknown> | null | undefined,
): string {
  if (!d || typeof d !== 'object') return '';
  return textoInterpretacionPQB(contarFrecuenciaPQB(d), sumarMalestarPQB(d));
}

export function puntajeTrastornoLimitePersonalidad(
  d: Record<string, unknown> | null | undefined,
): number {
  if (!d || typeof d !== 'object') return 0;
  return CAMPOS_MSI_BPD_TLP.reduce((acc, k) => acc + (d[k] === 'Sí' ? 1 : 0), 0);
}

export function textoResumenTrastornoLimitePersonalidad(
  d: Record<string, unknown> | null | undefined,
): string {
  if (!d || typeof d !== 'object') return '';
  const p = puntajeTrastornoLimitePersonalidad(d);
  if (p <= 4) return 'Síntomas improbables de TLP presentes.';
  if (p <= 6) return 'Posibles síntomas de TLP presentes.';
  return 'Probable presencia de síntomas de TLP.';
}
