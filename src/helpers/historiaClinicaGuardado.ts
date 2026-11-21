/**
 * Historia clínica, punto (39): una sola lógica de respuestas para los dos modos de captura.
 *
 * Antes, cada paso escribía su respuesta preseleccionada («No», «Negado», «12-14 años»…) al
 * cerrarse; en la captura rápida los pasos nunca se cierran. Ahora:
 * - `completarRespuestasPorDefecto` escribe lo que se ve en pantalla en los campos vacíos, al
 *   abrir el documento y otra vez al guardar (decisión del usuario 2026-11-21: una sección no
 *   visitada se guarda con lo preseleccionado, también con vista previa);
 * - `prepararHistoriaClinicaParaGuardar` además fija el resumen según su pregunta;
 * - `problemasEspecificarHistoriaClinica` pide «Especifique» cuando la respuesta es «Sí».
 * Solo se llenan campos vacíos: un documento existente conserva lo que tenga.
 */

import { fechaLocalHoy } from '@/helpers/dates';

type Datos = Record<string, any>;

export interface PreguntaConEspecificar {
  /** Campo de la respuesta («Si» / «No»). */
  campo: string;
  /** Campo del texto que se pide al responder «Sí». */
  especificar: string;
  /** Lo que se escribe en «Especifique» cuando la respuesta es «No». */
  textoNo: 'Negado' | 'Adecuada';
  /** Para los avisos: «Falta especificar diabetes». */
  nombre: string;
  /** Paso del asistente clásico (canónico de mujer, 1–46). */
  paso: number;
}

const antecedente = (
  campo: string,
  nombre: string,
  paso: number,
  textoNo: 'Negado' | 'Adecuada' = 'Negado',
): PreguntaConEspecificar => ({ campo, especificar: `${campo}Especificar`, textoNo, nombre, paso });

/** Pasos 2–27: heredofamiliares, personales patológicos y no patológicos. */
export const PREGUNTAS_ANTECEDENTES: PreguntaConEspecificar[] = [
  antecedente('nefropatias', 'nefropatías (heredofamiliares)', 2),
  antecedente('diabeticos', 'diabetes (heredofamiliares)', 3),
  antecedente('hipertensivos', 'hipertensión (heredofamiliares)', 4),
  antecedente('cardiopaticos', 'cardiopatías (heredofamiliares)', 5),
  antecedente('neoplasicos', 'cáncer (heredofamiliares)', 6),
  antecedente('psiquiatricos', 'trastornos psiquiátricos (heredofamiliares)', 7),
  antecedente('epilepticos', 'epilepsia (heredofamiliares)', 8),
  antecedente('autoinmunes', 'enfermedades autoinmunes (heredofamiliares)', 9),
  antecedente('tuberculosis', 'tuberculosis (heredofamiliares)', 10),
  antecedente('hepatopatias', 'hepatopatías (heredofamiliares)', 11),
  antecedente('lumbalgias', 'lumbalgias', 12),
  antecedente('diabeticosPP', 'diabetes (personales)', 13),
  antecedente('cardiopaticosPP', 'cardiopatías (personales)', 14),
  antecedente('alergicos', 'alergias', 15),
  antecedente('hipertensivosPP', 'hipertensión (personales)', 16),
  antecedente('respiratorios', 'enfermedades respiratorias', 17),
  antecedente('epilepticosPP', 'epilepsia (personales)', 18),
  antecedente('accidentes', 'accidentes', 19),
  antecedente('quirurgicos', 'antecedentes quirúrgicos', 20),
  antecedente('otros', 'otros antecedentes', 21),
  antecedente('alcoholismo', 'alcoholismo', 22),
  antecedente('tabaquismo', 'tabaquismo', 23),
  antecedente('toxicomanias', 'toxicomanías', 24),
  antecedente('alimentacionDeficiente', 'alimentación deficiente', 25, 'Adecuada'),
  antecedente('actividadFisicaDeficiente', 'actividad física deficiente', 26, 'Adecuada'),
  antecedente('higienePersonalDeficiente', 'higiene personal deficiente', 27, 'Adecuada'),
];

