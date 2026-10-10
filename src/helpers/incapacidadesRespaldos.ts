/**
 * Respaldos de una incapacidad: el escaneo o la foto del certificado y de los
 * formatos del IMSS. Se guardan como documentos externos del expediente,
 * ligados al caso y, si aplica, a una de sus incapacidades
 * (backend/src/modules/incapacidades/incapacidades-respaldos.util.ts).
 */
import DocumentosAPI from '@/api/DocumentosAPI';
import { fetchClinicalFileBlob } from '@/lib/clinicalFiles';
import { convertirFechaISOaDDMMYYYY, convertirYYYYMMDDaISO } from './dates';
import {
  soloFecha,
  type Caso,
  type Incapacidad,
  type Opcion,
  type RamoIncapacidad,
} from './incapacidades';

export type TipoRespaldo = 'certificadoIncapacidad' | 'st7' | 'st9' | 'st2' | 'st3' | 'otro';

export interface Respaldo {
  _id: string;
  nombreDocumento: string;
  fechaDocumento: string;
  extension: string;
  rutaDocumento: string;
  tipo: TipoRespaldo;
  /** Ausente cuando el documento es del caso y no de una incapacidad. */
  idIncapacidad?: string;
}

interface TipoDeRespaldo extends Opcion<TipoRespaldo> {
  /** Nombre completo del formato. */
  descripcion: string;
  /** Con lo que se nombra el archivo en el expediente. */
  nombreDeArchivo: string;
}

export const TIPOS_RESPALDO: TipoDeRespaldo[] = [
  {
    valor: 'certificadoIncapacidad',
    texto: 'Certificado de incapacidad',
    descripcion: 'Certificado de incapacidad o constancia del descanso',
    nombreDeArchivo: 'Incapacidad',
  },
  {
    valor: 'st7',
    texto: 'ST-7',
    descripcion: 'Aviso de atención médica inicial y calificación de probable accidente de trabajo',
    nombreDeArchivo: 'ST-7 Probable accidente de trabajo',
  },
  {
    valor: 'st9',
    texto: 'ST-9',
    descripcion: 'Aviso de atención médica y calificación de probable enfermedad de trabajo',
    nombreDeArchivo: 'ST-9 Probable enfermedad de trabajo',
  },
  {
    valor: 'st2',
    texto: 'ST-2',
    descripcion: 'Dictamen de alta por riesgo de trabajo',
    nombreDeArchivo: 'ST-2 Dictamen de alta',
  },
  {
    valor: 'st3',
    texto: 'ST-3',
    descripcion: 'Dictamen de incapacidad permanente o de defunción por riesgo de trabajo',
    nombreDeArchivo: 'ST-3 Dictamen de incapacidad permanente',
  },
  {
    valor: 'otro',
    texto: 'Otro documento',
    descripcion: 'Cualquier otro documento del caso',
    nombreDeArchivo: 'Documento de incapacidad',
  },
];

export const tipoDeRespaldo = (valor: TipoRespaldo) =>
  TIPOS_RESPALDO.find((tipo) => tipo.valor === valor) ?? TIPOS_RESPALDO[TIPOS_RESPALDO.length - 1];

/** Tipos que se pueden adjuntar al caso: los formatos ST solo existen en riesgo de trabajo. */
export function tiposParaCaso(ramo: RamoIncapacidad): TipoDeRespaldo[] {
  const valores: TipoRespaldo[] = ramo === 'riesgoTrabajo' ? ['st7', 'st9', 'st2', 'st3', 'otro'] : ['otro'];
  return TIPOS_RESPALDO.filter((tipo) => valores.includes(tipo.valor));
}

/** Nombre con el que el documento queda en el expediente. */
export function nombreDeRespaldo(tipo: TipoRespaldo, incapacidad?: Incapacidad | null): string {
  if (tipo === 'certificadoIncapacidad' && incapacidad) {
    if (incapacidad.origen === 'empresa') return 'Descanso otorgado por la empresa';
    if (incapacidad.origen === 'particular') return 'Reposo de médico particular';
    return incapacidad.folio ? `Incapacidad IMSS folio ${incapacidad.folio}` : 'Incapacidad IMSS';
  }
  return tipoDeRespaldo(tipo).nombreDeArchivo;
}

/** Fecha del documento que se propone al adjuntar (AAAA-MM-DD). */
export function fechaSugerida(
  tipo: TipoRespaldo,
  caso: Caso,
  incapacidad: Incapacidad | null | undefined,
  hoy: string,
): string {
  if (incapacidad) return soloFecha(incapacidad.fechaExpedicion) || soloFecha(incapacidad.fechaInicio);
  if (tipo === 'st7' || tipo === 'st9') return soloFecha(caso.fechaRiesgo) || soloFecha(caso.fechaInicio);
  if (tipo === 'st2' || tipo === 'st3') return soloFecha(caso.fechaAlta) || hoy;
  return hoy;
}

export const EXTENSIONES_DE_RESPALDO = ['.pdf', '.jpg', '.jpeg', '.png'];
/**
 * Mayor que el de documentos externos (1 MB) para que quepa la foto de un
 * certificado tomada con el celular. El servidor acepta hasta 10 MB.
 */
export const MB_MAXIMOS_DE_RESPALDO = 3;
export const AYUDA_DE_RESPALDO = `PDF, JPG o PNG (máximo ${MB_MAXIMOS_DE_RESPALDO} MB por archivo)`;
export const BYTES_MAXIMOS_DE_RESPALDO = MB_MAXIMOS_DE_RESPALDO * 1024 * 1024;

