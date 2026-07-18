export type PdfStatus = 'generating' | 'ready' | 'failed';

import { DocumentoEstado } from './nom024.interface';

/** Usuario poblado desde el backend (findDocument con populate) */
export interface UserRef {
  _id: string;
  username?: string;
  nombre?: string;
}

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

export interface TratamientoActualCardiometabolicoEsc {
  medicamento?: string;
  dosis?: string;
  frecuencia?: string;
  motivoUso?: string;
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
  tratamientoActual?: TratamientoActualCardiometabolicoEsc[];
  adherenciaTerapeutica?: string;
  sintomasRelevantes?: string;
  riesgosActuales?: string;
  proximaRevisionSugerida?: string;
  idTrabajador?: string;
  rutaPDF?: string;
  pdfStatus?: PdfStatus;
  estado?: DocumentoEstado;
  fechaFinalizacion?: string;
  finalizadoPor?: string;
  fechaAnulacion?: string;
  anuladoPor?: string;
  razonAnulacion?: string;
  createdBy?: string | UserRef;
  updatedBy?: string | UserRef;
}

export interface Antidoping {
    _id: string;
    fechaAntidoping: string;
    marihuana: string;
    cocaina: string;
    anfetaminas: string;
    metanfetaminas: string;
    opiaceos: string;
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string | UserRef;
    updatedBy: string | UserRef;
    metilendioximetanfetamina?: string;
    ketamina?: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    // Consentimiento Diario (NOM-024)
    consentimientoDiarioId?: string;
    consentimientoDiario?: {
        _id: string;
        acceptedAt: string;
        consentMethod: 'VERBAL' | 'AUTOGRAFO';
        acceptedByUserId: string | {
            username?: string;
            nombre?: string;
        };
    };
}

export interface Aptitud {
    _id: string;
    fechaAptitudPuesto: string;
    evaluacionAdicional1?: string;
    fechaEvaluacionAdicional1?: Date;
    resultadosEvaluacionAdicional1?: string;
    evaluacionAdicional2?: string;
    fechaEvaluacionAdicional2?: Date;
    resultadosEvaluacionAdicional2?: string;
    evaluacionAdicional3?: string;
    fechaEvaluacionAdicional3?: Date;
    resultadosEvaluacionAdicional3?: string;
    evaluacionAdicional4?: string;
    fechaEvaluacionAdicional4?: Date;
    resultadosEvaluacionAdicional4?: string;
    evaluacionAdicional5?: string;
    fechaEvaluacionAdicional5?: Date;
    resultadosEvaluacionAdicional5?: string;
    evaluacionAdicional6?: string;
    fechaEvaluacionAdicional6?: Date;
    resultadosEvaluacionAdicional6?: string;
    aptitudPuesto?: string;
    alteracionesSalud?: string;
    resultados?: string;
    medidasPreventivas?: string;
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    // Consentimiento Diario (NOM-024)
    consentimientoDiarioId?: string;
    consentimientoDiario?: {
        _id: string;
        acceptedAt: string;
        consentMethod: 'VERBAL' | 'AUTOGRAFO';
        acceptedByUserId: string | {
            username?: string;
            nombre?: string;
        };
    };
}

export interface Audiometria {
    _id: string;
    fechaAudiometria: string;
    oidoDerecho125?: number;
    oidoDerecho250?: number;
    oidoDerecho500?: number;
    oidoDerecho1000?: number;
    oidoDerecho2000?: number;
    oidoDerecho3000?: number;
    oidoDerecho4000?: number;
    oidoDerecho6000?: number;
    oidoDerecho8000?: number;
    porcentajePerdidaOD?: number;
    oidoIzquierdo125?: number;
    oidoIzquierdo250?: number;
    oidoIzquierdo500?: number;
    oidoIzquierdo1000?: number;
    oidoIzquierdo2000?: number;
    oidoIzquierdo3000?: number;
    oidoIzquierdo4000?: number;
    oidoIzquierdo6000?: number;
    oidoIzquierdo8000?: number;
    porcentajePerdidaOI?: number;
    hipoacusiaBilateralCombinada?: number;
    observacionesAudiometria?: string;
    interpretacionAudiometrica?: string;
    diagnosticoAudiometria?: string;
    recomendacionesAudiometria?: string[];
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    // Consentimiento Diario (NOM-024)
    consentimientoDiarioId?: string;
    consentimientoDiario?: {
        _id: string;
        acceptedAt: string;
        consentMethod: 'VERBAL' | 'AUTOGRAFO';
        acceptedByUserId: string | {
            username?: string;
            nombre?: string;
        };
    };
}

