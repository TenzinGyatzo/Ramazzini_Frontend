/**
 * Lo que impide guardar un documento clínico (nota médica, historia clínica…), en el orden
 * de los pasos: datos que faltan y datos que no son válidos se tratan igual. Al guardar se
 * lleva al usuario al primero (paso + campo + qué corregir) y el aviso permite ir al
 * siguiente o ver la lista. Cada documento aporta sus validaciones (FormStepper); aquí van
 * los textos, el orden en pantalla y la navegación entre pendientes.
 */
import type { CampoFaltante } from '@/helpers/validacionCampos';
import type { NotaMedicaStepMap } from '@/helpers/notaMedicaStepMap';
import {
  PASO_MEDICAMENTOS_NOTA_ENFERMERIA,
  PASO_SIGNOS_NOTA_ENFERMERIA,
  erroresSignosNotaEnfermeria,
  type SignosVitalesNotaEnfermeria,
} from '@/helpers/notaEnfermeria';

export interface ProblemaCampo {
  /** Paso del asistente clásico (el de secciones se traduce al navegar). */
  paso: number | null;
  /** Marca data-campo del paso; sin ella solo se lleva al paso. */
  campo?: string;
  /** Qué hacer, dicho al usuario. */
  mensaje: string;
  /** Nombre corto para la lista. */
  nombre: string;
  /** true si falta; false si hay un valor que no es válido. */
  falta: boolean;
}

/** Instrucción para un dato obligatorio vacío (lo que se lee bajo el campo). */
const INSTRUCCION_FALTA: Record<string, string> = {
  fechaNotaMedica: 'Elige la fecha de la consulta.',
  motivoConsulta: 'Escribe el motivo de consulta.',
  genero: 'Elige el género.',
  derechohabiencia: 'Marca la derechohabiencia.',
  peso: 'Escribe el peso; si no se pudo medir, marca «Se desconoce».',
  talla: 'Escribe la talla; si no se pudo medir, marca «Se desconoce».',
  codigoCIE10Principal: 'Elige el diagnóstico principal.',
  relacionTemporal: 'Indica si el diagnóstico principal es de primera vez o subsecuente.',
  primeraVezUneme:
    'Indica si es la primera consulta del año en una Unidad de Especialidades Médicas.',
  // Historia clínica
  motivoExamen: 'Elige el motivo del examen.',
  fechaHistoriaClinica: 'Elige la fecha de la historia clínica.',
  resumenHistoriaClinica: 'Indica si hay hallazgos por resumir y, si los hay, escríbelos.',
  // Examen de la vista
  fechaExamenVista: 'Elige la fecha del examen.',
  sinCorreccionLejanaInterpretacion: 'Captura la agudeza visual lejana sin lentes.',
  sinCorreccionCercanaInterpretacion: 'Captura la agudeza visual cercana sin lentes.',
  interpretacionIshihara: 'Captura las placas correctas de la prueba de Ishihara.',
  // Audiometría
  metodoAudiometria: 'Elige el método de la audiometría.',
  fechaAudiometria: 'Elige la fecha de la audiometría.',
  oidoDerecho125: 'Captura los valores del oído derecho.',
  oidoIzquierdo125: 'Captura los valores del oído izquierdo.',
  diagnosticoAudiometria: 'Escribe el diagnóstico.',
  // Aptitud
  fechaAptitudPuesto: 'Elige la fecha de valoración.',
  aptitudPuesto: 'Elige la aptitud al puesto.',
  alteracionesSalud: 'Describe las alteraciones de salud encontradas.',
  resultados: 'Escribe los resultados.',
  medidasPreventivas: 'Escribe las medidas preventivas.',
};

