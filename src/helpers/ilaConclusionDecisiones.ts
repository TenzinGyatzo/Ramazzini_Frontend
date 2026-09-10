export const VERSION_CONSTRUCTOR_CONCLUSIONES_ILA = 'v1';
export const MAX_CHARS_CONCLUSIONES_ILA = 4000;
export const ORIENTACION_CONCISION_CONCLUSIONES_ILA = 800;

export const EVOLUCION_SEGUIMIENTO_ILA = {
  ESTABLE: 'Estable',
  PROGRESIVA: 'Progresiva',
  FLUCTUANTE: 'Fluctuante',
  DISMINUCION_MEJORIA: 'Disminución o mejoría aparente',
  NO_CONCLUSIVO: 'No concluyente',
} as const;

export const DISTRIBUCION_HALLAZGOS_ILA = {
  PREDOMINIO_OD: 'Predominio en oído derecho',
  PREDOMINIO_OI: 'Predominio en oído izquierdo',
  BILATERAL_SIMILAR: 'Bilateral similar',
  BILATERAL_DIFERENTE: 'Bilateral diferente',
  NO_CONCLUSIVO: 'No concluyente',
} as const;

export const RELACION_LABORAL_ILA = {
  PROBABLE: 'Probable',
  POSIBLE: 'Posible',
  NO_SUSTENTADA: 'No sustentada',
  NO_DETERMINABLE: 'No determinable',
} as const;

export const CONFIRMACION_HALLAZGOS_ILA = {
  NO_REQUERIDA: 'No requerida',
  REQUIERE_REPETICION: 'Requiere repetición',
  REQUIERE_COMPLEMENTARIOS: 'Requiere estudios complementarios',
} as const;

export type EvolucionSeguimientoIla =
  (typeof EVOLUCION_SEGUIMIENTO_ILA)[keyof typeof EVOLUCION_SEGUIMIENTO_ILA];
export type DistribucionHallazgosIla =
  (typeof DISTRIBUCION_HALLAZGOS_ILA)[keyof typeof DISTRIBUCION_HALLAZGOS_ILA];
export type RelacionLaboralIla =
  (typeof RELACION_LABORAL_ILA)[keyof typeof RELACION_LABORAL_ILA];
export type ConfirmacionHallazgosIla =
  (typeof CONFIRMACION_HALLAZGOS_ILA)[keyof typeof CONFIRMACION_HALLAZGOS_ILA];

export type DecisionesConclusionIla = {
  evolucion?: EvolucionSeguimientoIla | '';
  distribucionHallazgos?: DistribucionHallazgosIla | '';
  relacionLaboral?: RelacionLaboralIla | '';
  confirmacion?: ConfirmacionHallazgosIla | '';
};

export const OPCIONES_EVOLUCION_SEGUIMIENTO_ILA = Object.values(EVOLUCION_SEGUIMIENTO_ILA);
export const OPCIONES_DISTRIBUCION_HALLAZGOS_ILA = Object.values(DISTRIBUCION_HALLAZGOS_ILA);
export const OPCIONES_RELACION_LABORAL_ILA = Object.values(RELACION_LABORAL_ILA);
export const OPCIONES_CONFIRMACION_HALLAZGOS_ILA = Object.values(CONFIRMACION_HALLAZGOS_ILA);

export function hayAlgunaDecisionConclusionIla(
  d: DecisionesConclusionIla | null | undefined,
): boolean {
  if (!d) return false;
  return Boolean(
    String(d.evolucion || '').trim() ||
      String(d.distribucionHallazgos || '').trim() ||
      String(d.relacionLaboral || '').trim() ||
      String(d.confirmacion || '').trim(),
  );
}

export function claveDecisionesConclusionIla(
  d: DecisionesConclusionIla | null | undefined,
): string {
  return [
    String(d?.evolucion || ''),
    String(d?.distribucionHallazgos || ''),
    String(d?.relacionLaboral || ''),
    String(d?.confirmacion || ''),
  ].join('|');
}

export function advertenciasDecisionesConclusionIla(
  d: DecisionesConclusionIla | null | undefined,
): string[] {
  const out: string[] = [];
  if (!d) return out;
  if (
    d.evolucion === EVOLUCION_SEGUIMIENTO_ILA.NO_CONCLUSIVO &&
    d.relacionLaboral === RELACION_LABORAL_ILA.PROBABLE
  ) {
    out.push('La evolución se marcó no concluyente y la relación laboral como probable.');
  }
  if (
    d.distribucionHallazgos === DISTRIBUCION_HALLAZGOS_ILA.NO_CONCLUSIVO &&
    d.relacionLaboral === RELACION_LABORAL_ILA.PROBABLE
  ) {
    out.push('La distribución se marcó no concluyente y la relación laboral como probable.');
  }
  return out;
}