/** Pasos 28–34 y 36 (solo mujeres): valor típico preseleccionado. */
export const GINECO_VALORES_TIPICOS: Record<string, string> = {
  menarca: '12-14 años',
  duracionPromedio: '5 días',
  frecuencia: 'Regular',
  gestas: '0 (Ninguna)',
  partos: '0 (Ninguno)',
  cesareas: '0 (Ninguna)',
  abortos: '0 (Ninguno)',
  dolorMenstrual: 'Eumenorrea',
};

/**
 * Pasos 35 y 37–41 (solo mujeres): pregunta «¿…?» con «No» preseleccionado. El campo guarda el
 * texto de «No» o, con «Sí», lo que se especifique (vacío = falta especificar).
 */
export const GINECO_PREGUNTAS: Array<{ campo: string; textoNo: string; nombre: string; paso: number }> = [
  { campo: 'fechaUltimaRegla', textoNo: 'No recuerda', nombre: 'fecha de última menstruación', paso: 35 },
  { campo: 'embarazoActual', textoNo: 'Negado', nombre: 'embarazo actual', paso: 37 },
  { campo: 'vidaSexualActiva', textoNo: 'Negada', nombre: 'vida sexual activa', paso: 38 },
  { campo: 'planificacionFamiliar', textoNo: 'Ninguno', nombre: 'planificación familiar', paso: 39 },
  { campo: 'fechaUltimoPapanicolaou', textoNo: 'No recuerda', nombre: 'último papanicolaou', paso: 40 },
  { campo: 'fechaUltimaMastografia', textoNo: 'No recuerda', nombre: 'última mastografía', paso: 41 },
];

/** Paso 45: accidente laboral; con «No», sus tres textos. */
export const ACCIDENTE_LABORAL_NO: Record<string, string> = {
  accidenteLaboralEspecificar: 'Niega haber sufrido riesgos de trabajo',
  descripcionDelDano: 'Ninguno',
  secuelas: 'Sin secuelas',
};

/** Campos que alimentan el resumen automático (pasos 12–21 y 45). */
const CAMPOS_HALLAZGOS = [
  'lumbalgiasEspecificar',
  'diabeticosPPEspecificar',
  'cardiopaticosPPEspecificar',
  'alergicosEspecificar',
  'hipertensivosPPEspecificar',
  'respiratoriosEspecificar',
  'epilepticosPPEspecificar',
  'accidentesEspecificar',
  'quirurgicosEspecificar',
  'otrosEspecificar',
  'secuelas',
];

const vacio = (v: unknown) => v === undefined || v === null || String(v).trim() === '';

export const textoResumenPorDefecto = (esMujer: boolean) =>
  esMujer ? 'Se refiere actualmente asintomática' : 'Se refiere actualmente asintomático';

/** Hallazgos de los antecedentes personales y del accidente laboral, en una línea. */
export function resumenAutomaticoHistoriaClinica(df: Datos): string {
  const hallazgos = CAMPOS_HALLAZGOS.map((c) => df[c])
    .filter((v) => typeof v === 'string' && v.trim() !== '' && v !== 'Negado' && v !== 'Sin secuelas');
  return hallazgos.length > 0 ? `${hallazgos.join('. ')}.` : '';
}

/**
 * Al marcar «Sí», «Especifique» no debe traer el texto de «No» («Negado», «Adecuada»…):
 * se vacía para que se escriba el detalle.
 */
export function limpiarTextoDeNo(df: Datos, campo: string, textoNo: string): void {
  if (df[campo] === textoNo) df[campo] = '';
}

