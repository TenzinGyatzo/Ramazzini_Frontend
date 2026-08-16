export interface Trabajador {
  _id: string;
  primerApellido?: string;
  segundoApellido?: string;
  nombre: string;
  fechaNacimiento: string;
  sexo: string;
  sexoCURP?: number;
  escolaridad: string;
  puesto: string;
  fechaIngreso?: string;
  telefono: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  estadoCivil: string;
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
}
