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

/** '5BZO': 5 parámetros con Benzodiacepinas en lugar de Opiáceos (otra marca de prueba). */
export type TipoPruebaAntidoping = '2' | '3' | '5' | '5BZO' | '6' | '10' | '12';

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

/** Abreviatura de cada analito (como aparece en la prueba física). */
export const ANTIDOPING_PARAMETRO_ABREVIATURAS: Record<AntidopingParametro, string> = {
  marihuana: 'THC',
  cocaina: 'COC',
  anfetaminas: 'AMP',
  metanfetaminas: 'MET',
  opiaceos: 'OPI',
  benzodiacepinas: 'BZO',
  fenciclidina: 'PCP',
  metadona: 'MTD',
  barbituricos: 'BAR',
  antidepresivosTriciclicos: 'TCA',
  metilendioximetanfetamina: 'MDMA',
  ketamina: 'KET',
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
  '5BZO': ['marihuana', 'cocaina', 'anfetaminas', 'metanfetaminas', 'benzodiacepinas'],
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

/**
 * Etiquetas cortas (la lista no debe crecer): solo las dos de 5 dicen su diferencia, el quinto
 * analito. Los analitos completos se leen en «Se reportan» debajo de la lista.
 */
function etiquetaTipo(tipo: TipoPruebaAntidoping): string {
  const campos = CAMPOS_POR_TIPO[tipo];
  if (tipo === '5' || tipo === '5BZO') {
    return `${campos.length} parámetros (${ANTIDOPING_PARAMETRO_ABREVIATURAS[campos[4]]})`;
  }
  return `${campos.length} parámetros`;
}

/** En este orden en la lista; las dos de 5 quedan juntas (la de OPI sigue siendo la predeterminada). */
export const TIPOS_PRUEBA_OPCIONES: Array<{ value: TipoPruebaAntidoping; label: string }> = (
  ['2', '3', '5', '5BZO', '6', '10', '12'] as TipoPruebaAntidoping[]
).map((value) => ({ value, label: etiquetaTipo(value) }));

/** «Marihuana, Cocaína, …»: los analitos que se reportan con un tipo de prueba. */
export function nombresDelTipo(tipoPrueba?: string | null): string {
  return getCamposVisibles(tipoPrueba)
    .map((c) => ANTIDOPING_PARAMETRO_LABELS_FORM[c])
    .join(', ');
}

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
  // 5 con Benzodiacepinas y sin Opiáceos: el set de BZO (antes se tomaba por el de 6 y, al
  // editar, se agregaba un Opiáceos «Negativo» que nunca se probó)
  if (
    camposPresentes.length === 5 &&
    camposPresentes.includes('benzodiacepinas') &&
    !camposPresentes.includes('opiaceos')
  ) {
    return '5BZO';
  }
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
