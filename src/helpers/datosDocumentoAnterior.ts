/**
 * Punto (54): una historia clínica o exploración física NUEVA se llena con lo del documento
 * anterior del trabajador (el más reciente con fecha anterior, sin anulados), con un aviso y la
 * opción «Empezar en blanco».
 *
 * Solo se copia lo que no es la respuesta preseleccionada (un «Sí» con su detalle, un valor
 * gineco distinto del típico, un empleo anterior): lo demás ya sale igual por defecto.
 * - Historia clínica: antecedentes heredofamiliares, personales y no patológicos; gineco-
 *   obstétricos SIN la FUM ni el embarazo actual (cambian); empleos anteriores y accidente
 *   laboral. No el motivo, la fecha ni el resumen (se arma de nuevo).
 * - Exploración física: la altura y los hallazgos por aparatos y sistemas. Peso, cintura y
 *   signos vitales no (decisión del usuario: se miden en cada examen).
 */
import { reactive } from 'vue';
import DocumentosAPI from '@/api/DocumentosAPI';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { fechaLegible } from '@/helpers/medicionesClinicas';
import {
  ACCIDENTE_LABORAL_NO,
  GINECO_PREGUNTAS,
  GINECO_VALORES_TIPICOS,
  PREGUNTAS_ANTECEDENTES,
} from '@/helpers/historiaClinicaGuardado';
import { PREGUNTAS_HALLAZGOS, SIN_HALLAZGOS } from '@/helpers/exploracionFisicaGuardado';

type Datos = Record<string, any>;
export type TipoConAnterior = 'historiaClinica' | 'exploracionFisica';

export const CAMPO_FECHA: Record<TipoConAnterior, string> = {
  historiaClinica: 'fechaHistoriaClinica',
  exploracionFisica: 'fechaExploracionFisica',
};

/** Gineco que no se trae: cambia de un examen a otro. */
const GINECO_NO_SE_TRAE = new Set(['fechaUltimaRegla', 'embarazoActual']);

const conTexto = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/** El documento más reciente con fecha anterior a `fecha` (los anulados no cuentan). */
export function documentoAnterior(docs: Datos[], tipo: TipoConAnterior, fecha: string): Datos | null {
  const campo = CAMPO_FECHA[tipo];
  const ref = formatDateYYYYMMDD(fecha);
  let mejor: Datos | null = null;
  let mejorFecha = '';
  for (const doc of docs) {
    if (!doc || doc.estado === 'anulado') continue;
    const f = formatDateYYYYMMDD(doc[campo]);
    if (!f || f >= ref) continue;
    if (f > mejorFecha) {
      mejor = doc;
      mejorFecha = f;
    }
  }
  return mejor;
}

/** Lo que se copia del documento anterior (campo → valor). */
export function datosATraer(tipo: TipoConAnterior, anterior: Datos, { esMujer }: { esMujer: boolean }): Datos {
  const datos: Datos = {};
  if (tipo === 'historiaClinica') {
    for (const p of PREGUNTAS_ANTECEDENTES) {
      if (anterior[p.campo] !== 'Si') continue;
      datos[p.campo] = 'Si';
      if (conTexto(anterior[p.especificar]) && anterior[p.especificar] !== p.textoNo) {
        datos[p.especificar] = anterior[p.especificar];
      }
    }
    if (esMujer) {
      for (const [campo, tipico] of Object.entries(GINECO_VALORES_TIPICOS)) {
        if (conTexto(anterior[campo]) && anterior[campo] !== tipico) datos[campo] = anterior[campo];
      }
      for (const p of GINECO_PREGUNTAS) {
        if (GINECO_NO_SE_TRAE.has(p.campo)) continue;
        if (conTexto(anterior[p.campo]) && anterior[p.campo] !== p.textoNo) datos[p.campo] = anterior[p.campo];
      }
    }
    for (let n = 1; n <= 3; n++) {
      for (const nombre of ['empresa', 'puesto', 'antiguedad', 'agentes']) {
        const campo = `${nombre}Anterior${n}`;
        if (conTexto(anterior[campo])) datos[campo] = anterior[campo];
      }
    }
    if (anterior.accidenteLaboral === 'Si') {
      datos.accidenteLaboral = 'Si';
      // Con «Sí», «Ninguno» y «Sin secuelas» son respuestas (no los textos de «No»)
      for (const campo of Object.keys(ACCIDENTE_LABORAL_NO)) {
        if (conTexto(anterior[campo])) datos[campo] = anterior[campo];
      }
    }
  } else {
    const altura = Number(anterior.altura);
    if (Number.isFinite(altura) && altura > 0) datos.altura = altura;
    for (const p of PREGUNTAS_HALLAZGOS) {
      const texto = anterior[p.campo];
      // Documentos viejos sin la pregunta: el texto distinto de «Sin hallazgos» es un «Sí»
      const esSi = anterior[p.pregunta] === 'Si' || (!anterior[p.pregunta] && conTexto(texto) && texto !== SIN_HALLAZGOS);
      if (esSi && conTexto(texto) && texto !== SIN_HALLAZGOS) {
        datos[p.pregunta] = 'Si';
        datos[p.campo] = texto;
      }
    }
  }
  return datos;
}

