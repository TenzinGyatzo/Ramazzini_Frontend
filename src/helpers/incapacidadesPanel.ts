/**
 * Seguimiento de incapacidades de una empresa: tipos de lo que entrega el servidor
 * (panelDeEmpresa en backend/src/modules/incapacidades/incapacidades.service.ts),
 * textos de los focos rojos y filtros de la tabla de casos.
 */
import {
  soloFecha,
  sumarDias,
  type CasoConIncapacidades,
  type EstadoCaso,
  type Opcion,
  type OrigenIncapacidad,
  type RamoIncapacidad,
} from './incapacidades';

export type TipoFoco =
  | 'incapacidadPermanente'
  | 'secuelas'
  | 'cercaDelLimite'
  | 'prolongada'
  | 'recaida'
  | 'frecuentes'
  | 'sinSeguimiento';

export interface Foco {
  tipo: TipoFoco;
  /** Dato que lo explica: «45 días», «3 casos en 12 meses», «15 %». */
  detalle: string;
  idCaso?: string;
}

export interface TrabajadorDePanel {
  _id: string;
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  puesto?: string;
  numeroEmpleado?: string;
  estadoLaboral?: string;
  idCentroTrabajo: string;
}

export interface IncapacitadoHoy {
  idTrabajador: string;
  idCaso: string;
  ramo: RamoIncapacidad;
  origen?: OrigenIncapacidad;
  diasQueLleva: number;
  fechaTermino?: string;
}

export type CasoDePanel = CasoConIncapacidades & { idTrabajador: string };

export interface PanelIncapacidades {
  centros: { _id: string; nombreCentro: string }[];
  trabajadores: TrabajadorDePanel[];
  casos: CasoDePanel[];
  incapacitadosHoy: IncapacitadoHoy[];
  focosRojos: { idTrabajador: string; focos: Foco[] }[];
  umbrales: {
    diasProlongada: number;
    semanasCercaDelLimite: number;
    casosFrecuentes: number;
    diasVentana: number;
    diasSinSeguimiento: number;
  };
}

interface TextoDeFoco {
  texto: string;
  icono: string;
  /** El detalle del servidor agrega un dato (días, porcentaje) y se muestra junto al texto. */
  conDetalle: boolean;
}

export const FOCOS: Record<TipoFoco, TextoDeFoco> = {
  incapacidadPermanente: { texto: 'Incapacidad permanente', icono: 'fas fa-wheelchair', conDetalle: true },
  secuelas: { texto: 'Con secuelas', icono: 'fas fa-crutch', conDetalle: false },
  cercaDelLimite: { texto: 'Cerca del límite de 52 semanas', icono: 'fas fa-hourglass-end', conDetalle: true },
  prolongada: { texto: 'Incapacidad prolongada', icono: 'fas fa-hourglass-half', conDetalle: true },
  recaida: { texto: 'Recaída', icono: 'fas fa-rotate-left', conDetalle: false },
  frecuentes: { texto: 'Incapacidades frecuentes', icono: 'fas fa-repeat', conDetalle: true },
  sinSeguimiento: { texto: 'Sin seguimiento', icono: 'fas fa-user-clock', conDetalle: false },
};

/** «Incapacidad prolongada · 45 días»; el detalle completo queda para el título del distintivo. */
export const textoDeFoco = (foco: Foco): string => {
  const definicion = FOCOS[foco.tipo];
  if (!definicion) return foco.detalle;
  return definicion.conDetalle ? `${definicion.texto} · ${foco.detalle}` : definicion.texto;
};

export type Periodo = 'ultimos30' | 'ultimos12Meses' | 'esteAnio' | 'todo';

export const PERIODOS: Opcion<Periodo>[] = [
  { valor: 'ultimos30', texto: 'Últimos 30 días' },
  { valor: 'ultimos12Meses', texto: 'Últimos 12 meses' },
  { valor: 'esteAnio', texto: 'Este año' },
  { valor: 'todo', texto: 'Todo el historial' },
];

/** Primer día del periodo (AAAA-MM-DD), o cadena vacía si no hay límite. */
export function inicioDePeriodo(periodo: Periodo, hoy: string): string {
  if (periodo === 'ultimos30') return sumarDias(hoy, -30);
  if (periodo === 'ultimos12Meses') return sumarDias(hoy, -365);
  if (periodo === 'esteAnio') return `${hoy.slice(0, 4)}-01-01`;
  return '';
}

export interface FiltrosDeCasos {
  ramo: RamoIncapacidad | '';
  estado: EstadoCaso | '';
  periodo: Periodo;
  /** Ids de los trabajadores que se muestran (por centro y por búsqueda); null = todos. */
  trabajadores: Set<string> | null;
}

/**
 * Un caso entra al periodo si sigue activo o si su última incapacidad
 * (o su inicio, cuando no tuvo incapacidades) cae dentro de él.
 */
export function filtrarCasos(
  casos: CasoDePanel[],
  filtros: FiltrosDeCasos,
  hoy: string,
): CasoDePanel[] {
  const desde = inicioDePeriodo(filtros.periodo, hoy);
  return casos.filter((item) => {
    if (filtros.trabajadores && !filtros.trabajadores.has(item.idTrabajador)) return false;
    if (filtros.ramo && item.caso.ramo !== filtros.ramo) return false;
    if (filtros.estado && item.estado !== filtros.estado) return false;
    if (!desde || item.estado === 'activo') return true;
    const ultimoDia =
      soloFecha(item.caso.fechaTerminoUltimaIncapacidad) || soloFecha(item.caso.fechaInicio);
    return ultimoDia >= desde;
  });
}

/** Coincidencia sin acentos ni mayúsculas, por nombre o número de empleado. */
export function coincideTrabajador(trabajador: TrabajadorDePanel, busqueda: string): boolean {
  const normalizar = (texto: string) =>
    texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  const buscado = normalizar(busqueda);
  if (!buscado) return true;
  const datos = normalizar(
    [
      trabajador.nombre,
      trabajador.primerApellido,
      trabajador.segundoApellido,
      trabajador.numeroEmpleado,
    ]
      .filter(Boolean)
      .join(' '),
  );
  return buscado.split(/\s+/).every((palabra) => datos.includes(palabra));
}
