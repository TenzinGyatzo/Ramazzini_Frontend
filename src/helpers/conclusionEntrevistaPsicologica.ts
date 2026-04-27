/**
 * Valores considerados “sin hallazgo relevante” respecto al criterio clínico habitual.
 * Debe alinearse con los defaults de los pasos y con entrevista-psicologica.schema.ts
 */
/** Valor canónico actual (redacción sexo-agnóstica) */
export const ORIENTACION_SIN_HALLAZGO = 'Orientación en tiempo, espacio y persona';
/** Valor histórico en documentos guardados; sigue aceptado en backend y aquí al detectar hallazgos */
export const ORIENTACION_SIN_HALLAZGO_LEGACY = 'Orientado en tiempo, espacio y persona';

const VALORES_ESPERADOS: Record<string, string> = {
  apariencia: 'Adecuada',
  actitudHaciaEvaluador: 'Colaboradora',
  nivelCooperacion: 'Alta',
  contactoVisual: 'Adecuado',
  conductaMotora: 'Normal',
  estadoAnimoPredominante: 'Eutímico (normal)',
  afecto: 'Adecuado',
  intensidadEmocional: 'Normal',
  cursoPensamiento: 'Normal',
  alteracionesPensamiento: 'No',
  alteracionesPerceptuales: 'No',
  orientacion: ORIENTACION_SIN_HALLAZGO,
  atencionConcentracion: 'Adecuada',
  memoria: 'Conservada',
  juicio: 'Conservado',
  concienciaEstado: 'Presente',
  relacionesInterpersonales: 'Adecuadas',
  desempenoLaboralAutorreporte: 'Adecuado',
  manejoEstres: 'Adecuado',
  ideacionSuicida: 'No',
};

export const CONCLUSION_SIN_HALLAZGOS =
  'Con orientación adecuada en las tres esferas, con estado de ánimo eutímico, pensamiento lógico y sin alteraciones perceptuales. Juicio conservado y funcionamiento psicosocial adecuado.';

/** Texto por defecto histórico (masculino genérico) */
export const CONCLUSION_SIN_HALLAZGOS_LEGACY =
  'Con orientación adecuada en las tres esferas, con estado de ánimo eutímico, pensamiento lógico y sin alteraciones perceptuales. Juicio conservado y funcionamiento psicosocial adecuado.';

/** Variante con error tipográfico en “ánimo” (acción rápida antigua en CrearDocumentoView) */
export const CONCLUSION_SIN_HALLAZGOS_LEGACY_TYPO =
  'Con orientación adecuada en las tres esferas, con estado de animo eutímico, pensamiento lógico y sin alteraciones perceptuales. Juicio conservado y funcionamiento psicosocial adecuado.';

export function esConclusionSinHallazgos(texto: string | undefined | null): boolean {
  if (!texto) return false;
  return (
    texto === CONCLUSION_SIN_HALLAZGOS ||
    texto === CONCLUSION_SIN_HALLAZGOS_LEGACY ||
    texto === CONCLUSION_SIN_HALLAZGOS_LEGACY_TYPO
  );
}

function joinHallazgos(frases: string[]): string {
  const f = frases.filter(Boolean);
  if (f.length === 0) return '';
  if (f.length === 1) return f[0];
  if (f.length === 2) return `${f[0]} y ${f[1]}`;
  return `${f.slice(0, -1).join(', ')} y ${f[f.length - 1]}`;
}