export interface Certificado {
    _id: string;
    fechaCertificado: string;
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    // Consentimiento Diario (NOM-024)
    consentimientoDiarioId?: string;
    consentimientoDiario?: {
        _id: string;
        acceptedAt: string;
        consentMethod: 'VERBAL' | 'AUTOGRAFO';
        acceptedByUserId: string | {
            username?: string;
            nombre?: string;
        };
    };
}

export interface CertificadoExpedito {
    _id: string;
    fechaCertificadoExpedito: string;
    cuerpoCertificado: string;
    impedimentosFisicos: string;
    peso: number;
    altura: number;
    indiceMasaCorporal: number;
    tensionArterialSistolica: number;
    tensionArterialDiastolica: number;
    frecuenciaCardiaca: number;
    frecuenciaRespiratoria: number;
    temperaturaCorporal: number;
    gradoSalud: string;
    aptitudPuesto: string;
    descripcionSobreAptitud: string;
    observaciones: string;
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
}

export interface DocumentoExterno {
    _id: string;
    nombreDocumento: string;
    fechaDocumento: string;
    notasDocumento?: string;
    extension: string;
    idTrabajador: string;
    rutaDocumento: string;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    // Consentimiento Diario (NOM-024)
    consentimientoDiarioId?: string;
    consentimientoDiario?: {
        _id: string;
        acceptedAt: string;
        consentMethod: 'VERBAL' | 'AUTOGRAFO';
        acceptedByUserId: string | {
            username?: string;
            nombre?: string;
        };
    };
    idResultadoClinico?: string;
    resultadoClinico?: {
        _id: string;
        tipoEstudio: string;
        fechaEstudio: string;
        resultadoGlobal?: string;
    };
}

export interface ExamenVista {
    _id: string;
    fechaExamenVista: string;
    ojoIzquierdoLejanaSinCorreccion: number;
    ojoDerechoLejanaSinCorreccion: number;
    sinCorreccionLejanaInterpretacion: string;
    requiereLentesUsoGeneral: string;
    ojoIzquierdoCercanaSinCorreccion: number;
    ojoDerechoCercanaSinCorreccion: number;
    sinCorreccionCercanaInterpretacion: string;
    requiereLentesParaLectura: string;
    ojoIzquierdoLejanaConCorreccion?: number;
    ojoDerechoLejanaConCorreccion?: number;
    conCorreccionLejanaInterpretacion?: string;
    ojoIzquierdoCercanaConCorreccion?: number;
    ojoDerechoCercanaConCorreccion?: number;
    conCorreccionCercanaInterpretacion?: string;
    placasCorrectas: number;
    porcentajeIshihara: number;
    interpretacionIshihara: string;
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    // Consentimiento Diario (NOM-024)
    consentimientoDiarioId?: string;
    consentimientoDiario?: {
        _id: string;
        acceptedAt: string;
        consentMethod: 'VERBAL' | 'AUTOGRAFO';
        acceptedByUserId: string | {
            username?: string;
            nombre?: string;
        };
    };
}

