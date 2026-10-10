/**
 * Incapacidades: tipos, catálogos con sus textos y cálculos de fechas para la captura.
 * Los valores de los catálogos son los que guarda el servidor
 * (backend/src/modules/incapacidades/incapacidades.catalogos.ts); no cambiarlos aquí solos.
 */

/**
 * Vista previa: mientras las vistas por empresa y los informes sigan leyendo el
 * módulo anterior de riesgos de trabajo, el módulo solo se muestra al
 * Administrador de plataforma. Mismo interruptor que en el servidor
 * (INCAPACIDADES_SOLO_ADMINISTRADOR en incapacidades.catalogos.ts).
 */
export const INCAPACIDADES_SOLO_ADMINISTRADOR = true;

export type RamoIncapacidad = 'riesgoTrabajo' | 'enfermedadGeneral' | 'maternidad';
export type OrigenIncapacidad = 'imss' | 'empresa' | 'particular';
export type CaracterIncapacidad =
  | 'inicial'
  | 'subsecuente'
  | 'recaida'
  | 'prenatal'
  | 'posparto'
  | 'enlace';
export type EstadoCaso = 'activo' | 'terminado';

export interface Incapacidad {
  _id: string;
  idCaso: string;
  origen: OrigenIncapacidad;
  caracter: CaracterIncapacidad;
  folio?: string;
  fechaInicio: string;
  dias: number;
  fechaTermino: string;
  fechaExpedicion?: string;
  conGoceDeSueldo?: boolean;
  historico?: boolean;
}

export interface Caso {
  _id: string;
  ramo: RamoIncapacidad;
  fechaInicio: string;
  grupoDiagnostico?: string;
  regionAnatomica?: string;
  diagnostico?: string;
  notas?: string;
  tipoRiesgo?: string;
  fechaRiesgo?: string;
  naturalezaLesion?: string;
  calificacion?: string;
  tipoAlta?: string;
  fechaAlta?: string;
  tieneSecuelas?: boolean;
  secuelasDescripcion?: string;
  porcentajeIPP?: number;
  defuncion?: boolean;
  fechaDefuncion?: string;
  idCasoOrigen?: string;
  diasAcumulados: number;
  fechaTerminoUltimaIncapacidad?: string;
  datosHeredados?: { naturalezaLesion?: string; parteCuerpoAfectada?: string; recaida?: string };
}

export interface DesgloseDias {
  total: number;
  subsidiados: number;
  sinSubsidio: number;
  aCargoEmpresa: number;
}

export interface CasoConIncapacidades {
  caso: Caso;
  incapacidades: Incapacidad[];
  estado: EstadoCaso;
  dias: DesgloseDias;
  incapacitadoHoy: boolean;
  /** Documentos que respaldan el caso; solo en la consulta por trabajador. */
  respaldos?: import('./incapacidadesRespaldos').Respaldo[];
}

export interface DatosCaso {
  ramo: RamoIncapacidad;
  grupoDiagnostico?: string;
  regionAnatomica?: string;
  diagnostico?: string;
  notas?: string;
  tipoRiesgo?: string;
  fechaRiesgo?: string;
  naturalezaLesion?: string;
  calificacion?: string;
  idCasoOrigen?: string;
}

export interface DatosIncapacidad {
  origen: OrigenIncapacidad;
  caracter: CaracterIncapacidad;
  folio?: string;
  fechaInicio: string;
  dias: number;
  fechaExpedicion?: string;
  conGoceDeSueldo?: boolean;
}

/** Seguimiento de un caso; `null` borra el dato. */
export type CambiosCaso = Partial<{
  grupoDiagnostico: string | null;
  regionAnatomica: string | null;
  diagnostico: string | null;
  notas: string | null;
  tipoRiesgo: string;
  fechaRiesgo: string | null;
  naturalezaLesion: string | null;
  calificacion: string | null;
  tipoAlta: string | null;
  fechaAlta: string | null;
  tieneSecuelas: boolean | null;
  secuelasDescripcion: string | null;
  porcentajeIPP: number | null;
  defuncion: boolean | null;
  fechaDefuncion: string | null;
}>;

export interface Opcion<T extends string = string> {
  valor: T;
  texto: string;
}

interface OpcionConEstilo<T extends string> extends Opcion<T> {
  icono: string;
  /** Clases del distintivo, en claro y en oscuro. */
  clases: string;
  descripcion: string;
}

export const RAMOS: OpcionConEstilo<RamoIncapacidad>[] = [
  {
    valor: 'enfermedadGeneral',
    texto: 'Enfermedad general',
    icono: 'fas fa-head-side-cough',
    clases: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300',
    descripcion: 'Padecimiento o accidente ajeno al trabajo',
  },
  {
    valor: 'riesgoTrabajo',
    texto: 'Riesgo de trabajo',
    icono: 'fas fa-hard-hat',
    clases: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    descripcion: 'Accidente o enfermedad de trabajo, o accidente en trayecto',
  },
  {
    valor: 'maternidad',
    texto: 'Maternidad',
    icono: 'fas fa-baby',
    clases: 'bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-300',
    descripcion: 'Incapacidad prenatal y posparto',
  },
];

