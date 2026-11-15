/**
 * Certificado médico: dos formas de redactarlo (punto 33). La modalidad se guarda con el
 * documento; sin ella (certificados anteriores) es la de resultados clínicos.
 * Debe coincidir con backend/src/modules/informes/documents/certificado.informe.ts.
 */

export type ModalidadCertificado = 'resultadosClinicos' | 'interrogatorio';

export const MODALIDAD_CERTIFICADO_PREDETERMINADA: ModalidadCertificado = 'resultadosClinicos';

export const MODALIDADES_CERTIFICADO: { value: ModalidadCertificado; etiqueta: string; ayuda: string }[] = [
  {
    value: 'resultadosClinicos',
    etiqueta: 'Con resultados clínicos',
    ayuda: 'Incluye los resultados de la exploración física y del examen de la vista más cercanos.',
  },
  {
    value: 'interrogatorio',
    etiqueta: 'Sin resultados clínicos',
    ayuda: 'No incluye resultados: se basa en las respuestas del interrogatorio médico.',
  },
];

/** Texto que guarda el paso 2 cuando no hay impedimentos (certificadoSteps/Step2.vue). */
export const TEXTO_SIN_IMPEDIMENTO_CERTIFICADO =
  'no presenta impedimento físico para desarrollar el puesto que actualmente solicita';

export function normalizarModalidadCertificado(valor: unknown): ModalidadCertificado {
  return valor === 'interrogatorio' ? 'interrogatorio' : MODALIDAD_CERTIFICADO_PREDETERMINADA;
}

/** «… de 53 años de edad y de acuerdo con sus respuestas durante el interrogatorio médico, se encuentra clínicamente sana.» */
export function textoConclusionInterrogatorio(sexo: string | null | undefined): string {
  const sano = sexo === 'Femenino' ? 'sana' : 'sano';
  return `y de acuerdo con sus respuestas durante el interrogatorio médico, se encuentra clínicamente ${sano}.`;
}

/**
 * Segundo párrafo. Por interrogatorio, «sin impedimento» nombra el puesto del trabajador
 * («… para desarrollar el puesto de Operador»). Un impedimento escrito por el médico se
 * respeta tal cual en las dos modalidades.
 */
export function textoImpedimentosCertificado(
  modalidad: unknown,
  impedimentosFisicos: string | null | undefined,
  puesto: string | null | undefined,
): string {
  const texto = String(impedimentosFisicos ?? '');
  if (normalizarModalidadCertificado(modalidad) !== 'interrogatorio') return texto;
  if (texto !== TEXTO_SIN_IMPEDIMENTO_CERTIFICADO) return texto;
  return `no presenta impedimento físico para desarrollar el puesto de ${String(puesto ?? '').trim()}`;
}
