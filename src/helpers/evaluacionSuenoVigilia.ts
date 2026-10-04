/**
 * Evaluación de sueño y vigilia: instrumento propio de Ramazzini (tamizaje inicial, no validado).
 * Alineado con `evaluacion-sueno-vigilia.constants.ts` y `evaluacion-sueno-vigilia-resultado.util.ts`
 * del backend. El resultado que se guarda lo calcula el servidor; aquí se calcula solo para la
 * vista previa mientras se captura.
 */

export type ModuloSuenoVigilia = 'sueno' | 'vigilia';

export type ClaveAreaSuenoVigilia =
  | 'calidadDescanso'
  | 'conciliacionContinuidad'
  | 'somnolencia'
  | 'fatiga'
  | 'concentracion';

export type ClavePreguntaSuenoVigilia =
  | 'suenoSuperficial'
  | 'despertarSinDescanso'
  | 'suenoInsuficiente'
  | 'conciliacionTardia'
  | 'despertarNocturno'
  | 'despertarTemprano'
  | 'esfuerzoNoDormirse'
  | 'suenoInvoluntario'
  | 'faltaEnergia'
  | 'interrupcionPorAgotamiento'
  | 'dificultadAtencion'
  | 'erroresUOlvidos';

export type NivelSuenoVigilia = 'verde' | 'amarillo' | 'naranja' | 'rojo';

/** Pasos del formulario. */
export const PASOS_SUENO_VIGILIA = [
  { paso: 1, nombre: 'Fecha y contexto' },
  { paso: 2, nombre: 'Sueño' },
  { paso: 3, nombre: 'Vigilia' },
  { paso: 4, nombre: 'Seguridad' },
  { paso: 5, nombre: 'Seguimiento y observaciones' },
] as const;

export const PASO_CONTEXTO_SUENO_VIGILIA = 1;
export const PASO_SEGURIDAD_SUENO_VIGILIA = 4;
export const PASO_SEGUIMIENTO_SUENO_VIGILIA = 5;

export const PASO_MODULO_SUENO_VIGILIA: Record<ModuloSuenoVigilia, number> = {
  sueno: 2,
  vigilia: 3,
};

export const TITULO_MODULO_SUENO_VIGILIA: Record<ModuloSuenoVigilia, string> = {
  sueno: 'Módulo A — Sueño',
  vigilia: 'Módulo B — Vigilia',
};

export const INSTRUCCION_SUENO_VIGILIA =
  'Las siguientes preguntas se refieren al último mes. Al hablar de dormir, considere su periodo principal de sueño, aunque duerma de día por su horario de trabajo. Al hablar de estar despierto, incluya su jornada laboral. Distinga entre tener sueño (sentir que podría quedarse dormido) y tener fatiga (sentirse agotado o sin energía, aunque no tenga sueño).';

export const AREAS_SUENO_VIGILIA: {
  clave: ClaveAreaSuenoVigilia;
  etiqueta: string;
  modulo: ModuloSuenoVigilia;
}[] = [
  { clave: 'calidadDescanso', etiqueta: 'Calidad y descanso', modulo: 'sueno' },
  { clave: 'conciliacionContinuidad', etiqueta: 'Conciliación y continuidad', modulo: 'sueno' },
  { clave: 'somnolencia', etiqueta: 'Somnolencia', modulo: 'vigilia' },
  { clave: 'fatiga', etiqueta: 'Fatiga', modulo: 'vigilia' },
  { clave: 'concentracion', etiqueta: 'Concentración', modulo: 'vigilia' },
];

