export const SUGERENCIAS_ADHERENCIA_TERAPEUTICA = [
  'Buena adherencia terapéutica referida',
  'Adherencia terapéutica irregular',
  'Mala adherencia terapéutica',
  'Olvido frecuente de medicamentos',
  'Suspensión voluntaria del tratamiento',
  'No cuenta con tratamiento actual',
  'Tratamiento indicado por médico externo',
  'Desconoce nombre o dosis de medicamentos',
  'Refiere apego parcial a indicaciones higiénico-dietéticas',
  'No realiza actividad física regular',
] as const;

export const ETIQUETAS_ASINTOMATICO_VARIANTES = ['Asintomático', 'Asintomática'] as const;

/** Chips frecuentes excepto Asintomático/a (orden en UI y en el string persistido). */
export const CHIPS_SINTOMAS_FRECUENTES_OTROS = [
  'Cefalea',
  'Mareo',
  'Palpitaciones',
  'Dolor torácico',
  'Disnea',
  'Fatiga',
  'Visión borrosa',
  'Poliuria',
  'Polidipsia',
  'Parestesias',
  'Edema en miembros inferiores',
] as const;
