/**
 * Aptitud al puesto, punto (45): la tabla «INFORMACIÓN Y ESTUDIOS · FECHAS · RESUMEN Y/O
 * ALTERACIONES ENCONTRADAS». Antes vivía dentro del visualizador; sale aquí, con el mismo
 * criterio y las mismas frases, para que la captura rápida la muestre igual (el médico la ve
 * antes de elegir la aptitud). Las evaluaciones adicionales no van aquí: se capturan en la
 * aptitud y el visualizador las agrega al final.
 */
import { textoCinturaResumen } from '@/helpers/medicionesClinicas';
import { esAudiometriaExternaUtilizable, usarAudiometriaExterna } from '@/helpers/audiometriaFuente';
import { findNearestDocument } from '@/helpers/findNearestDocuments';
import { textoResumenCuestionarioNordico } from '@/helpers/cuestionarioNordico';
import { textoResumenEvaluacionSuenoVigilia } from '@/helpers/evaluacionSuenoVigilia';
import { resumenSucintoEntrevistaPsicologica } from '@/helpers/conclusionEntrevistaPsicologica';
import {
  textoResumenTrastornosEstadoAnimo,
  textoResumenCuestionarioProdromalBreve,
  textoResumenTrastornoLimitePersonalidad,
} from '@/helpers/resumenesCuestionariosPsicologicosAptitud';

type Doc = Record<string, any>;

export interface FilaEstudioAptitud {
  clave: string;
  estudio: string;
  /** Fecha del documento tal como llega (ISO); null si no hay documento. */
  fecha: string | null;
  resumen: string;
}

const NEAREST = { sameYearAsReference: true };

const cercano = (docs: Doc[] | undefined, fecha: string | null | undefined, campo: string): Doc | null =>
  (findNearestDocument(docs ?? [], fecha, campo, NEAREST) as Doc | null) ?? null;

/** El resultado clínico más reciente de un tipo (del año de la aptitud si se indica). */
export function masRecientePorTipo(items: Doc[] | undefined, tipo: string, anio?: number | null): Doc | null {
  if (!items?.length) return null;
  let candidatos = items.filter((item) => item?.tipoEstudio === tipo && item?.fechaEstudio);
  if (anio != null && !Number.isNaN(anio)) {
    candidatos = candidatos.filter((item) => {
      const d = new Date(item.fechaEstudio);
      return !isNaN(d.getTime()) && d.getFullYear() === anio;
    });
  }
  return candidatos.reduce<Doc | null>((ultimo, actual) => {
    const fechaActual = new Date(actual.fechaEstudio);
    if (isNaN(fechaActual.getTime())) return ultimo;
    if (!ultimo) return actual;
    return fechaActual > new Date(ultimo.fechaEstudio) ? actual : ultimo;
  }, null);
}

const TIPO_SANGRE: Record<string, string> = {
  A_POS: 'A RH Positivo',
  A_NEG: 'A RH Negativo',
  B_POS: 'B RH Positivo',
  B_NEG: 'B RH Negativo',
  AB_POS: 'AB RH Positivo',
  AB_NEG: 'AB RH Negativo',
  O_POS: 'O RH Positivo',
  O_NEG: 'O RH Negativo',
};

const ALTERACION_AUDIOMETRIA: Record<string, string> = {
  HIPOACUSIA_CONDUCTIVA: 'Hipoacusia conductiva',
  HIPOACUSIA_NEUROSENSORIAL: 'Hipoacusia neurosensorial',
  HIPOACUSIA_MIXTA: 'Hipoacusia mixta',
  TRAUMA_ACUSTICO: 'Trauma acústico',
};

const GRADO_HIPOACUSIA: Record<string, string> = {
  LEVE: 'leve',
  MODERADA: 'moderada',
  MODERADA_SEVERA: 'moderada-severa',
  SEVERA: 'severa',
  PROFUNDA: 'profunda',
};

const ALTERACION_ESPIROMETRIA: Record<string, string> = {
  ANORMAL_OBSTRUCTIVO: 'Anormal obstructivo',
  ANORMAL_RESTRICTIVO_SOSPECHADO: 'Anormal restrictivo sospechado',
  ANORMAL_MIXTO: 'Anormal mixto',
};

const ALTERACION_EKG: Record<string, string> = {
  ANORMAL_ARRITMIA: 'Anormal arritmia',
  ANORMAL_TRASTORNO_CONDUCCION: 'Anormal trastorno de conducción',
  ANORMAL_ISQUEMIA_INFARTO: 'Anormal isquemia/infarto',
  ANORMAL_REPOLARIZACION: 'Anormal repolarización',
  ANORMAL_HIPERTROFIA_CRECIMIENTO_CAVIDADES: 'Anormal hipertrofia/crecimiento de cavidades',
  ANORMAL_QT_ALTERADO: 'Anormal QT alterado',
};