/** Escribe lo preseleccionado en los campos vacíos (lo que se ve en pantalla). Idempotente. */
export function completarRespuestasPorDefecto(
  df: Datos,
  { esMujer, hoy = fechaLocalHoy() }: { esMujer: boolean; hoy?: string },
): Datos {
  // Lo que muestra el paso 1 al abrir (la vista reinicia el formulario después de montarlo)
  if (vacio(df.motivoExamen)) df.motivoExamen = 'Ingreso';
  if (vacio(df.fechaHistoriaClinica)) df.fechaHistoriaClinica = hoy;

  for (const p of PREGUNTAS_ANTECEDENTES) {
    if (vacio(df[p.campo])) df[p.campo] = 'No';
    if (df[p.campo] === 'No' && vacio(df[p.especificar])) df[p.especificar] = p.textoNo;
  }

  if (esMujer) {
    for (const [campo, valor] of Object.entries(GINECO_VALORES_TIPICOS)) {
      if (vacio(df[campo])) df[campo] = valor;
    }
    // Una pregunta sin responder es «No»; con «Sí» el campo se vacía al marcarla y no se toca
    for (const p of GINECO_PREGUNTAS) {
      if (df[p.campo] === undefined || df[p.campo] === null) df[p.campo] = p.textoNo;
    }
  }

  if (vacio(df.accidenteLaboral)) df.accidenteLaboral = 'No';
  if (df.accidenteLaboral === 'No') {
    for (const [campo, texto] of Object.entries(ACCIDENTE_LABORAL_NO)) {
      if (vacio(df[campo])) df[campo] = texto;
    }
  }

  if (vacio(df.resumenHistoriaClinicaPregunta)) df.resumenHistoriaClinicaPregunta = 'No';
  if (df.resumenHistoriaClinicaPregunta === 'No' && vacio(df.resumenHistoriaClinica)) {
    df.resumenHistoriaClinica = textoResumenPorDefecto(esMujer);
  }
  return df;
}

/**
 * Lo que viaja al servidor: lo preseleccionado en lo vacío y el resumen según su pregunta
 * («No» → texto por defecto; «Sí» → lo escrito o, si está vacío, los hallazgos).
 */
export function prepararHistoriaClinicaParaGuardar(df: Datos, { esMujer }: { esMujer: boolean }): Datos {
  completarRespuestasPorDefecto(df, { esMujer });
  if (df.resumenHistoriaClinicaPregunta === 'No') {
    df.resumenHistoriaClinica = textoResumenPorDefecto(esMujer);
  } else if (vacio(df.resumenHistoriaClinica)) {
    df.resumenHistoriaClinica = resumenAutomaticoHistoriaClinica(df);
  }
  return df;
}

export interface ProblemaEspecificar {
  paso: number;
  campo: string;
  nombre: string;
  falta: true;
  mensaje: string;
}

/** «Sí» sin especificar (decisión del usuario 2026-11-21): un pendiente por pregunta. */
export function problemasEspecificarHistoriaClinica(
  df: Datos,
  { esMujer }: { esMujer: boolean },
): ProblemaEspecificar[] {
  const problemas: ProblemaEspecificar[] = [];
  const falta = (paso: number, campo: string, nombre: string) =>
    problemas.push({ paso, campo, nombre: `Especificar ${nombre}`, falta: true, mensaje: `Falta especificar ${nombre}.` });

  for (const p of PREGUNTAS_ANTECEDENTES) {
    if (df[p.campo] === 'Si' && (vacio(df[p.especificar]) || df[p.especificar] === p.textoNo)) {
      falta(p.paso, p.especificar, p.nombre);
    }
  }
  if (esMujer) {
    for (const p of GINECO_PREGUNTAS) {
      // Con «Sí» el paso vacía el campo; vacío (no indefinido) = respondió «Sí» y no especificó
      if (df[p.campo] === '') falta(p.paso, p.campo, p.nombre);
    }
  }
  if (df.accidenteLaboral === 'Si' && vacio(df.accidenteLaboralEspecificar)) {
    falta(45, 'accidenteLaboralEspecificar', 'el accidente laboral');
  }
  return problemas;
}
