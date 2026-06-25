import {
  clasificarFranjaTamizajeTLP,
  esPositivoTamizajeProdromalBreve,
  esPositivoTamizajeTrastornosEstadoAnimo,
  puntajeTamizajeTrastornoLimitePersonalidad,
} from '@/helpers/tamizajePsicologicoCriterios';
import {
  contarFrecuenciaPQB,
  sumarMalestarPQB,
  textoInterpretacionPQB,
} from '@/helpers/cuestionarioProdromalBreveSteps';

export function textoResumenTrastornosEstadoAnimo(
  d: Record<string, unknown> | null | undefined,
): string {
  if (!d || typeof d !== 'object') return '';
  return esPositivoTamizajeTrastornosEstadoAnimo(d)
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
  return puntajeTamizajeTrastornoLimitePersonalidad(d);
}

export function textoResumenTrastornoLimitePersonalidad(
  d: Record<string, unknown> | null | undefined,
): string {
  if (!d || typeof d !== 'object') return '';
  const franja = clasificarFranjaTamizajeTLP(puntajeTrastornoLimitePersonalidad(d));
  if (franja === 0) return 'Síntomas improbables de TLP presentes.';
  if (franja === 1) return 'Posibles síntomas de TLP presentes.';
  return 'Probable presencia de síntomas de TLP.';
}