/** Nombre corto en la lista para cada dato (si no viene de la validación). */
const NOMBRE_CAMPO: Record<string, string> = {
  fechaNotaMedica: 'Fecha de la consulta',
  fechaNotaEnfermeria: 'Fecha de la atención',
  motivoExamen: 'Motivo del examen',
  fechaHistoriaClinica: 'Fecha de la historia clínica',
  resumenHistoriaClinica: 'Resumen de la historia clínica',
  fechaExploracionFisica: 'Fecha de la exploración física',
  fechaExamenVista: 'Fecha del examen',
  sinCorreccionLejanaInterpretacion: 'Agudeza visual lejana sin lentes',
  sinCorreccionCercanaInterpretacion: 'Agudeza visual cercana sin lentes',
  interpretacionIshihara: 'Prueba de Ishihara',
  metodoAudiometria: 'Método de la audiometría',
  fechaAudiometria: 'Fecha de la audiometría',
  oidoDerecho125: 'Oído derecho',
  oidoIzquierdo125: 'Oído izquierdo',
  diagnosticoAudiometria: 'Diagnóstico',
  fechaAptitudPuesto: 'Fecha de valoración',
  aptitudPuesto: 'Aptitud al puesto',
  alteracionesSalud: 'Alteraciones de salud',
  resultados: 'Resultados',
  medidasPreventivas: 'Medidas preventivas',
  altura: 'Altura',
  indiceMasaCorporal: 'IMC',
  primeraVezUneme: 'Primera consulta del año en especialidades',
  tensionArterialSistolica: 'Tensión arterial',
  tensionArterialDiastolica: 'Tensión arterial',
  frecuenciaCardiaca: 'Frecuencia cardiaca',
  frecuenciaRespiratoria: 'Frecuencia respiratoria',
  temperatura: 'Temperatura',
  saturacionOxigeno: 'Saturación de oxígeno',
  peso: 'Peso',
  talla: 'Talla',
  circunferenciaCintura: 'Circunferencia de cintura',
  glucemia: 'Glucemia',
  tipoMedicion: '¿En ayunas?',
  resultadoObtenidoaTravesde: 'Origen del resultado de glucemia',
  trimestreGestacional: 'Trimestre gestacional',
  codigoCIE10Principal: 'Diagnóstico principal',
  codigosCIE10Complementarios: 'Diagnósticos complementarios',
  codigoCIEDiagnostico2: 'Diagnóstico 2',
  codigoCIEDiagnostico3: 'Diagnóstico 3',
  confirmacionDiagnostica: 'Confirmación diagnóstica',
  confirmacionDiagnostica2: 'Confirmación diagnóstica (diagnóstico 2)',
  confirmacionDiagnostica3: 'Confirmación diagnóstica (diagnóstico 3)',
};

export function nombreDeCampo(campo: string | undefined, porDefecto = 'Dato por corregir'): string {
  return (campo && NOMBRE_CAMPO[campo]) || porDefecto;
}

/** Datos vacíos de la lista de obligatorios → problemas con instrucción. */
export function problemasPorFaltantes(
  faltantes: CampoFaltante[],
  /** Textos propios del documento cuando el mismo dato se pide distinto (p. ej. el peso). */
  instrucciones: Record<string, string> = {},
): ProblemaCampo[] {
  return faltantes.map((f) => ({
    paso: f.paso ?? null,
    campo: f.campo,
    nombre: f.nombre,
    falta: true,
    mensaje:
      (f.campo && (instrucciones[f.campo] ?? INSTRUCCION_FALTA[f.campo])) ||
      `Falta: ${f.nombre}.`,
  }));
}

/** Exploración física: somatometría y signos se capturan siempre (sin «Se desconoce»). */
export const INSTRUCCION_EXPLORACION_FISICA: Record<string, string> = {
  fechaExploracionFisica: 'Elige la fecha de la exploración física.',
  peso: 'Escribe el peso.',
  altura: 'Escribe la altura.',
  indiceMasaCorporal: 'Escribe el peso y la altura para calcular el IMC.',
  circunferenciaCintura: 'Escribe la circunferencia de cintura.',
  tensionArterialSistolica: 'Escribe la tensión arterial sistólica.',
  tensionArterialDiastolica: 'Escribe la tensión arterial diastólica.',
  frecuenciaCardiaca: 'Escribe la frecuencia cardiaca.',
  frecuenciaRespiratoria: 'Escribe la frecuencia respiratoria.',
  saturacionOxigeno: 'Escribe la saturación de oxígeno.',
};

/** Resultado de una validación ({ valido, mensaje, paso, campo }) → problema, o null. */
export function problemaDeValidacion(r: {
  valido: boolean;
  mensaje?: string;
  paso?: number;
  campo?: string;
}): ProblemaCampo | null {
  if (r.valido) return null;
  return {
    paso: r.paso ?? null,
    campo: r.campo,
    nombre: nombreDeCampo(r.campo),
    falta: false,
    mensaje: r.mensaje || 'Revisa este dato.',
  };
}