const ALTERACION_RAYOS_X: Record<string, string> = {
  ALTERACION_PARENQUIMATOSA: 'Alteración parenquimatosa',
  ALTERACION_PLEURAL: 'Alteración pleural',
  ALTERACION_CARDIOMEDIASTINICA: 'Alteración cardiomediastínica',
  NODULO_O_MASA: 'Nódulo o masa',
  SECUELA_CRONICA: 'Secuela crónica',
  ALTERACION_OSEA: 'Alteración ósea',
  ALTERACION_ARTICULAR: 'Alteración articular',
  ALTERACION_ALINEACION: 'Alteración de alineación',
  CAMBIO_DEGENERATIVO: 'Cambio degenerativo',
  FRACTURA_O_TRAUMA: 'Fractura o trauma',
  OTRA_ALTERACION: 'Otra alteración',
};

const ALTERACION_LABORATORIO: Record<string, string> = {
  ALTERACION_HEMATOLOGICA: 'Alteración hematológica',
  ALTERACION_METABOLICA: 'Alteración metabólica',
  ALTERACION_RENAL: 'Alteración renal',
  ALTERACION_HEPATICA: 'Alteración hepática',
  ALTERACION_INFECCIOSA_O_INFLAMATORIA: 'Alteración infecciosa o inflamatoria',
  ALTERACION_URINARIA: 'Alteración urinaria',
  OTRA_ALTERACION: 'Otra alteración',
};

const textoLibre = (h: unknown): string | null => {
  if (h == null) return null;
  const t = String(h).trim();
  return t.length > 0 ? t : null;
};

const examenVistaResumen = (ev: Doc): string => {
  const formatAV = (valor: unknown, ceguera: boolean) => {
    if (ceguera) return 'Ceguera Total';
    if (valor == null || valor === '') return 'NA';
    return `20/${valor}`;
  };
  const ciegaOI = ev.ojoIzquierdoCegueraTotal ?? false;
  const ciegaOD = ev.ojoDerechoCegueraTotal ?? false;
  const sinCorreccion = ev.sinCorreccionNoEvaluablePorLentesContacto
    ? `OI: NA, OD: NA - ${ev.sinCorreccionLejanaInterpretacion || '-'}`
    : `OI: ${formatAV(ev.ojoIzquierdoLejanaSinCorreccion, ciegaOI)}, OD: ${formatAV(ev.ojoDerechoLejanaSinCorreccion, ciegaOD)} - ${ev.sinCorreccionLejanaInterpretacion || '-'}`;
  const conCorreccion = `OI: ${formatAV(ev.ojoIzquierdoLejanaConCorreccion, ciegaOI)}, OD: ${formatAV(ev.ojoDerechoLejanaConCorreccion, ciegaOD)} - ${ev.conCorreccionLejanaInterpretacion || '-'} Corregida`;
  const ishihara = `Ishihara: ${ev.porcentajeIshihara || '-'}% - ${ev.interpretacionIshihara || '-'}`;
  return (ev.ojoIzquierdoLejanaConCorreccion === 0 || ev.ojoIzquierdoLejanaConCorreccion == null) &&
    (ev.ojoDerechoLejanaConCorreccion === 0 || ev.ojoDerechoLejanaConCorreccion == null)
    ? `${sinCorreccion}, ${ishihara}`
    : `${conCorreccion}, ${ishihara}`;
};

const audiometriaResumen = (a: Doc): string => {
  const diagnostico = a.diagnosticoAudiometria || 'Sin diagnóstico';
  const hipoacusia = a.hipoacusiaBilateralCombinada !== undefined ? a.hipoacusiaBilateralCombinada + '%' : 'No especificado';
  return `${diagnostico} HBC ${hipoacusia}`;
};

const PARAMETROS_ANTIDOPING: [string, string][] = [
  ['marihuana', 'Marihuana'],
  ['cocaina', 'Cocaína'],
  ['anfetaminas', 'Anfetaminas'],
  ['metanfetaminas', 'Metanfetaminas'],
  ['opiaceos', 'Opiáceos'],
  ['benzodiacepinas', 'Benzodiazepinas'],
  ['fenciclidina', 'Fenciclidina'],
  ['metadona', 'Metadona'],
  ['barbituricos', 'Barbitúricos'],
  ['antidepresivosTriciclicos', 'Antidepresivos Tricíclicos'],
  ['metilendioximetanfetamina', 'Metilendioximetanfetamina'],
  ['ketamina', 'Ketamina'],
];

