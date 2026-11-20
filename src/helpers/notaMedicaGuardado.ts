/**
 * Reglas de guardado de la nota médica (punto 38, modo captura).
 *
 * Antes vivían en la salida de cada paso (onUnmounted): solo se aplicaban si el paso se
 * había abierto y cerrado, y dependían de cómo se navegaba. Ahora se aplican aquí, una vez,
 * justo antes de validar y enviar, sea cual sea el modo de captura. Los pasos solo copian al
 * formulario lo que está en pantalla, en el momento.
 */
import { NOTA_MEDICA_CEX_SENTINEL, isBlankOrZero } from '@/helpers/notaMedicaCexRanges';
import { normalizeNotaMedicaDiagnosticosPv } from '@/helpers/notaMedicaDiagnosticosSis';

/** Textos libres que viajan como cadena vacía cuando no se escribieron. */
export const TEXTOS_NOTA_MEDICA = [
  'motivoConsulta',
  'antecedentes',
  'exploracionFisica',
  'observaciones',
] as const;

/** Listas que viajan vacías cuando no se capturó nada. */
export const LISTAS_NOTA_MEDICA = ['tratamiento', 'recomendaciones'] as const;

/** Signos vitales: sin capturar se registran como «Se desconoce». */
export const SIGNOS_VITALES_NOTA_MEDICA = [
  'tensionArterialSistolica',
  'tensionArterialDiastolica',
  'frecuenciaCardiaca',
  'frecuenciaRespiratoria',
  'temperatura',
  'saturacionOxigeno',
] as const;

export interface OpcionesGuardadoNotaMedica {
  /** Con cumplimiento normativo (pasos de identificación, somatometría, glucemia, embarazo). */
  showSires: boolean;
  /** Trabajadora: con régimen se captura el embarazo. */
  esMujer: boolean;
}

/**
 * Deja la nota lista para validar y enviar. Modifica el formulario recibido (lo que se ve en
 * la vista previa es lo que se guarda) y lo devuelve.
 */
export function prepararNotaMedicaParaGuardar(
  df: Record<string, any>,
  { showSires, esMujer }: OpcionesGuardadoNotaMedica,
): Record<string, any> {
  const d = df;

  for (const campo of TEXTOS_NOTA_MEDICA) {
    if (!d[campo]) d[campo] = '';
  }
  for (const campo of LISTAS_NOTA_MEDICA) {
    if (!Array.isArray(d[campo])) d[campo] = [];
  }

  // Signos vitales vacíos (o 0) → «Se desconoce»; si una presión se desconoce, las dos
  for (const campo of SIGNOS_VITALES_NOTA_MEDICA) {
    if (isBlankOrZero(d[campo])) d[campo] = NOTA_MEDICA_CEX_SENTINEL[campo];
  }
  const sinSistolica = d.tensionArterialSistolica === NOTA_MEDICA_CEX_SENTINEL.tensionArterialSistolica;
  const sinDiastolica =
    d.tensionArterialDiastolica === NOTA_MEDICA_CEX_SENTINEL.tensionArterialDiastolica;
  if (sinSistolica || sinDiastolica) {
    d.tensionArterialSistolica = NOTA_MEDICA_CEX_SENTINEL.tensionArterialSistolica;
    d.tensionArterialDiastolica = NOTA_MEDICA_CEX_SENTINEL.tensionArterialDiastolica;
  }

  // Glucemia (solo con régimen, donde existe su paso): sin capturar → «Se desconoce»
  if (showSires && isBlankOrZero(d.glucemia)) {
    d.glucemia = NOTA_MEDICA_CEX_SENTINEL.glucemia;
    d.tipoMedicion = -1;
    d.resultadoObtenidoaTravesde = -1;
  }

  // Embarazo: sin régimen o sin ser trabajadora, no aplica
  if (!showSires || !esMujer) {
    d.relacionTemporalEmbarazo = -1;
    d.trimestreGestacional = -1;
  }

  if (!showSires) delete d.relacionTemporal;

  if (d.primeraVezUnemeAplica !== true) delete d.primeraVezUneme;
  delete d.esPrimeraVezAnioPreview;
  delete d.primeraVezAnio;

  // Diagnósticos 2 y 3 sin registrar: se limpian
  normalizeNotaMedicaDiagnosticosPv(d, showSires);

  return df;
}
