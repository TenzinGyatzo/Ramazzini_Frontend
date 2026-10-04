/**
 * Cuestionario Nórdico de Kuorinka: regiones, catálogos y regla del resultado.
 * Alineado con `cuestionario-nordico.constants.ts`, `cuestionario-nordico-resultado.util.ts`
 * y `guia-corporal-nordico.svg.ts` del backend. El resultado que se guarda lo calcula el
 * servidor; aquí se calcula solo para la vista previa mientras se captura.
 */

export type ClaveRegionNordico =
  | 'cuello'
  | 'hombroIzquierdo'
  | 'hombroDerecho'
  | 'codoIzquierdo'
  | 'codoDerecho'
  | 'munecaIzquierda'
  | 'munecaDerecha'
  | 'espaldaAlta'
  | 'espaldaBaja'
  | 'cadera'
  | 'musloIzquierdo'
  | 'musloDerecho'
  | 'rodillaIzquierda'
  | 'rodillaDerecha'
  | 'tobilloIzquierdo'
  | 'tobilloDerecho';

/** Las 9 regiones del cuestionario general original; agrupan las 16 capturadas. */
type GrupoOriginalNordico =
  | 'cuello'
  | 'hombros'
  | 'codos'
  | 'munecas'
  | 'espaldaAlta'
  | 'espaldaBaja'
  | 'caderas'
  | 'rodillas'
  | 'tobillos';

export interface RegionNordicoDef {
  clave: ClaveRegionNordico;
  numero: number;
  etiqueta: string;
  grupo: GrupoOriginalNordico;
  /** Paso del formulario donde se captura (el paso 1 es la fecha). */
  paso: number;
  /** Centro del marcador en la guía corporal (viewBox 200 × 420). */
  x: number;
  y: number;
}

export const REGIONES_NORDICO: RegionNordicoDef[] = [
  { clave: 'cuello', numero: 1, etiqueta: 'Cuello / nuca', grupo: 'cuello', paso: 2, x: 100, y: 59 },
  { clave: 'hombroIzquierdo', numero: 2, etiqueta: 'Hombro izquierdo', grupo: 'hombros', paso: 2, x: 57, y: 78 },
  { clave: 'hombroDerecho', numero: 3, etiqueta: 'Hombro derecho', grupo: 'hombros', paso: 2, x: 143, y: 78 },
  { clave: 'codoIzquierdo', numero: 4, etiqueta: 'Codo / antebrazo izquierdo', grupo: 'codos', paso: 3, x: 40, y: 140 },
  { clave: 'codoDerecho', numero: 5, etiqueta: 'Codo / antebrazo derecho', grupo: 'codos', paso: 3, x: 160, y: 140 },
  { clave: 'munecaIzquierda', numero: 6, etiqueta: 'Muñeca / mano izquierda', grupo: 'munecas', paso: 3, x: 29, y: 198 },
  { clave: 'munecaDerecha', numero: 7, etiqueta: 'Muñeca / mano derecha', grupo: 'munecas', paso: 3, x: 171, y: 198 },
  { clave: 'espaldaAlta', numero: 8, etiqueta: 'Espalda alta (dorsal)', grupo: 'espaldaAlta', paso: 4, x: 100, y: 102 },
  { clave: 'espaldaBaja', numero: 9, etiqueta: 'Espalda baja (lumbar)', grupo: 'espaldaBaja', paso: 4, x: 100, y: 160 },
  { clave: 'cadera', numero: 10, etiqueta: 'Cadera / glúteos', grupo: 'caderas', paso: 4, x: 100, y: 200 },
  { clave: 'musloIzquierdo', numero: 11, etiqueta: 'Muslo izquierdo', grupo: 'caderas', paso: 5, x: 81, y: 246 },
  { clave: 'musloDerecho', numero: 12, etiqueta: 'Muslo derecho', grupo: 'caderas', paso: 5, x: 119, y: 246 },
  { clave: 'rodillaIzquierda', numero: 13, etiqueta: 'Rodilla izquierda', grupo: 'rodillas', paso: 5, x: 80, y: 294 },
  { clave: 'rodillaDerecha', numero: 14, etiqueta: 'Rodilla derecha', grupo: 'rodillas', paso: 5, x: 120, y: 294 },
  { clave: 'tobilloIzquierdo', numero: 15, etiqueta: 'Tobillo / pie izquierdo', grupo: 'tobillos', paso: 5, x: 80, y: 372 },
  { clave: 'tobilloDerecho', numero: 16, etiqueta: 'Tobillo / pie derecho', grupo: 'tobillos', paso: 5, x: 120, y: 372 },
];

