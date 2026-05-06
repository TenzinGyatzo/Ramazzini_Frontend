/** Valores alineados con backend enum `EstadoSeguimientoProgramadoCardiometabolico`. */
export const ESTADO_SEGUIMIENTO_PROGRAMADO_OPTS = [
  { value: 'Programada', label: 'Programada' },
  { value: 'Realizada', label: 'Realizada' },
  { value: 'No asistió', label: 'No asistió' },
  { value: 'Cancelada', label: 'Cancelada' },
] as const;

export const MOTIVO_SEGUIMIENTO_PROGRAMADO_OPTS = [
  { value: 'Control periódico', label: 'Control periódico' },
  { value: 'Seguimiento por descontrol', label: 'Seguimiento por descontrol' },
  { value: 'Examen médico inicial', label: 'Examen médico inicial' },
  { value: 'Examen médico periódico', label: 'Examen médico periódico' },
  { value: 'Otro', label: 'Otro' },
] as const;

export type EstadoSeguimientoProgramadoValue =
  (typeof ESTADO_SEGUIMIENTO_PROGRAMADO_OPTS)[number]['value'];
export type MotivoSeguimientoProgramadoValue =
  (typeof MOTIVO_SEGUIMIENTO_PROGRAMADO_OPTS)[number]['value'];