/** Frases breves por campo cuando el valor no es el esperado */
function hallazgoPorCampo(campo: string, valor: unknown): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (campo === 'orientacion') {
    if (valor === ORIENTACION_SIN_HALLAZGO || valor === ORIENTACION_SIN_HALLAZGO_LEGACY) return null;
  }
  const esp = VALORES_ESPERADOS[campo];
  if (esp !== undefined && valor === esp) return null;

  switch (campo) {
    case 'apariencia':
      if (valor === 'Descuidada') return 'apariencia descuidada';
      if (valor === 'Incongruente con el contexto') return 'apariencia incongruente con el contexto';
      return `apariencia ${String(valor).toLowerCase()}`;
    case 'actitudHaciaEvaluador':
      if (valor === 'Indiferente') return 'actitud indiferente';
      if (valor === 'Hostil') return 'actitud hostil';
      if (valor === 'Evasiva') return 'actitud evasiva';
      return `actitud ${String(valor).toLowerCase()}`;
    case 'nivelCooperacion':
      if (valor === 'Media') return 'cooperación media';
      if (valor === 'Baja') return 'cooperación baja';
      return null;
    case 'contactoVisual':
      if (valor === 'Escaso') return 'contacto visual escaso';
      if (valor === 'Evitativo') return 'contacto visual evitativo';
      if (valor === 'Excesivo') return 'contacto visual excesivo';
      return null;
    case 'conductaMotora':
      if (valor === 'Inquietud psicomotora') return 'inquietud psicomotora';
      if (valor === 'Retardo psicomotor') return 'retardo psicomotor';
      if (valor === 'Movimientos inusuales') return 'movimientos motores inusuales';
      return `conducta motora ${String(valor).toLowerCase()}`;
    case 'estadoAnimoPredominante':
      if (valor === 'Ansioso') return 'ansiedad';
      if (valor === 'Deprimido') return 'síntomas depresivos';
      if (valor === 'Irritable') return 'irritabilidad';
      return null;
    case 'afecto':
      if (valor === 'Plano') return 'afecto plano';
      if (valor === 'Lábil') return 'afecto lábil';
      if (valor === 'Incongruente') return 'afecto incongruente';
      return null;
    case 'intensidadEmocional':
      if (valor === 'Disminuida') return 'intensidad emocional disminuida';
      if (valor === 'Aumentada') return 'hiperreactividad emocional';
      return null;
    case 'cursoPensamiento':
      if (valor === 'Acelerado') return 'curso del pensamiento acelerado';
      if (valor === 'Enlentecido') return 'curso del pensamiento enlentecido';
      if (valor === 'Disgregado') return 'curso del pensamiento disgregado';
      return null;
    case 'alteracionesPensamiento':
      return valor === 'Sí' ? 'alteraciones del pensamiento' : null;
    case 'alteracionesPerceptuales':
      return valor === 'Sí' ? 'alteraciones perceptuales' : null;
    case 'orientacion':
      if (valor === 'Desorientación parcial') return 'desorientación parcial';
      if (valor === 'Desorientación global') return 'desorientación global';
      return null;
    case 'atencionConcentracion':
      if (valor === 'Disminuida') return 'atención disminuida';
      if (valor === 'Muy limitada') return 'atención muy limitada';
      return null;
    case 'memoria':
      if (valor === 'Leve alteración') return 'leve alteración de la memoria';
      if (valor === 'Alteración significativa') return 'alteración significativa de la memoria';
      return null;
    case 'juicio':
      if (valor === 'Parcialmente alterado') return 'juicio parcialmente alterado';
      if (valor === 'Alterado') return 'juicio alterado';
      return null;
    case 'concienciaEstado':
      if (valor === 'Parcial') return 'conciencia de estado parcial';
      if (valor === 'Ausente') return 'conciencia de estado ausente';
      return null;
    case 'relacionesInterpersonales':
      if (valor === 'Conflictos ocasionales') return 'conflictos interpersonales ocasionales';
      if (valor === 'Conflictos frecuentes') return 'conflictos interpersonales frecuentes';
      if (valor === 'Aislamiento') return 'aislamiento social';
      return null;
    case 'desempenoLaboralAutorreporte':
      if (valor === 'Disminuido') return 'desempeño laboral disminuido (autorreporte)';
      if (valor === 'Inestable') return 'desempeño laboral inestable (autorreporte)';
      return null;
    case 'manejoEstres':
      if (valor === 'Limitado') return 'manejo del estrés limitado';
      if (valor === 'Inadecuado') return 'manejo del estrés inadecuado';
      return null;
    case 'ideacionSuicida':
      return valor === 'Sí' ? 'ideación suicida' : null;
    default:
      return null;
  }
}

const ORDEN_CAMPOS: string[] = [
  'apariencia',
  'actitudHaciaEvaluador',
  'nivelCooperacion',
  'contactoVisual',
  'conductaMotora',
  'estadoAnimoPredominante',
  'afecto',
  'intensidadEmocional',
  'cursoPensamiento',
  'alteracionesPensamiento',
  'alteracionesPerceptuales',
  'orientacion',
  'atencionConcentracion',
  'memoria',
  'juicio',
  'concienciaEstado',
  'relacionesInterpersonales',
  'desempenoLaboralAutorreporte',
  'manejoEstres',
  'ideacionSuicida',
];

function esValorEsperado(campo: string, v: unknown): boolean {
  const esp = VALORES_ESPERADOS[campo];
  if (campo === 'orientacion') {
    return v === ORIENTACION_SIN_HALLAZGO || v === ORIENTACION_SIN_HALLAZGO_LEGACY;
  }
  return v === esp;
}

export function hayHallazgosSignificativos(fd: Record<string, unknown>): boolean {
  for (const campo of ORDEN_CAMPOS) {
    const v = fd[campo];
    if (v === undefined || v === null || v === '') continue;
    if (!esValorEsperado(campo, v)) return true;
  }
  return false;
}

/**
 * Construye un párrafo de conclusión mezclando hallazgos y aspectos conservados.
 */
export function generarConclusionClinica(fd: Record<string, unknown>): string {
  const hallazgos: string[] = [];
  for (const campo of ORDEN_CAMPOS) {
    const frase = hallazgoPorCampo(campo, fd[campo]);
    if (frase) hallazgos.push(frase);
  }

  if (hallazgos.length === 0) {
    return CONCLUSION_SIN_HALLAZGOS;
  }

  let texto = `Paciente con ${joinHallazgos(hallazgos)}`;

  const complementos: string[] = [];
  if (fd.alteracionesPensamiento === 'No' && fd.alteracionesPerceptuales === 'No') {
    complementos.push('sin alteraciones del pensamiento ni de la percepción');
  } else if (fd.alteracionesPensamiento === 'No') {
    complementos.push('sin alteraciones del pensamiento');
  } else if (fd.alteracionesPerceptuales === 'No') {
    complementos.push('sin alteraciones perceptuales');
  }

  if (complementos.length > 0) {
    texto += `, ${complementos.join(' y ')}`;
  }
  texto += '.';

  if (fd.juicio === 'Conservado') {
    texto += ' Juicio conservado.';
  }

  if (fd.ideacionSuicida === 'No') {
    texto += ' Sin ideación suicida actual o reciente.';
  }

  return texto.trim();
}