/** Las 12 preguntas de frecuencia: «En el último mes, ¿con qué frecuencia…». */
export const PREGUNTAS_SUENO_VIGILIA: {
  clave: ClavePreguntaSuenoVigilia;
  modulo: ModuloSuenoVigilia;
  area: ClaveAreaSuenoVigilia;
  texto: string;
}[] = [
  { clave: 'suenoSuperficial', modulo: 'sueno', area: 'calidadDescanso', texto: '…sintió que su sueño fue superficial o poco profundo?' },
  { clave: 'despertarSinDescanso', modulo: 'sueno', area: 'calidadDescanso', texto: '…despertó sin sentirse descansado(a)?' },
  { clave: 'suenoInsuficiente', modulo: 'sueno', area: 'calidadDescanso', texto: '…durmió menos tiempo del que siente que necesita?' },
  { clave: 'conciliacionTardia', modulo: 'sueno', area: 'conciliacionContinuidad', texto: '…tardó más de 30 minutos en quedarse dormido(a)?' },
  { clave: 'despertarNocturno', modulo: 'sueno', area: 'conciliacionContinuidad', texto: '…despertó durante su periodo de sueño y tardó más de 30 minutos en volver a dormirse?' },
  { clave: 'despertarTemprano', modulo: 'sueno', area: 'conciliacionContinuidad', texto: '…despertó antes de la hora deseada sin poder volver a dormirse?' },
  { clave: 'esfuerzoNoDormirse', modulo: 'vigilia', area: 'somnolencia', texto: '…tuvo que esforzarse para no quedarse dormido(a) durante sus actividades?' },
  { clave: 'suenoInvoluntario', modulo: 'vigilia', area: 'somnolencia', texto: '…cabeceó o se quedó dormido(a) sin proponérselo?' },
  { clave: 'faltaEnergia', modulo: 'vigilia', area: 'fatiga', texto: '…le faltó energía para sus actividades habituales?' },
  { clave: 'interrupcionPorAgotamiento', modulo: 'vigilia', area: 'fatiga', texto: '…tuvo que bajar el ritmo o interrumpir una actividad por agotamiento?' },
  { clave: 'dificultadAtencion', modulo: 'vigilia', area: 'concentracion', texto: '…le costó mantener la atención en lo que hacía?' },
  { clave: 'erroresUOlvidos', modulo: 'vigilia', area: 'concentracion', texto: '…cometió errores u olvidó pasos de una tarea que normalmente hace sin dificultad?' },
];

/** Escala de frecuencia (último mes); el valor guardado es el índice 0–3. */
export const FRECUENCIAS_SUENO_VIGILIA = [
  'Nunca',
  'Menos de una vez por semana',
  'Una o dos veces por semana',
  'Tres o más veces por semana',
] as const;

export const FRECUENCIA_MAXIMA_SUENO_VIGILIA = 3;

export const NIVELES_SUENO_VIGILIA: NivelSuenoVigilia[] = ['verde', 'amarillo', 'naranja', 'rojo'];

export const ETIQUETA_NIVEL_SUENO_VIGILIA: Record<NivelSuenoVigilia, string> = {
  verde: 'Sin síntomas',
  amarillo: 'Ocasional',
  naranja: 'Semanal',
  rojo: 'Frecuente',
};

export const CLASE_NIVEL_SUENO_VIGILIA: Record<
  NivelSuenoVigilia,
  { texto: string; punto: string; fila: string }
> = {
  verde: { texto: 'text-green-600', punto: 'bg-green-500', fila: 'bg-gray-50' },
  amarillo: { texto: 'text-yellow-600', punto: 'bg-yellow-500', fila: 'bg-yellow-50' },
  naranja: { texto: 'text-orange-600', punto: 'bg-orange-500', fila: 'bg-orange-50' },
  rojo: { texto: 'text-red-600', punto: 'bg-red-600', fila: 'bg-red-50' },
};

export const TITULO_PRIORIDAD_SUENO_VIGILIA: Record<NivelSuenoVigilia, string> = {
  verde: 'Sin síntomas ni alertas reportadas',
  amarillo: 'Síntomas ocasionales',
  naranja: 'Síntomas semanales o hallazgo que requiere seguimiento',
  rojo: 'Síntomas frecuentes o alerta de seguridad',
};

export const LEYENDA_SUENO_VIGILIA =
  'Instrumento propio de tamizaje inicial. Resultado orientativo no validado: no sustituye la valoración médica ni determina la aptitud laboral.';

export const SI = 'Sí';
export const NO = 'No';

