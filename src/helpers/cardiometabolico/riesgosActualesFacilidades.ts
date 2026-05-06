/** Frases típicas de síntesis de riesgo; se guardan concatenadas como en Step 6 (`; ` y bloque texto libre). */
export const CHIPS_RIESGOS_ACTUALES = [
  'Riesgo cardiometabólico aumentado',
  'Riesgo cardiovascular elevado',
  'Cifras tensionales elevadas durante la valoración',
  'Descontrol glucémico probable',
  'Perfil lipídico alterado',
  'Riesgo asociado a obesidad',
  'Riesgo asociado a circunferencia de cintura elevada',
  'Riesgo asociado a sedentarismo',
  'Riesgo asociado a adherencia terapéutica deficiente',
  'Requiere seguimiento médico estrecho',
  'Requiere control con médico tratante',
  'Sin riesgos cardiometabólicos relevantes documentados en esta visita',
] as const;

export const CHIP_RIESGO_CARDIOMETABOLICO_AUMENTADO = CHIPS_RIESGOS_ACTUALES[0];
export const CHIP_RIESGO_CARDIOVASCULAR_ELEVADO = CHIPS_RIESGOS_ACTUALES[1];
export const CHIP_SIN_RIESGOS_CARDIOMETABOLICOS = CHIPS_RIESGOS_ACTUALES[11];

/** Referencia orientativa para el contador junto al textarea (informe PDF). */
export const RIESGOS_ACTUALES_CHARS_RECOMENDADOS_PARA_INFORME = 500;
