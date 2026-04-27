/**
 * Lógica compartida del cuestionario MDQ (trastornos del estado de ánimo).
 * Centraliza los campos P1 y la regla del paso 15 (pregunta 2) para no duplicar
 * condiciones entre FormStepper, validación y futuros visualizadores.
 */

/** Debe coincidir con `siNoOpciones` en trastornos-estado-animo.schema.ts */
export const MDQ_SI = 'Sí';

/** Ítems P1 del MDQ que corresponden a los pasos 2–14 del formulario (orden fijo). */
export const CAMPOS_MDQ_P1 = [
  'p1ExaltadoComportamientoNoHabitualOMetidoProblemas',
  'p1IrritableGritosPeleas',
  'p1MasSeguridadQueLoHabitual',
  'p1DormiaMenosSinNecesitarMasSueno',
  'p1HablabaMasOMasRapido',
  'p1PensamientosAgolpados',
  'p1DistraccionDificultadConcentracion',
  'p1MasEnergiaQueLoHabitual',
  'p1MasActivoOMasCosasQueLoHabitual',
  'p1MasSocialExtrovertido',
  'p1MasApetitoSexual',
  'p1CosasExageradasRiesgosas',
  'p1GastoDineroProblemas',
] as const;

export type CampoMdqP1 = (typeof CAMPOS_MDQ_P1)[number];

/**
 * Cuenta cuántas respuestas "Sí" hay en los ítems P1 (pasos 2–14).
 */
export function contarSiMdqP1(datos: Record<string, unknown> | null | undefined): number {
  if (!datos) return 0;
  let n = 0;
  for (const campo of CAMPOS_MDQ_P1) {
    if (datos[campo] === MDQ_SI) n++;
  }
  return n;
}

/**
 * El paso 15 (pregunta 2 del MDQ: mismo período de tiempo) solo aplica si hubo
 * al menos dos "Sí" en P1, según criterio clínico del instrumento.
 */
export function requierePaso15SituacionesMismoPeriodo(
  datos: Record<string, unknown> | null | undefined
): boolean {
  return contarSiMdqP1(datos) >= 2;
}

/** Debe coincidir con `nivelProblemaSituacionesOpciones` en trastornos-estado-animo.schema.ts */
export const OPCIONES_NIVEL_PROBLEMA_P3 = [
  'Ningún problema',
  'Problemas menores',
  'Problemas moderados',
  'Problemas serios',
] as const;

export function esOpcionNivelProblemaP3(valor: unknown): valor is (typeof OPCIONES_NIVEL_PROBLEMA_P3)[number] {
  return (
    typeof valor === 'string' &&
    (OPCIONES_NIVEL_PROBLEMA_P3 as readonly string[]).includes(valor)
  );
}

/** Número de paso del formulario para la pregunta 3 MDQ (15 si no hay paso P2, 16 si sí). */
export function indicePasoP3Mdq(datos: Record<string, unknown> | null | undefined): number {
  return requierePaso15SituacionesMismoPeriodo(datos) ? 16 : 15;
}

/** Paso del formulario para la pregunta 4 MDQ (familiar bipolar): siempre inmediatamente después de P3. */
export function indicePasoP4Mdq(datos: Record<string, unknown> | null | undefined): number {
  return indicePasoP3Mdq(datos) + 1;
}

/** Paso del formulario para la pregunta 5 MDQ (diagnóstico profesional): inmediatamente después de P4. */
export function indicePasoP5Mdq(datos: Record<string, unknown> | null | undefined): number {
  return indicePasoP4Mdq(datos) + 1;
}

/**
 * Criterio de triaje positivo MDQ (trastorno bipolar): ≥7 «Sí» en P1, «Sí» en P2 y
 * «Problemas moderados» o «Problemas serios» en P3.
 * Si la pregunta 2 no aplica (menos de 2 «Sí» en P1), no se cumple el criterio.
 */
export function cumpleCriterioTriajePositivoMdq(datos: Record<string, unknown> | null | undefined): boolean {
  if (!datos) return false;
  if (contarSiMdqP1(datos) < 7) return false;
  if (datos.p2SituacionesMismoPeriodo !== MDQ_SI) return false;
  const p3 = datos.p3NivelProblemaCausado;
  return p3 === 'Problemas moderados' || p3 === 'Problemas serios';
}