export const HORARIOS_LABORALES_SUENO_VIGILIA = ['Diurno', 'Nocturno', 'Rotatorio', 'Otro'] as const;
export const CALIDADES_GENERALES_SUENO = ['Buena', 'Regular', 'Mala', 'Muy mala'] as const;
export const SI_NO_NO_SABE_SUENO_VIGILIA = ['No', 'Sí', 'No sabe'] as const;
export const SUENO_ACTIVIDAD_PELIGROSA_OPCIONES = ['No', 'Sí', 'No realiza esas actividades'] as const;
export const SI_NO_SUENO_VIGILIA = ['No', 'Sí'] as const;

export const DURACIONES_SUENO_VIGILIA = [
  'Menos de 1 mes',
  'De 1 a menos de 3 meses',
  '3 meses o más',
] as const;

export const DURACION_PERSISTENTE_SUENO_VIGILIA = '3 meses o más';

export const FACTORES_SUENO_VIGILIA = [
  'Preocupaciones o estrés',
  'Dolor o enfermedad',
  'Ambiente (ruido, luz, temperatura)',
  'Horario o jornadas prolongadas',
  'Responsabilidades familiares',
  'Medicamentos',
  'Alcohol u otras sustancias',
  'Otro',
  'No sabe',
] as const;

export const PRODUCTOS_PARA_DORMIR = ['Nada', 'Medicamentos', 'Suplementos', 'Alcohol', 'Otro'] as const;

/** Por debajo de 7 horas por cada 24 se muestra un hallazgo informativo. */
export const MINUTOS_SUENO_CORTO = 7 * 60;

export type ClaveSeguridadSuenoVigilia =
  | 'ronquidoFuerte'
  | 'pausasRespiratorias'
  | 'despertarConAhogo'
  | 'suenoActividadPeligrosa'
  | 'accidenteOCasiAccidente';

/** Preguntas de seguridad: siempre visibles, sin puntaje y sin respuesta por defecto. */
export const PREGUNTAS_SEGURIDAD_SUENO_VIGILIA: {
  clave: ClaveSeguridadSuenoVigilia;
  /** Nombre corto para avisos de validación. */
  etiqueta: string;
  texto: string;
  opciones: readonly string[];
  campoDescripcion?: 'descripcionSuenoActividadPeligrosa' | 'descripcionAccidente';
}[] = [
  { clave: 'ronquidoFuerte', etiqueta: 'Ronquido fuerte', texto: '¿Le han comentado que ronca fuerte?', opciones: SI_NO_NO_SABE_SUENO_VIGILIA },
  {
    clave: 'pausasRespiratorias',
    etiqueta: 'Pausas respiratorias',
    texto: '¿Le han comentado que deja de respirar mientras duerme?',
    opciones: SI_NO_NO_SABE_SUENO_VIGILIA,
  },
  { clave: 'despertarConAhogo', etiqueta: 'Despertar con ahogo', texto: '¿Ha despertado con sensación de ahogo?', opciones: SI_NO_NO_SABE_SUENO_VIGILIA },
  {
    clave: 'suenoActividadPeligrosa',
    etiqueta: 'Sueño en actividad peligrosa',
    texto:
      'En el último mes, ¿ha tenido sueño intenso, cabeceos o se ha quedado dormido(a) al conducir, operar maquinaria o realizar una actividad en la que un descuido pudiera causar daño?',
    opciones: SUENO_ACTIVIDAD_PELIGROSA_OPCIONES,
    campoDescripcion: 'descripcionSuenoActividadPeligrosa',
  },
  {
    clave: 'accidenteOCasiAccidente',
    etiqueta: 'Accidente o casi accidente',
    texto:
      'En el último mes, ¿ocurrió un accidente, o estuvo cerca de ocurrir uno, mientras se sentía con sueño, fatigado(a) o desconcentrado(a)?',
    opciones: SI_NO_SUENO_VIGILIA,
    campoDescripcion: 'descripcionAccidente',
  },
];

export type ClaveAlertaSuenoVigilia =
  | 'suenoActividadPeligrosa'
  | 'accidenteOCasiAccidente'
  | 'sintomasRespiratorios'
  | 'suenoInvoluntario'
  | 'dificultadPersistente'
  | 'ronquidoFuerte'
  | 'suenoCorto'
  | 'relacionConSueno';

