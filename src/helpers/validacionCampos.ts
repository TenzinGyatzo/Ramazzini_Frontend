import {
  esOpcionNivelProblemaP3,
  indicePasoP3Mdq,
  indicePasoP4Mdq,
  indicePasoP5Mdq,
  requierePaso15SituacionesMismoPeriodo,
} from '@/helpers/trastornosEstadoAnimoSteps';

// Helper para validar campos requeridos según el tipo de documento
export interface CampoFaltante {
  nombre: string;
  tipo: string;
  paso?: number;
}

export interface ValidacionResultado {
  esValido: boolean;
  camposFaltantes: CampoFaltante[];
}

// Función para verificar si un valor está vacío o es inválido
function esValorVacio(valor: any): boolean {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === 'string') return valor.trim() === '';
  if (typeof valor === 'number') return isNaN(valor);
  if (Array.isArray(valor)) return valor.length === 0;
  return false;
}

// Función para validar campos de fecha
function validarFecha(fecha: any): boolean {
  if (esValorVacio(fecha)) return false;
  if (typeof fecha === 'string') {
    // Verificar si es una fecha válida en formato ISO o YYYY-MM-DD
    const date = new Date(fecha);
    return !isNaN(date.getTime());
  }
  return fecha instanceof Date && !isNaN(fecha.getTime());
}

// Función para validar campos numéricos
function validarNumero(numero: any): boolean {
  if (esValorVacio(numero)) return false;
  const num = Number(numero);
  return !isNaN(num) && isFinite(num);
}

// Función para validar campos de texto
function validarTexto(texto: any): boolean {
  if (esValorVacio(texto)) return false;
  return typeof texto === 'string' && texto.trim().length > 0;
}

// Función para validar listas de texto (mínimo un elemento no vacío)
function validarListaTexto(lista: any): boolean {
  if (!Array.isArray(lista) || lista.length === 0) return false;
  return lista.every(item => typeof item === 'string' && item.trim().length > 0);
}

// Función para validar campos de selección
function validarSeleccion(seleccion: any): boolean {
  if (esValorVacio(seleccion)) return false;
  return typeof seleccion === 'string' && seleccion.trim().length > 0;
}

/** Sí / No (coincide con enums del backend) */
function validarSiNo(valor: any): boolean {
  return valor === 'Sí' || valor === 'No';
}

/** Obligatorio solo si `alteracionesPensamiento === 'Sí'` */
function validarDescripcionAlteracionesPensamientoSiAplica(valor: any, datos?: any): boolean {
  if (!datos || datos.alteracionesPensamiento !== 'Sí') return true;
  return validarTexto(valor);
}

/** Obligatorio solo si `alteracionesPerceptuales === 'Sí'` */
function validarDescripcionAlteracionesPerceptualesSiAplica(valor: any, datos?: any): boolean {
  if (!datos || datos.alteracionesPerceptuales !== 'Sí') return true;
  return validarTexto(valor);
}

/** Obligatorio solo si `ideacionSuicida === 'Sí'` */
function validarObservacionesIdeacionSuicidaSiAplica(valor: any, datos?: any): boolean {
  if (!datos || datos.ideacionSuicida !== 'Sí') return true;
  return validarTexto(valor);
}

/** Obligatorio solo si el paso 15 MDQ está activo (≥2 "Sí" en P1) */
function validarP2SituacionesMismoPeriodoSiAplica(valor: any, datos?: any): boolean {
  if (!datos || !requierePaso15SituacionesMismoPeriodo(datos)) return true;
  return validarSiNo(valor);
}

function validarP3NivelProblemaCausado(valor: any): boolean {
  return esOpcionNivelProblemaP3(valor);
}

/** Coincide con `gradoAcuerdoStatementSiOpciones` en cuestionario-prodromal-breve.schema.ts */
const GRADO_ACUERDO_PRODROMAL_OPCIONES = [
  'Totalmente en desacuerdo',
  'En desacuerdo',
  'Neutral',
  'De acuerdo',
  'Totalmente de acuerdo',
] as const;

/** Obligatorio solo si la pregunta PQ-B `pn` es `Sí` (p.ej. pn = 'p1') */
function validarProdromalGradoSiPN(pn: string) {
  return (valor: any, datos?: any): boolean => {
    if (!datos || datos[pn] !== 'Sí') return true;
    return typeof valor === 'string' && GRADO_ACUERDO_PRODROMAL_OPCIONES.includes(valor as any);
  };
}

