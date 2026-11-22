/**
 * Exploración física, punto (41): una sola lógica de respuestas para los dos modos de captura
 * (como `historiaClinicaGuardado.ts` en el punto 39).
 *
 * Antes, cada paso escribía al cerrarse lo preseleccionado («No» / «Sin hallazgos», la fecha,
 * el resumen); en la captura rápida los pasos nunca se cierran. Ahora:
 * - `completarRespuestasPorDefecto` escribe en los campos vacíos lo que se ve en pantalla, por
 *   sección conforme se revisa (`visitado`) o todo de una vez (al guardar o al editar);
 * - `prepararExploracionFisicaParaGuardar` además fija el resumen según su pregunta y deja las
 *   mediciones con la misma forma que dejaba el cierre de los pasos 2 y 3;
 * - `problemasHallazgosExploracionFisica` pide la descripción cuando un hallazgo es «Sí»
 *   (decisión del usuario 2026-11-21).
 * Solo se llenan campos vacíos: un documento existente conserva lo que tenga.
 */

import { fechaLocalHoy } from '@/helpers/dates';

type Datos = Record<string, any>;

export const SIN_HALLAZGOS = 'Sin hallazgos';

export interface PreguntaHallazgo {
  /** Campo de la descripción («Sin hallazgos» con «No»). */
  campo: string;
  /** Campo de la respuesta («Si» / «No»). */
  pregunta: string;
  /** Para los avisos: «Falta describir los hallazgos de cráneo-cara.» */
  nombre: string;
  /** Paso del asistente clásico (1–31). */
  paso: number;
}

const hallazgo = (campo: string, nombre: string, paso: number): PreguntaHallazgo => ({
  campo,
  pregunta: `${campo}Pregunta`,
  nombre,
  paso,
});

/** Pasos 4–30, en el orden de la pantalla. */
export const PREGUNTAS_HALLAZGOS: PreguntaHallazgo[] = [
  hallazgo('craneoCara', 'cráneo-cara', 4),
  hallazgo('ojos', 'ojos', 5),
  hallazgo('oidos', 'oídos', 6),
  hallazgo('nariz', 'nariz', 7),
  hallazgo('boca', 'boca', 8),
  hallazgo('cuello', 'cuello', 9),
  hallazgo('hombros', 'hombros', 10),
  hallazgo('codos', 'codos', 11),
  hallazgo('manos', 'manos', 12),
  hallazgo('reflejosOsteoTendinososSuperiores', 'reflejos osteotendinosos superiores', 13),
  hallazgo('vascularESuperiores', 'vascular de extremidades superiores', 14),
  hallazgo('torax', 'tórax', 15),
  hallazgo('abdomen', 'abdomen', 16),
  hallazgo('cadera', 'cadera', 17),
  hallazgo('rodillas', 'rodillas', 18),
  hallazgo('tobillosPies', 'tobillos-pies', 19),
  hallazgo('reflejosOsteoTendinososInferiores', 'reflejos osteotendinosos inferiores', 20),
  hallazgo('vascularEInferiores', 'vascular de extremidades inferiores', 21),
  hallazgo('inspeccionColumna', 'inspección de columna', 22),
  hallazgo('movimientosColumna', 'movimientos de columna', 23),
  hallazgo('lesionesPiel', 'lesiones en piel', 24),
  hallazgo('cicatrices', 'cicatrices', 25),
  hallazgo('nevos', 'nevos', 26),
  hallazgo('coordinacion', 'coordinación', 27),
  hallazgo('sensibilidad', 'sensibilidad', 28),
  hallazgo('equilibrio', 'equilibrio', 29),
  hallazgo('marcha', 'marcha', 30),
];

/** Mediciones de los pasos 2 y 3: el cierre del paso las dejaba en null o '' si no se medían. */
const MEDICIONES = [
  'peso',
  'altura',
  'indiceMasaCorporal',
  'circunferenciaCintura',
  'tensionArterialSistolica',
  'tensionArterialDiastolica',
  'frecuenciaCardiaca',
  'frecuenciaRespiratoria',
  'saturacionOxigeno',
];
const CATEGORIAS = [
  'categoriaIMC',
  'categoriaCircunferenciaCintura',
  'categoriaTensionArterial',
  'categoriaFrecuenciaCardiaca',
  'categoriaFrecuenciaRespiratoria',
  'categoriaSaturacionOxigeno',
];

const vacio = (v: unknown) => v === undefined || v === null || String(v).trim() === '';

export const textoResumenPorDefecto = (esMujer: boolean) =>
  esMujer ? 'Se encuentra clínicamente sana' : 'Se encuentra clínicamente sano';

/** Los hallazgos descritos, en orden, como en el resumen automático del paso 31. */
export function resumenAutomaticoExploracionFisica(df: Datos): string {
  const hallazgos = PREGUNTAS_HALLAZGOS.map((p) => df[p.campo]).filter(
    (v) => typeof v === 'string' && v.trim() !== '' && v !== SIN_HALLAZGOS,
  );
  return hallazgos.length ? `${hallazgos.join('. ')}.` : '';
}