/** Hallazgos y alertas, de mayor a menor gravedad. Las informativas no cambian la prioridad. */
export const ALERTAS_SUENO_VIGILIA: {
  clave: ClaveAlertaSuenoVigilia;
  texto: string;
  nivel: NivelSuenoVigilia | 'informativo';
}[] = [
  { clave: 'suenoActividadPeligrosa', texto: 'Somnolencia en actividad peligrosa', nivel: 'rojo' },
  {
    clave: 'accidenteOCasiAccidente',
    texto: 'Accidente o casi accidente con sueño, fatiga o falta de concentración',
    nivel: 'rojo',
  },
  { clave: 'sintomasRespiratorios', texto: 'Síntomas respiratorios durante el sueño', nivel: 'naranja' },
  { clave: 'suenoInvoluntario', texto: 'Episodios de sueño involuntario', nivel: 'naranja' },
  {
    clave: 'dificultadPersistente',
    texto: 'Dificultad persistente para conciliar o mantener el sueño',
    nivel: 'naranja',
  },
  { clave: 'ronquidoFuerte', texto: 'Ronquido fuerte reportado', nivel: 'amarillo' },
  { clave: 'suenoCorto', texto: 'Duerme menos de 7 horas por cada 24', nivel: 'informativo' },
  { clave: 'relacionConSueno', texto: 'Relación con el sueño reportada por el trabajador', nivel: 'informativo' },
];

export type RespuestasFrecuenciaSuenoVigilia = Partial<Record<ClavePreguntaSuenoVigilia, number | null>>;

export interface SeguridadSuenoVigilia {
  ronquidoFuerte?: string;
  pausasRespiratorias?: string;
  despertarConAhogo?: string;
  suenoActividadPeligrosa?: string;
  descripcionSuenoActividadPeligrosa?: string;
  accidenteOCasiAccidente?: string;
  descripcionAccidente?: string;
}

export interface SeguimientoSuenoVigilia {
  duracion?: string;
  factores?: string[];
  factorOtro?: string;
  productosParaDormir?: string[];
  detalleProductos?: string;
  empeoraAlDormirMal?: string;
}

export interface EvaluacionSuenoVigiliaRespuestas {
  minutosSuenoDiarios?: number | null;
  horarioLaboral?: string;
  calidadGeneralSueno?: string;
  sueno?: RespuestasFrecuenciaSuenoVigilia | null;
  vigilia?: RespuestasFrecuenciaSuenoVigilia | null;
  seguridad?: SeguridadSuenoVigilia | null;
  seguimiento?: SeguimientoSuenoVigilia | null;
  observaciones?: string;
}

export interface ResultadoAreaSuenoVigilia {
  /** Respuesta más alta del área. */
  nivel: NivelSuenoVigilia;
  /** Suma de las respuestas; solo para comparar en el tiempo, sin color. */
  suma: number;
}

export interface ResultadoEvaluacionSuenoVigilia {
  versionRegla?: number;
  /** Lo más grave entre los niveles por área y las alertas con color. */
  prioridad: NivelSuenoVigilia;
  areas: Record<ClaveAreaSuenoVigilia, ResultadoAreaSuenoVigilia>;
  alertas: ClaveAlertaSuenoVigilia[];
  /** false si falta alguna de las 12 preguntas o de las 5 de seguridad. */
  completo: boolean;
}

export function preguntasSuenoVigiliaDelModulo(modulo: ModuloSuenoVigilia) {
  return PREGUNTAS_SUENO_VIGILIA.filter((pregunta) => pregunta.modulo === modulo);
}

export function valorFrecuenciaSuenoVigilia(valor: unknown): number | null {
  const numero = Number(valor);
  if (valor == null || valor === '' || !Number.isInteger(numero)) return null;
  if (numero < 0 || numero > FRECUENCIA_MAXIMA_SUENO_VIGILIA) return null;
  return numero;
}