// Definición de campos requeridos por tipo de documento
const camposRequeridosPorTipo: Record<
  string,
  Array<{
    campo: string;
    nombre: string;
    tipo: string;
    paso?: number | ((datosFormulario: any) => number);
    /** El segundo argumento es opcional: datos completos del formulario para reglas condicionales */
    validacion?: (valor: any, datosFormulario?: any) => boolean;
  }>
> = {
  antidoping: [
    { campo: 'fechaAntidoping', nombre: 'Fecha de la prueba', tipo: 'fecha', paso: 1, validacion: validarFecha },
    { campo: 'marihuana', nombre: 'Resultados', tipo: 'seleccion', paso: 2, validacion: validarSeleccion }
  ],
  
  aptitud: [
    { campo: 'fechaAptitudPuesto', nombre: 'Fecha del informe ', tipo: 'fecha', paso: 1, validacion: validarFecha },
    { campo: 'aptitudPuesto', nombre: 'Aptitud al Puesto', tipo: 'seleccion', paso: 8, validacion: validarSeleccion },
    { campo: 'alteracionesSalud', nombre: 'Alteraciones de Salud', tipo: 'texto', paso: 9, validacion: validarTexto },
    { campo: 'resultados', nombre: 'Resultados', tipo: 'texto', paso: 10, validacion: validarTexto },
    { campo: 'medidasPreventivas', nombre: 'Medidas Preventivas', tipo: 'texto', paso: 11, validacion: validarTexto },
  ],
  
  audiometria: [
    { campo: 'fechaAudiometria', nombre: 'Fecha de audiometría', tipo: 'fecha', paso: 1, validacion: validarFecha },
    { campo: 'metodoAudiometria', nombre: 'Método de audiometría', tipo: 'seleccion', paso: 1, validacion: validarSeleccion },
    { campo: 'oidoDerecho125', nombre: 'Valores oido derecho', tipo: 'medida', paso: 2, validacion: validarNumero },
    { campo: 'oidoIzquierdo125', nombre: 'Valores oido izquierdo', tipo: 'medida', paso: 3, validacion: validarNumero },
    { campo: 'diagnosticoAudiometria', nombre: 'Diagnóstico', tipo: 'texto', paso: 6, validacion: validarTexto },
  ],
  
  certificado: [
    { campo: 'fechaCertificado', nombre: 'Fecha del Certificado', tipo: 'fecha', paso: 1, validacion: validarFecha },
    { campo: 'impedimentosFisicos', nombre: 'Impedimentos Físicos', tipo: 'texto', paso: 2, validacion: validarTexto }
  ],
  
  certificadoExpedito: [
    { campo: 'fechaCertificadoExpedito', nombre: 'Fecha del certificado', tipo: 'fecha', paso: 1, validacion: validarFecha },
    { campo: 'cuerpoCertificado', nombre: 'Cuerpo del certificado', tipo: 'texto', paso: 2, validacion: validarTexto },
    { campo: 'tensionArterialSistolica', nombre: 'Tensión Arterial', tipo: 'medida', paso: 3, validacion: validarNumero },
    { campo: 'frecuenciaCardiaca', nombre: 'Frecuencia Cardíaca', tipo: 'medida', paso: 3, validacion: validarNumero },
    { campo: 'frecuenciaRespiratoria', nombre: 'Frecuencia Respiratoria', tipo: 'medida', paso: 3, validacion: validarNumero },
    { campo: 'temperaturaCorporal', nombre: 'Temperatura Corporal', tipo: 'medida', paso: 3, validacion: validarNumero },
    { campo: 'peso', nombre: 'Peso', tipo: 'medida', paso: 4, validacion: validarNumero },
    { campo: 'altura', nombre: 'Altura', tipo: 'medida', paso: 4, validacion: validarNumero },
    { campo: 'impedimentosFisicos', nombre: 'Impedimentos Físicos', tipo: 'texto', paso: 5, validacion: validarTexto },
    { campo: 'gradoSalud', nombre: 'Grado de Salud', tipo: 'seleccion', paso: 6, validacion: validarSeleccion },
    { campo: 'aptitudPuesto', nombre: 'Aptitud Puesto', tipo: 'seleccion', paso: 7, validacion: validarSeleccion },
  ],
  
  examenVista: [
    { campo: 'fechaExamenVista', nombre: 'Fecha de examen de vista', tipo: 'fecha', paso: 1, validacion: validarFecha },
    { campo: 'sinCorreccionLejanaInterpretacion', nombre: 'Agudeza visual lejana sin lentes', tipo: 'seleccion', paso: 2, validacion: validarSeleccion },
    { campo: 'sinCorreccionCercanaInterpretacion', nombre: 'Agudeza visual cercana sin lentes', tipo: 'seleccion', paso: 3, validacion: validarSeleccion },
    { campo: 'interpretacionIshihara', nombre: 'Prueba de Ishihara', tipo: 'seleccion', paso: 6, validacion: validarSeleccion },
  ],
  
  exploracionFisica: [
    { campo: 'fechaExploracionFisica', nombre: 'Fecha de exploración física', tipo: 'fecha', paso: 1, validacion: validarFecha },
    { campo: 'peso', nombre: 'Peso', tipo: 'medida', paso: 2, validacion: validarNumero },
    { campo: 'altura', nombre: 'Altura', tipo: 'medida', paso: 2, validacion: validarNumero },
    { campo: 'indiceMasaCorporal', nombre: 'IMC', tipo: 'medida', paso: 2, validacion: validarNumero },
    { campo: 'circunferenciaCintura', nombre: 'Circunferencia Cintura', tipo: 'medida', paso: 2, validacion: validarNumero },
    { campo: 'tensionArterialSistolica', nombre: 'Tensión Arterial', tipo: 'medida', paso: 3, validacion: validarNumero },
    { campo: 'frecuenciaCardiaca', nombre: 'Frecuencia Cardíaca', tipo: 'medida', paso: 3, validacion: validarNumero },
    { campo: 'frecuenciaRespiratoria', nombre: 'Frecuencia Respiratoria', tipo: 'medida', paso: 3, validacion: validarNumero },
    { campo: 'saturacionOxigeno', nombre: 'Saturación de Oxígeno', tipo: 'medida', paso: 3, validacion: validarNumero },
  ],
  
  historiaClinica: [
    { campo: 'motivoExamen', nombre: 'Motivo del examen', tipo: 'seleccion', paso: 1, validacion: validarSeleccion },
    { campo: 'fechaHistoriaClinica', nombre: 'Fecha de historia clínica', tipo: 'fecha', paso: 1, validacion: validarFecha },
    { campo: 'resumenHistoriaClinica', nombre: 'Resumen de historia clínica', tipo: 'texto', paso: 32, validacion: validarTexto }
  ],
  
  notaMedica: [
    { campo: 'fechaNotaMedica', nombre: 'Fecha de la nota médica', tipo: 'fecha', paso: 1, validacion: validarFecha },
    { campo: 'motivoConsulta', nombre: 'Motivo de consulta', tipo: 'texto', paso: 2, validacion: validarTexto },
    { campo: 'diagnostico', nombre: 'Diagnóstico', tipo: 'texto', paso: 6, validacion: validarTexto }
  ],
  
  controlPrenatal: [
    { campo: 'fechaInicioControlPrenatal', nombre: 'Fecha de inicio del control prenatal', tipo: 'fecha', paso: 1, validacion: validarFecha },
  ],
  
  historiaOtologica: [
    { campo: 'fechaHistoriaOtologica', nombre: 'Fecha de historia otológica', tipo: 'fecha', paso: 1, validacion: validarFecha },
  ],
  
  previoEspirometria: [
    { campo: 'fechaPrevioEspirometria', nombre: 'Fecha del cuestionario', tipo: 'fecha', paso: 1, validacion: validarFecha },
  ],

  receta: [
    { campo: 'fechaReceta', nombre: 'Fecha de la receta', tipo: 'fecha', paso: 1, validacion: validarFecha },
    { campo: 'tratamiento', nombre: 'Tratamiento', tipo: 'lista', paso: 2, validacion: validarListaTexto },
  ],

  entrevistaPsicologica: [
    { campo: 'fechaEntrevistaPsicologica', nombre: 'Fecha de la entrevista psicológica', tipo: 'fecha', paso: 1, validacion: validarFecha },
    { campo: 'apariencia', nombre: 'Apariencia', tipo: 'seleccion', paso: 2, validacion: validarSeleccion },
    { campo: 'actitudHaciaEvaluador', nombre: 'Actitud hacia el evaluador', tipo: 'seleccion', paso: 3, validacion: validarSeleccion },
    { campo: 'nivelCooperacion', nombre: 'Nivel de cooperación', tipo: 'seleccion', paso: 4, validacion: validarSeleccion },
    { campo: 'contactoVisual', nombre: 'Contacto visual', tipo: 'seleccion', paso: 5, validacion: validarSeleccion },
    { campo: 'conductaMotora', nombre: 'Conducta motora', tipo: 'seleccion', paso: 6, validacion: validarSeleccion },
    { campo: 'estadoAnimoPredominante', nombre: 'Estado de ánimo predominante', tipo: 'seleccion', paso: 7, validacion: validarSeleccion },
    { campo: 'afecto', nombre: 'Afecto', tipo: 'seleccion', paso: 8, validacion: validarSeleccion },
    { campo: 'intensidadEmocional', nombre: 'Intensidad emocional', tipo: 'seleccion', paso: 9, validacion: validarSeleccion },
    { campo: 'cursoPensamiento', nombre: 'Curso del pensamiento', tipo: 'seleccion', paso: 10, validacion: validarSeleccion },
    { campo: 'alteracionesPensamiento', nombre: 'Alteraciones del pensamiento', tipo: 'seleccion', paso: 11, validacion: validarSeleccion },
    { campo: 'descripcionAlteracionesPensamiento', nombre: 'Descripción de alteraciones del pensamiento', tipo: 'texto', paso: 11, validacion: validarDescripcionAlteracionesPensamientoSiAplica },
    { campo: 'alteracionesPerceptuales', nombre: 'Alteraciones perceptuales', tipo: 'seleccion', paso: 12, validacion: validarSeleccion },
    { campo: 'descripcionAlteracionesPerceptuales', nombre: 'Descripción de alteraciones perceptuales', tipo: 'texto', paso: 12, validacion: validarDescripcionAlteracionesPerceptualesSiAplica },
    { campo: 'orientacion', nombre: 'Orientación', tipo: 'seleccion', paso: 13, validacion: validarSeleccion },
    { campo: 'atencionConcentracion', nombre: 'Atención y concentración', tipo: 'seleccion', paso: 14, validacion: validarSeleccion },
    { campo: 'memoria', nombre: 'Memoria', tipo: 'seleccion', paso: 15, validacion: validarSeleccion },
    { campo: 'juicio', nombre: 'Juicio', tipo: 'seleccion', paso: 16, validacion: validarSeleccion },
    { campo: 'concienciaEstado', nombre: 'Conciencia de estado', tipo: 'seleccion', paso: 17, validacion: validarSeleccion },
    { campo: 'relacionesInterpersonales', nombre: 'Relaciones interpersonales', tipo: 'seleccion', paso: 18, validacion: validarSeleccion },
    { campo: 'desempenoLaboralAutorreporte', nombre: 'Desempeño laboral (autorreporte)', tipo: 'seleccion', paso: 19, validacion: validarSeleccion },
    { campo: 'manejoEstres', nombre: 'Manejo del estrés', tipo: 'seleccion', paso: 20, validacion: validarSeleccion },
    { campo: 'ideacionSuicida', nombre: 'Ideación suicida', tipo: 'seleccion', paso: 21, validacion: validarSeleccion },
    { campo: 'observacionesIdeacionSuicida', nombre: 'Observaciones (ideación suicida)', tipo: 'texto', paso: 21, validacion: validarObservacionesIdeacionSuicidaSiAplica },
    { campo: 'conclusionClinica', nombre: 'Conclusión clínica', tipo: 'texto', paso: 22, validacion: validarTexto },
  ],

  trastornosEstadoAnimo: [
    { campo: 'fechaTrastornosEstadoAnimo', nombre: 'Fecha de los trastornos del estado de ánimo', tipo: 'fecha', paso: 1, validacion: validarFecha },
    {
      campo: 'p1ExaltadoComportamientoNoHabitualOMetidoProblemas',
      nombre: 'MDQ P1: exaltación o comportamiento no habitual',
      tipo: 'seleccion',
      paso: 2,
      validacion: validarSiNo,
    },
    {
      campo: 'p1IrritableGritosPeleas',
      nombre: 'MDQ P1: irritable, gritos o peleas',
      tipo: 'seleccion',
      paso: 3,
      validacion: validarSiNo,
    },
    {
      campo: 'p1MasSeguridadQueLoHabitual',
      nombre: 'MDQ P1: más seguridad en sí mismo',
      tipo: 'seleccion',
      paso: 4,
      validacion: validarSiNo,
    },
    {
      campo: 'p1DormiaMenosSinNecesitarMasSueno',
      nombre: 'MDQ P1: dormía menos sin necesitar más sueño',
      tipo: 'seleccion',
      paso: 5,
      validacion: validarSiNo,
    },
    {
      campo: 'p1HablabaMasOMasRapido',
      nombre: 'MDQ P1: hablaba más o más rápido',
      tipo: 'seleccion',
      paso: 6,
      validacion: validarSiNo,
    },
    {
      campo: 'p1PensamientosAgolpados',
      nombre: 'MDQ P1: pensamientos agolpados',
      tipo: 'seleccion',
      paso: 7,
      validacion: validarSiNo,
    },
    {
      campo: 'p1DistraccionDificultadConcentracion',
      nombre: 'MDQ P1: distracción o dificultad de concentración',
      tipo: 'seleccion',
      paso: 8,
      validacion: validarSiNo,
    },
    {
      campo: 'p1MasEnergiaQueLoHabitual',
      nombre: 'MDQ P1: más energía que lo habitual',
      tipo: 'seleccion',
      paso: 9,
      validacion: validarSiNo,
    },
    {
      campo: 'p1MasActivoOMasCosasQueLoHabitual',
      nombre: 'MDQ P1: más activo o más cosas que lo habitual',
      tipo: 'seleccion',
      paso: 10,
      validacion: validarSiNo,
    },
    {
      campo: 'p1MasSocialExtrovertido',
      nombre: 'MDQ P1: más social o extrovertido',
      tipo: 'seleccion',
      paso: 11,
      validacion: validarSiNo,
    },
    {
      campo: 'p1MasApetitoSexual',
      nombre: 'MDQ P1: más apetito sexual',
      tipo: 'seleccion',
      paso: 12,
      validacion: validarSiNo,
    },
    {
      campo: 'p1CosasExageradasRiesgosas',
      nombre: 'MDQ P1: conductas exageradas o riesgosas',
      tipo: 'seleccion',
      paso: 13,
      validacion: validarSiNo,
    },
    {
      campo: 'p1GastoDineroProblemas',
      nombre: 'MDQ P1: gasto de dinero con problemas',
      tipo: 'seleccion',
      paso: 14,
      validacion: validarSiNo,
    },
    {
      campo: 'p2SituacionesMismoPeriodo',
      nombre: 'MDQ P2: situaciones en el mismo período',
      tipo: 'seleccion',
      paso: 15,
      validacion: validarP2SituacionesMismoPeriodoSiAplica,
    },
    {
      campo: 'p3NivelProblemaCausado',
      nombre: 'MDQ P3: nivel de problema causado por las situaciones',
      tipo: 'seleccion',
      paso: (datos) => indicePasoP3Mdq(datos),
      validacion: validarP3NivelProblemaCausado,
    },
    {
      campo: 'p4FamiliarDirectoBipolar',
      nombre: 'MDQ P4: familiar directo con trastorno bipolar o maníaco-depresivo',
      tipo: 'seleccion',
      paso: (datos) => indicePasoP4Mdq(datos),
      validacion: validarSiNo,
    },
    {
      campo: 'p5DiagnosticoProfesionalBipolar',
      nombre: 'MDQ P5: diagnóstico profesional de trastorno bipolar o maníaco-depresivo',
      tipo: 'seleccion',
      paso: (datos) => indicePasoP5Mdq(datos),
      validacion: validarSiNo,
    },
  ],

  cuestionarioProdromalBreve: [
    { campo: 'fechaCuestionarioProdromalBreve', nombre: 'Fecha del cuestionario prodromal breve', tipo: 'fecha', paso: 1, validacion: validarFecha },
    {
      campo: 'p1',
      nombre: 'PQ-B P1: ambientes conocidos extraños o irreales',
      tipo: 'seleccion',
      paso: 2,
      validacion: validarSiNo,
    },
    {
      campo: 'p1GradoAcuerdoStatement',
      nombre: 'PQ-B P1: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 2,
      validacion: validarProdromalGradoSiPN('p1'),
    },
    {
      campo: 'p2',
      nombre: 'PQ-B P2: sonidos inusuales en los oídos',
      tipo: 'seleccion',
      paso: 3,
      validacion: validarSiNo,
    },
    {
      campo: 'p2GradoAcuerdoStatement',
      nombre: 'PQ-B P2: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 3,
      validacion: validarProdromalGradoSiPN('p2'),
    },
    {
      campo: 'p3',
      nombre: 'PQ-B P3: percepción visual diferente a lo habitual',
      tipo: 'seleccion',
      paso: 4,
      validacion: validarSiNo,
    },
    {
      campo: 'p3GradoAcuerdoStatement',
      nombre: 'PQ-B P3: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 4,
      validacion: validarProdromalGradoSiPN('p3'),
    },
    {
      campo: 'p4',
      nombre: 'PQ-B P4: telepatía, vidente o adivino',
      tipo: 'seleccion',
      paso: 5,
      validacion: validarSiNo,
    },
    {
      campo: 'p4GradoAcuerdoStatement',
      nombre: 'PQ-B P4: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 5,
      validacion: validarProdromalGradoSiPN('p4'),
    },
    {
      campo: 'p5',
      nombre: 'PQ-B P5: control de ideas o pensamientos',
      tipo: 'seleccion',
      paso: 6,
      validacion: validarSiNo,
    },
    {
      campo: 'p5GradoAcuerdoStatement',
      nombre: 'PQ-B P5: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 6,
      validacion: validarProdromalGradoSiPN('p5'),
    },
    {
      campo: 'p6',
      nombre: 'PQ-B P6: dificultad para seguir el tema al hablar',
      tipo: 'seleccion',
      paso: 7,
      validacion: validarSiNo,
    },
    {
      campo: 'p6GradoAcuerdoStatement',
      nombre: 'PQ-B P6: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 7,
      validacion: validarProdromalGradoSiPN('p6'),
    },
    {
      campo: 'p7',
      nombre: 'PQ-B P7: dones o talentos inusuales',
      tipo: 'seleccion',
      paso: 8,
      validacion: validarSiNo,
    },
    {
      campo: 'p7GradoAcuerdoStatement',
      nombre: 'PQ-B P7: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 8,
      validacion: validarProdromalGradoSiPN('p7'),
    },
    {
      campo: 'p8',
      nombre: 'PQ-B P8: sensación de ser observado o hablado de él',
      tipo: 'seleccion',
      paso: 9,
      validacion: validarSiNo,
    },
    {
      campo: 'p8GradoAcuerdoStatement',
      nombre: 'PQ-B P8: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 9,
      validacion: validarProdromalGradoSiPN('p8'),
    },
    {
      campo: 'p9',
      nombre: 'PQ-B P9: sensaciones en la piel tipo bichos reptando',
      tipo: 'seleccion',
      paso: 10,
      validacion: validarSiNo,
    },
    {
      campo: 'p9GradoAcuerdoStatement',
      nombre: 'PQ-B P9: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 10,
      validacion: validarProdromalGradoSiPN('p9'),
    },
    {
      campo: 'p10',
      nombre: 'PQ-B P10: distracción por sonidos distantes',
      tipo: 'seleccion',
      paso: 11,
      validacion: validarSiNo,
    },
    {
      campo: 'p10GradoAcuerdoStatement',
      nombre: 'PQ-B P10: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 11,
      validacion: validarProdromalGradoSiPN('p10'),
    },
    {
      campo: 'p11',
      nombre: 'PQ-B P11: persona o fuerza invisible alrededor',
      tipo: 'seleccion',
      paso: 12,
      validacion: validarSiNo,
    },
    {
      campo: 'p11GradoAcuerdoStatement',
      nombre: 'PQ-B P11: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 12,
      validacion: validarProdromalGradoSiPN('p11'),
    },
    {
      campo: 'p12',
      nombre: 'PQ-B P12: preocupación de que algo vaya mal en la mente',
      tipo: 'seleccion',
      paso: 13,
      validacion: validarSiNo,
    },
    {
      campo: 'p12GradoAcuerdoStatement',
      nombre: 'PQ-B P12: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 13,
      validacion: validarProdromalGradoSiPN('p12'),
    },
    {
      campo: 'p13',
      nombre: 'PQ-B P13: no existir, mundo inexistente o estar muerto',
      tipo: 'seleccion',
      paso: 14,
      validacion: validarSiNo,
    },
    {
      campo: 'p13GradoAcuerdoStatement',
      nombre: 'PQ-B P13: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 14,
      validacion: validarProdromalGradoSiPN('p13'),
    },
    {
      campo: 'p14',
      nombre: 'PQ-B P14: confusión real o imaginario',
      tipo: 'seleccion',
      paso: 15,
      validacion: validarSiNo,
    },
    {
      campo: 'p14GradoAcuerdoStatement',
      nombre: 'PQ-B P14: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 15,
      validacion: validarProdromalGradoSiPN('p14'),
    },
    {
      campo: 'p15',
      nombre: 'PQ-B P15: creencias extrañas o inusuales',
      tipo: 'seleccion',
      paso: 16,
      validacion: validarSiNo,
    },
    {
      campo: 'p15GradoAcuerdoStatement',
      nombre: 'PQ-B P15: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 16,
      validacion: validarProdromalGradoSiPN('p15'),
    },
    {
      campo: 'p16',
      nombre: 'PQ-B P16: cambios en el cuerpo o funcionamiento distinto',
      tipo: 'seleccion',
      paso: 17,
      validacion: validarSiNo,
    },
    {
      campo: 'p16GradoAcuerdoStatement',
      nombre: 'PQ-B P16: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 17,
      validacion: validarProdromalGradoSiPN('p16'),
    },
    {
      campo: 'p17',
      nombre: 'PQ-B P17: pensamientos tan intensos que casi se oyen',
      tipo: 'seleccion',
      paso: 18,
      validacion: validarSiNo,
    },
    {
      campo: 'p17GradoAcuerdoStatement',
      nombre: 'PQ-B P17: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 18,
      validacion: validarProdromalGradoSiPN('p17'),
    },
    {
      campo: 'p18',
      nombre: 'PQ-B P18: recelo y desconfianza hacia otras personas',
      tipo: 'seleccion',
      paso: 19,
      validacion: validarSiNo,
    },
    {
      campo: 'p18GradoAcuerdoStatement',
      nombre: 'PQ-B P18: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 19,
      validacion: validarProdromalGradoSiPN('p18'),
    },
    {
      campo: 'p19',
      nombre: 'PQ-B P19: flashes, luces o figuras geométricas',
      tipo: 'seleccion',
      paso: 20,
      validacion: validarSiNo,
    },
    {
      campo: 'p19GradoAcuerdoStatement',
      nombre: 'PQ-B P19: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 20,
      validacion: validarProdromalGradoSiPN('p19'),
    },
    {
      campo: 'p20',
      nombre: 'PQ-B P20: cosas que otros no ven',
      tipo: 'seleccion',
      paso: 21,
      validacion: validarSiNo,
    },
    {
      campo: 'p20GradoAcuerdoStatement',
      nombre: 'PQ-B P20: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 21,
      validacion: validarProdromalGradoSiPN('p20'),
    },
    {
      campo: 'p21',
      nombre: 'PQ-B P21: dificultad de otros para entenderle',
      tipo: 'seleccion',
      paso: 22,
      validacion: validarSiNo,
    },
    {
      campo: 'p21GradoAcuerdoStatement',
      nombre: 'PQ-B P21: grado de acuerdo (si contestó Sí)',
      tipo: 'seleccion',
      paso: 22,
      validacion: validarProdromalGradoSiPN('p21'),
    },
  ],

  trastornoLimitePersonalidad: [
    { campo: 'fechaTrastornoLimitePersonalidad', nombre: 'Fecha del trastorno límite de personalidad', tipo: 'fecha', paso: 1, validacion: validarFecha },
    {
      campo: 'relacionesCercanasDiscusionesRupturas',
      nombre: 'Relaciones cercanas (discusiones o rupturas repetidas)',
      tipo: 'seleccion',
      paso: 2,
      validacion: validarSiNo,
    },
    {
      campo: 'autolesionIntentoSuicidio',
      nombre: 'Autolesión deliberada o intento de suicidio',
      tipo: 'seleccion',
      paso: 3,
      validacion: validarSiNo,
    },
    {
      campo: 'impulsividadOtrosDosProblemas',
      nombre: 'Otros problemas de impulsividad',
      tipo: 'seleccion',
      paso: 4,
      validacion: validarSiNo,
    },
    {
      campo: 'extremadamenteMalHumor',
      nombre: 'Extremadamente de mal humor',
      tipo: 'seleccion',
      paso: 5,
      validacion: validarSiNo,
    },
    {
      campo: 'enojadoFrecuenteActuaEnojadoSarcastico',
      nombre: 'Enfado frecuente o comportamiento enojado/sarcástico',
      tipo: 'seleccion',
      paso: 6,
      validacion: validarSiNo,
    },
    {
      campo: 'desconfianzaOtrasPersonas',
      nombre: 'Desconfianza hacia otras personas',
      tipo: 'seleccion',
      paso: 7,
      validacion: validarSiNo,
    },
    {
      campo: 'sensacionIrrealidadEntornoIrreal',
      nombre: 'Sensación de irrealidad o entorno irreal',
      tipo: 'seleccion',
      paso: 8,
      validacion: validarSiNo,
    },
    {
      campo: 'vacioCronico',
      nombre: 'Vacío crónico',
      tipo: 'seleccion',
      paso: 9,
      validacion: validarSiNo,
    },
    {
      campo: 'faltaIdentidadQuienEs',
      nombre: 'Falta de identidad o no saber quién es',
      tipo: 'seleccion',
      paso: 10,
      validacion: validarSiNo,
    },
    {
      campo: 'esfuerzosEvitarAbandono',
      nombre: 'Esfuerzos por evitar abandono',
      tipo: 'seleccion',
      paso: 11,
      validacion: validarSiNo,
    },
  ],

  eventoSeguimientoCardiometabolico: [
    {
      campo: 'fechaEventoSeguimientoCardiometabolico',
      nombre: 'Fecha de seguimiento cardiometabólico',
      tipo: 'fecha',
      paso: 1,
      validacion: validarFecha,
    },
    {
      campo: 'motivoSeguimiento',
      nombre: 'Motivo del seguimiento',
      tipo: 'texto',
      paso: 1,
      validacion: validarTexto,
    },
  ],
};

