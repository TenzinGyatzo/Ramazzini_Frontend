/**
 * Examen de la vista, punto (43): una sola lógica de respuestas para los dos modos de captura
 * (como historiaClinicaGuardado y exploracionFisicaGuardado).
 *
 * Antes cada paso escribía al abrirse y al cerrarse lo que mostraba (20/20, sus
 * interpretaciones, «requiere lentes», Ishihara 14) y aplicaba ahí las reglas de ceguera y de
 * lentes de contacto. En la captura rápida los pasos están abiertos a la vez y nunca se cierran.
 * Ahora:
 * - los pasos solo escriben cuando el usuario cambia algo;
 * - `completarRespuestasPorDefecto` escribe lo preseleccionado por sección conforme se revisa
 *   (o todo, al guardar o al editar), con las mismas reglas que los pasos;
 * - `prepararExamenVistaParaGuardar` además deja los datos como los dejaba el cierre de los
 *   pasos (ceguera y lentes de contacto sin valores, textos vacíos fuera).
 * Solo se llenan campos vacíos: un documento existente conserva lo que tenga.
 */
import { fechaLocalHoy } from '@/helpers/dates';
import { PASO_EV } from '@/helpers/examenVistaSections';

type Datos = Record<string, any>;

export const INTERPRETACION_LENTES_CONTACTO = 'No evaluable (lentes de contacto)';
/** Lo que se ve al abrir: 20/20 y 14 placas (decisión del usuario 2026-11-13). */
export const AGUDEZA_POR_DEFECTO = 20;
export const PLACAS_ISHIHARA = 14;

const vacio = (v: unknown) => v === undefined || v === null || String(v).trim() === '';

/** Interpretación de un valor de Snellen (20/x). */
export function interpretacionAgudeza(valor: unknown): string | null {
  if (valor == null || valor === '') return null;
  const v = Number(valor);
  if (v >= 5 && v <= 15) return 'Visión excepcional';
  if (v >= 16 && v <= 25) return 'Visión normal';
  if (v >= 26 && v <= 35) return 'Visión ligeramente reducida';
  if (v >= 36 && v <= 45) return 'Visión moderadamente reducida';
  if (v >= 46 && v <= 55) return 'Visión significativamente reducida';
  if (v >= 56) return 'Visión muy reducida';
  return 'Valor fuera de rango';
}

export interface Ojos {
  oi: unknown;
  od: unknown;
  ciegaOI: boolean;
  ciegaOD: boolean;
}

/**
 * La interpretación de una agudeza, como la calculan los pasos: ceguera de los dos ojos, lentes
 * de contacto (solo sin corrección), un solo ojo («OD: …») o el peor de los dos.
 * `sinValor` es lo que se escribe si el peor ojo no tiene valor (sin corrección «Valor fuera de
 * rango», con corrección «NA»).
 */
export function interpretarAgudeza(
  { oi, od, ciegaOI, ciegaOD }: Ojos,
  { noEvaluable = false, sinValor = 'Valor fuera de rango' }: { noEvaluable?: boolean; sinValor?: string } = {},
): string {
  if (ciegaOI && ciegaOD) return 'Ceguera total';
  if (noEvaluable) return INTERPRETACION_LENTES_CONTACTO;
  if (ciegaOI) {
    const od2 = interpretacionAgudeza(od);
    return od2 ? `OD: ${od2}` : 'OD: NA';
  }
  if (ciegaOD) {
    const oi2 = interpretacionAgudeza(oi);
    return oi2 ? `OI: ${oi2}` : 'OI: NA';
  }
  const valOI = oi != null ? Number(oi) : 0;
  const valOD = od != null ? Number(od) : 0;
  return valOI > valOD ? interpretacionAgudeza(oi) ?? sinValor : interpretacionAgudeza(od) ?? sinValor;
}

/** «Si» si algún ojo con valor pasa del umbral (25 lejana / uso general; 20 cercana / lectura). */
export function requiereLentes({ oi, od, ciegaOI, ciegaOD }: Ojos, umbral: number): 'Si' | 'No' {
  const valores = [ciegaOI ? null : oi, ciegaOD ? null : od]
    .filter((v) => v != null && v !== '')
    .map(Number);
  return valores.length === 0 || valores.every((v) => v <= umbral) ? 'No' : 'Si';
}

