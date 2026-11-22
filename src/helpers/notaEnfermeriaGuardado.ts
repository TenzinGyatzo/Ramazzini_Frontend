/**
 * Nota de enfermería, punto (46): lo que los pasos escribían al abrirse o cerrarse (la fecha, la
 * hora, el trabajador, los signos vitales vacíos) se escribe aquí, igual en los dos modos. En la
 * captura rápida todos los pasos se montan a la vez, así que no pueden escribir al montarse.
 *
 * - El trabajador y los signos vitales (objeto vacío) se escriben siempre: son estructura, no
 *   respuestas.
 * - La fecha (hoy) y la hora (la de cuando se abrió la nota) se ven llenas desde el principio y
 *   se escriben al revisar la sección de datos, o al guardar.
 * - Nada más se preselecciona: tipo, sistema, origen y destino se eligen siempre.
 */
import { format } from 'date-fns';
import { fechaLocalHoy } from '@/helpers/dates';

type Datos = Record<string, any>;

const vacio = (v: unknown) => v === undefined || v === null || String(v).trim() === '';

export const PASO_DATOS = 1;

/** La hora que se ve en la nota nueva: la de cuando se abrió (la fija el asistente al abrirla). */
let horaApertura = format(new Date(), 'HH:mm');
export function fijarHoraApertura(ahora: Date = new Date()): void {
  horaApertura = format(ahora, 'HH:mm');
}
export const horaDeApertura = () => horaApertura;

export function completarRespuestasPorDefecto(
  df: Datos,
  {
    trabajadorId,
    hoy = fechaLocalHoy(),
    hora = horaApertura,
    visitado,
  }: { trabajadorId?: string | null; hoy?: string; hora?: string; visitado?: (paso: number) => boolean } = {},
): Datos {
  const revisado = (paso: number) => !visitado || visitado(paso);
  if (trabajadorId && vacio(df.idTrabajador)) df.idTrabajador = trabajadorId;
  if (!df.signosVitales || typeof df.signosVitales !== 'object') df.signosVitales = {};
  if (revisado(PASO_DATOS)) {
    if (vacio(df.fechaNotaEnfermeria)) df.fechaNotaEnfermeria = hoy;
    if (vacio(df.horaAtencion)) df.horaAtencion = hora;
  }
  return df;
}

/** Antes de guardar (y para los avisos, sobre una copia): todo lo que se ve, escrito. */
export function prepararNotaEnfermeriaParaGuardar(
  df: Datos,
  opciones: { trabajadorId?: string | null; hoy?: string; hora?: string } = {},
): Datos {
  return completarRespuestasPorDefecto(df, opciones);
}