export interface ExploracionFisica {
    _id: string;
    fechaExploracionFisica: string;
    peso?: number;
    altura?: number;
    indiceMasaCorporal?: number;
    categoriaIMC?: string;
    circunferenciaCintura?: number;
    categoriaCircunferenciaCintura?: string;
    tensionArterialSistolica?: number;
    tensionArterialDiastolica?: number;
    categoriaTensionArterial?: string;
    frecuenciaCardiaca?: number;
    categoriaFrecuenciaCardiaca?: string;
    frecuenciaRespiratoria?: number;
    categoriaFrecuenciaRespiratoria?: string;
    saturacionOxigeno?: number;
    categoriaSaturacionOxigeno?: string;
    craneoCara?: string;
    ojos?: string;
    oidos?: string;
    nariz?: string;
    boca?: string;
    cuello?: string;
    hombros?: string;
    codos?: string;
    manos?: string;
    reflejosOsteoTendinososSuperiores?: string;
    vascularESuperiores?: string;
    torax?: string;
    abdomen?: string;
    cadera?: string;
    rodillas?: string;
    tobillosPies?: string;
    reflejosOsteoTendinososInferiores?: string;
    vascularEInferiores?: string;
    inspeccionColumna?: string;
    movimientosColumna?: string;
    lesionesPiel?: string;
    cicatrices?: string;
    nevos?: string;
    coordinacion?: string;
    sensibilidad?: string;
    equilibrio?: string;
    marcha?: string;
    resumenExploracionFisica?: string;
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    // Consentimiento Diario (NOM-024)
    consentimientoDiarioId?: string;
    consentimientoDiario?: {
        _id: string;
        acceptedAt: string;
        consentMethod: 'VERBAL' | 'AUTOGRAFO';
        acceptedByUserId: string | {
            username?: string;
            nombre?: string;
        };
    };
}

export interface HistoriaClinica {
    _id: string;
    motivoExamen: string;
    fechaHistoriaClinica: string;
    nefropatias?: string;
    nefropatiasEspecificar?: string;
    diabeticos?: string;
    diabeticosEspecificar?: string;
    hipertensivos?: string;
    hipertensivosEspecificar?: string;
    cardiopaticos?: string;
    cardiopaticosEspecificar?: string;
    neoplasicos?: string;
    neoplasicosEspecificar?: string;
    psiquiatricos?: string;
    psiquiatricosEspecificar?: string;
    epilepticos?: string;
    epilepticosEspecificar?: string;
    autoinmunes?: string;
    autoinmunesEspecificar?: string;
    tuberculosis?: string;
    tuberculosisEspecificar?: string;
    hepatopatias?: string;
    hepatopatiasEspecificar?: string;
    lumbalgias?: string;
    lumbalgiasEspecificar?: string;
    diabeticosPP?: string;
    diabeticosPPEspecificar?: string;
    cardiopaticosPP?: string;
    cardiopaticosPPEspecificar?: string;
    alergicos?: string;
    alergicosEspecificar?: string;
    hipertensivosPP?: string;
    hipertensivosPPEspecificar?: string;
    respiratorios?: string;
    respiratoriosEspecificar?: string;
    epilepticosPP?: string;
    epilepticosPPEspecificar?: string;
    accidentes?: string;
    accidentesEspecificar?: string;
    quirurgicos?: string;
    quirurgicosEspecificar?: string;
    otros?: string;
    otrosEspecificar?: string;
    alcoholismo?: string;
    alcoholismoEspecificar?: string;
    tabaquismo?: string;
    tabaquismoEspecificar?: string;
    toxicomanias?: string;
    toxicomaniasEspecificar?: string;
    alimentacionDeficiente?: string;
    alimentacionDeficienteEspecificar?: string;
    actividadFisicaDeficiente?: string;
    actividadFisicaDeficienteEspecificar?: string;
    higienePersonalDeficiente?: string;
    higienePersonalDeficienteEspecificar?: string;
    menarca?: string;
    duracionPromedio?: string;
    frecuencia?: string;
    gestas?: string;
    partos?: string;
    abortos?: string;
    fechaUltimaRegla?: string;
    dolorMenstrual?: string;
    embarazoActual?: string;
    planificacionFamiliar?: string;
    vidaSexualActiva?: string;
    fechaUltimoPpanicolaou?: string;
    fechaUltimaMastografia?: string;
    empresaAnterior1?: string;
    puestoAnterior1?: string;
    antiguedadAnterior1?: string;
    agentesAnterior1?: string;
    empresaAnterior2?: string;
    puestoAnterior2?: string;
    antiguedadAnterior2?: string;
    agentesAnterior2?: string;
    empresaAnterior3?: string;
    puestoAnterior3?: string;
    antiguedadAnterior3?: string;
    agentesAnterior3?: string;
    accidenteLaboral?: string;
    accidenteLaboralEspecificar?: string;
    descripcionDelDano?: string;
    secuelas?: string;
    resumenHistoriaClinica?: string;
    diagnosticoTexto?: string;
    // NOM-024 Fields
    codigoCIE10Principal?: string;
    codigosCIE10Complementarios?: string[];
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    // Consentimiento Diario (NOM-024)
    consentimientoDiarioId?: string;
    consentimientoDiario?: {
        _id: string;
        acceptedAt: string;
        consentMethod: 'VERBAL' | 'AUTOGRAFO';
        acceptedByUserId: string | {
            username?: string;
            nombre?: string;
        };
    };
}