// Función principal para validar campos requeridos
export function validarCamposRequeridos(tipoDocumento: string, datosFormulario: any): ValidacionResultado {
  const camposRequeridos = camposRequeridosPorTipo[tipoDocumento];
  
  if (!camposRequeridos) {
    console.warn(`No se encontraron campos requeridos para el tipo de documento: ${tipoDocumento}`);
    return { esValido: true, camposFaltantes: [] };
  }
  
  const camposFaltantes: CampoFaltante[] = [];
  
  for (const campoRequerido of camposRequeridos) {
    const valor = datosFormulario[campoRequerido.campo];
    
    // Usar la función de validación específica si está definida, sino usar validación general
    // El segundo argumento permite reglas condicionales (p. ej. descripción solo si "Sí")
    const esValido = campoRequerido.validacion 
      ? campoRequerido.validacion(valor, datosFormulario)
      : !esValorVacio(valor);
    
    if (!esValido) {
      const pasoResuelto =
        typeof campoRequerido.paso === 'function'
          ? campoRequerido.paso(datosFormulario)
          : campoRequerido.paso;
      camposFaltantes.push({
        nombre: campoRequerido.nombre,
        tipo: campoRequerido.tipo,
        paso: pasoResuelto,
      });
    }
  }
  
  return {
    esValido: camposFaltantes.length === 0,
    camposFaltantes
  };
}

// Función para obtener campos requeridos por tipo de documento (para debugging)
export function obtenerCamposRequeridos(tipoDocumento: string) {
  return camposRequeridosPorTipo[tipoDocumento] || [];
}