/**
 * Escribe lo preseleccionado en los campos vacíos (lo que se ve en pantalla). Idempotente.
 * `visitado` limita el llenado a los pasos que ya se revisaron; sin él se llena todo.
 */
export function completarRespuestasPorDefecto(
  df: Datos,
  {
    esMujer,
    hoy = fechaLocalHoy(),
    visitado = () => true,
  }: { esMujer: boolean; hoy?: string; visitado?: (paso: number) => boolean },
): Datos {
  // Lo que muestra el paso 1 al abrir (la vista reinicia el formulario después de montarlo)
  if (vacio(df.fechaExploracionFisica)) df.fechaExploracionFisica = hoy;

  for (const p of PREGUNTAS_HALLAZGOS) {
    if (!visitado(p.paso)) continue;
    if (vacio(df[p.pregunta])) {
      // Documentos antiguos con descripción y sin pregunta: la pregunta sale de la descripción
      df[p.pregunta] = vacio(df[p.campo]) || df[p.campo] === SIN_HALLAZGOS ? 'No' : 'Si';
    }
    if (df[p.pregunta] === 'No' && vacio(df[p.campo])) df[p.campo] = SIN_HALLAZGOS;
  }

  // Punto 55: el resumen no se preselecciona; con «No» elegido, su texto
  if (visitado(31) && df.resumenExploracionFisicaPregunta === 'No' && vacio(df.resumenExploracionFisica)) {
    df.resumenExploracionFisica = textoResumenPorDefecto(esMujer);
  }
  return df;
}

/**
 * Punto 55: la respuesta a «¿Hay hallazgos significativos por resumir?». El servidor no la
 * guarda: al editar se deduce del texto (el de «No» o uno escrito). '' = sin contestar.
 */
export function preguntaResumenExploracionFisica(df: Datos, esMujer: boolean): 'Si' | 'No' | '' {
  const p = df.resumenExploracionFisicaPregunta;
  if (p === 'Si' || p === 'No') return p;
  if (vacio(df.resumenExploracionFisica)) return '';
  return df.resumenExploracionFisica === textoResumenPorDefecto(esMujer) ? 'No' : 'Si';
}

/** Punto 55: sin contestar, o «Sí» sin texto, se pide al guardar. */
export function problemasResumenExploracionFisica(df: Datos, esMujer: boolean): ProblemaHallazgo[] {
  const pregunta = preguntaResumenExploracionFisica(df, esMujer);
  if (pregunta === 'No' || (pregunta === 'Si' && !vacio(df.resumenExploracionFisica))) return [];
  return [
    {
      paso: 31,
      campo: 'resumenExploracionFisica',
      nombre: 'Resumen de la exploración física',
      falta: true,
      mensaje: 'Indica si hay hallazgos por resumir',
    },
  ];
}

/**
 * Lo que viaja al servidor: lo preseleccionado en lo vacío, el resumen según su pregunta
 * («No» → texto por defecto; «Sí» → lo escrito o, si está vacío, los hallazgos) y las
 * mediciones con la forma que dejaba el cierre de los pasos 2 y 3.
 */
export function prepararExploracionFisicaParaGuardar(df: Datos, { esMujer }: { esMujer: boolean }): Datos {
  completarRespuestasPorDefecto(df, { esMujer });
  // Punto 55: nada se genera al guardar; sin contestar o «Sí» sin texto lo pide el aviso
  if (preguntaResumenExploracionFisica(df, esMujer) === 'No') {
    df.resumenExploracionFisica = textoResumenPorDefecto(esMujer);
  }
  for (const campo of MEDICIONES) if (df[campo] === undefined) df[campo] = null;
  for (const campo of CATEGORIAS) if (df[campo] === undefined || df[campo] === null) df[campo] = '';
  if (df.circunferenciaCinturaSeDesconoce === undefined) df.circunferenciaCinturaSeDesconoce = false;
  return df;
}

export interface ProblemaHallazgo {
  paso: number;
  campo: string;
  nombre: string;
  falta: true;
  mensaje: string;
}

/** «Sí» sin descripción (o con la de «No»): se pide al guardar. */
export function problemasHallazgosExploracionFisica(df: Datos): ProblemaHallazgo[] {
  return PREGUNTAS_HALLAZGOS.filter(
    (p) => df[p.pregunta] === 'Si' && (vacio(df[p.campo]) || df[p.campo] === SIN_HALLAZGOS),
  ).map((p) => ({
    paso: p.paso,
    campo: p.campo,
    nombre: `Describir los hallazgos de ${p.nombre}`,
    falta: true,
    mensaje: `Falta describir los hallazgos de ${p.nombre}.`,
  }));
}
