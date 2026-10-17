/**
 * Estado del tablero de salud en la dirección (URL): centro, periodo, filtros de población y
 * modo de comparación. Así «Atrás» y recargar lo conservan, y la dirección se puede compartir.
 * Cada valor se valida al leerlo; lo que no se reconoce se ignora.
 *
 * Los periodos predefinidos se guardan por nombre («este-anio»), no por fecha: al abrir la
 * dirección otro día, «Este año» vuelve a calcular sus fechas.
 */

import { RANGOS_DE_ANTIGUEDAD, RANGOS_DE_EDAD, SEXOS, filtrosVacios, type FiltrosDePoblacion } from './dashboardFiltros';
import { MODOS_DE_COMPARACION } from './dashboardComparativo';

export const PERIODOS_TABLERO: { etiqueta: string; clave: string }[] = [
  { etiqueta: 'Hoy', clave: 'hoy' },
  { etiqueta: 'Esta semana', clave: 'esta-semana' },
  { etiqueta: 'Este mes', clave: 'este-mes' },
  { etiqueta: 'Mes anterior', clave: 'mes-anterior' },
  { etiqueta: 'Últimos 3 meses', clave: 'ultimos-3-meses' },
  { etiqueta: 'Últimos 6 meses', clave: 'ultimos-6-meses' },
  { etiqueta: 'Este año', clave: 'este-anio' },
  { etiqueta: 'Año anterior', clave: 'anio-anterior' },
];

/** Valor de `centro` en la dirección cuando se ven todos los centros. */
export const CENTRO_TODOS = 'todos';
const MODO_POR_OMISION = 'anterior';
const LARGO_MAXIMO_TEXTO = 120;

/** Parámetros de la dirección que describen el estado (además de `centro`). */
const CLAVES_DE_ESTADO = ['periodo', 'desde', 'hasta', 'puesto', 'sexo', 'edad', 'antiguedad', 'agente', 'comparar'];

export interface EstadoTablero {
  /** Id del centro o CENTRO_TODOS; undefined si no se indica. */
  centro?: string;
  /** Etiqueta de PERIODOS_TABLERO (p. ej. «Este año»). */
  periodo?: string;
  desde?: string;
  hasta?: string;
  filtros: FiltrosDePoblacion;
  comparar: string;
}

type Consulta = Record<string, unknown>;

const primero = (valor: unknown): string | undefined => {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, LARGO_MAXIMO_TEXTO) : undefined;
};

const esFecha = (valor: string | undefined): valor is string =>
  !!valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !isNaN(new Date(`${valor}T00:00:00Z`).getTime());

export function etiquetaDePeriodo(clave: string | undefined): string | undefined {
  return PERIODOS_TABLERO.find((p) => p.clave === clave)?.etiqueta;
}

export function claveDePeriodo(etiqueta: string | undefined): string | undefined {
  return PERIODOS_TABLERO.find((p) => p.etiqueta === etiqueta)?.clave;
}

/** ¿La dirección trae algo más que el centro (periodo, filtros o comparación)? */
export function consultaTieneEstado(consulta: Consulta): boolean {
  return CLAVES_DE_ESTADO.some((clave) => primero(consulta[clave]) !== undefined);
}

/**
 * Lee y valida el estado de la dirección. `agentes` son los agentes de riesgo válidos;
 * el puesto se acepta como texto porque depende de los datos del proveedor.
 */