/** Campo de cada duplicidad CIE-10 detectada antes de enviar. */
export function campoDeProblemaCie10(tipo: string): string {
  if (tipo.startsWith('diagnostico2')) return 'codigoCIEDiagnostico2';
  if (tipo.startsWith('diagnostico3')) return 'codigoCIEDiagnostico3';
  return 'codigosCIE10Complementarios';
}

/** Paso de diagnóstico → campo (código o confirmación) de ese diagnóstico. */
export function campoPorPasoDiagnostico(
  paso: number | null | undefined,
  stepMap: NotaMedicaStepMap,
  tipo: 'codigo' | 'confirmacion',
): string | undefined {
  if (paso == null) return undefined;
  if (paso === stepMap.diagnostico) {
    return tipo === 'codigo' ? 'codigoCIE10Principal' : 'confirmacionDiagnostica';
  }
  if (paso === stepMap.comorbilidad2) {
    return tipo === 'codigo' ? 'codigoCIEDiagnostico2' : 'confirmacionDiagnostica2';
  }
  if (paso === stepMap.comorbilidad3) {
    return tipo === 'codigo' ? 'codigoCIEDiagnostico3' : 'confirmacionDiagnostica3';
  }
  return undefined;
}

/**
 * Orden en que se ven los datos dentro de su paso (de arriba abajo). Así, en el paso de
 * diagnóstico se pide primero la relación temporal y luego el diagnóstico, como en pantalla.
 */
const ORDEN_EN_PANTALLA = [
  // Nota de enfermería (paso 1: fecha y hora arriba de «primera vez o subsecuente»)
  'fechaNotaEnfermeria',
  'horaAtencion',
  // Historia clínica (paso 1)
  'motivoExamen',
  'fechaHistoriaClinica',
  // Exploración física (paso 1)
  'fechaExploracionFisica',
  // Audiometría (paso 1: método arriba, fecha abajo)
  'metodoAudiometria',
  'fechaAudiometria',
  // Nota médica
  'tipoNota',
  'fechaNotaMedica',
  'primeraVezUneme',
  'motivoConsulta',
  'genero',
  'derechohabiencia',
  'tensionArterialSistolica',
  'tensionArterialDiastolica',
  'frecuenciaCardiaca',
  'frecuenciaRespiratoria',
  'temperatura',
  'saturacionOxigeno',
  'peso',
  'talla',
  'altura',
  'indiceMasaCorporal',
  'circunferenciaCintura',
  'glucemia',
  'tipoMedicion',
  'resultadoObtenidoaTravesde',
  'relacionTemporalEmbarazo',
  'trimestreGestacional',
  'relacionTemporal',
  'codigoCIE10Principal',
  'codigosCIE10Complementarios',
  'confirmacionDiagnostica',
  'primeraVezDiagnostico2',
  'codigoCIEDiagnostico2',
  'confirmacionDiagnostica2',
  'primeraVezDiagnostico3',
  'codigoCIEDiagnostico3',
  'confirmacionDiagnostica3',
];

function posicionEnPantalla(campo: string | undefined): number {
  const i = campo ? ORDEN_EN_PANTALLA.indexOf(campo) : -1;
  return i < 0 ? Infinity : i;
}

/**
 * En el orden de los pasos; dentro de un paso, en el orden en que se ven los datos (y si no
 * se conoce, en el que llegaron). Un mismo campo aparece una vez (el primero gana: así
 * «falta» no se repite como «no válido»).
 */