/** Misma regla que `calcularResultadoEvaluacionSuenoVigilia` del backend. */
export function calcularResultadoEvaluacionSuenoVigilia(
  datos: EvaluacionSuenoVigiliaRespuestas | null | undefined,
): ResultadoEvaluacionSuenoVigilia {
  const areas = Object.fromEntries(
    AREAS_SUENO_VIGILIA.map(({ clave }) => [clave, { nivel: 'verde', suma: 0 }]),
  ) as Record<ClaveAreaSuenoVigilia, ResultadoAreaSuenoVigilia>;

  let completo = true;
  let haySintomaVigilia = false;
  let conciliacionFrecuente = false;

  for (const pregunta of PREGUNTAS_SUENO_VIGILIA) {
    const valor = valorFrecuenciaSuenoVigilia(datos?.[pregunta.modulo]?.[pregunta.clave]);
    if (valor === null) {
      completo = false;
      continue;
    }
    const area = areas[pregunta.area];
    area.suma += valor;
    if (valor > NIVELES_SUENO_VIGILIA.indexOf(area.nivel)) area.nivel = NIVELES_SUENO_VIGILIA[valor];
    if (pregunta.modulo === 'vigilia' && valor > 0) haySintomaVigilia = true;
    if (pregunta.area === 'conciliacionContinuidad' && valor === FRECUENCIA_MAXIMA_SUENO_VIGILIA) {
      conciliacionFrecuente = true;
    }
  }

  const seguridad = datos?.seguridad ?? {};
  if (PREGUNTAS_SEGURIDAD_SUENO_VIGILIA.some(({ clave }) => !seguridad[clave])) completo = false;

  const condiciones: Record<ClaveAlertaSuenoVigilia, boolean> = {
    suenoActividadPeligrosa: seguridad.suenoActividadPeligrosa === SI,
    accidenteOCasiAccidente: seguridad.accidenteOCasiAccidente === SI,
    sintomasRespiratorios: seguridad.pausasRespiratorias === SI || seguridad.despertarConAhogo === SI,
    suenoInvoluntario: (valorFrecuenciaSuenoVigilia(datos?.vigilia?.suenoInvoluntario) ?? 0) > 0,
    dificultadPersistente:
      conciliacionFrecuente && datos?.seguimiento?.duracion === DURACION_PERSISTENTE_SUENO_VIGILIA,
    // El ronquido solo se destaca aparte si no hay pausas ni ahogo
    ronquidoFuerte:
      seguridad.ronquidoFuerte === SI &&
      seguridad.pausasRespiratorias !== SI &&
      seguridad.despertarConAhogo !== SI,
    suenoCorto:
      typeof datos?.minutosSuenoDiarios === 'number' && datos.minutosSuenoDiarios < MINUTOS_SUENO_CORTO,
    relacionConSueno: haySintomaVigilia && datos?.seguimiento?.empeoraAlDormirMal === SI,
  };

  const alertas = ALERTAS_SUENO_VIGILIA.map((alerta) => alerta.clave).filter((clave) => condiciones[clave]);

  let prioridad = 0;
  for (const area of Object.values(areas)) {
    prioridad = Math.max(prioridad, NIVELES_SUENO_VIGILIA.indexOf(area.nivel));
  }
  for (const clave of alertas) {
    const nivel = ALERTAS_SUENO_VIGILIA.find((alerta) => alerta.clave === clave)!.nivel;
    if (nivel !== 'informativo') prioridad = Math.max(prioridad, NIVELES_SUENO_VIGILIA.indexOf(nivel));
  }

  return { prioridad: NIVELES_SUENO_VIGILIA[prioridad], areas, alertas, completo };
}

/** ¿Alguna de las 12 preguntas (o solo las de un módulo) reporta síntomas? */
export function haySintomasSuenoVigilia(
  datos: EvaluacionSuenoVigiliaRespuestas | null | undefined,
  modulo?: ModuloSuenoVigilia,
): boolean {
  return PREGUNTAS_SUENO_VIGILIA.some(
    (pregunta) =>
      (!modulo || pregunta.modulo === modulo) &&
      (valorFrecuenciaSuenoVigilia(datos?.[pregunta.modulo]?.[pregunta.clave]) ?? 0) > 0,
  );
}