export function consultaAEstado(consulta: Consulta, agentes: string[]): EstadoTablero {
  const filtros = filtrosVacios();
  const puesto = primero(consulta.puesto);
  if (puesto) filtros.puesto = puesto;
  const sexo = primero(consulta.sexo);
  if (sexo && SEXOS.includes(sexo)) filtros.sexo = sexo;
  const edad = primero(consulta.edad);
  if (edad && RANGOS_DE_EDAD.some((r) => r.clave === edad)) filtros.edad = edad;
  const antiguedad = primero(consulta.antiguedad);
  if (antiguedad && RANGOS_DE_ANTIGUEDAD.some((r) => r.clave === antiguedad)) filtros.antiguedad = antiguedad;
  const agente = primero(consulta.agente);
  if (agente && agentes.includes(agente)) filtros.agente = agente;

  const comparar = primero(consulta.comparar);
  const estado: EstadoTablero = {
    filtros,
    comparar: comparar && MODOS_DE_COMPARACION.some((m) => m.valor === comparar) ? comparar : MODO_POR_OMISION,
  };

  const centro = primero(consulta.centro);
  if (centro) estado.centro = centro;

  const periodo = etiquetaDePeriodo(primero(consulta.periodo));
  if (periodo) {
    estado.periodo = periodo;
  } else {
    const desde = primero(consulta.desde);
    const hasta = primero(consulta.hasta);
    if (esFecha(desde)) estado.desde = desde;
    if (esFecha(hasta)) estado.hasta = hasta;
  }
  return estado;
}

/** Parámetros de la dirección para el estado; omite lo vacío y los valores por omisión. */
export function estadoAConsulta(estado: EstadoTablero): Record<string, string> {
  const consulta: Record<string, string> = {};
  if (estado.centro) consulta.centro = estado.centro;
  const clavePeriodo = claveDePeriodo(estado.periodo);
  if (clavePeriodo) {
    consulta.periodo = clavePeriodo;
  } else {
    if (estado.desde) consulta.desde = estado.desde;
    if (estado.hasta) consulta.hasta = estado.hasta;
  }
  (Object.keys(estado.filtros) as (keyof FiltrosDePoblacion)[]).forEach((clave) => {
    if (estado.filtros[clave]) consulta[clave] = estado.filtros[clave];
  });
  if (estado.comparar && estado.comparar !== MODO_POR_OMISION) consulta.comparar = estado.comparar;
  return consulta;
}

/** ¿Dos consultas describen lo mismo? (para no reescribir la dirección sin cambios) */
export function mismaConsulta(a: Consulta, b: Record<string, string>): boolean {
  const claves = new Set([...Object.keys(b), ...['centro', ...CLAVES_DE_ESTADO].filter((c) => a[c] !== undefined)]);
  return [...claves].every((clave) => primero(a[clave]) === b[clave]);
}

// ---- Último estado por empresa durante la sesión de la pestaña (al entrar sin parámetros)

const clavePorEmpresa = (empresaId: string) => `ramazzini:tablero:${empresaId}`;

export function guardarEstadoDeSesion(empresaId: string | undefined, consulta: Record<string, string>): void {
  if (!empresaId) return;
  try {
    sessionStorage.setItem(clavePorEmpresa(empresaId), JSON.stringify(consulta));
  } catch {
    // ignorar
  }
}

export function leerEstadoDeSesion(empresaId: string | undefined): Record<string, string> | null {
  if (!empresaId) return null;
  try {
    const crudo = sessionStorage.getItem(clavePorEmpresa(empresaId));
    const datos = crudo ? JSON.parse(crudo) : null;
    return datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : null;
  } catch {
    return null;
  }
}

// ---- Vista de cada sección (gráfica o tabla): preferencia del usuario en este navegador

const CLAVE_VISTAS = 'ramazzini:tablero:vistas';
const VISTAS_VALIDAS = ['grafico', 'tabla'];

export function leerVistasGuardadas(): Record<string, string> {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_VISTAS) || '{}');
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return {};
    return Object.fromEntries(
      Object.entries(datos).filter(([, valor]) => typeof valor === 'string' && VISTAS_VALIDAS.includes(valor)),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

export function guardarVista(seccion: string, vista: string): void {
  if (!VISTAS_VALIDAS.includes(vista)) return;
  try {
    localStorage.setItem(CLAVE_VISTAS, JSON.stringify({ ...leerVistasGuardadas(), [seccion]: vista }));
  } catch {
    // ignorar
  }
}