export const extensionDe = (nombre: string): string => {
  const punto = nombre.lastIndexOf('.');
  return punto >= 0 ? nombre.slice(punto).toLowerCase() : '';
};

/** Mensaje si el archivo no se puede subir; cadena vacía si es válido. */
export function errorDeArchivo(archivo: { name: string; size: number } | null): string {
  if (!archivo) return 'Elige un archivo.';
  if (!EXTENSIONES_DE_RESPALDO.includes(extensionDe(archivo.name))) {
    return 'El archivo debe ser PDF, JPG o PNG.';
  }
  if (archivo.size > BYTES_MAXIMOS_DE_RESPALDO) {
    return `El archivo no puede pesar más de ${MB_MAXIMOS_DE_RESPALDO} MB.`;
  }
  if (!archivo.size) return 'El archivo está vacío.';
  return '';
}

export interface DatosDeRespaldo {
  trabajadorId: string;
  usuarioId: string;
  archivo: File;
  tipo: TipoRespaldo;
  /** AAAA-MM-DD. */
  fecha: string;
  nombre: string;
  idCaso: string;
  idIncapacidad?: string;
}

/** Intentos con nombre distinto cuando ya existe un archivo igual en esa fecha (frente y reverso, por ejemplo). */
const INTENTOS = 6;

export async function subirRespaldo(datos: DatosDeRespaldo): Promise<void> {
  const extension = extensionDe(datos.archivo.name);
  for (let intento = 1; ; intento++) {
    const nombre = intento === 1 ? datos.nombre : `${datos.nombre} (${intento})`;
    const formulario = new FormData();
    formulario.append('nombreDocumento', nombre);
    formulario.append('fechaDocumento', convertirYYYYMMDDaISO(datos.fecha));
    formulario.append('notasDocumento', '');
    formulario.append('extension', extension);
    formulario.append('idTrabajador', datos.trabajadorId);
    formulario.append('createdBy', datos.usuarioId);
    formulario.append('updatedBy', datos.usuarioId);
    formulario.append('idCasoIncapacidad', datos.idCaso);
    if (datos.idIncapacidad) formulario.append('idIncapacidad', datos.idIncapacidad);
    formulario.append('tipoRespaldoIncapacidad', datos.tipo);
    // El servidor toma la extensión del nombre del archivo: se manda en minúsculas
    formulario.append('file', datos.archivo, `respaldo${extension}`);
    try {
      await DocumentosAPI.uploadExternalDocument(datos.trabajadorId, formulario);
      return;
    } catch (error) {
      const estado = (error as { response?: { status?: number } })?.response?.status;
      if (estado !== 409 || intento >= INTENTOS) throw error;
    }
  }
}

/** Tamaño legible: «350 KB», «0.98 MB». */
export const textoDeTamano = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

/** Documento elegido en el formulario de registro, antes de que exista el caso. */
export interface RespaldoPendiente {
  archivo: File;
  tipo: TipoRespaldo;
}

/**
 * Sube los documentos elegidos al registrar, ya con el caso y la incapacidad
 * creados. Devuelve los nombres de los archivos que no se pudieron subir: el
 * registro ya quedó guardado y se pueden adjuntar después desde la lista.
 */
export async function subirRespaldosPendientes(
  pendientes: RespaldoPendiente[],
  destino: {
    trabajadorId: string;
    usuarioId: string;
    caso: Caso;
    incapacidad?: Incapacidad | null;
    hoy: string;
  },
): Promise<string[]> {
  const fallidos: string[] = [];
  for (const pendiente of pendientes) {
    const esCertificado = pendiente.tipo === 'certificadoIncapacidad' && !!destino.incapacidad;
    const incapacidad = esCertificado ? destino.incapacidad : null;
    try {
      await subirRespaldo({
        trabajadorId: destino.trabajadorId,
        usuarioId: destino.usuarioId,
        archivo: pendiente.archivo,
        tipo: pendiente.tipo,
        fecha: fechaSugerida(pendiente.tipo, destino.caso, incapacidad, destino.hoy),
        nombre: nombreDeRespaldo(pendiente.tipo, incapacidad),
        idCaso: destino.caso._id,
        idIncapacidad: incapacidad?._id,
      });
    } catch {
      fallidos.push(pendiente.archivo.name);
    }
  }
  return fallidos;
}

/** Ruta del archivo dentro del expediente, como la arma el servidor al guardarlo. */
export function rutaDeRespaldo(respaldo: Respaldo): string {
  const archivo = `${respaldo.nombreDocumento} ${convertirFechaISOaDDMMYYYY(respaldo.fechaDocumento)}${respaldo.extension}`;
  const carpeta = respaldo.rutaDocumento.replace(/[\\/]+$/, '');
  return carpeta.endsWith(archivo) ? carpeta : `${carpeta}/${archivo}`;
}

/** Abre el documento en otra pestaña. */
export async function abrirRespaldo(respaldo: Respaldo): Promise<void> {
  const contenido = await fetchClinicalFileBlob(rutaDeRespaldo(respaldo));
  const direccion = URL.createObjectURL(contenido);
  window.open(direccion, '_blank', 'noopener');
  // La pestaña ya cargó el contenido; se libera la referencia más tarde
  setTimeout(() => URL.revokeObjectURL(direccion), 60_000);
}
