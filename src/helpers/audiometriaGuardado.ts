/**
 * Audiometría, punto (44): una sola lógica de respuestas para los dos modos de captura (como
 * examenVistaGuardado y exploracionFisicaGuardado).
 *
 * Antes los pasos escribían al abrirse y al cerrarse: el método y la fecha, 0 dB en los 9
 * umbrales de cada oído, los porcentajes de pérdida, la interpretación y las recomendaciones
 * por defecto. En la captura rápida los pasos están abiertos a la vez y nunca se cierran.
 * Ahora:
 * - los pasos solo escriben cuando el usuario cambia algo;
 * - los resultados que salen de los umbrales (porcentajes por oído, binaural, interpretación)
 *   se calculan aquí siempre, en los dos modos, se haya abierto o no la sección;
 * - lo preseleccionado (método, fecha, recomendaciones) se escribe al revisar su sección, o todo
 *   al guardar o al editar;
 * - los umbrales ya no tienen valor por defecto: abren vacíos y son obligatorios (decisión del
 *   usuario 2026-11-21; antes se guardaba 0 dB aunque no se capturara).
 * Solo se llenan campos vacíos: un documento existente conserva lo que tenga.
 */
import { fechaLocalHoy } from '@/helpers/dates';
import { PASO_AU } from '@/helpers/audiometriaSections';
import { MENSAJE_DATOS_INSUFICIENTES, generarInterpretacionAudiometrica } from '@/helpers/audiometriaInterpretacion';

type Datos = Record<string, any>;
export type Lado = 'Derecho' | 'Izquierdo';
export type MetodoAudiometria = 'AMA' | 'LFT';

export const FRECUENCIAS_AUDIOMETRIA = [125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000] as const;

export const RECOMENDACIONES_POR_DEFECTO = [
  'Vigilancia audiométrica periódica',
  'Control en Programa de Conservación de la Audición',
  'Uso de equipo adecuado de protección auditiva',
];

const vacio = (v: unknown) => v === undefined || v === null || String(v).trim() === '';

export const campoUmbral = (lado: Lado, frecuencia: number) => `oido${lado}${frecuencia}`;
/** La fila de los 9 umbrales de un oído (el aviso al guardar la marca completa). */
export const campoFilaUmbrales = (lado: Lado) => `umbralesOido${lado}`;
const enLista = (partes: string[]) =>
  partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;

/**
 * Método de una audiometría nueva: LFT (Ley Federal del Trabajo) para proveedores de México o
 * sin país; AMA en cualquier otro país (decisión del usuario 2026-11-21).
 */
export function metodoAudiometriaPorDefecto(pais: string | null | undefined): MetodoAudiometria {
  return pais && pais !== 'MX' ? 'AMA' : 'LFT';
}

export function metodoDe(df: Datos, pais?: string | null): MetodoAudiometria {
  return df.metodoAudiometria === 'AMA' || df.metodoAudiometria === 'LFT'
    ? df.metodoAudiometria
    : metodoAudiometriaPorDefecto(pais);
}

/** Algún umbral de ese oído capturado. */
export function oidoConUmbrales(df: Datos, lado: Lado): boolean {
  return FRECUENCIAS_AUDIOMETRIA.some((f) => !vacio(df[campoUmbral(lado, f)]));
}

/** Frecuencias de ese oído sin umbral. */
export function umbralesFaltantes(df: Datos, lado: Lado): number[] {
  return FRECUENCIAS_AUDIOMETRIA.filter((f) => vacio(df[campoUmbral(lado, f)]));
}

const promedio = (df: Datos, lado: Lado, frecuencias: number[]) =>
  frecuencias.reduce((suma, f) => suma + (Number(df[campoUmbral(lado, f)]) || 0), 0) / frecuencias.length;
const dosDecimales = (n: number) => Math.round(n * 100) / 100;

export interface PorcentajeOido {
  porcentaje: number;
  frecuencias: number[];
  rango?: 'A' | 'B';
}

/**
 * Porcentaje de pérdida de un oído, como lo calculaban los pasos 2 y 3:
 * - AMA: max(0, PTA(500–3000) − 25) × 1.5 (pérdida monoaural);
 * - LFT: índice de Fletcher, PTA × 0.8 con el rango (A 250–2000, B 2000–6000) de mayor pérdida.
 */
export function porcentajePerdidaOido(df: Datos, lado: Lado, metodo: MetodoAudiometria): PorcentajeOido {
  if (metodo === 'AMA') {
    const frecuencias = [500, 1000, 2000, 3000];
    return { porcentaje: dosDecimales(Math.max(0, promedio(df, lado, frecuencias) - 25) * 1.5), frecuencias };
  }
  const a = [250, 500, 1000, 2000];
  const b = [2000, 3000, 4000, 6000];
  const pa = promedio(df, lado, a) * 0.8;
  const pb = promedio(df, lado, b) * 0.8;
  return pa >= pb
    ? { porcentaje: dosDecimales(pa), frecuencias: a, rango: 'A' }
    : { porcentaje: dosDecimales(pb), frecuencias: b, rango: 'B' };
}

/**
 * Los resultados que salen de los umbrales, como los escribían los pasos 2 y 3: por oído
 * (`perdidaMonauralO?_AMA` o `porcentajePerdidaO?`) y binaural (AMA (5·menor + mayor)/6;
 * LFT (7·menor + mayor)/8 con el redondeo de la LFT). Un oído sin umbrales no tiene resultado.
 */
