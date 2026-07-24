/**
 * Matriz canónica tipo de prueba → parámetros antidoping.
 * Usada por Step2, VisualizadorAntidoping y tests.
 */

export type AntidopingParametro =
  | 'marihuana'
  | 'cocaina'
  | 'anfetaminas'
  | 'metanfetaminas'
  | 'opiaceos'
  | 'benzodiacepinas'
  | 'fenciclidina'
  | 'metadona'
  | 'barbituricos'
  | 'antidepresivosTriciclicos'
  | 'metilendioximetanfetamina'
  | 'ketamina';

export type TipoPruebaAntidoping = '2' | '3' | '5' | '6' | '10' | '12';

export const ANTIDOPING_PARAMETROS_ORDEN: AntidopingParametro[] = [
  'marihuana',
  'cocaina',
  'anfetaminas',
  'metanfetaminas',
  'opiaceos',
  'benzodiacepinas',
  'fenciclidina',
  'metadona',
  'barbituricos',
  'antidepresivosTriciclicos',
  'metilendioximetanfetamina',
  'ketamina',
];

export const ANTIDOPING_PARAMETROS_DEFAULTS: Record<AntidopingParametro, string> =
  Object.fromEntries(
    ANTIDOPING_PARAMETROS_ORDEN.map((p) => [p, 'Negativo']),
  ) as Record<AntidopingParametro, string>;

/** Labels cortos para checkboxes del formulario. */
export const ANTIDOPING_PARAMETRO_LABELS_FORM: Record<AntidopingParametro, string> = {
  marihuana: 'Marihuana',
  cocaina: 'Cocaína',
  anfetaminas: 'Anfetaminas',
  metanfetaminas: 'Metanfetaminas',
  opiaceos: 'Opiáceos',
  benzodiacepinas: 'Benzodiacepinas',
  fenciclidina: 'Fenciclidina',
  metadona: 'Metadona',
  barbituricos: 'Barbitúricos',
  antidepresivosTriciclicos: 'Antidepresivos T.',
  metilendioximetanfetamina: 'Metilendioximetanfetamina',
  ketamina: 'Ketamina',
};

/** Labels con abreviatura para el visualizador. */
export const ANTIDOPING_PARAMETRO_LABELS_VISTA: Record<AntidopingParametro, string> = {
  marihuana: 'Marihuana (THC)',
  cocaina: 'Cocaína (COC)',
  anfetaminas: 'Anfetaminas (AMP)',
  metanfetaminas: 'Metanfetaminas (MET)',
  opiaceos: 'Opiáceos (OPI)',
  benzodiacepinas: 'Benzodiacepinas (BZO)',
  fenciclidina: 'Fenciclidina (PCP)',
  metadona: 'Metadona (MTD)',
  barbituricos: 'Barbitúricos (BAR)',
  antidepresivosTriciclicos: 'Antidepresivos T. (TCA)',
  metilendioximetanfetamina: 'Metilendioximetanfetamina',
  ketamina: 'Ketamina (KET)',
};

export const CAMPOS_POR_TIPO: Record<TipoPruebaAntidoping, AntidopingParametro[]> = {
  '2': ['marihuana', 'cocaina'],
  '3': ['marihuana', 'cocaina', 'anfetaminas'],
  '5': ['marihuana', 'cocaina', 'anfetaminas', 'metanfetaminas', 'opiaceos'],
  '6': [
    'marihuana',
    'cocaina',
    'anfetaminas',
    'metanfetaminas',
    'opiaceos',
    'benzodiacepinas',
  ],
  '10': [
    'marihuana',
    'cocaina',
    'anfetaminas',
    'metanfetaminas',
    'opiaceos',
    'benzodiacepinas',
    'fenciclidina',
    'metadona',
    'barbituricos',
    'antidepresivosTriciclicos',
  ],
  '12': [...ANTIDOPING_PARAMETROS_ORDEN],
};

export const TIPOS_PRUEBA_OPCIONES: Array<{ value: TipoPruebaAntidoping; label: string }> = [
  { value: '2', label: '2 parámetros' },
  { value: '3', label: '3 parámetros' },
  { value: '5', label: '5 parámetros' },
  { value: '6', label: '6 parámetros' },
  { value: '10', label: '10 parámetros' },
  { value: '12', label: '12 parámetros' },
];

export function normalizeTipoPrueba(
  tipoPrueba?: string | null,
): TipoPruebaAntidoping {
  if (tipoPrueba && tipoPrueba in CAMPOS_POR_TIPO) {
    return tipoPrueba as TipoPruebaAntidoping;
  }
  return '5';
}

export function getCamposVisibles(
  tipoPrueba?: string | null,
): AntidopingParametro[] {
  return CAMPOS_POR_TIPO[normalizeTipoPrueba(tipoPrueba)];
}

export function isCampoVisible(
  campo: string,
  tipoPrueba?: string | null,
): boolean {
  return getCamposVisibles(tipoPrueba).includes(campo as AntidopingParametro);
}

export function formatoNombreParametro(campo: AntidopingParametro | string): string {
  if (campo in ANTIDOPING_PARAMETRO_LABELS_FORM) {
    return ANTIDOPING_PARAMETRO_LABELS_FORM[campo as AntidopingParametro];
  }
  return String(campo)
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
}

/**
 * Infiere el tipo de prueba a partir de los campos presentes en un documento legacy.
 */
export function inferTipoPruebaFromDoc(
  doc: Record<string, unknown> | null | undefined,
): TipoPruebaAntidoping {
  if (!doc) return '5';

  const camposPresentes = ANTIDOPING_PARAMETROS_ORDEN.filter(
    (campo) =>
      campo in doc && doc[campo] !== undefined && doc[campo] !== null,
  );

  if (camposPresentes.length >= 12) return '12';
  if (camposPresentes.length >= 10) return '10';
  if (camposPresentes.includes('benzodiacepinas')) return '6';
  if (
    camposPresentes.length === 5 &&
    camposPresentes.includes('metanfetaminas') &&
    camposPresentes.includes('opiaceos')
  ) {
    return '5';
  }
  if (
    camposPresentes.length === 3 &&
    camposPresentes.includes('anfetaminas') &&
    !camposPresentes.includes('metanfetaminas')
  ) {
    return '3';
  }
  if (camposPresentes.length === 2 && !camposPresentes.includes('anfetaminas')) {
    return '2';
  }
  return '5';
}