const antidopingResumen = (a: Doc): string => {
  const evaluados = PARAMETROS_ANTIDOPING.map(([p]) => p).filter((p) => a[p] !== undefined);
  if (evaluados.every((p) => a[p] === 'Negativo')) {
    const enLetras = ({ 5: 'cinco', 6: 'seis', 10: 'diez', 12: 'doce' } as Record<number, string>)[evaluados.length] || evaluados.length;
    return `Negativo a ${enLetras} parámetros`;
  }
  const positivas = PARAMETROS_ANTIDOPING.filter(([p]) => a[p] && a[p] !== 'Negativo')
    .map(([, nombre]) => nombre)
    .join(', ');
  return `Positivo a: ${positivas}`;
};

/** Resultado clínico (EKG, espirometría, rayos X, laboratorio): null si no concluyente. */
const resumenResultado = (
  r: Doc | null,
  normal: string,
  anormal: (r: Doc) => string,
): string | null => {
  if (!r || r.resultadoGlobal === 'NO_CONCLUYENTE') return null;
  const libre = textoLibre(r.hallazgoEspecifico);
  if (libre) return libre;
  if (r.resultadoGlobal === 'NORMAL') return normal;
  if (r.resultadoGlobal === 'ANORMAL') return anormal(r);
  return null;
};

const lista = (valores: unknown, etiquetas: Record<string, string>): string =>
  Array.isArray(valores) && valores.length > 0 ? valores.map((k) => etiquetas[k] || k).join(', ') : 'Anormal';

/**
 * Las filas de la tabla, en el orden del documento. Historia clínica, exploración física,
 * adiposidad y examen visual van siempre (con «-» si no hay); los demás, solo si hay.
 */
