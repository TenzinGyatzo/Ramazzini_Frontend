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
      'Acudir a orientación nutricional y realizar actividad física acorde con su condición de salud para reducir peso de forma gradual.',
  },
  {
    clave: 'cintura',
    hallazgo: 'Circunferencia de cintura con riesgo',
    texto:
      'Mejorar la alimentación y realizar actividad física regular para reducir la circunferencia abdominal y el riesgo cardiometabólico.',
  },
  {
    clave: 'presionElevada',
    hallazgo: 'Presión arterial elevada en la medición',
    texto:
      'Registrar la presión arterial en por lo menos 4 días consecutivos y acudir a valoración médica para confirmar o descartar hipertensión.',
  },
  {
    clave: 'hipertension',
    hallazgo: 'Antecedente de hipertensión',
    texto:
      'Mantener seguimiento médico, vigilar la presión arterial y cumplir el tratamiento indicado.',
  },
  {
    clave: 'diabetes',
    hallazgo: 'Antecedente de diabetes',
    texto:
      'Mantener seguimiento médico, cumplir el tratamiento y vigilar la glucosa con la frecuencia indicada.',
  },
  {
    clave: 'cardiopatia',
    hallazgo: 'Antecedente de cardiopatía',
    texto:
      'Mantener seguimiento con su médico tratante y ajustar los esfuerzos físicos a las indicaciones recibidas.',
  },
  {
    clave: 'lumbalgia',
    hallazgo: 'Lumbalgia',
    texto:
      'Mantener actividad según tolerancia, ajustar la ergonomía del puesto y acudir a valoración si el dolor persiste o limita sus actividades.',
  },
  {
    clave: 'musculoesqueletico',
    hallazgo: 'Molestias musculoesqueléticas',
    texto:
      'Alternar posturas, realizar pausas de movilidad y ajustar la ergonomía del puesto. Acudir a valoración si las molestias persisten o limitan sus actividades.',
  },
  {
    clave: 'respiratorios',
    hallazgo: 'Antecedente respiratorio',
    texto:
      'Mantener el seguimiento médico indicado y aplicar las medidas de control de exposición a polvos, humos o vapores que correspondan al puesto.',
  },
  {
    clave: 'hipoacusia',
    hallazgo: 'Audiometría anormal',
    texto:
      'Acudir a valoración audiológica u otorrinolaringológica y utilizar protección auditiva adecuada cuando exista exposición a ruido.',
  },
  {
    clave: 'vista',
    hallazgo: 'Agudeza visual sin corregir',
    texto:
      'Acudir a optometría para valoración y adaptación de lentes, utilizar la corrección indicada en las actividades del puesto.',
  },
  {
    clave: 'visionCromatica',
    hallazgo: 'Alteración en la visión cromática',
    texto:
      'Complementar los códigos de color con etiquetas, símbolos u otras referencias en las tareas que requieran distinguir colores.',
  },
  {
    clave: 'sueno',
    hallazgo: 'Alteraciones de sueño o vigilia',
    texto:
      'Mantener horarios regulares y tiempo suficiente de sueño. Acudir a valoración médica por somnolencia diurna o problemas persistentes para dormir.',
  },
  {
    clave: 'saludMental',
    hallazgo: 'Tamizaje psicológico con hallazgos',
    texto:
      'Acudir a valoración con un profesional de salud mental para determinar si requiere atención o seguimiento.',
  },
  {
    clave: 'tabaquismo',
    hallazgo: 'Tabaquismo',
    texto:
      'Suspender el consumo de tabaco y solicitar apoyo profesional para facilitar el abandono.',
  },
  {
    clave: 'alcohol',
    hallazgo: 'Consumo de alcohol',
    texto:
      'Reducir o evitar el consumo de alcohol y no realizar actividades laborales bajo sus efectos.',
  },
  {
    // Sin dato estructurado que la dispare: solo se agrega a mano
    clave: 'hernia',
    hallazgo: 'Hernia abdominal',
    texto:
      'Acudir a valoración por cirugía general para definir el manejo y las recomendaciones sobre esfuerzos físicos.',
  },
  {
    clave: 'generico',
    hallazgo: 'Recomendación general',
    texto:
      'Utilizar el EPP indicado para el puesto, mantener hábitos saludables y acudir a las evaluaciones médicas que correspondan según sus riesgos y condición de salud.',
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

  // Se detectan todos los hallazgos; las combinaciones se resuelven al escribir las medidas
  if (String(ef?.categoriaIMC ?? '').startsWith('Obesidad')) claves.add('obesidad');

  const cintura = ef?.categoriaCircunferenciaCintura;
  if (cintura === 'Riesgo Aumentado' || cintura === 'Alto Riesgo') claves.add('cintura');

  if (esSi(hc?.hipertensivosPP)) claves.add('hipertension');

  const tension = String(ef?.categoriaTensionArterial ?? '');
  if (tension === 'Alta' || tension.startsWith('Hipertensión')) claves.add('presionElevada');

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

/**
 * Combinaciones que evitan textos duplicados o inadecuados. La medida combinada ocupa el
 * lugar de la primera del par (en el orden del catálogo) y nombra ambos hallazgos.
 */
const COMBINACIONES: Array<{ claves: [ClaveMedidaPreventiva, ClaveMedidaPreventiva]; medida: MedidaPreventiva }> = [
  {
    // La recomendación de peso ya cubre la de cintura
    claves: ['obesidad', 'cintura'],
    medida: {
      clave: 'obesidad',
      hallazgo: 'Obesidad y circunferencia de cintura con riesgo',
      texto: MEDIDAS_PREVENTIVAS.find((medida) => medida.clave === 'obesidad')!.texto,
    },
  },
  {
    // Con el diagnóstico establecido no se pide confirmarlo: se revisa su control
    claves: ['presionElevada', 'hipertension'],
    medida: {
      clave: 'hipertension',
      hallazgo: 'Antecedente de hipertensión con presión arterial elevada',
      texto:
        'Acudir a valoración médica para revisar el control de la presión arterial; mantener registro de las mediciones y cumplir el tratamiento indicado.',
    },
  },
  {
    // Si las molestias son solo lumbares, el Nórdico ya no dispara la medida musculoesquelética
    claves: ['lumbalgia', 'musculoesqueletico'],
    medida: {
      clave: 'lumbalgia',
      hallazgo: 'Lumbalgia y molestias musculoesqueléticas',
      texto:
        'Alternar posturas, realizar pausas de movilidad y ajustar la ergonomía del puesto. Acudir a valoración para el manejo del dolor lumbar y de las demás molestias.',
    },
  },
];

/** Con más hallazgos que esto, la general se omite: una sola medida precisa puede bastar. */
export const MAX_HALLAZGOS_CON_RECOMENDACION_GENERAL = 0;

/** Medidas que corresponden a los hallazgos, en el orden del catálogo; la general solo sin hallazgos. */
export function medidasPreventivasParaAptitud(docs: DocumentosCercanosAptitud): MedidaPreventiva[] {
  const hallazgos = detectarHallazgosAptitud(docs);
  const claves = new Set<ClaveMedidaPreventiva>(hallazgos);
  if (hallazgos.length <= MAX_HALLAZGOS_CON_RECOMENDACION_GENERAL) claves.add('generico');

  const sustitutas = new Map<ClaveMedidaPreventiva, MedidaPreventiva>();
  const omitidas = new Set<ClaveMedidaPreventiva>();
  for (const { claves: [primera, segunda], medida } of COMBINACIONES) {
    if (!claves.has(primera) || !claves.has(segunda)) continue;
    sustitutas.set(primera, medida);
    omitidas.add(segunda);
  }

  return MEDIDAS_PREVENTIVAS.filter((medida) => claves.has(medida.clave) && !omitidas.has(medida.clave)).map(
    (medida) => sustitutas.get(medida.clave) ?? medida,
  );
}

export function textoMedidasPreventivasAptitud(docs: DocumentosCercanosAptitud): string {
  return medidasPreventivasParaAptitud(docs)
    .map((medida) => medida.texto)
    .join(' ');
}
