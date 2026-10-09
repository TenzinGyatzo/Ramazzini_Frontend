import {
  clasificarFranjaTamizajeTLP,
  esPositivoTamizajeProdromalBreve,
  esPositivoTamizajeTrastornosEstadoAnimo,
  puntajeTamizajeTrastornoLimitePersonalidad,
} from '@/helpers/tamizajePsicologicoCriterios';

/**
 * Medidas preventivas de la aptitud al puesto: cada hallazgo de los documentos
 * más cercanos a la fecha de la aptitud dispara su recomendación.
 * Es una propuesta: el médico revisa y edita el texto antes de guardar.
 */

type Doc = Record<string, any> | null | undefined;

export interface DocumentosCercanosAptitud {
  historiaClinica?: Doc;
  exploracionFisica?: Doc;
  examenVista?: Doc;
  audiometria?: Doc;
  trastornosEstadoAnimo?: Doc;
  cuestionarioProdromalBreve?: Doc;
  trastornoLimitePersonalidad?: Doc;
  cuestionarioNordico?: Doc;
  evaluacionSuenoVigilia?: Doc;
}

export type ClaveMedidaPreventiva =
  | 'obesidad'
  | 'cintura'
  | 'presionElevada'
  | 'hipertension'
  | 'diabetes'
  | 'cardiopatia'
  | 'lumbalgia'
  | 'musculoesqueletico'
  | 'respiratorios'
  | 'hipoacusia'
  | 'vista'
  | 'visionCromatica'
  | 'sueno'
  | 'saludMental'
  | 'tabaquismo'
  | 'alcohol'
  | 'hernia'
  | 'generico';

export interface MedidaPreventiva {
  clave: ClaveMedidaPreventiva;
  /** Nombre corto del hallazgo, para mostrar qué disparó la medida. */
  hallazgo: string;
  texto: string;
}

