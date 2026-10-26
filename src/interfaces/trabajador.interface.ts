export interface Trabajador {
  _id: string;
  primerApellido?: string;
  segundoApellido?: string;
  nombre: string;
  fechaNacimiento: string;
  sexo: string;
  sexoCURP?: number;
  escolaridad?: string | null;
  puesto: string;
  fechaIngreso?: string;
  telefono: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  estadoCivil?: string | null;
  numeroEmpleado: string;
  nss: string;
  curp?: string;
  // NOM-024 Person Identification Fields
  entidadNacimiento?: string;
  paisNacimiento?: number | string;
  entidadResidencia?: string;
  municipioResidencia?: string;
  localidadResidencia?: string;
  estadoLaboral: string;
  idCentroTrabajo: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  fechaTransferencia?: string;
  folio?: string;
  tieneDuplicadoPendiente?: boolean;
  alertasPendientesCount?: number;
  tieneDocumentoClinicoFinalizado?: boolean;
}

export interface DuplicateWorkerSummary {
  _id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido?: string;
  curp?: string;
  folio?: string;
  numeroEmpleado?: string;
  sexo?: string;
  fechaNacimiento?: string;
  puesto?: string;
  fechaIngreso?: string;
  idCentroTrabajo: string;
  nombreCentroTrabajo?: string;
  createdAt?: string;
}

export interface PosibleDuplicado {
  trabajadorId: string;
  criterio: 'CURP' | 'FOLIO';
  trabajador: DuplicateWorkerSummary;
  alertId?: string;
}

export interface WorkerDuplicateAlert {
  _id: string;
  trabajadorId: DuplicateWorkerSummary | string;
  candidatoId: DuplicateWorkerSummary | string;
  criterio: 'CURP' | 'FOLIO';
  estado: 'PENDIENTE' | 'DESCARTADO' | 'FUSIONADO';
}

export interface FusionResultadoClinicoSummary {
  _id: string;
  tipoEstudio: string;
  fechaEstudio: string;
  resultadoGlobal?: string;
}

export interface FusionRiesgoTrabajoSummary {
  _id: string;
  fechaRiesgo: string;
  tipoRiesgo?: string;
  naturalezaLesion?: string;
  parteCuerpoAfectada?: string;
}

export interface FusionPreview {
  destino: DuplicateWorkerSummary;
  fuente: DuplicateWorkerSummary;
  conteosDestino: Record<string, number>;
  conteosFuente: Record<string, number>;
  documentosExpedienteDestino: number;
  documentosExpedienteFuente: number;
  registrosVinculadosDestino: number;
  registrosVinculadosFuente: number;
  detalleVinculadosDestino: Record<string, number>;
  detalleVinculadosFuente: Record<string, number>;
  resultadosClinicosDestino: FusionResultadoClinicoSummary[];
  resultadosClinicosFuente: FusionResultadoClinicoSummary[];
  riesgosTrabajoDestino: FusionRiesgoTrabajoSummary[];
  riesgosTrabajoFuente: FusionRiesgoTrabajoSummary[];
  totalDocumentosFuente: number;
  conflictos: {
    numeroEmpleado: boolean;
    consentimientoMismoDia: number;
  };
  criterioMatch: 'CURP' | 'FOLIO' | null;
  destinoRecomendadoId: string;
  /** Hay una alerta de posible duplicado pendiente entre los dos. */
  posibleDuplicado?: boolean;
  /** Datos que difieren entre `destino` y `fuente` (en el orden en que se pidió la vista previa). */
  camposDiferentes?: CampoFusionDiferente[];
  /** Nombre, apellidos, CURP, sexo y fecha de nacimiento son iguales. */
  identidadCoincide?: boolean;
  /** Nombre de cada centro de trabajo que aparece en los dos registros. */
  centrosNombre?: Record<string, string>;
}

export type MotivoFusion =
  | 'CAMBIO_NOMBRE'
  | 'CAMBIO_SEXO'
  | 'CAMBIO_CURP'
  | 'REGISTRO_DUPLICADO'
  | 'OTRO';

export type OrigenCampoFusion = 'destino' | 'fuente';

export interface CampoFusionDiferente {
  clave: string;
  etiqueta: string;
  identidad: boolean;
  valoresDestino: Record<string, string | number | null>;
  valoresFuente: Record<string, string | number | null>;
  porDefecto: OrigenCampoFusion;
}

/** Resultado del buscador del paso 1: trabajadores de la empresa. */
export interface TrabajadorParaFusion extends DuplicateWorkerSummary {
  estadoLaboral?: string;
  numeroDocumentos: number;
  posibleDuplicado: boolean;
}

/** Lo que el modal de fusión avisa al terminar. */
export interface ResultadoFusion {
  conservadoId: string;
  eliminadoId: string;
  /** Centro de trabajo en el que queda el trabajador conservado. */
  idCentroTrabajo: string;
}

/** Una fusión en la que el trabajador conservó otro registro (consulta en el expediente). */
export interface FusionConsultada {
  _id: string;
  fecha: string | null;
  destinoId: string;
  fuenteId: string;
  /** El registro se fusionó con otro que después se fusionó con este. */
  indirecta: boolean;
  folioDestino: string | null;
  folioFuente: string | null;
  /** null en fusiones anteriores a la trazabilidad completa. */
  nombreFuente: string | null;
  curpFuente: string | null;
  actor: { nombre: string; email: string | null } | null;
  criterio: string | null;
  motivos: MotivoFusion[];
  motivoOtro: string | null;
  comentario: string | null;
  camposCambiados: {
    clave: string;
    etiqueta: string;
    origen: OrigenCampoFusion;
    anterior: Record<string, string | number | null>;
    nuevo: Record<string, string | number | null>;
  }[];
  documentosMigradosPorColeccion: Record<string, number>;
  trasladados: Record<string, { id: string; tipo?: string; fecha?: string | null; nombre?: string }[]>;
  centrosNombre: Record<string, string>;
}