/**
 * Estado del documento nuevo en curso (uno a la vez). FormStepper lo pide al abrir y no muestra
 * los pasos mientras `cargando` (los pasos leen el formulario al montarse).
 */
export const datosAnteriores = reactive<{
  tipo: TipoConAnterior | null;
  cargando: boolean;
  /** Fecha legible del documento de donde se copió; null si no se copió nada. */
  fecha: string | null;
  campos: string[];
}>({ tipo: null, cargando: false, fecha: null, campos: [] });

let solicitud = 0;

export function limpiarDatosAnteriores(): void {
  solicitud++;
  Object.assign(datosAnteriores, { tipo: null, cargando: false, fecha: null, campos: [] });
}

const pedir = (tipo: TipoConAnterior, trabajadorId: string) =>
  tipo === 'historiaClinica' ? DocumentosAPI.getHistoriasClinicas(trabajadorId) : DocumentosAPI.getExploracionesFisicas(trabajadorId);

/** Pide los documentos del trabajador y copia lo del anterior en `df` (solo campos vacíos). */
export async function cargarDatosAnteriores(
  tipo: TipoConAnterior,
  trabajadorId: string,
  df: () => Datos,
  { esMujer, hoy }: { esMujer: boolean; hoy: string },
): Promise<void> {
  const mia = ++solicitud;
  Object.assign(datosAnteriores, { tipo, cargando: true, fecha: null, campos: [] });
  try {
    const { data } = await pedir(tipo, trabajadorId);
    if (mia !== solicitud) return;
    const anterior = documentoAnterior(Array.isArray(data) ? data : [], tipo, hoy);
    if (!anterior) return;
    const datos = datosATraer(tipo, anterior, { esMujer });
    const destino = df();
    const campos = Object.keys(datos).filter((c) => destino[c] === undefined || destino[c] === null || destino[c] === '');
    if (campos.length === 0) return;
    for (const c of campos) destino[c] = datos[c];
    datosAnteriores.campos = campos;
    datosAnteriores.fecha = fechaLegible(formatDateYYYYMMDD(anterior[CAMPO_FECHA[tipo]]));
  } catch (error) {
    // Sin el documento anterior se captura como siempre
    console.error('No se pudo consultar el documento anterior', error);
  } finally {
    if (mia === solicitud) datosAnteriores.cargando = false;
  }
}

/** «Empezar en blanco»: quita lo copiado (los pasos se vuelven a montar después). */
const CAMPOS_RESUMEN: Record<TipoConAnterior, string[]> = {
  historiaClinica: ['resumenHistoriaClinica', 'resumenHistoriaClinicaPregunta'],
  exploracionFisica: ['resumenExploracionFisica', 'resumenExploracionFisicaPregunta'],
};

export function quitarDatosAnteriores(df: Datos): void {
  for (const c of datosAnteriores.campos) delete df[c];
  // El resumen se armó con lo traído: se vuelve a armar con lo que quede
  if (datosAnteriores.tipo) for (const c of CAMPOS_RESUMEN[datosAnteriores.tipo]) delete df[c];
  datosAnteriores.campos = [];
  datosAnteriores.fecha = null;
}