/** Catálogo en el orden en que se escriben; "generico" siempre cierra. */
export const MEDIDAS_PREVENTIVAS: MedidaPreventiva[] = [
  {
    clave: 'obesidad',
    hallazgo: 'Obesidad',
    texto:
      'Se recomienda adoptar una dieta balanceada y realizar ejercicio físico regularmente para mejorar la salud en general. Estas prácticas ayudan a controlar el peso, disminuir los niveles de grasa corporal, fortalecer los músculos y mejorar la función cardiovascular. Además, reducen el riesgo de desarrollar enfermedades crónicas como la diabetes tipo 2, enfermedades cardíacas y ciertos tipos de cáncer.',
  },
  {
    clave: 'cintura',
    hallazgo: 'Circunferencia de cintura de riesgo',
    texto:
      'Se recomienda reducir la circunferencia abdominal mediante una alimentación balanceada y actividad física regular, ya que su aumento se asocia a un mayor riesgo de enfermedades cardiometabólicas.',
  },
  {
    clave: 'presionElevada',
    hallazgo: 'Presión arterial elevada en la medición',
    texto:
      'Se recomienda vigilar periódicamente la presión arterial, moderar el consumo de sal y acudir con su médico familiar para confirmar o descartar hipertensión arterial.',
  },
  {
    clave: 'hipertension',
    hallazgo: 'Antecedente de hipertensión',
    texto:
      'Es recomendable mantener una dieta baja en sodio, realizar actividad física regularmente, controlar la presión arterial periódicamente y adherirse estrictamente al tratamiento recetado para gestionar la hipertensión de manera efectiva.',
  },
  {
    clave: 'diabetes',
    hallazgo: 'Antecedente de diabetes',
    texto:
      'Es importante mantener una dieta equilibrada, controlar regularmente los niveles de azúcar en la sangre y visitar al médico familiar para un seguimiento y una correcta gestión de la diabetes.',
  },
  {
    clave: 'cardiopatia',
    hallazgo: 'Antecedente de cardiopatía',
    texto:
      'Se recomienda mantener seguimiento con su médico tratante, apegarse al tratamiento indicado, evitar esfuerzos físicos no autorizados y acudir a valoración ante dolor torácico, palpitaciones o dificultad para respirar.',
  },
  {
    clave: 'lumbalgia',
    hallazgo: 'Lumbalgia',
    texto:
      'Es esencial mantener una postura correcta durante las actividades laborales, realizar ejercicios de fortalecimiento de la musculatura lumbar y abdominal, evitar movimientos bruscos o levantamiento de peso excesivo, y considerar el uso de soportes ergonómicos cuando sea necesario.',
  },
  {
    clave: 'musculoesqueletico',
    hallazgo: 'Molestias musculoesqueléticas',
    texto:
      'Se recomienda realizar pausas activas y ejercicios de estiramiento durante la jornada, cuidar la postura y la ergonomía del puesto de trabajo, y acudir a valoración médica si las molestias musculoesqueléticas persisten o limitan sus actividades.',
  },
  {
    clave: 'respiratorios',
    hallazgo: 'Antecedente respiratorio',
    texto:
      'Se recomienda evitar la exposición a agentes irritantes respiratorios, mantener una buena ventilación en los espacios de trabajo, realizar ejercicios de respiración profunda regularmente, evitar el tabaquismo y consultar al médico ante síntomas persistentes como tos, dificultad para respirar o sibilancias.',
  },
  {
    clave: 'hipoacusia',
    hallazgo: 'Audiometría anormal',
    texto:
      'Es fundamental proteger la audición mediante el uso adecuado de protección auditiva en ambientes ruidosos, evitar la exposición prolongada a sonidos de alta intensidad, realizar evaluaciones auditivas periódicas y consultar al especialista ante cualquier cambio en la capacidad auditiva.',
  },
  {
    clave: 'vista',
    hallazgo: 'Agudeza visual sin corregir',
    texto:
      'Se recomienda acudir a valoración por optometría u oftalmología y utilizar la corrección visual indicada durante la jornada laboral, así como realizar revisiones visuales periódicas.',
  },
  {
    clave: 'visionCromatica',
    hallazgo: 'Alteración en la visión cromática',
    texto:
      'Se sugiere considerar la alteración en la visión cromática en las tareas que requieran identificar colores, como señalización, cableado o indicadores luminosos, y apoyarse en referencias no cromáticas cuando sea posible.',
  },
  {
    clave: 'sueno',
    hallazgo: 'Alteraciones de sueño o vigilia',
    texto:
      'Se recomienda mantener horarios regulares de sueño, procurar al menos 7 horas de descanso, evitar cafeína, alcohol y pantallas antes de dormir, y acudir a valoración médica si persisten la somnolencia diurna, la fatiga o los problemas para dormir.',
  },
  {
    clave: 'saludMental',
    hallazgo: 'Tamizaje psicológico con hallazgos',
    texto:
      'Se recomienda acudir a valoración con un profesional de salud mental para una evaluación más detallada, y mantener hábitos que favorezcan el bienestar emocional, como descanso adecuado, actividad física y redes de apoyo.',
  },
  {
    clave: 'tabaquismo',
    hallazgo: 'Tabaquismo',
    texto:
      'Se recomienda suspender el consumo de tabaco y, de ser necesario, solicitar apoyo profesional para lograrlo, ya que aumenta el riesgo de enfermedades respiratorias, cardiovasculares y de cáncer.',
  },
  {
    clave: 'alcohol',
    hallazgo: 'Consumo de alcohol',
    texto:
      'Se recomienda moderar o evitar el consumo de alcohol y no presentarse a laborar bajo sus efectos, por su repercusión en la salud y en la seguridad en el trabajo.',
  },
  {
    // Sin dato estructurado que la dispare: solo se agrega a mano
    clave: 'hernia',
    hallazgo: 'Hernia abdominal',
    texto:
      'Es crucial priorizar la prevención y el cuidado de la pared abdominal mediante el fortalecimiento de los músculos centrales, la mejora de la postura y el uso de técnicas adecuadas de levantamiento de objetos.',
  },
  {
    clave: 'generico',
    hallazgo: 'Recomendación general',
    texto:
      'Es importante usar adecuadamente el EPP, mantener hábitos saludables como una alimentación balanceada, ejercicio regular y descanso adecuado, así como efectuar vigilancia médica con periodicidad anual, incluyendo exámenes generales de laboratorio y gabinete para una vigilancia integral de la salud.',
  },
];

const esSi = (valor: unknown) => valor === 'Si' || valor === 'Sí';

const esNumero = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isFinite(valor);

/** Mismos umbrales que clasifican Normal/Anormal en la tabla de trabajadores. */
function audiometriaAnormal(audiometria: Doc): boolean {
  if (!audiometria) return false;
  if (audiometria.metodoAudiometria === 'AMA') {
    return esNumero(audiometria.perdidaAuditivaBilateralAMA) && audiometria.perdidaAuditivaBilateralAMA > 25;
  }
  // Los registros anteriores al método AMA solo traen el valor LFT
  return esNumero(audiometria.hipoacusiaBilateralCombinada) && audiometria.hipoacusiaBilateralCombinada >= 10;
}

