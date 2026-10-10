/**
 * Tablero de salud: filtros de población (a qué trabajadores se refieren las
 * estadísticas). El servidor los aplica antes de leer los documentos
 * (backend/src/modules/trabajadores/tablero-poblacion.util.ts).
 */

export interface FiltrosDePoblacion {
  puesto: string;
  sexo: string;
  /** Clave de RANGOS_DE_EDAD. */
  edad: string;
  /** Clave de RANGOS_DE_ANTIGUEDAD. */
  antiguedad: string;
  /** Agente de riesgo al que está expuesto. */
  agente: string;
}

export const filtrosVacios = (): FiltrosDePoblacion => ({
  puesto: '',
  sexo: '',
  edad: '',
  antiguedad: '',
  agente: '',
});

interface Rango {
  clave: string;
  texto: string;
  min?: number;
  max?: number;
}

/** Años cumplidos, ambos extremos incluidos. */
export const RANGOS_DE_EDAD: Rango[] = [
  { clave: 'menos30', texto: 'Menores de 30 años', max: 29 },
  { clave: 'de30a39', texto: 'De 30 a 39 años', min: 30, max: 39 },
  { clave: 'de40a49', texto: 'De 40 a 49 años', min: 40, max: 49 },
  { clave: 'de50a59', texto: 'De 50 a 59 años', min: 50, max: 59 },
  { clave: 'desde60', texto: '60 años o más', min: 60 },
];

export const RANGOS_DE_ANTIGUEDAD: Rango[] = [
  { clave: 'menos1', texto: 'Menos de 1 año', max: 0 },
  { clave: 'de1a4', texto: 'De 1 a 4 años', min: 1, max: 4 },
  { clave: 'de5a9', texto: 'De 5 a 9 años', min: 5, max: 9 },
  { clave: 'desde10', texto: '10 años o más', min: 10 },
];

export const SEXOS = ['Masculino', 'Femenino'];

const rango = (lista: Rango[], clave: string) => lista.find((r) => r.clave === clave);

export const hayFiltros = (filtros: FiltrosDePoblacion) =>
  Object.values(filtros).some((valor) => !!valor);

/** Parámetros que entiende el servidor; solo lleva lo que está elegido. */
export function parametrosDeFiltros(filtros: FiltrosDePoblacion): Record<string, string | number> {
  const parametros: Record<string, string | number> = {};
  if (filtros.puesto) parametros.puesto = filtros.puesto;
  if (filtros.sexo) parametros.sexo = filtros.sexo;
  if (filtros.agente) parametros.agente = filtros.agente;
  const edad = rango(RANGOS_DE_EDAD, filtros.edad);
  if (edad?.min !== undefined) parametros.edadMin = edad.min;
  if (edad?.max !== undefined) parametros.edadMax = edad.max;
  const antiguedad = rango(RANGOS_DE_ANTIGUEDAD, filtros.antiguedad);
  if (antiguedad?.min !== undefined) parametros.antiguedadMin = antiguedad.min;
  if (antiguedad?.max !== undefined) parametros.antiguedadMax = antiguedad.max;
  return parametros;
}

/** «Puesto: Soldador · Sexo: Femenino · De 40 a 49 años»; cadena vacía sin filtros. */
export function textoDeFiltros(filtros: FiltrosDePoblacion): string {
  return [
    filtros.puesto ? `Puesto: ${filtros.puesto}` : '',
    filtros.sexo ? `Sexo: ${filtros.sexo}` : '',
    rango(RANGOS_DE_EDAD, filtros.edad)?.texto ?? '',
    filtros.antiguedad ? `Antigüedad: ${rango(RANGOS_DE_ANTIGUEDAD, filtros.antiguedad)?.texto.toLowerCase() ?? ''}` : '',
    filtros.agente ? `Expuestos a: ${filtros.agente}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Filtros equivalentes en la tabla de trabajadores, para que al ir de una
 * gráfica a la tabla se vea el mismo segmento. La tabla no filtra por edad ni
 * por antigüedad: `sinEquivalente` dice cuáles no se pudieron llevar.
 */
export function filtrosParaLaTabla(filtros: FiltrosDePoblacion): {
  consulta: Record<string, string>;
  sinEquivalente: string[];
} {
  const consulta: Record<string, string> = {};
  if (filtros.puesto) consulta.puesto = filtros.puesto;
  if (filtros.sexo) consulta.sexo = filtros.sexo;
  if (filtros.agente) consulta.exposicion = filtros.agente;
  return {
    consulta,
    sinEquivalente: [filtros.edad ? 'edad' : '', filtros.antiguedad ? 'antigüedad' : ''].filter(Boolean),
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
