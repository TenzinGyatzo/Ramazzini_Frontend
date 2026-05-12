/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tipos de documentos del expediente. Muchos modelos están como `any` por compatibilidad con el cliente;
 * Evento e Informe longitudinal cardiometabólico declarados con más detalle.
 */
export type Antidoping = any;
export type Aptitud = any;
export type Audiometria = any;
export type Certificado = any;
export type CertificadoExpedito = any;
export type DocumentoExterno = any;
export type ExamenVista = any;
export type ExploracionFisica = any;
export type HistoriaClinica = any;
export type NotaMedica = any;
export type ControlPrenatal = any;
export type HistoriaOtologica = any;
export type PrevioEspirometria = any;
export type Receta = any;
export type ConstanciaAptitud = any;
export type EntrevistaPsicologica = any;
export type TrastornosEstadoAnimo = any;
export type CuestionarioProdromalBreve = any;
export type TrastornoLimitePersonalidad = any;

export interface VisitaControlCondicionEsc {
  control?: string;
}

export interface EventoSeguimientoCardiometabolicoObesidad {
  grado?: string;
}

export interface EstadoCondicionesCardiometabolicasEvento {
  hipertensionArterial?: VisitaControlCondicionEsc;
  diabetesMellitusTipo2?: VisitaControlCondicionEsc;
  dislipidemia?: VisitaControlCondicionEsc;
  obesidad?: EventoSeguimientoCardiometabolicoObesidad;
}

export interface SignosVitalesCardiometabolicoEsc {
  tensionArterialSistolica?: number;
  tensionArterialDiastolica?: number;
  categoriaTensionArterial?: string;
  frecuenciaCardiaca?: number;
  categoriaFrecuenciaCardiaca?: string;
}

export interface SomatometriaCardiometabolicoEsc {
  peso?: number;
  altura?: number;
  indiceMasaCorporal?: number;
  categoriaIMC?: string;
  circunferenciaCintura?: number;
  categoriaCircunferenciaCintura?: string;
}

export interface LaboratorioCardiometabolicoEsc {
  glucosaMgDl?: number;
  categoriaGlucosa?: string;
  hba1cPorcentaje?: number;
  categoriaHbA1c?: string;
  colesterolTotalMgDl?: number;
  categoriaColesterolTotal?: string;
  ldlMgDl?: number;
  categoriaLDL?: string;
  hdlMgDl?: number;
  categoriaHDL?: string;
  trigliceridosMgDl?: number;
  categoriaTrigliceridos?: string;
}

export interface EventoSeguimientoCardiometabolico {
  _id: string;
  fechaEventoSeguimientoCardiometabolico: string;
  motivoSeguimiento: string;
  diagnosticosActivos?: string[];
  estadoCondiciones?: EstadoCondicionesCardiometabolicasEvento;
  signosVitales?: SignosVitalesCardiometabolicoEsc;
  somatometria?: SomatometriaCardiometabolicoEsc;
  laboratorio?: LaboratorioCardiometabolicoEsc;
  adherenciaTerapeutica?: string;
  sintomasRelevantes?: string;
  riesgosActuales?: string;
  proximaRevisionSugerida?: string;
}

export interface CondicionControlResumenInformeLongitudinal {
  presente?: boolean;
  estadoActual?: string;
  tendencia?: string;
  observaciones?: string;
  interpretacionAutomatica?: string;
}

export interface CondicionObesidadResumenInformeLongitudinal {
  presente?: boolean;
  gradoActual?: string;
  tendencia?: string;
  observaciones?: string;
  interpretacionAutomatica?: string;
}

export interface ResumenCondicionesCardiometabolicasInformeLongitudinal {
  hipertension?: CondicionControlResumenInformeLongitudinal;
  diabetes?: CondicionControlResumenInformeLongitudinal;
  dislipidemia?: CondicionControlResumenInformeLongitudinal;
  obesidad?: CondicionObesidadResumenInformeLongitudinal;
}