/** Pasos del formulario; los de regiones se arman a partir de `REGIONES_NORDICO`. */
export const PASOS_NORDICO = [
  { paso: 1, nombre: 'Fecha y actividad' },
  { paso: 2, nombre: 'Cuello y hombros' },
  { paso: 3, nombre: 'Codos, muñecas y manos' },
  { paso: 4, nombre: 'Espalda y cadera' },
  { paso: 5, nombre: 'Muslos, rodillas, tobillos y pies' },
  { paso: 6, nombre: 'Observaciones' },
] as const;

export const PASO_OBSERVACIONES_NORDICO = 6;

export function regionesNordicoDelPaso(paso: number): RegionNordicoDef[] {
  return REGIONES_NORDICO.filter((region) => region.paso === paso);
}

export const SI = 'Sí';
export const NO = 'No';

export const TIEMPO_MOLESTIA_NORDICO = [
  '1-7 días',
  '8-30 días',
  'Más de 30 días, no seguidos',
  'Todos los días',
] as const;

export const DIAS_IMPEDIMENTO_NORDICO = [
  '0 días',
  '1-7 días',
  '8-30 días',
  'Más de 30 días',
] as const;

export const ATENCION_PROFESIONAL_NORDICO = ['No', 'Médico', 'Fisioterapia', 'Otro'] as const;

export const RELACION_TRABAJO_NORDICO = ['No relacionada', 'Parcialmente', 'Principalmente'] as const;

export const ACTIVIDADES_NORDICO = [
  'Levantamiento de cargas',
  'Empuje o arrastre',
  'Posturas forzadas',
  'Movimientos repetitivos',
  'Otro',
] as const;

export const MANO_DOMINANTE_NORDICO = ['Diestro', 'Zurdo', 'Ambidiestro'] as const;

export const INTENSIDADES_NORDICO = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Desde esta intensidad (escala 0–10) la molestia se considera intensa. */
export const INTENSIDAD_INTENSA_NORDICO = 7;

export interface RegionNordicoRespuestas {
  molestia12Meses?: string;
  tiempoMolestia12Meses?: string;
  molestia7Dias?: string;
  intensidad?: number;
  diasImpedimento?: string;
  atencionProfesional?: string;
  relacionTrabajo?: string;
  actividades?: string[];
  actividadOtra?: string;
}

export type RegionesNordicoRespuestas = Partial<
  Record<ClaveRegionNordico, RegionNordicoRespuestas | null>
>;

export type SemaforoNordico = 'verde' | 'amarillo' | 'rojo';

export interface ResultadoCuestionarioNordico {
  versionRegla?: number;
  semaforo: SemaforoNordico;
  regionesMolestia12Meses: ClaveRegionNordico[];
  regionesMolestia7Dias: ClaveRegionNordico[];
  regionesImpedimento: ClaveRegionNordico[];
  regionesRelacionLaboral: ClaveRegionNordico[];
  /** Regiones que por sí solas ponen el semáforo en rojo. */
  regionesPrioritarias: ClaveRegionNordico[];
  intensidadMaxima: number;
  /** Suma 0–36 de las 9 regiones originales (codificación 0–4 por región). */
  puntuacionTotal: number;
}

export type NivelRegionNordico = 'sinMolestia' | 'molestia' | 'prioritaria';

const CAMPOS_DETALLE_NORDICO: (keyof RegionNordicoRespuestas)[] = [
  'tiempoMolestia12Meses',
  'molestia7Dias',
  'intensidad',
  'diasImpedimento',
  'atencionProfesional',
  'relacionTrabajo',
  'actividades',
  'actividadOtra',
];

function tieneImpedimento(region: RegionNordicoRespuestas): boolean {
  return !!region.diasImpedimento && region.diasImpedimento !== '0 días';
}

function esRegionPrioritaria(region: RegionNordicoRespuestas): boolean {
  return (
    region.molestia7Dias === SI ||
    tieneImpedimento(region) ||
    Number(region.intensidad) >= INTENSIDAD_INTENSA_NORDICO
  );
}