export function ordenarProblemas(problemas: Array<ProblemaCampo | null>): ProblemaCampo[] {
  const vistos = new Set<string>();
  const unicos: ProblemaCampo[] = [];
  for (const p of problemas) {
    if (!p) continue;
    const clave = p.campo ?? `sin-campo:${p.mensaje}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    unicos.push(p);
  }
  return unicos
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const porPaso = (a.p.paso ?? Infinity) - (b.p.paso ?? Infinity);
      if (porPaso) return porPaso;
      const pa = posicionEnPantalla(a.p.campo);
      const pb = posicionEnPantalla(b.p.campo);
      if (pa !== pb) return pa === Infinity ? 1 : pb === Infinity ? -1 : pa - pb;
      return a.i - b.i;
    })
    .map(({ p }) => p);
}

function mismaClave(a: ProblemaCampo, b: ProblemaCampo): boolean {
  return (a.campo ?? a.mensaje) === (b.campo ?? b.mensaje);
}

/**
 * Con la lista recalculada: el que sigue después del actual; si el actual ya se corrigió,
 * el primero que siga pendiente después de su posición; al final, vuelve al primero.
 */
export function siguienteProblema(
  lista: ProblemaCampo[],
  actual: ProblemaCampo | null,
): ProblemaCampo | null {
  if (lista.length === 0) return null;
  if (!actual) return lista[0];
  const i = lista.findIndex((p) => mismaClave(p, actual));
  if (i >= 0) return lista[(i + 1) % lista.length];
  // Ya corregido: el primero que esté después en pantalla (paso y, dentro del paso, posición)
  const despues = lista.find((p) => {
    const porPaso = (p.paso ?? Infinity) - (actual.paso ?? Infinity);
    if (porPaso) return porPaso > 0;
    return posicionEnPantalla(p.campo) > posicionEnPantalla(actual.campo);
  });
  return despues ?? lista[0];
}

/** Para la lista «Ver todos» (ModalCamposFaltantes). */
export function aCamposFaltantes(lista: ProblemaCampo[]): CampoFaltante[] {
  return lista.map((p) => ({
    nombre: p.nombre,
    tipo: 'general',
    revisar: !p.falta,
    paso: p.paso ?? undefined,
    campo: p.campo,
    mensaje: p.mensaje,
  }));
}

/**
 * Exploración física: la lista de obligatorios revisa vacío y rango juntos. Vacío → se pide
 * con su instrucción; con valor → se dice por qué no vale (rango o formato). El IMC se
 * calcula del peso y la altura: si falta alguno de ellos, se pide ese y no el IMC.
 */
export function problemasExploracionFisica(
  faltantes: CampoFaltante[],
  datos: Record<string, unknown>,
  motivoInvalido: (campo: string, valor: unknown) => string | null,
): ProblemaCampo[] {
  const vacio = (v: unknown) => v === undefined || v === null || v === '';
  const pendientes = problemasPorFaltantes(faltantes, INSTRUCCION_EXPLORACION_FISICA).map((p) => {
    if (!p.campo || p.campo === 'indiceMasaCorporal') return p;
    const valor = datos[p.campo];
    if (vacio(valor)) return p;
    return { ...p, falta: false, mensaje: motivoInvalido(p.campo, valor) || 'Revisa este dato.' };
  });
  const faltaPesoOAltura = pendientes.some((p) => p.campo === 'peso' || p.campo === 'altura');
  return pendientes.filter((p) => !(faltaPesoOAltura && p.campo === 'indiceMasaCorporal'));
}

/**
 * Examen de la vista: número de paso de la lista de obligatorios → identificador del paso.
 * El orden real cambia según el país (en Guatemala hay pasos antes de la agudeza visual),
 * así que se navega por identificador.
 */
export const ID_PASO_EXAMEN_VISTA: Record<number, string> = {
  1: 'evFecha',
  2: 'evAvLejanaSin',
  3: 'evAvCercanaSin',
  4: 'evAvLejanaCon',
  5: 'evAvCercanaCon',
  6: 'evIshihara',
};

/** Nota de enfermería: instrucción de cada dato obligatorio vacío. */
export const INSTRUCCION_NOTA_ENFERMERIA: Record<string, string> = {
  fechaNotaEnfermeria: 'Elige la fecha de la atención.',
  horaAtencion: 'Escribe la hora de la atención.',
  relacionTemporal: 'Indica si es la primera vez que se le atiende por este motivo.',
  motivoAtencion: 'Escribe el motivo de atención.',
  tipoProblema: 'Elige el tipo de problema.',
  sistema: 'Elige el aparato o sistema.',
  origen: 'Elige el origen de la atención.',
  habitusExterior: 'Describe el aspecto general.',
  procedimientoOtro: 'Escribe qué otro procedimiento se realizó.',
  destino: 'Elige el destino del trabajador.',
};

/** Revisiones de la lista de obligatorios que agrupan varios datos: aquí se separan. */
const AGRUPADOS_NOTA_ENFERMERIA = new Set(['signosVitales', 'tomasControl', 'medicamentos']);

const NOMBRE_SIGNO_NOTA_ENFERMERIA: Record<string, string> = {
  tensionArterialSistolica: 'Tensión arterial sistólica',
  tensionArterialDiastolica: 'Tensión arterial diastólica',
  frecuenciaCardiaca: 'Frecuencia cardiaca',
  frecuenciaRespiratoria: 'Frecuencia respiratoria',
  temperatura: 'Temperatura',
  saturacionOxigeno: 'Saturación de oxígeno',
  glucosaCapilar: 'Glucosa capilar',
  dolor: 'Dolor',
};

const vacioNE = (v: unknown) => v === undefined || v === null || v === '';
const tomaConAlgunSigno = (toma?: SignosVitalesNotaEnfermeria | null) =>
  !!toma &&
  Object.keys(NOMBRE_SIGNO_NOTA_ENFERMERIA).some(
    (k) => !vacioNE(toma[k as keyof SignosVitalesNotaEnfermeria]),
  );

/** Errores de una toma (los mismos que se ven bajo cada signo) → un problema por signo. */
function problemasDeToma(
  toma: SignosVitalesNotaEnfermeria | null | undefined,
  prefijo: string,
  cual: string,
): ProblemaCampo[] {
  return Object.entries(erroresSignosNotaEnfermeria(toma)).map(([clave, error]) => {
    const signo = NOMBRE_SIGNO_NOTA_ENFERMERIA[clave] ?? clave;
    const texto = String(error);
    const falta = texto.startsWith('Falta');
    return {
      paso: PASO_SIGNOS_NOTA_ENFERMERIA,
      campo: `${prefijo}.${clave}`,
      nombre: `${signo} (${cual})`,
      falta,
      mensaje: falta
        ? `Escribe la ${signo.toLowerCase()}; la tensión arterial lleva las dos cifras.`
        : `${signo}: ${texto.charAt(0).toLowerCase()}${texto.slice(1)}.`,
    };
  });
}

/**
 * Nota de enfermería. La lista de obligatorios revisa los signos vitales, las horas de las
 * tomas de control y las cantidades de los medicamentos como un solo dato cada uno; aquí se
 * lleva al signo, la toma o el medicamento exacto. Se revisa lo capturado, con los mismos
 * números que en pantalla; los renglones de medicamento vacíos no se guardan y no se piden.
 */
export function problemasNotaEnfermeria(
  faltantes: CampoFaltante[],
  datos: {
    signosVitales?: SignosVitalesNotaEnfermeria | null;
    tomasControl?: SignosVitalesNotaEnfermeria[] | null;
    medicamentos?: Array<{ idInsumo?: string; nombre?: string; cantidad?: unknown }> | null;
  },
): ProblemaCampo[] {
  const problemas = problemasPorFaltantes(
    faltantes.filter((f) => !f.campo || !AGRUPADOS_NOTA_ENFERMERIA.has(f.campo)),
    INSTRUCCION_NOTA_ENFERMERIA,
  );

  problemas.push(...problemasDeToma(datos.signosVitales, 'signosVitales', 'toma inicial'));
  (datos.tomasControl ?? []).forEach((toma, i) => {
    if (!tomaConAlgunSigno(toma)) return;
    const cual = `toma de control ${i + 1}`;
    if (!toma.hora) {
      problemas.push({
        paso: PASO_SIGNOS_NOTA_ENFERMERIA,
        campo: `tomasControl.${i}.hora`,
        nombre: `Hora de la ${cual}`,
        falta: true,
        mensaje: `Escribe la hora de la ${cual}.`,
      });
    }
    problemas.push(...problemasDeToma(toma, `tomasControl.${i}`, cual));
  });

  (datos.medicamentos ?? []).forEach((m, i) => {
    // Sin medicamento elegido ni nombre: el renglón no se guarda
    if (!m?.idInsumo && !String(m?.nombre ?? '').trim()) return;
    const cantidad = m.cantidad;
    if (Number.isInteger(cantidad) && (cantidad as number) >= 1) return;
    const falta = vacioNE(cantidad);
    problemas.push({
      paso: PASO_MEDICAMENTOS_NOTA_ENFERMERIA,
      campo: `medicamentos.${i}.cantidad`,
      nombre: `Cantidad del medicamento ${i + 1}`,
      falta,
      mensaje: falta
        ? `Escribe la cantidad del medicamento ${i + 1}.`
        : `La cantidad del medicamento ${i + 1} debe ser un número entero desde 1.`,
    });
  });

  return problemas;
}