export function interpretarIshihara(placas: unknown): { porcentaje: number; interpretacion: 'Normal' | 'Daltonismo' } {
  const porcentaje = Math.round((Number(placas) * 100) / PLACAS_ISHIHARA);
  return { porcentaje, interpretacion: porcentaje >= 80 ? 'Normal' : 'Daltonismo' };
}

/** Ceguera total de cada ojo, también con los campos antiguos por distancia. */
export function cegueraDe(df: Datos): { ciegaOI: boolean; ciegaOD: boolean } {
  return {
    ciegaOI: !!(df.ojoIzquierdoCegueraTotal ?? df.ojoIzquierdoLejanaCegueraTotal ?? df.ojoIzquierdoCercanaCegueraTotal ?? false),
    ciegaOD: !!(df.ojoDerechoCegueraTotal ?? df.ojoDerechoLejanaCegueraTotal ?? df.ojoDerechoCercanaCegueraTotal ?? false),
  };
}

/** Una agudeza sin corrección: 20/20 en lo vacío, null en ojo ciego o con lentes de contacto. */
function completarSinCorreccion(df: Datos, distancia: 'Lejana' | 'Cercana') {
  const { ciegaOI, ciegaOD } = cegueraDe(df);
  const noEvaluable = !!df.sinCorreccionNoEvaluablePorLentesContacto;
  const oi = `ojoIzquierdo${distancia}SinCorreccion`;
  const od = `ojoDerecho${distancia}SinCorreccion`;
  if (ciegaOI || noEvaluable) {
    if (df[oi] === undefined) df[oi] = null;
  } else if (vacio(df[oi])) df[oi] = AGUDEZA_POR_DEFECTO;
  if (ciegaOD || noEvaluable) {
    if (df[od] === undefined) df[od] = null;
  } else if (vacio(df[od])) df[od] = AGUDEZA_POR_DEFECTO;
  const ojos: Ojos = { oi: df[oi], od: df[od], ciegaOI, ciegaOD };
  const interp = `sinCorreccion${distancia}Interpretacion`;
  if (vacio(df[interp])) df[interp] = interpretarAgudeza(ojos, { noEvaluable });
  if (distancia === 'Lejana') {
    if (vacio(df.requiereLentesUsoGeneral)) df.requiereLentesUsoGeneral = noEvaluable ? 'Si' : requiereLentes(ojos, 25);
  } else if (vacio(df.requiereLentesParaLectura)) {
    df.requiereLentesParaLectura = noEvaluable ? 'No' : requiereLentes(ojos, 20);
  }
}

/**
 * Agudeza con corrección: solo si usa lentes. Se preselecciona «Sí» con lentes de contacto o, en
 * Guatemala, si «¿Utiliza anteojos?» es «Sí» (como hacían los pasos 7 y 8 al abrirse).
 */
function completarConCorreccion(df: Datos, distancia: 'Lejana' | 'Cercana', esGuatemala: boolean) {
  const interp = `conCorreccion${distancia}Interpretacion`;
  if (!vacio(df[interp])) return;
  const usaLentes = !!df.sinCorreccionNoEvaluablePorLentesContacto || (esGuatemala && df.utilizaAnteojos === 'Si');
  if (!usaLentes) return;
  const { ciegaOI, ciegaOD } = cegueraDe(df);
  const oi = `ojoIzquierdo${distancia}ConCorreccion`;
  const od = `ojoDerecho${distancia}ConCorreccion`;
  if (!ciegaOI && vacio(df[oi])) df[oi] = AGUDEZA_POR_DEFECTO;
  if (!ciegaOD && vacio(df[od])) df[od] = AGUDEZA_POR_DEFECTO;
  df[interp] = interpretarAgudeza(
    { oi: ciegaOI ? undefined : df[oi], od: ciegaOD ? undefined : df[od], ciegaOI, ciegaOD },
    { sinValor: 'NA' },
  );
}

/**
 * Escribe lo preseleccionado en los campos vacíos (lo que se ve en pantalla). Idempotente.
 * `visitado(paso canónico)` limita el llenado a lo ya revisado; sin él se llena todo.
 */