export interface ResumenIndicadorLongitudinalEsc {
  valorInicial?: number;
  valorFinal?: number;
  cambioAbsoluto?: number;
  cambioPorcentual?: number;
  mejorValor?: number;
  peorValor?: number;
  tendencia?: string;
  interpretacion?: string;
  tieneDatosSuficientes?: boolean;
  numeroMediciones?: number;
}

export interface ResumenIndicadoresLongitudinalEsc {
  tensionArterialSistolica?: ResumenIndicadorLongitudinalEsc;
  tensionArterialDiastolica?: ResumenIndicadorLongitudinalEsc;
  peso?: ResumenIndicadorLongitudinalEsc;
  indiceMasaCorporal?: ResumenIndicadorLongitudinalEsc;
  circunferenciaCintura?: ResumenIndicadorLongitudinalEsc;
  glucosaMgDl?: ResumenIndicadorLongitudinalEsc;
  hba1cPorcentaje?: ResumenIndicadorLongitudinalEsc;
  ldlMgDl?: ResumenIndicadorLongitudinalEsc;
  trigliceridosMgDl?: ResumenIndicadorLongitudinalEsc;
}

export interface EventoConcentradoCardiometabolicoEsc {
  idEventoOriginal?: string;
  fechaControl?: string;
  signosVitales?: SignosVitalesCardiometabolicoEsc;
  somatometria?: SomatometriaCardiometabolicoEsc;
  laboratorio?: LaboratorioCardiometabolicoEsc;
  riesgoActual?: string;
  plan?: string;
}

export interface SeguimientoProgramadoConcentradoCardiometabolicoEsc {
  idSeguimientoProgramadoOriginal?: string;
  fechaProgramada?: string;
  /** Si el registro en BD tenía fecha de reprogramación (indicador útil para conteos). */
  fechaReprogramada?: string;
  /** True si existe enlace explícito a otro seguimiento (reprogramación en Mongo). */
  esResultadoDeReprogramacion?: boolean;
  estado?: string;
  motivo?: string;
  observaciones?: string;
  idEventoClinico?: string;
}

export interface InformeLongitudinalCardiometabolico {
  _id?: string;
  fechaInformeLongitudinalCardiometabolico: string;
  periodoInicio: string;
  periodoFin: string;
  fechaUltimoEventoConsiderado?: string;
  numeroEventosIncluidos: number;
  numeroEventosValidos?: number;
  numeroSeguimientosProgramados?: number;
  numeroSeguimientosRealizados?: number;
  numeroInasistencias?: number;
  numeroCancelaciones?: number;
  numeroReprogramaciones?: number;
  porcentajeAsistencia?: number;
  consistenciaSeguimiento?: string;
  datosFaltantesRelevantes?: string[];
  idTrabajador?: string;
  eventosIncluidos?: string[];
  seguimientosProgramadosIncluidos?: string[];
  resumenCondiciones?: ResumenCondicionesCardiometabolicasInformeLongitudinal;
  eventosConcentrados?: EventoConcentradoCardiometabolicoEsc[];
  seguimientosProgramadosConcentrados?: SeguimientoProgramadoConcentradoCardiometabolicoEsc[];
  resumenIndicadores?: ResumenIndicadoresLongitudinalEsc;
  graficasIncluidas?: string[];
  nivelRiesgoLongitudinal?: string;
  interpretacionRiesgoLongitudinal?: string;
  factoresPersistentes?: string[];
  alertasRelevantes?: string[];
  resumenLongitudinalSugerido?: string;
  conclusionClinicaSugerida?: string;
  recomendacionesSugeridas?: string;
  limitacionesSugeridas?: string;
  resumenLongitudinal?: string;
  conclusionClinica?: string;
  recomendaciones?: string;
  limitaciones?: string;
  rutaPDF?: string;
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: string;
  updatedAt?: string;
}