export interface NotaMedica {
    _id: string;
    fechaNotaMedica: string;
    motivoConsulta?: string;
    antecedentes?: string;
    exploracionFisica?: string;
    tensionArterialSistolica?: number;
    tensionArterialDiastolica?: number;
    frecuenciaCardiaca?: number;
    frecuenciaRespiratoria?: number;
    temperatura?: number;
    saturacionOxigeno?: number;
    glucemia?: number;
    tipoMedicion?: number;
    resultadoObtenidoaTravesde?: number;
    relacionTemporalEmbarazo?: number;
    trimestreGestacional?: number;
    diagnosticoTexto?: string;
    tratamiento?: string;
    recomendaciones?: string;
    observaciones?: string;
    // NOM-024 Fields
    codigoCIE10Principal?: string;
    codigosCIE10Complementarios?: string[];
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
}

export interface NotaAclaratoria {
    _id: string;
    fechaNotaAclaratoria: string;
    motivoAclaracion: string;
    descripcionAclaracion: string;
    alcanceAclaracion: string;
    impactoClinico: string;
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    // Consentimiento Diario (NOM-024)
    consentimientoDiarioId?: string;
    consentimientoDiario?: {
        _id: string;
        acceptedAt: string;
        consentMethod: 'VERBAL' | 'AUTOGRAFO';
        acceptedByUserId: string | {
            username?: string;
            nombre?: string;
        };
    };
    documentoOrigenId: string;
    documentoOrigenTipo: string;
    documentoOrigenNombre?: string;
    documentoOrigenFecha: string;
    documentoOrigenUsuario: string;
    documentoOrigenMotivo: string;
    documentoOrigenObservaciones: string;
    documentoOrigenEstado: string;
    documentoOrigenFinalizadoPor: string;
}

