/**
 * Volver al expediente donde se estaba. Se guarda en la sesión de la pestaña (como el estado de
 * la tabla de trabajadores) y solo vale para el mismo trabajador:
 * - el expediente anota su posición al salir;
 * - al entrar a editar un documento se anota cuál se abrió;
 * - al guardar un documento se anota cuál se guardó.
 * Al volver, si se guardó un documento la pantalla va a él y lo ilumina; si no, regresa a la
 * posición anterior y marca el documento que se había abierto.
 */
import { ref } from 'vue';

const CLAVE = 'ramazzini:expediente:retorno';
/** Pasado este tiempo, volver al expediente ya no restaura nada. */
const VIGENCIA_MS = 30 * 60 * 1000;
export const DURACION_RESALTADO_MS = 2500;

export interface RetornoExpediente {
  trabajadorId: string;
  scrollY?: number;
  documentoAbierto?: string;
  documentoGuardado?: string;
  en: number;
}

/** Documento iluminado en el expediente (GrupoDocumentos lo marca). */
export const documentoResaltado = ref<string | null>(null);
let limpiarResaltado: ReturnType<typeof setTimeout> | null = null;

function leer(): RetornoExpediente | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as RetornoExpediente) : null;
  } catch {
    return null;
  }
}

function escribir(valor: RetornoExpediente | null) {
  try {
    if (valor) sessionStorage.setItem(CLAVE, JSON.stringify(valor));
    else sessionStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento de sesión: simplemente no se restaura
  }
}

/** Combina con lo anotado para el mismo trabajador; otro trabajador empieza de cero. */
function anotar(trabajadorId: string | null | undefined, cambios: Partial<RetornoExpediente>) {
  if (!trabajadorId) return;
  const id = String(trabajadorId);
  const previo = leer();
  const base = previo && previo.trabajadorId === id ? previo : { trabajadorId: id };
  escribir({ ...base, ...cambios, trabajadorId: id, en: Date.now() });
}

export const anotarPosicionExpediente = (trabajadorId: string | null | undefined, scrollY: number) =>
  anotar(trabajadorId, { scrollY: Math.max(0, Math.round(scrollY)) });

export const anotarDocumentoAbierto = (trabajadorId: string | null | undefined, documentId: string) =>
  anotar(trabajadorId, { documentoAbierto: String(documentId), documentoGuardado: undefined });

export const anotarDocumentoGuardado = (trabajadorId: string | null | undefined, documentId: string) =>
  anotar(trabajadorId, { documentoGuardado: String(documentId) });

/** Lo anotado para este trabajador, si sigue vigente; se entrega una sola vez. */
export function tomarRetornoExpediente(trabajadorId: string | null | undefined, ahora = Date.now()): RetornoExpediente | null {
  const valor = leer();
  escribir(null);
  if (!valor || !trabajadorId || valor.trabajadorId !== String(trabajadorId)) return null;
  if (ahora - valor.en > VIGENCIA_MS) return null;
  return valor;
}

/** Ilumina un documento unos segundos. */
export function resaltarDocumento(documentId: string) {
  documentoResaltado.value = String(documentId);
  if (limpiarResaltado) clearTimeout(limpiarResaltado);
  limpiarResaltado = setTimeout(() => {
    documentoResaltado.value = null;
    limpiarResaltado = null;
  }, DURACION_RESALTADO_MS);
}
