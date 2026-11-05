/**
 * Nota de enfermería: atención de enfermería en la empresa, sin diagnósticos CIE-10.
 * Las claves y los textos deben coincidir con
 * `backend/src/modules/expedientes/constants/nota-enfermeria.constants.ts`.
 * Espec: docs/nota-enfermeria-especificacion.md
 */

export interface OpcionNotaEnfermeria {
  clave: string;
  etiqueta: string;
}

export const RELACIONES_TEMPORALES_NOTA_ENFERMERIA: OpcionNotaEnfermeria[] = [
  { clave: 'primeraVez', etiqueta: 'Primera vez' },
  { clave: 'subsecuente', etiqueta: 'Subsecuente' },
];

/** Qué clase de problema es. */
export const TIPOS_PROBLEMA_NOTA_ENFERMERIA: (OpcionNotaEnfermeria & { ayuda?: string })[] = [
  { clave: 'lesion', etiqueta: 'Lesión o traumatismo' },
  { clave: 'sintoma', etiqueta: 'Síntoma o malestar' },
  {
    clave: 'control',
    etiqueta: 'Control o seguimiento',
    ayuda: 'Presión, glucosa, curación subsecuente',
  },
  { clave: 'medicamento', etiqueta: 'Solicitud de medicamento' },
  { clave: 'preventiva', etiqueta: 'Preventiva', ayuda: 'Vacunación, tamizaje, orientación' },
];

/** Dónde está el problema; `capituloCie10` es el capítulo equivalente del tablero. */
export const SISTEMAS_NOTA_ENFERMERIA: (OpcionNotaEnfermeria & { capituloCie10: string | null })[] = [
  { clave: 'piel', etiqueta: 'Piel y tegumentos', capituloCie10: 'XII' },
  { clave: 'musculoesqueletico', etiqueta: 'Musculoesquelético', capituloCie10: 'XIII' },
  { clave: 'ojo', etiqueta: 'Ojo', capituloCie10: 'VII' },
  { clave: 'oido', etiqueta: 'Oído', capituloCie10: 'VIII' },
  { clave: 'respiratorio', etiqueta: 'Respiratorio', capituloCie10: 'X' },
  { clave: 'cardiovascular', etiqueta: 'Cardiovascular', capituloCie10: 'IX' },
  { clave: 'digestivo', etiqueta: 'Digestivo', capituloCie10: 'XI' },
  { clave: 'neurologico', etiqueta: 'Neurológico', capituloCie10: 'VI' },
  { clave: 'genitourinario', etiqueta: 'Genitourinario', capituloCie10: 'XIV' },
  { clave: 'endocrino', etiqueta: 'Endocrino y metabólico', capituloCie10: 'IV' },
  { clave: 'saludMental', etiqueta: 'Salud mental', capituloCie10: 'V' },
  { clave: 'general', etiqueta: 'General (fiebre, malestar general)', capituloCie10: null },
  { clave: 'noAplica', etiqueta: 'No aplica', capituloCie10: null },
];

/** Relación de la atención con el trabajo. */
export const ORIGENES_NOTA_ENFERMERIA: OpcionNotaEnfermeria[] = [
  { clave: 'enfermedadGeneral', etiqueta: 'Enfermedad general' },
  { clave: 'accidenteTrabajo', etiqueta: 'Accidente de trabajo' },
  { clave: 'accidenteTrayecto', etiqueta: 'Accidente de trayecto' },
  { clave: 'probableEnfermedadTrabajo', etiqueta: 'Probable enfermedad de trabajo' },
  { clave: 'noDeterminado', etiqueta: 'No determinado' },
];

/** A dónde va el trabajador al terminar la atención. */
export const DESTINOS_NOTA_ENFERMERIA: OpcionNotaEnfermeria[] = [
  { clave: 'regresaPuesto', etiqueta: 'Regresa a su puesto' },
  { clave: 'regresaRestricciones', etiqueta: 'Regresa con restricciones' },
  { clave: 'casa', etiqueta: 'Se envía a casa' },
  { clave: 'refiereMedico', etiqueta: 'Se refiere al médico' },
  { clave: 'refiereExterno', etiqueta: 'Se refiere a IMSS o urgencias' },
  { clave: 'ambulancia', etiqueta: 'Traslado en ambulancia' },
];