export interface ControlPrenatal {
    _id: string;
    fechaInicioControlPrenatal: string;
    altura?: number;
    menarca?: number;
    ciclos?: string;
    ivsa?: number;
    gestas?: number;
    partos?: number;
    cesareas?: number;
    abortos?: number;
    fum?: string;
    fpp?: string;
    metodoPlanificacionFamiliar?: string;
    eneroFecha?: string;
    eneroFcf?: number;
    eneroSdg?: number;
    eneroFondoUterino?: number;
    eneroTia?: string;
    eneroImc?: number;
    eneroPeso?: number;
    febreroFecha?: string;
    febreroFcf?: number;
    febreroImc?: number;
    febreroPeso?: number;
    febreroSdg?: number;
    febreroFondoUterino?: number;
    febreroTia?: string;
    marzoFecha?: string;
    marzoFcf?: number;
    marzoSdg?: number;
    marzoFondoUterino?: number;
    marzoTia?: string;
    marzoImc?: number;
    marzoPeso?: number;
    abrilFecha?: string;
    abrilFcf?: number;
    abrilSdg?: number;
    abrilFondoUterino?: number;
    abrilTia?: string;
    abrilImc?: number;
    abrilPeso?: number;
    mayoFecha?: string;
    mayoFcf?: number;
    mayoSdg?: number;
    mayoFondoUterino?: number;
    mayoTia?: string;
    mayoImc?: number;
    mayoPeso?: number;
    junioFecha?: string;
    junioFcf?: number;
    junioSdg?: number;
    junioFondoUterino?: number;
    junioTia?: string;
    junioImc?: number;
    junioPeso?: number;
    julioFecha?: string;
    julioFcf?: number;
    julioSdg?: number;
    julioFondoUterino?: number;
    julioTia?: string;
    julioImc?: number;
    julioPeso?: number;
    agostoFecha?: string;
    agostoFcf?: number;
    agostoSdg?: number;
    agostoFondoUterino?: number;
    agostoTia?: string;
    agostoImc?: number;
    agostoPeso?: number;
    septiembreFecha?: string;
    septiembreFcf?: number;
    septiembreSdg?: number;
    septiembreFondoUterino?: number;
    septiembreTia?: string;
    septiembreImc?: number;
    septiembrePeso?: number;
    octubreFecha?: string;
    octubreFcf?: number;
    octubreSdg?: number;
    octubreFondoUterino?: number;
    octubreTia?: string;
    octubreImc?: number;
    octubrePeso?: number;
    noviembreFecha?: string;
    noviembreFcf?: number;
    noviembreSdg?: number;
    noviembreFondoUterino?: number;
    noviembreTia?: string;
    noviembreImc?: number;
    noviembrePeso?: number;
    diciembreFecha?: string;
    diciembreFcf?: number;
    diciembreSdg?: number;
    diciembreFondoUterino?: number;
    diciembreTia?: string;
    diciembreImc?: number;
    diciembrePeso?: number;
    observacionesPeso?: string;
    observacionesImc?: string;
    observacionesTia?: string;
    observacionesFcf?: string;
    observacionesSdg?: string;
    observacionesFondoUterino?: string;
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    // Consentimiento Diario (NOM-024)
    consentimientoDiarioId?: string;
    consentimientoDiario?: {
        _id: string;
        acceptedAt: string;
        consentMethod: 'VERBAL' | 'AUTOGRAFO';
        acceptedByUserId: string | {
            username?: string;
            nombre?: string;
        };
    };
}

export interface HistoriaOtologica {
    _id: string;
    fechaHistoriaOtologica: string;
    dolorOido: string;
    supuracionOido: string;
    mareoVertigo: string;
    zumbidoTinnitus: string;
    perdidaAudicion: string;
    oidoTapadoPlenitud: string;
    otitisFrecuentesInfancia: string;
    cirugiasOido: string;
    traumatismoCranealBarotrauma: string;
    usoAudifonos: string;
    meningitisInfeccionGraveInfancia: string;
    diabetes: string;
    enfermedadRenal: string;
    medicamentosOtotoxicos: string;
    trabajoAmbientesRuidosos: string;
    tiempoExposicionLaboral: string;
    usoProteccionAuditiva: string;
    musicaFuerteAudifonos: string;
    armasFuegoPasatiemposRuidosos: string;
    servicioMilitar: string;
    alergias: string;
    resfriadoDiaPrueba: string;
    otoscopiaOidoDerecho: string;
    otoscopiaOidoIzquierdo: string;
    resultadoCuestionario: string;
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    // Consentimiento Diario (NOM-024)
    consentimientoDiarioId?: string;
    consentimientoDiario?: {
        _id: string;
        acceptedAt: string;
        consentMethod: 'VERBAL' | 'AUTOGRAFO';
        acceptedByUserId: string | {
            username?: string;
            nombre?: string;
        };
    };
}

export interface PrevioEspirometria {
    _id: string;
    fechaPrevioEspirometria: string;
    tabaquismo: string;
    cigarrosSemana: string;
    exposicionHumosBiomasa: string;
    exposicionLaboralPolvos: string;
    exposicionVaporesGasesIrritantes: string;
    antecedentesTuberculosisInfeccionesRespiratorias: string;
    tosCronica: string;
    expectoracionFrecuente: string;
    disnea: string;
    sibilancias: string;
    hemoptisis: string;
    otrosSintomas: string;
    asma: string;
    epocBronquitisCronica: string;
    fibrosisPulmonar: string;
    apneaSueno: string;
    medicamentosActuales: string;
    medicamentosActualesEspecificar: string;
    cirugiaReciente: string;
    infeccionRespiratoriaActiva: string;
    embarazoComplicado: string;
    derramePleural: string;
    neumotorax: string;
    infartoAgudoAnginaInestable: string;
    aneurismaAorticoConocido: string;
    inestabilidadHemodinamicaGrave: string;
    hipertensionIntracraneal: string;
    desprendimientoAgudoRetina: string;
    resultadoCuestionario: string;
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    // Consentimiento Diario (NOM-024)
    consentimientoDiarioId?: string;
    consentimientoDiario?: {
        _id: string;
        acceptedAt: string;
        consentMethod: 'VERBAL' | 'AUTOGRAFO';
        acceptedByUserId: string | {
            username?: string;
            nombre?: string;
        };
    };
}