export function completarRespuestasPorDefecto(
  df: Datos,
  {
    esGuatemala,
    hoy = fechaLocalHoy(),
    visitado = () => true,
  }: { esGuatemala: boolean; hoy?: string; visitado?: (paso: number) => boolean },
): Datos {
  if (vacio(df.fechaExamenVista)) df.fechaExamenVista = hoy;

  if (esGuatemala && visitado(PASO_EV.evUtilizaAnteojosGT) && vacio(df.utilizaAnteojos)) {
    df.utilizaAnteojos = 'No';
  }

  if (visitado(PASO_EV.evAvLejanaSin) || visitado(PASO_EV.evAvCercanaSin)) {
    const { ciegaOI, ciegaOD } = cegueraDe(df);
    if (df.ojoIzquierdoCegueraTotal === undefined) df.ojoIzquierdoCegueraTotal = ciegaOI;
    if (df.ojoDerechoCegueraTotal === undefined) df.ojoDerechoCegueraTotal = ciegaOD;
    if (df.sinCorreccionNoEvaluablePorLentesContacto === undefined) df.sinCorreccionNoEvaluablePorLentesContacto = false;
  }
  if (visitado(PASO_EV.evAvLejanaSin)) completarSinCorreccion(df, 'Lejana');
  if (visitado(PASO_EV.evAvCercanaSin)) completarSinCorreccion(df, 'Cercana');
  if (visitado(PASO_EV.evAvLejanaCon)) completarConCorreccion(df, 'Lejana', esGuatemala);
  if (visitado(PASO_EV.evAvCercanaCon)) completarConCorreccion(df, 'Cercana', esGuatemala);

  if (visitado(PASO_EV.evIshihara) && vacio(df.placasCorrectas)) {
    df.placasCorrectas = PLACAS_ISHIHARA;
    const { porcentaje, interpretacion } = interpretarIshihara(PLACAS_ISHIHARA);
    if (vacio(df.porcentajeIshihara)) df.porcentajeIshihara = porcentaje;
    if (vacio(df.interpretacionIshihara)) df.interpretacionIshihara = interpretacion;
  }
  return df;
}

const TEXTOS_GUATEMALA = [
  'antecedentes',
  'anamnesis',
  'testEstereopsis',
  'testCampoVisual',
  'coverTest',
  'esferaOjoIzquierdo',
  'cilindroOjoIzquierdo',
  'adicionOjoIzquierdo',
  'esferaOjoDerecho',
  'cilindroOjoDerecho',
  'adicionOjoDerecho',
  'diagnosticoRecomendaciones',
];

/**
 * Lo que viaja al servidor: lo preseleccionado en lo vacío y los datos como los dejaba el
 * cierre de los pasos (ojo ciego o lentes de contacto sin agudeza sin corrección; ojo ciego sin
 * agudeza con corrección; textos vacíos fuera).
 */
export function prepararExamenVistaParaGuardar(df: Datos, { esGuatemala }: { esGuatemala: boolean }): Datos {
  completarRespuestasPorDefecto(df, { esGuatemala });
  const { ciegaOI, ciegaOD } = cegueraDe(df);
  const noEvaluable = !!df.sinCorreccionNoEvaluablePorLentesContacto;
  for (const distancia of ['Lejana', 'Cercana']) {
    if (ciegaOI || noEvaluable) df[`ojoIzquierdo${distancia}SinCorreccion`] = null;
    if (ciegaOD || noEvaluable) df[`ojoDerecho${distancia}SinCorreccion`] = null;
    if (ciegaOI) df[`ojoIzquierdo${distancia}ConCorreccion`] = undefined;
    if (ciegaOD) df[`ojoDerecho${distancia}ConCorreccion`] = undefined;
  }
  if (noEvaluable) {
    df.sinCorreccionCercanaInterpretacion = INTERPRETACION_LENTES_CONTACTO;
    df.requiereLentesParaLectura = 'No';
  }
  for (const campo of TEXTOS_GUATEMALA) {
    const v = df[campo];
    if (v === undefined) continue;
    // Como el cierre de los pasos: «valor || undefined» (lo vacío no viaja)
    const texto = typeof v === 'string' ? v.trim() : v;
    df[campo] = texto || undefined;
  }
  return df;
}