export function calcularResultadosAudiometria(df: Datos, metodo: MetodoAudiometria): Datos {
  const od = oidoConUmbrales(df, 'Derecho') ? porcentajePerdidaOido(df, 'Derecho', metodo).porcentaje : null;
  const oi = oidoConUmbrales(df, 'Izquierdo') ? porcentajePerdidaOido(df, 'Izquierdo', metodo).porcentaje : null;
  if (metodo === 'AMA') {
    if (od != null) df.perdidaMonauralOD_AMA = od;
    if (oi != null) df.perdidaMonauralOI_AMA = oi;
    if (od != null && oi != null) {
      const menor = Math.min(od, oi);
      const mayor = Math.max(od, oi);
      df.perdidaAuditivaBilateralAMA = dosDecimales((5 * menor + mayor) / 6);
    }
  } else {
    if (od != null) df.porcentajePerdidaOD = od;
    if (oi != null) df.porcentajePerdidaOI = oi;
    if (od != null && oi != null) {
      let binaural = (Math.min(od, oi) * 7 + Math.max(od, oi)) / 8;
      binaural = binaural % 1 >= 0.6 ? Math.ceil(binaural) : Math.floor(binaural);
      df.hipoacusiaBilateralCombinada = binaural;
    }
  }
  return df;
}

/**
 * La interpretación generada de los umbrales, si el campo está vacío o conserva intacto lo que
 * se generó antes (como el paso 5: no pisa lo que el médico editó).
 */
export function escribirInterpretacionGenerada(df: Datos): Datos {
  const generada = generarInterpretacionAudiometrica(df);
  if (!generada || generada === MENSAJE_DATOS_INSUFICIENTES) return df;
  const actual = String(df.interpretacionAudiometrica ?? '').trim();
  const antes = String(df.interpretacionAudiometricaGenerada ?? '').trim();
  if (actual === '' || (antes !== '' && actual === antes)) {
    df.interpretacionAudiometrica = generada;
    df.interpretacionAudiometricaGenerada = generada;
  }
  return df;
}

/**
 * Lo preseleccionado por sección (método, fecha, recomendaciones) y los resultados de los
 * umbrales. Sin `visitado`, todo (al guardar o al editar).
 */
export function completarRespuestasPorDefecto(
  df: Datos,
  { pais, hoy = fechaLocalHoy(), visitado }: { pais?: string | null; hoy?: string; visitado?: (paso: number) => boolean } = {},
): Datos {
  const revisado = (paso: number) => !visitado || visitado(paso);
  // El método va desde el principio: de él dependen los porcentajes y lo que muestra la vista
  // previa (sin método, el documento suponía AMA aunque el proveedor fuera de México)
  if (vacio(df.metodoAudiometria)) df.metodoAudiometria = metodoAudiometriaPorDefecto(pais);
  if (revisado(PASO_AU.metodoFecha) && vacio(df.fechaAudiometria)) df.fechaAudiometria = hoy;
  if (revisado(PASO_AU.recomendaciones) && df.recomendacionesAudiometria === undefined) {
    df.recomendacionesAudiometria = [...RECOMENDACIONES_POR_DEFECTO];
  }
  calcularResultadosAudiometria(df, metodoDe(df, pais));
  escribirInterpretacionGenerada(df);
  return df;
}

/** Lo que se envía: todo lo preseleccionado y los resultados (los umbrales vacíos se piden). */
export function prepararAudiometriaParaGuardar(df: Datos, { pais }: { pais?: string | null } = {}): Datos {
  completarRespuestasPorDefecto(df, { pais });
  if (!Array.isArray(df.recomendacionesAudiometria)) df.recomendacionesAudiometria = [];
  // Los pasos dejaban en 0 los campos de LFT también en una audiometría AMA (tablas, PDF y
  // tablero los leen así): se conserva
  for (const campo of ['porcentajePerdidaOD', 'porcentajePerdidaOI', 'hipoacusiaBilateralCombinada']) {
    if (df[campo] === undefined || df[campo] === null) df[campo] = 0;
  }
  return df;
}

export interface ProblemaUmbrales {
  paso: number;
  campo: string;
  nombre: string;
  falta: true;
  mensaje: string;
}

/** Umbrales sin capturar, un aviso por oído con sus frecuencias. */
export function problemasUmbralesAudiometria(df: Datos): ProblemaUmbrales[] {
  return (['Derecho', 'Izquierdo'] as Lado[]).flatMap((lado) => {
    const faltan = umbralesFaltantes(df, lado);
    if (faltan.length === 0) return [];
    const oido = lado === 'Derecho' ? 'oído derecho' : 'oído izquierdo';
    return [
      {
        paso: lado === 'Derecho' ? PASO_AU.oidoDerecho : PASO_AU.oidoIzquierdo,
        // Toda la fila del oído (el cursor va a la primera casilla vacía), no solo una casilla
        campo: campoFilaUmbrales(lado),
        nombre: `Umbrales del ${oido}`,
        falta: true as const,
        mensaje:
          faltan.length === FRECUENCIAS_AUDIOMETRIA.length
            ? `Faltan los umbrales del ${oido}.`
            : `Faltan los umbrales del ${oido} en ${enLista(faltan.map(String))} Hz.`,
      },
    ];
  });
}