export interface Receta {
    _id: string;
    fechaReceta: string;
    tratamiento: string[];
    recomendaciones: string[] | string;
    indicaciones: string;
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    // Consentimiento Diario (NOM-024)
    consentimientoDiarioId?: string;
    consentimientoDiario?: {
        _id: string;
        acceptedAt: string;
        consentMethod: 'VERBAL' | 'AUTOGRAFO';
        acceptedByUserId: string | {
            username?: string;
            nombre?: string;
        };
    };
}

export interface ConstanciaAptitud {
    _id: string;
    fechaConstanciaAptitud: string;
    idTrabajador: string;
    rutaPDF: string;
    pdfStatus?: PdfStatus;
    createdBy: string;
    updatedBy: string;
    // NOM-024 Fields
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
}

export interface EntrevistaPsicologica {
    _id: string;
    fechaEntrevistaPsicologica: string;
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    fechaAnulacion?: string;
    anuladoPor?: string;
    razonAnulacion?: string;
    apariencia: string;
    actitudHaciaEvaluador: string;
    nivelCooperacion: string;
    contactoVisual: string;
    conductaMotora: string;
    estadoAnimoPredominante: string;
    afecto: string;
    intensidadEmocional: string;
    cursoPensamiento: string;
    alteracionesPensamiento: string;
    descripcionAlteracionesPensamiento: string;
    alteracionesPerceptuales: string;
    descripcionAlteracionesPerceptuales: string;
    orientacion: string;
    atencionConcentracion: string;
    memoria: string;
    juicio: string;
    concienciaEstado: string;
    relacionesInterpersonales: string;
    desempenoLaboralAutorreporte: string;
    manejoEstres: string;
    ideacionSuicida: string;
    observacionesIdeacionSuicida: string;
    conclusionClinica: string;
}

export interface TrastornosEstadoAnimo {
    _id: string;
    fechaTrastornosEstadoAnimo: string;
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    fechaAnulacion?: string;
    anuladoPor?: string;
    razonAnulacion?: string;
    p1ExaltadoComportamientoNoHabitualOMetidoProblemas?: string;
    p1IrritableGritosPeleas?: string;
    p1MasSeguridadQueLoHabitual?: string;
    p1DormiaMenosSinNecesitarMasSueno?: string;
    p1HablabaMasOMasRapido?: string;
    p1PensamientosAgolpados?: string;
    p1DistraccionDificultadConcentracion?: string;
    p1MasEnergiaQueLoHabitual?: string;
    p1MasActivoOMasCosasQueLoHabitual?: string;
    p1MasSocialExtrovertido?: string;
    p1MasApetitoSexual?: string;
    p1CosasExageradasRiesgosas?: string;
    p1GastoDineroProblemas?: string;
    p2SituacionesMismoPeriodo?: string;
    p3NivelProblemaCausado?: string;
    p4FamiliarDirectoBipolar?: string;
    p5DiagnosticoProfesionalBipolar?: string;
}