export const PROCEDIMIENTOS_NOTA_ENFERMERIA: OpcionNotaEnfermeria[] = [
  { clave: 'signosVitales', etiqueta: 'Toma de signos vitales' },
  { clave: 'glucosaCapilar', etiqueta: 'Glucosa capilar' },
  { clave: 'curacion', etiqueta: 'Curación' },
  { clave: 'lavadoOcular', etiqueta: 'Lavado ocular' },
  { clave: 'retiroCuerpoExtrano', etiqueta: 'Retiro de cuerpo extraño superficial' },
  { clave: 'vendaje', etiqueta: 'Vendaje o inmovilización' },
  { clave: 'compresas', etiqueta: 'Aplicación de compresas' },
  { clave: 'nebulizacion', etiqueta: 'Nebulización' },
  { clave: 'vacunacion', etiqueta: 'Vacunación' },
  { clave: 'electrocardiograma', etiqueta: 'Electrocardiograma' },
  { clave: 'primerosAuxilios', etiqueta: 'Primeros auxilios o RCP' },
  { clave: 'orientacion', etiqueta: 'Orientación para la salud' },
  { clave: 'otro', etiqueta: 'Otro' },
];

export const VIAS_ADMINISTRACION_NOTA_ENFERMERIA: OpcionNotaEnfermeria[] = [
  { clave: 'oral', etiqueta: 'Oral' },
  { clave: 'sublingual', etiqueta: 'Sublingual' },
  { clave: 'topica', etiqueta: 'Tópica' },
  { clave: 'oftalmica', etiqueta: 'Oftálmica' },
  { clave: 'otica', etiqueta: 'Ótica' },
  { clave: 'nasal', etiqueta: 'Nasal' },
  { clave: 'inhalada', etiqueta: 'Inhalada' },
  { clave: 'intramuscular', etiqueta: 'Intramuscular' },
  { clave: 'intravenosa', etiqueta: 'Intravenosa' },
  { clave: 'subcutanea', etiqueta: 'Subcutánea' },
  { clave: 'rectal', etiqueta: 'Rectal' },
  { clave: 'otra', etiqueta: 'Otra' },
];

export const MAX_TOMAS_CONTROL_NOTA_ENFERMERIA = 3;

/** Pasos de captura (la espec, sección 2). */
export const PASO_DATOS_NOTA_ENFERMERIA = 1;
export const PASO_CLASIFICACION_NOTA_ENFERMERIA = 2;
export const PASO_VALORACION_NOTA_ENFERMERIA = 3;
export const PASO_INTERVENCION_NOTA_ENFERMERIA = 4;
export const PASO_CIERRE_NOTA_ENFERMERIA = 5;

export const MENSAJE_NOTA_ENFERMERIA_PARA_MEDICOS =
  'La Nota de enfermería es exclusiva del personal de enfermería. Para registrar esta atención usa la Nota médica.';
export const MENSAJE_NOTA_ENFERMERIA_OTROS_PERFILES =
  'La Nota de enfermería es exclusiva del personal de enfermería.';

/** Etiqueta de una clave; si la clave ya no existe en la lista, la clave misma. */
export function etiquetaNotaEnfermeria(
  opciones: readonly OpcionNotaEnfermeria[],
  clave: string | null | undefined,
): string {
  if (!clave) return '';
  return opciones.find((o) => o.clave === clave)?.etiqueta ?? clave;
}

export interface SignosVitalesNotaEnfermeria {
  hora?: string;
  tensionArterialSistolica?: number | null;
  tensionArterialDiastolica?: number | null;
  frecuenciaCardiaca?: number | null;
  frecuenciaRespiratoria?: number | null;
  temperatura?: number | null;
  saturacionOxigeno?: number | null;
  glucosaCapilar?: number | null;
  dolor?: number | null;
}