/** Agudeza reducida o requiere lentes, y el examen no registra agudeza con corrección. */
function agudezaVisualSinCorregir(examenVista: Doc): boolean {
  if (!examenVista) return false;
  const interpretacion = String(examenVista.sinCorreccionLejanaInterpretacion ?? '').toLowerCase();
  const reducida =
    esSi(examenVista.requiereLentesUsoGeneral) ||
    interpretacion.includes('reducida') ||
    interpretacion.includes('ceguera');
  // Mismo criterio que la columna "Corrección" de la tabla de trabajadores
  const corregida =
    Number(examenVista.ojoIzquierdoLejanaConCorreccion) > 0 ||
    Number(examenVista.ojoDerechoLejanaConCorreccion) > 0;
  return reducida && !corregida;
}

function tamizajePsicologicoConHallazgos(docs: DocumentosCercanosAptitud): boolean {
  const tlp = docs.trastornoLimitePersonalidad;
  return (
    esPositivoTamizajeTrastornosEstadoAnimo(docs.trastornosEstadoAnimo ?? null) ||
    esPositivoTamizajeProdromalBreve(docs.cuestionarioProdromalBreve ?? null) ||
    (!!tlp && clasificarFranjaTamizajeTLP(puntajeTamizajeTrastornoLimitePersonalidad(tlp)) > 0)
  );
}

/** Hallazgos presentes en los documentos más cercanos, sin la recomendación general. */
export function detectarHallazgosAptitud(docs: DocumentosCercanosAptitud): ClaveMedidaPreventiva[] {
  const hc = docs.historiaClinica;
  const ef = docs.exploracionFisica;
  const claves = new Set<ClaveMedidaPreventiva>();

  const obesidad = String(ef?.categoriaIMC ?? '').startsWith('Obesidad');
  if (obesidad) claves.add('obesidad');

  // Con obesidad la recomendación de peso ya cubre la cintura
  const cintura = ef?.categoriaCircunferenciaCintura;
  if (!obesidad && (cintura === 'Riesgo Aumentado' || cintura === 'Alto Riesgo')) claves.add('cintura');

  const hipertenso = esSi(hc?.hipertensivosPP);
  if (hipertenso) claves.add('hipertension');

  // Una medición alta sin antecedente no es hipertensión: solo se pide vigilarla
  const tension = String(ef?.categoriaTensionArterial ?? '');
  if (!hipertenso && (tension === 'Alta' || tension.startsWith('Hipertensión'))) claves.add('presionElevada');

  if (esSi(hc?.diabeticosPP)) claves.add('diabetes');
  if (esSi(hc?.cardiopaticosPP)) claves.add('cardiopatia');

  const regiones: string[] = docs.cuestionarioNordico?.resultado?.regionesMolestia12Meses ?? [];
  if (esSi(hc?.lumbalgias) || regiones.includes('espaldaBaja')) claves.add('lumbalgia');
  if (regiones.some((region) => region !== 'espaldaBaja')) claves.add('musculoesqueletico');

  if (esSi(hc?.respiratorios)) claves.add('respiratorios');
  if (audiometriaAnormal(docs.audiometria)) claves.add('hipoacusia');
  if (agudezaVisualSinCorregir(docs.examenVista)) claves.add('vista');

  const ishihara = docs.examenVista?.porcentajeIshihara;
  if (esNumero(ishihara) && ishihara < 80) claves.add('visionCromatica');

  const prioridadSueno = docs.evaluacionSuenoVigilia?.resultado?.prioridad;
  if (prioridadSueno && prioridadSueno !== 'verde') claves.add('sueno');

  if (tamizajePsicologicoConHallazgos(docs)) claves.add('saludMental');
  if (esSi(hc?.tabaquismo)) claves.add('tabaquismo');
  if (esSi(hc?.alcoholismo)) claves.add('alcohol');

  return MEDIDAS_PREVENTIVAS.map((medida) => medida.clave).filter((clave) => claves.has(clave));
}

/** Con más hallazgos que esto, las medidas específicas bastan y la general se omite. */
export const MAX_HALLAZGOS_CON_RECOMENDACION_GENERAL = 1;

/** Medidas que corresponden a los hallazgos, en el orden del catálogo; la general cierra si hay pocos. */
export function medidasPreventivasParaAptitud(docs: DocumentosCercanosAptitud): MedidaPreventiva[] {
  const hallazgos = detectarHallazgosAptitud(docs);
  const claves = new Set<ClaveMedidaPreventiva>(hallazgos);
  if (hallazgos.length <= MAX_HALLAZGOS_CON_RECOMENDACION_GENERAL) claves.add('generico');
  return MEDIDAS_PREVENTIVAS.filter((medida) => claves.has(medida.clave));
}

export function textoMedidasPreventivasAptitud(docs: DocumentosCercanosAptitud): string {
  return medidasPreventivasParaAptitud(docs)
    .map((medida) => medida.texto)
    .join(' ');
}