export const ORIGENES: (Opcion<OrigenIncapacidad> & { descripcion: string })[] = [
  { valor: 'imss', texto: 'IMSS', descripcion: 'Certificado de incapacidad con folio' },
  { valor: 'empresa', texto: 'La empresa', descripcion: 'Descanso otorgado por el servicio médico' },
  { valor: 'particular', texto: 'Médico particular', descripcion: 'Reposo indicado por un médico externo' },
];

export const CARACTERES: Opcion<CaracterIncapacidad>[] = [
  { valor: 'inicial', texto: 'Inicial' },
  { valor: 'subsecuente', texto: 'Subsecuente' },
  { valor: 'recaida', texto: 'Recaída' },
  { valor: 'prenatal', texto: 'Prenatal' },
  { valor: 'posparto', texto: 'Posparto' },
  { valor: 'enlace', texto: 'Enlace' },
];

export const TIPOS_RIESGO: Opcion[] = [
  { valor: 'accidenteTrabajo', texto: 'Accidente de trabajo' },
  { valor: 'accidenteTrayecto', texto: 'Accidente en trayecto' },
  { valor: 'enfermedadTrabajo', texto: 'Enfermedad de trabajo' },
];

export const CALIFICACIONES: Opcion[] = [
  { valor: 'probable', texto: 'Probable, en calificación' },
  { valor: 'siDeTrabajo', texto: 'Calificado: sí de trabajo' },
  { valor: 'noDeTrabajo', texto: 'Calificado: no de trabajo' },
];

export const TIPOS_ALTA: Opcion[] = [
  { valor: 'altaST2', texto: 'Alta del IMSS (ST-2)' },
  { valor: 'altaInterna', texto: 'Alta interna' },
];

export const NATURALEZAS_LESION: Opcion[] = [
  { valor: 'contusion', texto: 'Contusión' },
  { valor: 'traumatismo', texto: 'Traumatismo' },
  { valor: 'fractura', texto: 'Fractura' },
  { valor: 'luxacion', texto: 'Luxación' },
  { valor: 'esguince', texto: 'Esguince' },
  { valor: 'corte', texto: 'Corte' },
  { valor: 'quemadura', texto: 'Quemadura' },
  { valor: 'herida', texto: 'Herida' },
  { valor: 'policontundido', texto: 'Policontundido' },
  { valor: 'otra', texto: 'Otra' },
];

export const REGIONES_ANATOMICAS: Opcion[] = [
  { valor: 'cabeza', texto: 'Cabeza' },
  { valor: 'ojos', texto: 'Ojos' },
  { valor: 'cuelloCervical', texto: 'Cuello y columna cervical' },
  { valor: 'hombro', texto: 'Hombro' },
  { valor: 'brazoCodo', texto: 'Brazo y codo' },
  { valor: 'antebrazoMuneca', texto: 'Antebrazo y muñeca' },
  { valor: 'manoDedos', texto: 'Mano y dedos' },
  { valor: 'torax', texto: 'Tórax' },
  { valor: 'abdomen', texto: 'Abdomen' },
  { valor: 'espaldaAlta', texto: 'Espalda alta' },
  { valor: 'espaldaBaja', texto: 'Espalda baja (lumbar)' },
  { valor: 'cadera', texto: 'Cadera' },
  { valor: 'muslo', texto: 'Muslo' },
  { valor: 'rodilla', texto: 'Rodilla' },
  { valor: 'pierna', texto: 'Pierna' },
  { valor: 'tobilloPie', texto: 'Tobillo y pie' },
  { valor: 'multiples', texto: 'Múltiples regiones' },
  { valor: 'otra', texto: 'Otra' },
];

export const GRUPOS_DIAGNOSTICO: Opcion[] = [
  { valor: 'traumatismos', texto: 'Traumatismos y lesiones' },
  { valor: 'musculoesqueletico', texto: 'Musculoesquelético' },
  { valor: 'respiratorio', texto: 'Respiratorio' },
  { valor: 'circulatorio', texto: 'Circulatorio y cardiovascular' },
  { valor: 'digestivo', texto: 'Digestivo' },
  { valor: 'infeccioso', texto: 'Infeccioso' },
  { valor: 'saludMental', texto: 'Salud mental' },
  { valor: 'neurologico', texto: 'Neurológico' },
  { valor: 'piel', texto: 'Piel' },
  { valor: 'oftalmologico', texto: 'Oftalmológico' },
  { valor: 'auditivo', texto: 'Auditivo' },
  { valor: 'genitourinario', texto: 'Genitourinario' },
  { valor: 'embarazoParto', texto: 'Embarazo y parto' },
  { valor: 'cirugiaProgramada', texto: 'Cirugía programada' },
  { valor: 'otro', texto: 'Otro' },
];