export function textoHorasSuenoVigilia(minutos?: number | null): string {
  if (minutos == null) return 'No registradas';
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

/** Garantiza los cuatro grupos de respuestas para poder enlazar el formulario. */
export function asegurarGruposSuenoVigilia(datos: EvaluacionSuenoVigiliaRespuestas) {
  for (const grupo of ['sueno', 'vigilia', 'seguridad', 'seguimiento'] as const) {
    if (!datos[grupo] || typeof datos[grupo] !== 'object') datos[grupo] = {};
  }
  return datos as Required<Pick<EvaluacionSuenoVigiliaRespuestas, 'sueno' | 'vigilia' | 'seguridad' | 'seguimiento'>> &
    EvaluacionSuenoVigiliaRespuestas;
}

/**
 * Deja el payload coherente antes de guardar: quita el seguimiento que ya no aplica, las
 * descripciones de seguridad sin un «Sí» y el resultado (lo calcula el servidor).
 */
export function normalizarEvaluacionSuenoVigilia<T extends EvaluacionSuenoVigiliaRespuestas>(datos: T): T {
  const limpio = JSON.parse(JSON.stringify(datos)) as T & { resultado?: unknown };
  delete limpio.resultado;

  const seguridad = limpio.seguridad;
  if (seguridad) {
    if (seguridad.suenoActividadPeligrosa !== SI) delete seguridad.descripcionSuenoActividadPeligrosa;
    if (seguridad.accidenteOCasiAccidente !== SI) delete seguridad.descripcionAccidente;
  }

  if (!haySintomasSuenoVigilia(limpio)) {
    delete limpio.seguimiento;
  } else if (limpio.seguimiento) {
    const seguimiento = limpio.seguimiento;
    if (!haySintomasSuenoVigilia(limpio, 'vigilia')) delete seguimiento.empeoraAlDormirMal;
    if (!seguimiento.factores?.includes('Otro')) delete seguimiento.factorOtro;
    if (!seguimiento.factores?.length) delete seguimiento.factores;
    if (!seguimiento.productosParaDormir?.length) delete seguimiento.productosParaDormir;
  }
  return limpio;
}

function listaConOtro(valores: string[] | undefined, otro: string | undefined): string {
  return (valores ?? [])
    .map((valor) => (valor === 'Otro' && otro?.trim() ? `Otro (${otro.trim()})` : valor))
    .join(', ');
}

export function textoFactoresSuenoVigilia(seguimiento: SeguimientoSuenoVigilia | null | undefined): string {
  return listaConOtro(seguimiento?.factores, seguimiento?.factorOtro);
}

export function textoProductosSuenoVigilia(seguimiento: SeguimientoSuenoVigilia | null | undefined): string {
  return [listaConOtro(seguimiento?.productosParaDormir, undefined), seguimiento?.detalleProductos?.trim()]
    .filter(Boolean)
    .join(' — ');
}

/**
 * Texto para la tabla resumen de la aptitud al puesto y la fila del expediente.
 * Usa el resultado guardado; sin resultado devuelve ''.
 * Mismo texto que `resumenTablaEvaluacionSuenoVigilia` del backend.
 */
export function textoResumenEvaluacionSuenoVigilia(
  d: { resultado?: Partial<ResultadoEvaluacionSuenoVigilia> | null } | null | undefined,
): string {
  const resultado = d?.resultado;
  if (!resultado?.prioridad || !resultado.areas) return '';

  const partes: string[] = [];
  for (const { clave, etiqueta } of AREAS_SUENO_VIGILIA) {
    const nivel = resultado.areas[clave]?.nivel;
    if (nivel && nivel !== 'verde') partes.push(`${etiqueta}: ${ETIQUETA_NIVEL_SUENO_VIGILIA[nivel].toLowerCase()}`);
  }
  const alertas = ALERTAS_SUENO_VIGILIA.filter(
    (alerta) => alerta.nivel !== 'informativo' && (resultado.alertas ?? []).includes(alerta.clave),
  );
  if (alertas.length) partes.push(`alertas: ${alertas.map((alerta) => alerta.texto.toLowerCase()).join(', ')}`);

  if (!partes.length) return TITULO_PRIORIDAD_SUENO_VIGILIA.verde;
  const texto = partes.join('; ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
