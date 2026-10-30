/**
 * Tablero de salud: filtros de población (a qué trabajadores se refieren las
 * estadísticas). El servidor los aplica antes de leer los documentos
 * (backend/src/modules/trabajadores/tablero-poblacion.util.ts).
 */

/**
 * Dentro de un filtro basta con cumplir una de las opciones; entre filtros hay que
 * cumplirlos todos. El sexo es de una sola opción: elegir ambos sería «Todos».
 */
export interface FiltrosDePoblacion {
  puesto: string[];
  sexo: string;
  /** Claves de RANGOS_DE_EDAD. */
  edad: string[];
  /** Claves de RANGOS_DE_ANTIGUEDAD. */
  antiguedad: string[];
  /** Agentes de riesgo: expuesto al menos a uno. */
  agente: string[];
}

export const filtrosVacios = (): FiltrosDePoblacion => ({
  puesto: [],
  sexo: '',
  edad: [],
  antiguedad: [],
  agente: [],
});

interface Rango {
  clave: string;
  texto: string;
  min?: number;
  max?: number;
}

/**
 * Años cumplidos, ambos extremos incluidos. Los cortes coinciden con los de la
 * gráfica de grupos etarios (16–20, 21–25… en dashboardDataProcessor.ts): cada
 * opción abarca dos o tres de sus barras completas.
 */
export const RANGOS_DE_EDAD: Rango[] = [
  { clave: 'hasta30', texto: 'Hasta 30 años', max: 30 },
  { clave: 'de31a40', texto: 'De 31 a 40 años', min: 31, max: 40 },
  { clave: 'de41a50', texto: 'De 41 a 50 años', min: 41, max: 50 },
  { clave: 'de51a60', texto: 'De 51 a 60 años', min: 51, max: 60 },
  { clave: 'desde61', texto: '61 años o más', min: 61 },
];

export const RANGOS_DE_ANTIGUEDAD: Rango[] = [
  { clave: 'menos1', texto: 'Menos de 1 año', max: 0 },
  { clave: 'de1a4', texto: 'De 1 a 4 años', min: 1, max: 4 },
  { clave: 'de5a9', texto: 'De 5 a 9 años', min: 5, max: 9 },
  { clave: 'desde10', texto: '10 años o más', min: 10 },
];

export const SEXOS = ['Masculino', 'Femenino'];

const rangosElegidos = (lista: Rango[], claves: string[]) => lista.filter((r) => claves.includes(r.clave));

/** «31-40», «-30» (hasta) o «61-» (desde). */
const rangoParaElServidor = ({ min, max }: Rango) => `${min ?? ''}-${max ?? ''}`;

export const hayFiltros = (filtros: FiltrosDePoblacion) =>
  Object.values(filtros).some((valor) => valor.length > 0);

/** Parámetros que entiende el servidor; solo lleva lo que está elegido. */
export function parametrosDeFiltros(filtros: FiltrosDePoblacion): Record<string, string | string[]> {
  const parametros: Record<string, string | string[]> = {};
  if (filtros.puesto.length) parametros.puesto = filtros.puesto;
  if (filtros.sexo) parametros.sexo = filtros.sexo;
  if (filtros.agente.length) parametros.agente = filtros.agente;
  const edades = rangosElegidos(RANGOS_DE_EDAD, filtros.edad);
  if (edades.length) parametros.edadRango = edades.map(rangoParaElServidor);
  const antiguedades = rangosElegidos(RANGOS_DE_ANTIGUEDAD, filtros.antiguedad);
  if (antiguedades.length) parametros.antiguedadRango = antiguedades.map(rangoParaElServidor);
  return parametros;
}

const MAXIMO_EN_TEXTO_BREVE = 3;

/**
 * «Puesto: Soldador, Chofer · Sexo: Femenino · De 40 a 49 años»; cadena vacía sin
 * filtros. `breve` cuenta las listas largas («5 puestos») para mostrarlas en pantalla.
 */
export function textoDeFiltros(filtros: FiltrosDePoblacion, { breve = false } = {}): string {
  const enumerar = (valores: string[], singular: string, plural: string) =>
    breve && valores.length > MAXIMO_EN_TEXTO_BREVE
      ? `${valores.length} ${plural}`
      : `${singular}: ${valores.join(', ')}`;
  const edades = rangosElegidos(RANGOS_DE_EDAD, filtros.edad).map((r) => r.texto);
  const antiguedades = rangosElegidos(RANGOS_DE_ANTIGUEDAD, filtros.antiguedad).map((r) => r.texto.toLowerCase());
  return [
    filtros.puesto.length ? enumerar(filtros.puesto, 'Puesto', 'puestos') : '',
    filtros.sexo ? `Sexo: ${filtros.sexo}` : '',
    edades.join(', '),
    antiguedades.length ? `Antigüedad: ${antiguedades.join(', ')}` : '',
    filtros.agente.length ? enumerar(filtros.agente, 'Expuestos a', 'agentes de riesgo') : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Filtros equivalentes en la tabla de trabajadores, para que al ir de una
 * gráfica a la tabla se vea el mismo segmento. La tabla no filtra por edad ni
 * por antigüedad, y solo admite un puesto y un agente: `sinEquivalente` dice
 * qué no se pudo llevar.
 */
export function filtrosParaLaTabla(filtros: FiltrosDePoblacion): {
  consulta: Record<string, string>;
  sinEquivalente: string[];
} {
  const consulta: Record<string, string> = {};
  if (filtros.puesto.length === 1) consulta.puesto = filtros.puesto[0];
  if (filtros.sexo) consulta.sexo = filtros.sexo;
  if (filtros.agente.length === 1) consulta.exposicion = filtros.agente[0];
  return {
    consulta,
    sinEquivalente: [
      filtros.puesto.length > 1 ? 'varios puestos' : '',
      filtros.edad.length ? 'edad' : '',
      filtros.antiguedad.length ? 'antigüedad' : '',
      filtros.agente.length > 1 ? 'varios agentes de riesgo' : '',
    ].filter(Boolean),
  };
}

/** Puestos de los centros que se están viendo, sin repetir y en orden. */
export function puestosDisponibles(
  datos: ({ puestos?: string[] } | null | undefined)[],
  indiceCentro: number | null,
): string[] {
  const centros = indiceCentro === null ? datos : [datos[indiceCentro]];
  const porClave = new Map<string, string>();
  for (const centro of centros) {
    for (const puesto of centro?.puestos ?? []) {
      const clave = puesto.toLocaleLowerCase('es');
      if (!porClave.has(clave)) porClave.set(clave, puesto);
    }
  }
  return [...porClave.values()].sort((a, b) => a.localeCompare(b, 'es'));
}
