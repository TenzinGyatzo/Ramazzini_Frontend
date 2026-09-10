import {
  CONFIRMACION_HALLAZGOS_ILA,
  DISTRIBUCION_HALLAZGOS_ILA,
  EVOLUCION_SEGUIMIENTO_ILA,
  RELACION_LABORAL_ILA,
  hayAlgunaDecisionConclusionIla,
  type DecisionesConclusionIla,
} from '@/helpers/ilaConclusionDecisiones';

const ADJETIVO_EVOLUCION: Record<string, string> = {
  [EVOLUCION_SEGUIMIENTO_ILA.ESTABLE]: 'estable',
  [EVOLUCION_SEGUIMIENTO_ILA.PROGRESIVA]: 'progresiva',
  [EVOLUCION_SEGUIMIENTO_ILA.FLUCTUANTE]: 'fluctuante',
  [EVOLUCION_SEGUIMIENTO_ILA.DISMINUCION_MEJORIA]: 'de disminución o mejoría aparente',
  [EVOLUCION_SEGUIMIENTO_ILA.NO_CONCLUSIVO]: 'no concluyente',
};

const ADJETIVO_RELACION: Record<string, string> = {
  [RELACION_LABORAL_ILA.PROBABLE]: 'probable',
  [RELACION_LABORAL_ILA.POSIBLE]: 'posible',
  [RELACION_LABORAL_ILA.NO_SUSTENTADA]: 'no sustentada',
  [RELACION_LABORAL_ILA.NO_DETERMINABLE]: 'no determinable',
};

function fraseEvolucion(evolucion: string): string {
  const x = ADJETIVO_EVOLUCION[evolucion];
  if (!x) return '';
  return `La evolución del seguimiento se considera ${x}.`;
}

function fraseDistribucion(distribucion: string): string {
  if (distribucion === DISTRIBUCION_HALLAZGOS_ILA.PREDOMINIO_OD) {
    return 'Los hallazgos predominan en el oído derecho.';
  }
  if (distribucion === DISTRIBUCION_HALLAZGOS_ILA.PREDOMINIO_OI) {
    return 'Los hallazgos predominan en el oído izquierdo.';
  }
  if (distribucion === DISTRIBUCION_HALLAZGOS_ILA.BILATERAL_SIMILAR) {
    return 'Los hallazgos presentan una distribución bilateral similar.';
  }
  if (distribucion === DISTRIBUCION_HALLAZGOS_ILA.BILATERAL_DIFERENTE) {
    return 'Los hallazgos presentan una distribución bilateral diferente.';
  }
  if (distribucion === DISTRIBUCION_HALLAZGOS_ILA.NO_CONCLUSIVO) {
    return 'La distribución de los hallazgos se considera no concluyente.';
  }
  return '';
}

function fraseEvolucionYDistribucion(evolucion: string, distribucion: string): string {
  const x = ADJETIVO_EVOLUCION[evolucion];
  if (!x) return fraseDistribucion(distribucion);
  if (distribucion === DISTRIBUCION_HALLAZGOS_ILA.PREDOMINIO_OD) {
    return `La evolución del seguimiento se considera ${x}, con predominio de los hallazgos en el oído derecho.`;
  }
  if (distribucion === DISTRIBUCION_HALLAZGOS_ILA.PREDOMINIO_OI) {
    return `La evolución del seguimiento se considera ${x}, con predominio de los hallazgos en el oído izquierdo.`;
  }
  if (distribucion === DISTRIBUCION_HALLAZGOS_ILA.BILATERAL_SIMILAR) {
    return `La evolución del seguimiento se considera ${x} y los hallazgos presentan una distribución bilateral similar.`;
  }
  if (distribucion === DISTRIBUCION_HALLAZGOS_ILA.BILATERAL_DIFERENTE) {
    return `La evolución del seguimiento se considera ${x} y los hallazgos presentan una distribución bilateral diferente.`;
  }
  if (distribucion === DISTRIBUCION_HALLAZGOS_ILA.NO_CONCLUSIVO) {
    return `La evolución del seguimiento se considera ${x} y la distribución de los hallazgos se considera no concluyente.`;
  }
  return fraseEvolucion(evolucion);
}

function fraseRelacion(relacion: string): string {
  const x = ADJETIVO_RELACION[relacion];
  if (!x) return '';
  return `La relación con el trabajo se considera ${x}.`;
}

function fraseConfirmacion(confirmacion: string): string {
  if (confirmacion === CONFIRMACION_HALLAZGOS_ILA.NO_REQUERIDA) {
    return 'Los hallazgos no requieren confirmación adicional.';
  }
  if (confirmacion === CONFIRMACION_HALLAZGOS_ILA.REQUIERE_REPETICION) {
    return 'Los hallazgos requieren repetición para su confirmación.';
  }
  if (confirmacion === CONFIRMACION_HALLAZGOS_ILA.REQUIERE_COMPLEMENTARIOS) {
    return 'Se requieren estudios complementarios para confirmar los hallazgos.';
  }
  return '';
}

export function construirBorradorConclusionIla(
  d: DecisionesConclusionIla | null | undefined,
): string {
  if (!hayAlgunaDecisionConclusionIla(d)) return '';
  const evolucion = String(d?.evolucion || '').trim();
  const distribucion = String(d?.distribucionHallazgos || '').trim();
  const relacion = String(d?.relacionLaboral || '').trim();
  const confirmacion = String(d?.confirmacion || '').trim();

  const partes: string[] = [];
  if (evolucion && distribucion) {
    partes.push(fraseEvolucionYDistribucion(evolucion, distribucion));
  } else if (evolucion) {
    partes.push(fraseEvolucion(evolucion));
  } else if (distribucion) {
    partes.push(fraseDistribucion(distribucion));
  }
  if (relacion) partes.push(fraseRelacion(relacion));
  if (confirmacion) partes.push(fraseConfirmacion(confirmacion));
  return partes.filter(Boolean).join(' ');
}

export function aplicarBorradorConclusionSiNoEditada(
  conclusionActual?: string | null,
  borradorAnterior?: string | null,
  borradorNuevo?: string | null,
): string {
  const actual = conclusionActual ?? '';
  const actualTrim = String(actual).trim();
  const anterior = String(borradorAnterior || '').trim();
  const nuevo = String(borradorNuevo || '').trim();

  if (!actualTrim) {
    if (anterior) return '';
    return nuevo;
  }
  if (anterior && actualTrim === anterior) {
    return nuevo;
  }
  return actual;
}

export function mostrarRestaurarBorradorConclusionIla(
  conclusionActual?: string | null,
  borradorVigente?: string | null,
): boolean {
  const vigente = String(borradorVigente || '').trim();
  if (!vigente) return false;
  return String(conclusionActual || '').trim() !== vigente;
}
