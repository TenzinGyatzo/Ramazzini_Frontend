/**
 * Sugerencia de agentes de riesgo a partir de los compañeros del mismo puesto en el centro:
 * la exposición depende sobre todo del puesto, así que se propone la combinación más frecuente
 * entre los trabajadores activos con ese puesto que ya tienen agentes capturados.
 * Es solo una sugerencia: el usuario la aplica a las casillas, revisa y guarda.
 */

interface TrabajadorConAgentes {
  _id?: unknown;
  puesto?: unknown;
  estadoLaboral?: unknown;
  agentesRiesgoActuales?: unknown;
}

export interface SugerenciaAgentes {
  /** Agentes sugeridos, en el orden del catálogo. */
  agentes: string[];
  /** Compañeros con exactamente esa combinación. */
  coinciden: number;
  /** Compañeros del mismo puesto con agentes capturados. */
  total: number;
}

/** «Soldador », «SOLDADOR» y «Sóldador» son el mismo puesto. */
export function normalizarPuesto(puesto: unknown): string {
  return String(puesto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function agentesDe(trabajador: TrabajadorConAgentes): string[] {
  const agentes = trabajador.agentesRiesgoActuales;
  return Array.isArray(agentes) ? agentes.filter((a): a is string => typeof a === 'string' && a.trim() !== '') : [];
}

export function sugerirAgentesPorPuesto(
  trabajador: TrabajadorConAgentes | null | undefined,
  companeros: TrabajadorConAgentes[] | null | undefined,
  ordenCatalogo: string[] = [],
): SugerenciaAgentes | null {
  const puesto = normalizarPuesto(trabajador?.puesto);
  if (!puesto || !Array.isArray(companeros)) return null;

  const posicion = (agente: string) => {
    const i = ordenCatalogo.indexOf(agente);
    return i === -1 ? ordenCatalogo.length : i;
  };
  const ordenar = (agentes: string[]) =>
    [...new Set(agentes)].sort((a, b) => posicion(a) - posicion(b) || a.localeCompare(b));

  const combinaciones = new Map<string, { agentes: string[]; veces: number }>();
  let total = 0;
  for (const companero of companeros) {
    if (!companero || String(companero._id) === String(trabajador?._id)) continue;
    if (companero.estadoLaboral === 'Inactivo') continue;
    if (normalizarPuesto(companero.puesto) !== puesto) continue;
    const agentes = ordenar(agentesDe(companero));
    if (agentes.length === 0) continue;
    total += 1;
    const clave = agentes.join('|');
    const actual = combinaciones.get(clave);
    if (actual) actual.veces += 1;
    else combinaciones.set(clave, { agentes, veces: 1 });
  }
  if (total === 0) return null;

  // La más frecuente; ante empate, la que incluye más agentes (para no dejar exposiciones fuera)
  const masFrecuente = [...combinaciones.values()].sort(
    (a, b) => b.veces - a.veces || b.agentes.length - a.agentes.length,
  )[0];
  return { agentes: masFrecuente.agentes, coinciden: masFrecuente.veces, total };
}

/** «Los otros 12 trabajadores…», «8 de los 12…», «El otro trabajador…». */
export function textoSugerenciaAgentes(sugerencia: SugerenciaAgentes, puesto: string): string {
  const { coinciden, total } = sugerencia;
  if (total === 1) return `El otro trabajador con el puesto ${puesto} tiene:`;
  if (coinciden === total) return `Los otros ${total} trabajadores con el puesto ${puesto} tienen:`;
  return `${coinciden} de los ${total} trabajadores con el puesto ${puesto} tienen:`;
}

export function mismosAgentes(a: string[], b: string[]): boolean {
  const conjuntoA = new Set(a);
  const conjuntoB = new Set(b);
  return conjuntoA.size === conjuntoB.size && [...conjuntoA].every((agente) => conjuntoB.has(agente));
}