export interface CuestionarioProdromalBreve {
    _id: string;
    fechaCuestionarioProdromalBreve: string;
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    fechaAnulacion?: string;
    anuladoPor?: string;
    razonAnulacion?: string;
    p1?: string;
    p1GradoAcuerdoStatement?: string;
    p2?: string;
    p2GradoAcuerdoStatement?: string;
    p3?: string;
    p3GradoAcuerdoStatement?: string;
    p4?: string;
    p4GradoAcuerdoStatement?: string;
    p5?: string;
    p5GradoAcuerdoStatement?: string;
    p6?: string;
    p6GradoAcuerdoStatement?: string;
    p7?: string;
    p7GradoAcuerdoStatement?: string;
    p8?: string;
    p8GradoAcuerdoStatement?: string;
    p9?: string;
    p9GradoAcuerdoStatement?: string;
    p10?: string;
    p10GradoAcuerdoStatement?: string;
    p11?: string;
    p11GradoAcuerdoStatement?: string;
    p12?: string;
    p12GradoAcuerdoStatement?: string;
    p13?: string;
    p13GradoAcuerdoStatement?: string;
    p14?: string;
    p14GradoAcuerdoStatement?: string;
    p15?: string;
    p15GradoAcuerdoStatement?: string;
    p16?: string;
    p16GradoAcuerdoStatement?: string;
    p17?: string;
    p17GradoAcuerdoStatement?: string;
    p18?: string;
    p18GradoAcuerdoStatement?: string;
    p19?: string;
    p19GradoAcuerdoStatement?: string;
    p20?: string;
    p20GradoAcuerdoStatement?: string;
    p21?: string;
    p21GradoAcuerdoStatement?: string;
}

export interface TrastornoLimitePersonalidad {
    _id: string;
    fechaTrastornoLimitePersonalidad: string;
    estado?: DocumentoEstado;
    fechaFinalizacion?: string;
    finalizadoPor?: string;
    fechaAnulacion?: string;
    anuladoPor?: string;
    razonAnulacion?: string;
    relacionesCercanasDiscusionesRupturas?: string;
    autolesionIntentoSuicidio?: string;
    impulsividadOtrosDosProblemas?: string;
    extremadamenteMalHumor?: string;
    enojadoFrecuenteActuaEnojadoSarcastico?: string;
    desconfianzaOtrasPersonas?: string;
    sensacionIrrealidadEntornoIrreal?: string;
    vacioCronico?: string;
    faltaIdentidadQuienEs?: string;
    esfuerzosEvitarAbandono?: string;
}

export interface CondicionControlResumenInformeLongitudinal {
  presente?: boolean;
  estadoActual?: string;
  /** Última visita con dato relevante (motor ESC): hallazgo, alteración o control. */
  codigoEstadoVigencia?: string;
  razonUltimaVisita?: string;
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
  tendencia?: string;
}

export interface ResumenIndicadoresLongitudinalEsc {
  tensionArterialSistolica?: ResumenIndicadorLongitudinalEsc;
  tensionArterialDiastolica?: ResumenIndicadorLongitudinalEsc;
  peso?: ResumenIndicadorLongitudinalEsc;
  indiceMasaCorporal?: ResumenIndicadorLongitudinalEsc;
  glucosaMgDl?: ResumenIndicadorLongitudinalEsc;
  hba1cPorcentaje?: ResumenIndicadorLongitudinalEsc;
}

export interface EventoConcentradoCardiometabolicoEsc {
  idEventoOriginal?: string;
  fechaControl?: string;
  diagnosticosActivos?: string[];
  signosVitales?: SignosVitalesCardiometabolicoEsc;
  somatometria?: SomatometriaCardiometabolicoEsc;
  laboratorio?: LaboratorioCardiometabolicoEsc;
  tratamientoActual?: TratamientoActualCardiometabolicoEsc[];
  estadoCondiciones?: EstadoCondicionesCardiometabolicasEvento;
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
  nivelRiesgoLongitudinal?: string;
  /** Trayectoria agregada del periodo (Favorable, Estable, …). */
  tendenciaLongitudinal?: string;
  interpretacionRiesgoLongitudinal?: string;
  /** Viñetas de contexto terapéutico; solo en evidencia clínica de soporte. */
  contextoTerapeutico?: string[];
  graficaEvolucionGlucemica?: string;
  graficaEvolucionPresionArterial?: string;
  graficaEvolucionPesoImc?: string;
  graficaEvolucionPerfilLipidico?: string;
  rutaPDF?: string;
  pdfStatus?: PdfStatus;
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: string;
  updatedAt?: string;
  estado?: DocumentoEstado;
  fechaFinalizacion?: string;
  finalizadoPor?: string;
  fechaAnulacion?: string;
  anuladoPor?: string;
  razonAnulacion?: string;
}