const hay = (valor: unknown) => valor !== undefined && valor !== null && valor !== '';

/** Columnas de la tabla de signos vitales, igual que el PDF. */
export const COLUMNAS_SIGNOS_NOTA_ENFERMERIA: {
  titulo: string;
  valor: (s: SignosVitalesNotaEnfermeria) => string;
}[] = [
  {
    titulo: 'TA (mmHg)',
    valor: (s) =>
      hay(s.tensionArterialSistolica) && hay(s.tensionArterialDiastolica)
        ? `${s.tensionArterialSistolica}/${s.tensionArterialDiastolica}`
        : '',
  },
  { titulo: 'FC (lpm)', valor: (s) => (hay(s.frecuenciaCardiaca) ? String(s.frecuenciaCardiaca) : '') },
  { titulo: 'FR (rpm)', valor: (s) => (hay(s.frecuenciaRespiratoria) ? String(s.frecuenciaRespiratoria) : '') },
  { titulo: 'Temp (°C)', valor: (s) => (hay(s.temperatura) ? String(s.temperatura) : '') },
  { titulo: 'SatO2 (%)', valor: (s) => (hay(s.saturacionOxigeno) ? String(s.saturacionOxigeno) : '') },
  { titulo: 'Glucosa (mg/dl)', valor: (s) => (hay(s.glucosaCapilar) ? String(s.glucosaCapilar) : '') },
  { titulo: 'Dolor (0-10)', valor: (s) => (hay(s.dolor) ? String(s.dolor) : '') },
];

export const tomaConDatosNotaEnfermeria = (toma?: SignosVitalesNotaEnfermeria | null) =>
  !!toma && COLUMNAS_SIGNOS_NOTA_ENFERMERIA.some((c) => c.valor(toma) !== '');

/** Filas de la tabla: la toma inicial y las de control que tengan algún valor. */
export function filasSignosNotaEnfermeria(nota: {
  horaAtencion?: string;
  signosVitales?: SignosVitalesNotaEnfermeria | null;
  tomasControl?: SignosVitalesNotaEnfermeria[] | null;
}): { toma: string; hora: string; datos: SignosVitalesNotaEnfermeria }[] {
  const filas: { toma: string; hora: string; datos: SignosVitalesNotaEnfermeria }[] = [];
  if (tomaConDatosNotaEnfermeria(nota.signosVitales)) {
    filas.push({ toma: 'Inicial', hora: nota.horaAtencion ?? '', datos: nota.signosVitales! });
  }
  (nota.tomasControl ?? []).forEach((toma, i) => {
    if (tomaConDatosNotaEnfermeria(toma)) {
      filas.push({ toma: `Control ${i + 1}`, hora: toma.hora ?? '', datos: toma });
    }
  });
  return filas;
}

/** Procedimientos por su etiqueta; «Otro» se sustituye por lo que se escribió. */
export function textoProcedimientosNotaEnfermeria(nota: {
  procedimientos?: string[] | null;
  procedimientoOtro?: string;
}): string {
  return (nota.procedimientos ?? [])
    .map((clave) =>
      clave === 'otro'
        ? nota.procedimientoOtro?.trim() || 'Otro'
        : etiquetaNotaEnfermeria(PROCEDIMIENTOS_NOTA_ENFERMERIA, clave),
    )
    .join(', ');
}

/** `Nota Enfermeria 05-11-2026 0930.pdf`: igual que el servidor (nombreArchivoNotaEnfermeria). */
export function nombreArchivoNotaEnfermeria(fechaDDMMYYYY: string, horaAtencion?: string | null): string {
  const hora = (horaAtencion ?? '').replace(':', '');
  return /^\d{4}$/.test(hora)
    ? `Nota Enfermeria ${fechaDDMMYYYY} ${hora}.pdf`
    : `Nota Enfermeria ${fechaDDMMYYYY}.pdf`;
}
