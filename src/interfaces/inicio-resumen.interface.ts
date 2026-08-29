export type InicioActivityScope = 'user' | 'tenant';
export type InicioRegimen = 'SIRES_NOM024' | 'SIN_REGIMEN';

export interface InicioHoy {
  trabajadoresUnicos: number;
  documentosCreados: number;
  centrosConActividad?: number;
  borradoresPendientes?: number;
}

export interface InicioClienteReciente {
  idEmpresa: string;
  nombreComercial: string;
  idCentroTrabajo: string;
  nombreCentro: string;
  ultimaActividad: string;
  actorUsername?: string;
}

export interface InicioExpedienteReciente {
  idEmpresa: string;
  idCentroTrabajo: string;
  idTrabajador: string;
  nombreTrabajador: string;
  nombreComercial?: string;
  nombreCentro?: string;
  tipoDocumento: string;
  etiquetaTipo: string;
  ultimaActividad: string;
  actorUsername?: string;
}

export interface InicioPendienteItem {
  idDocumento: string;
  tipoDocumento: string;
  etiquetaTipo: string;
  idEmpresa: string;
  idCentroTrabajo: string;
  idTrabajador: string;
  nombreTrabajador: string;
  createdAt: string;
  elaboradorUsername?: string;
}

export interface InicioAtencionGrupo {
  tipo: 'borrador_nm_propio' | 'borrador_nm_equipo' | 'borrador_otro';
  count: number;
  titulo: string;
  subtitulo: string;
  items: InicioPendienteItem[];
}

export interface InicioConsejo {
  id: string;
  texto: string;
  enlace?: {
    name: string;
    params?: Record<string, string>;
  };
}

export interface InicioHoyListResponse<T> {
  items: T[];
  total: number;
  truncated: boolean;
}

export interface InicioHoyTrabajadorItem {
  idEmpresa: string;
  idCentroTrabajo: string;
  idTrabajador: string;
  nombreTrabajador: string;
  nombreComercial: string;
  nombreCentro: string;
  etiquetaTipo: string;
  ultimaActividad: string;
  actorUsername?: string;
}

export interface InicioHoyDocumentoItem {
  idDocumento: string;
  tipoDocumento: string;
  etiquetaTipo: string;
  nombreDocumento?: string;
  idEmpresa: string;
  idCentroTrabajo: string;
  idTrabajador: string;
  nombreTrabajador: string;
  nombreComercial: string;
  nombreCentro: string;
  createdAt: string;
  estado?: 'borrador' | 'finalizado';
  creadorUsername?: string;
  finalizadoPorUsername?: string;
}

export interface InicioHoyCentroItem {
  idEmpresa: string;
  idCentroTrabajo: string;
  nombreComercial: string;
  nombreCentro: string;
  ultimaActividad: string;
  actorUsername?: string;
}

export interface InicioResumen {
  hasActivity: boolean;
  hasTrabajadores: boolean;
  activityScope: InicioActivityScope;
  regimen: InicioRegimen;
  dateKey: string;
  hoy: InicioHoy;
  clientesRecientes: InicioClienteReciente[];
  expedientesRecientes: InicioExpedienteReciente[];
  atencion: InicioAtencionGrupo[];
  pendientes: InicioPendienteItem[];
  consejo: InicioConsejo | null;
}