export function filasEstudiosAptitud(
  vecinos: Record<string, Doc[]> | null | undefined,
  resultados: Doc[] | null | undefined,
  fecha: string | null | undefined,
): FilaEstudioAptitud[] {
  const v = vecinos ?? {};
  const rc = resultados ?? [];
  const ref = fecha ? new Date(fecha) : null;
  const anio = ref && !isNaN(ref.getTime()) ? ref.getFullYear() : null;

  const hc = cercano(v.historiaClinica, fecha, 'fechaHistoriaClinica');
  const ef = cercano(v.exploracionFisica, fecha, 'fechaExploracionFisica');
  const ev = cercano(v.examenVista, fecha, 'fechaExamenVista');
  const au = cercano(v.audiometria, fecha, 'fechaAudiometria');
  const ad = cercano(v.antidoping, fecha, 'fechaAntidoping');
  const ekg = masRecientePorTipo(rc, 'EKG', anio);
  const espiro = masRecientePorTipo(rc, 'ESPIROMETRIA', anio);
  const externaReciente = masRecientePorTipo(
    rc.filter((r) => esAudiometriaExternaUtilizable(r as any)),
    'AUDIOMETRIA',
    anio,
  );
  const externa = usarAudiometriaExterna(au?.fechaAudiometria, externaReciente as any) ? externaReciente : null;
  const sangre = masRecientePorTipo(rc, 'TIPO_SANGRE');
  const rx = masRecientePorTipo(rc, 'RAYOS_X', anio);
  const lab = masRecientePorTipo(rc, 'ANALISIS_LABORATORIO', anio);
  const ep = cercano(v.entrevistaPsicologica, fecha, 'fechaEntrevistaPsicologica');
  const tea = cercano(v.trastornosEstadoAnimo, fecha, 'fechaTrastornosEstadoAnimo');
  const pqb = cercano(v.cuestionarioProdromalBreve, fecha, 'fechaCuestionarioProdromalBreve');
  const tlp = cercano(v.trastornoLimitePersonalidad, fecha, 'fechaTrastornoLimitePersonalidad');
  const nordico = cercano(v.cuestionarioNordico, fecha, 'fechaCuestionarioNordico');
  const sueno = cercano(v.evaluacionSuenoVigilia, fecha, 'fechaEvaluacionSuenoVigilia');

  const filas: FilaEstudioAptitud[] = [];
  const fila = (clave: string, estudio: string, f: unknown, resumen: unknown) =>
    filas.push({ clave, estudio, fecha: (f as string) ?? null, resumen: resumen == null ? '' : String(resumen) });

  fila('historiaClinica', 'HISTORIA CLÍNICA', hc?.fechaHistoriaClinica, hc ? hc.resumenHistoriaClinica ?? '' : '-');
  fila(
    'exploracionFisica',
    'EXPLORACIÓN FÍSICA',
    ef?.fechaExploracionFisica,
    ef
      ? `TA: ${ef.tensionArterialSistolica}/${ef.tensionArterialDiastolica} mmHg - ${ef.categoriaTensionArterial}. ${ef.resumenExploracionFisica}.`
      : '-',
  );
  fila(
    'adiposidadCorporal',
    'ADIPOSIDAD CORPORAL',
    ef?.fechaExploracionFisica,
    ef ? `IMC: ${ef.indiceMasaCorporal} - ${ef.categoriaIMC}.${textoCinturaResumen(ef)}` : '-',
  );
  fila('examenVista', 'EXAMEN VISUAL', ev?.fechaExamenVista, ev ? examenVistaResumen(ev) : '-');

  if (au && !externa) {
    fila('audiometria', 'AUDIOMETRÍA', au.fechaAudiometria, audiometriaResumen(au));
  } else {
    // Mismo criterio que el PDF: cuenta la más reciente; el mismo día, la de Ramazzini
    const resumen = resumenResultado(externa, 'Normal, audición dentro de límites normales', (r) => {
      const tipo = ALTERACION_AUDIOMETRIA[r.tipoAlteracionAudiometria] || r.tipoAlteracionAudiometria || 'Anormal';
      const grado = GRADO_HIPOACUSIA[r.gradoHipoacusia];
      return grado ? `${tipo} (${grado})` : tipo;
    });
    if (resumen && externa) fila('audiometriaExterna', 'AUDIOMETRÍA', externa.fechaEstudio, resumen);
  }
  if (ad) fila('antidoping', 'ANTIDOPING', ad.fechaAntidoping, antidopingResumen(ad));
  if (sangre) fila('tipoSangre', 'TIPO DE SANGRE', sangre.fechaEstudio, TIPO_SANGRE[sangre.tipoSangre] || sangre.tipoSangre || '-');

  const normalRango = 'Normal, valores dentro del rango de referencia';
  if (ekg && ekg.resultadoGlobal !== 'NO_CONCLUYENTE') {
    fila('ekg', 'ELECTROCARDIOGRAMA', ekg.fechaEstudio, resumenResultado(ekg, normalRango, (r) => ALTERACION_EKG[r.tipoAlteracionEKG] || r.tipoAlteracionEKG || 'Anormal') || '-');
  }
  if (espiro && espiro.resultadoGlobal !== 'NO_CONCLUYENTE') {
    fila('espirometria', 'ESPIROMETRIA', espiro.fechaEstudio, resumenResultado(espiro, normalRango, (r) => ALTERACION_ESPIROMETRIA[r.tipoAlteracionEspirometria] || r.tipoAlteracionEspirometria || 'Anormal') || '-');
  }
  if (rx && rx.resultadoGlobal !== 'NO_CONCLUYENTE') {
    fila('rayosX', 'RAYOS X', rx.fechaEstudio, resumenResultado(rx, 'Dentro de límites normales', (r) => lista(r.tipoAlteracionRayosX, ALTERACION_RAYOS_X)) || '-');
  }
  if (lab && lab.resultadoGlobal !== 'NO_CONCLUYENTE') {
    fila('analisisLaboratorio', 'ANÁLISIS DE LABORATORIO', lab.fechaEstudio, resumenResultado(lab, 'Resultados dentro de parámetros normales', (r) => lista(r.tipoAlteracionAnalisisLaboratorio, ALTERACION_LABORATORIO)) || '-');
  }

  if (ep) fila('entrevistaPsicologica', 'ENTREVISTA PSICOLÓGICA', ep.fechaEntrevistaPsicologica, resumenSucintoEntrevistaPsicologica(ep as any));
  if (tea) fila('trastornosEstadoAnimo', 'TRASTORNOS DEL ESTADO DE ÁNIMO', tea.fechaTrastornosEstadoAnimo, textoResumenTrastornosEstadoAnimo(tea as any));
  if (pqb) fila('cuestionarioProdromalBreve', 'CUESTIONARIO PRODROMAL BREVE', pqb.fechaCuestionarioProdromalBreve, textoResumenCuestionarioProdromalBreve(pqb as any));
  if (tlp) fila('trastornoLimitePersonalidad', 'TRASTORNO LÍMITE PERSONALIDAD', tlp.fechaTrastornoLimitePersonalidad, textoResumenTrastornoLimitePersonalidad(tlp as any));
  const resumenNordico = nordico ? textoResumenCuestionarioNordico(nordico as any) : null;
  if (nordico && resumenNordico) fila('cuestionarioNordico', 'CUESTIONARIO NÓRDICO', nordico.fechaCuestionarioNordico, resumenNordico);
  const resumenSueno = sueno ? textoResumenEvaluacionSuenoVigilia(sueno as any) : null;
  if (sueno && resumenSueno) fila('evaluacionSuenoVigilia', 'EVALUACIÓN DE SUEÑO Y VIGILIA', sueno.fechaEvaluacionSuenoVigilia, resumenSueno);

  return filas;
}