/**
 * Codificación 0–4 por región: 0 sin síntomas; 1 síntomas en 12 meses;
 * 2 además en 7 días; 3 con impedimento; 4 en 7 días y con impedimento.
 */
function puntuacionRegion(region: RegionNordicoRespuestas): number {
  const en7Dias = region.molestia7Dias === SI;
  const impedimento = tieneImpedimento(region);
  if (en7Dias && impedimento) return 4;
  if (impedimento) return 3;
  if (en7Dias) return 2;
  return 1;
}

export function bandaIntensidadNordico(intensidad: number | undefined | null): string {
  if (!intensidad || intensidad <= 0) return 'Sin molestia';
  if (intensidad <= 3) return 'Leve';
  if (intensidad < INTENSIDAD_INTENSA_NORDICO) return 'Moderada';
  return 'Intensa';
}

/** Misma regla que `calcularResultadoCuestionarioNordico` del backend. */
export function calcularResultadoCuestionarioNordico(
  regiones: RegionesNordicoRespuestas | null | undefined,
): ResultadoCuestionarioNordico {
  const resultado: ResultadoCuestionarioNordico = {
    semaforo: 'verde',
    regionesMolestia12Meses: [],
    regionesMolestia7Dias: [],
    regionesImpedimento: [],
    regionesRelacionLaboral: [],
    regionesPrioritarias: [],
    intensidadMaxima: 0,
    puntuacionTotal: 0,
  };
  const puntuacionPorGrupo = new Map<GrupoOriginalNordico, number>();

  for (const { clave, grupo } of REGIONES_NORDICO) {
    const region = regiones?.[clave];
    if (!region || region.molestia12Meses !== SI) continue;

    resultado.regionesMolestia12Meses.push(clave);
    if (region.molestia7Dias === SI) resultado.regionesMolestia7Dias.push(clave);
    if (tieneImpedimento(region)) resultado.regionesImpedimento.push(clave);
    if (region.relacionTrabajo === 'Parcialmente' || region.relacionTrabajo === 'Principalmente') {
      resultado.regionesRelacionLaboral.push(clave);
    }
    if (esRegionPrioritaria(region)) resultado.regionesPrioritarias.push(clave);

    const intensidad = Number(region.intensidad);
    if (Number.isFinite(intensidad) && intensidad > resultado.intensidadMaxima) {
      resultado.intensidadMaxima = intensidad;
    }
    puntuacionPorGrupo.set(
      grupo,
      Math.max(puntuacionPorGrupo.get(grupo) ?? 0, puntuacionRegion(region)),
    );
  }

  for (const puntos of puntuacionPorGrupo.values()) {
    resultado.puntuacionTotal += puntos;
  }

  if (resultado.regionesMolestia12Meses.length > 0) {
    resultado.semaforo = resultado.regionesPrioritarias.length > 0 ? 'rojo' : 'amarillo';
  }

  return resultado;
}

export function nivelesRegionNordico(
  resultado: Pick<ResultadoCuestionarioNordico, 'regionesMolestia12Meses' | 'regionesPrioritarias'>,
): Partial<Record<ClaveRegionNordico, NivelRegionNordico>> {
  const niveles: Partial<Record<ClaveRegionNordico, NivelRegionNordico>> = {};
  for (const clave of resultado.regionesMolestia12Meses ?? []) niveles[clave] = 'molestia';
  for (const clave of resultado.regionesPrioritarias ?? []) niveles[clave] = 'prioritaria';
  return niveles;
}

export const SEMAFORO_NORDICO: Record<
  SemaforoNordico,
  { titulo: string; descripcion: string; claseTexto: string; clasePunto: string }
> = {
  verde: {
    titulo: 'Sin molestias reportadas',
    descripcion: 'No se reportaron regiones con molestia en los últimos 12 meses.',
    claseTexto: 'text-green-600',
    clasePunto: 'bg-green-500',
  },
  amarillo: {
    titulo: 'Molestias reportadas',
    descripcion:
      'Molestias en los últimos 12 meses, sin molestia en los últimos 7 días, sin impedimento para trabajar y de intensidad leve o moderada.',
    claseTexto: 'text-yellow-600',
    clasePunto: 'bg-amber-500',
  },
  rojo: {
    titulo: 'Molestias con prioridad de seguimiento',
    descripcion:
      'Al menos una región con molestia en los últimos 7 días, impedimento para trabajar o intensidad de 7 o más.',
    claseTexto: 'text-red-600',
    clasePunto: 'bg-red-600',
  },
};

