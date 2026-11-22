/**
 * Previo a espirometría e historia otológica (punto 52): cada paso escribe su respuesta
 * preseleccionada solo al abrirse. Guardar sin recorrer las secciones mandaba esas respuestas
 * vacías y el servidor rechazaba todo a la vez (un aviso enorme). Al guardar se completan con lo
 * mismo que el paso mostraría, como la historia clínica (punto 39); solo campos vacíos.
 * El resultado del cuestionario no tiene valor preseleccionado: lo elige el médico y se pide
 * campo por campo.
 */
type Datos = Record<string, any>;

const vacio = (v: unknown) => v === undefined || v === null || String(v).trim() === '';

/** Lo que muestra cada paso al abrirse sin respuesta (los `ref` iniciales de los pasos). */
export const PRESELECCION_PREVIO_ESPIROMETRIA: Record<string, string> = {
  tabaquismo: 'NO FUMA',
  cigarrosSemana: '0',
  exposicionHumosBiomasa: 'NO',
  exposicionLaboralPolvos: 'NO',
  exposicionVaporesGasesIrritantes: 'NO',
  antecedentesTuberculosisInfeccionesRespiratorias: 'NO',
  tosCronica: 'NO',
  expectoracionFrecuente: 'NO',
  disnea: 'NINGUNA',
  sibilancias: 'NO',
  hemoptisis: 'NO',
  otrosSintomasPregunta: 'NO',
  asma: 'NO',
  epocBronquitisCronica: 'NO',
  fibrosisPulmonar: 'NO',
  apneaSueno: 'NO',
  medicamentosActuales: 'NO',
  cirugiaReciente: 'NO',
  infeccionRespiratoriaActiva: 'NO',
  embarazoComplicado: 'NO',
  derramePleural: 'NO',
  neumotorax: 'NO',
  infartoAgudoAnginaInestable: 'NO',
  aneurismaAorticoConocido: 'NO',
  inestabilidadHemodinamicaGrave: 'NO',
  hipertensionIntracraneal: 'NO',
  desprendimientoAgudoRetina: 'NO',
};

export const PRESELECCION_HISTORIA_OTOLOGICA: Record<string, string> = {
  dolorOido: 'NO',
  supuracionOido: 'NO',
  mareoVertigo: 'NO',
  zumbidoTinnitus: 'NO',
  perdidaAudicion: 'NO',
  oidoTapadoPlenitud: 'NO',
  otitisFrecuentesInfancia: 'NO',
  cirugiasOido: 'NO',
  traumatismoCranealBarotrauma: 'NO',
  usoAudifonos: 'NO',
  meningitisInfeccionGraveInfancia: 'NO',
  diabetes: 'NO',
  enfermedadRenal: 'NO',
  medicamentosOtotoxicos: 'NO',
  trabajoAmbientesRuidosos: 'NO',
  tiempoExposicionLaboral: 'NINGUNO',
  usoProteccionAuditiva: 'SIEMPRE',
  musicaFuerteAudifonos: 'NO',
  armasFuegoPasatiemposRuidosos: 'NO',
  servicioMilitar: 'NO',
  alergias: 'NO',
  resfriadoDiaPrueba: 'NO',
  otoscopiaOidoDerecho: 'PERMEABLE',
  otoscopiaOidoIzquierdo: 'PERMEABLE',
};

function completar(df: Datos, preseleccion: Record<string, string>): Datos {
  for (const [campo, valor] of Object.entries(preseleccion)) {
    if (vacio(df[campo])) df[campo] = valor;
  }
  return df;
}

/** Antes de guardar (y para los avisos, sobre una copia). */
export const prepararPrevioEspirometriaParaGuardar = (df: Datos) => completar(df, PRESELECCION_PREVIO_ESPIROMETRIA);
export const prepararHistoriaOtologicaParaGuardar = (df: Datos) => completar(df, PRESELECCION_HISTORIA_OTOLOGICA);