/** Grupos en los que la región anatómica es obligatoria. */
export const GRUPOS_CON_REGION = ['traumatismos', 'musculoesqueletico'];

export function textoDe(opciones: Opcion[], valor: string | null | undefined): string {
  return opciones.find((opcion) => opcion.valor === valor)?.texto ?? '';
}

export const ramoDe = (valor: RamoIncapacidad) =>
  RAMOS.find((ramo) => ramo.valor === valor) ?? RAMOS[0];

/** Caracteres que puede tener una incapacidad según el ramo y si abre el caso o lo continúa. */
export function caracteresDisponibles(
  ramo: RamoIncapacidad,
  esCasoNuevo: boolean,
): Opcion<CaracterIncapacidad>[] {
  const valores: CaracterIncapacidad[] =
    ramo === 'maternidad'
      ? ['prenatal', 'posparto', 'enlace']
      : !esCasoNuevo
        ? ['subsecuente']
        : ramo === 'riesgoTrabajo'
          ? ['inicial', 'recaida']
          : ['inicial'];
  return CARACTERES.filter((caracter) => valores.includes(caracter.valor));
}

// ---- Fechas de solo día: se manejan como texto AAAA-MM-DD para no depender de la zona horaria

const MS_POR_DIA = 86_400_000;

/** `2026-05-04T00:00:00.000Z` o `2026-05-04` → `2026-05-04`. */
export function soloFecha(fecha: string | null | undefined): string {
  return fecha ? String(fecha).slice(0, 10) : '';
}

/** `2026-05-04…` → `04-05-2026`. */
export function fechaCorta(fecha: string | null | undefined): string {
  const [anio, mes, dia] = soloFecha(fecha).split('-');
  return anio && mes && dia ? `${dia}-${mes}-${anio}` : '';
}

export function sumarDias(fecha: string, dias: number): string {
  const base = Date.parse(`${soloFecha(fecha)}T00:00:00.000Z`);
  if (Number.isNaN(base)) return '';
  return new Date(base + dias * MS_POR_DIA).toISOString().slice(0, 10);
}

/** Último día amparado: inicio + días − 1. */
export function fechaTermino(fechaInicio: string, dias: number): string {
  return fechaInicio && dias >= 1 ? sumarDias(fechaInicio, dias - 1) : '';
}

export function hoyISO(): string {
  const hoy = new Date();
  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  return `${hoy.getFullYear()}-${dosDigitos(hoy.getMonth() + 1)}-${dosDigitos(hoy.getDate())}`;
}

export const textoDias = (dias: number) => `${dias} ${dias === 1 ? 'día' : 'días'}`;

/** Avisos que no impiden guardar: límites habituales del IMSS y huecos entre incapacidades. */
export function avisosDeCaptura(datos: {
  origen: OrigenIncapacidad;
  caracter: CaracterIncapacidad;
  fechaInicio: string;
  dias: number;
  /** Fin de la última incapacidad del caso al que se agrega. */
  terminoAnterior?: string;
}): string[] {
  const avisos: string[] = [];
  if (datos.origen === 'imss' && datos.dias >= 1) {
    if (datos.caracter === 'posparto' && datos.dias !== 42) {
      avisos.push('El certificado posparto del IMSS es por 42 días.');
    } else if (datos.caracter === 'prenatal' && datos.dias !== 42 && datos.dias !== 84) {
      avisos.push('El certificado prenatal del IMSS es por 42 días, o por 84 si es certificado único.');
    } else if (datos.caracter === 'enlace' && datos.dias > 7) {
      avisos.push('Un certificado de enlace ampara de 1 a 7 días.');
    } else if (
      !['posparto', 'prenatal', 'enlace'].includes(datos.caracter) &&
      datos.dias > 28
    ) {
      avisos.push('Un certificado del IMSS ampara de 1 a 28 días. Revisa los días o captura cada certificado por separado.');
    }
  }
  if (datos.terminoAnterior && datos.fechaInicio) {
    const esperado = sumarDias(datos.terminoAnterior, 1);
    if (datos.fechaInicio > esperado) {
      avisos.push(
        `Queda un hueco: la incapacidad anterior terminó el ${fechaCorta(datos.terminoAnterior)} y esta empieza el ${fechaCorta(datos.fechaInicio)}.`,
      );
    }
  }
  return avisos;
}

/** Mensaje de error del servidor, o uno genérico. */
export function mensajeDeError(error: unknown, porDefecto: string): string {
  const mensaje = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(mensaje)) return mensaje.join('. ');
  return typeof mensaje === 'string' && mensaje ? mensaje : porDefecto;
}