export function etiquetaRegionNordico(clave: ClaveRegionNordico): string {
  return REGIONES_NORDICO.find((region) => region.clave === clave)?.etiqueta ?? clave;
}

export function listaRegionesNordico(claves: ClaveRegionNordico[] | undefined): string {
  if (!claves?.length) return 'Ninguna';
  return claves.map(etiquetaRegionNordico).join(', ');
}

export function textoAntiguedadActividadNordico(anios?: number | null, meses?: number | null): string {
  if (anios == null && meses == null) return 'No registrada';
  const partes: string[] = [];
  if (anios) partes.push(`${anios} ${anios === 1 ? 'año' : 'años'}`);
  if (meses) partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
  return partes.length ? partes.join(' ') : 'Menos de 1 mes';
}

export function textoRelacionTrabajoNordico(region: RegionNordicoRespuestas): string {
  if (!region.relacionTrabajo) return '';
  if (region.relacionTrabajo === 'No relacionada') return 'No relacionada';
  const actividades = (region.actividades ?? []).map((actividad) =>
    actividad === 'Otro' && region.actividadOtra?.trim()
      ? `Otro (${region.actividadOtra.trim()})`
      : actividad,
  );
  return actividades.length
    ? `${region.relacionTrabajo}: ${actividades.join(', ')}`
    : region.relacionTrabajo;
}

/** Garantiza `regiones` y la entrada de cada región para poder enlazar el formulario. */
export function asegurarRegionesNordico(datos: { regiones?: RegionesNordicoRespuestas }): Record<
  ClaveRegionNordico,
  RegionNordicoRespuestas
> {
  if (!datos.regiones || typeof datos.regiones !== 'object') datos.regiones = {};
  for (const { clave } of REGIONES_NORDICO) {
    if (!datos.regiones[clave] || typeof datos.regiones[clave] !== 'object') {
      datos.regiones[clave] = {};
    }
  }
  return datos.regiones as Record<ClaveRegionNordico, RegionNordicoRespuestas>;
}

/** Quita el detalle de una región (al contestar «No» en 12 meses). */
export function limpiarDetalleRegionNordico(region: RegionNordicoRespuestas): void {
  for (const campo of CAMPOS_DETALLE_NORDICO) delete region[campo];
}

/** Sin relación con el trabajo no hay actividades que registrar. */
export function limpiarActividadesNordico(region: RegionNordicoRespuestas): void {
  delete region.actividades;
  delete region.actividadOtra;
}

/** ¿Falta algún dato del detalle en una región con molestia en 12 meses? */
export function detalleRegionNordicoCompleto(region: RegionNordicoRespuestas | null | undefined): boolean {
  if (!region || region.molestia12Meses !== SI) return true;
  return (
    !!region.tiempoMolestia12Meses &&
    !!region.molestia7Dias &&
    region.intensidad != null &&
    !!region.diasImpedimento &&
    !!region.atencionProfesional &&
    !!region.relacionTrabajo
  );
}

/**
 * Texto del Cuestionario Nórdico para la tabla resumen de la aptitud al puesto.
 * Usa el resultado guardado; sin resultado devuelve ''.
 * Mismo texto que `resumenTablaCuestionarioNordico` del backend.
 */
export function textoResumenCuestionarioNordico(
  d: { resultado?: Partial<ResultadoCuestionarioNordico> | null } | null | undefined,
): string {
  const resultado = d?.resultado;
  if (!resultado?.semaforo) return '';
  const en12Meses = resultado.regionesMolestia12Meses ?? [];
  if (en12Meses.length === 0) return 'Sin molestias musculoesqueléticas en los últimos 12 meses';
  const en7Dias = resultado.regionesMolestia7Dias ?? [];
  const conImpedimento = resultado.regionesImpedimento ?? [];
  const lista = (claves: ClaveRegionNordico[]) => claves.map(etiquetaRegionNordico).join(', ');
  const partes = [
    `Molestias en 12 meses: ${lista(en12Meses)}`,
    `en los últimos 7 días: ${en7Dias.length ? lista(en7Dias) : 'ninguna'}`,
    `intensidad máxima ${resultado.intensidadMaxima ?? 0}/10`,
  ];
  if (conImpedimento.length) partes.push(`impedimento para trabajar: ${lista(conImpedimento)}`);
  return partes.join('; ');
}
