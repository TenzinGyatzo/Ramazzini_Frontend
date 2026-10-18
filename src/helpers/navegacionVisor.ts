/**
 * Navegación entre documentos desde el visor de PDF o de imagen del expediente.
 *
 * Cada documento (DocumentoItem) tiene su propio visor. Este módulo los coordina:
 * - El orden es el de la pantalla: filas `[data-documento]` en el orden del DOM (respeta el
 *   orden organizado, los subgrupos y el filtro por tipo, porque solo existen las filas visibles).
 * - «Siguiente» pide al documento vecino que se abra exactamente como si se le hiciera clic
 *   (su elemento `[data-abrir-documento]`), así no se toca la lógica de apertura de cada tipo.
 * - El cambio no parpadea: mientras se navega, los visores aparecen y se quitan sin animación,
 *   y el anterior se cierra en el mismo instante en que se abre el nuevo.
 * - Mientras hay un visor abierto se montan todos los años (normalmente se montan al hacer scroll),
 *   para que el recorrido y el «3 de 12» abarquen todo el expediente.
 */
import { ref } from 'vue';

/** Los visores aparecen y se quitan sin animación (al pasar de un documento a otro). */
export const visorSinAnimacion = ref(false);
/** Hay un visor abierto: el expediente monta todos los años. */
export const montarTodosLosAnios = ref(false);

interface VisorAbierto {
  id: string;
  cerrar: () => void;
}

let visorActual: VisorAbierto | null = null;
/** Documento al que se intentó ir; si no se pudo abrir, el siguiente intento parte de él. */
let cursor: string | null = null;
/** Documento que se está abriendo por navegación (para retirar el visor anterior si falla). */
let pendiente: string | null = null;
let limpiezaPendiente: ReturnType<typeof setTimeout> | null = null;

const ESPERA_MAXIMA_APERTURA_MS = 4000;

export function filasDelExpediente(raiz: ParentNode = document): HTMLElement[] {
  return [...raiz.querySelectorAll<HTMLElement>('[data-documento]')];
}

/** Posición (1-based) del documento en el expediente visible, y total. */
export function posicionEnExpediente(id: string, raiz: ParentNode = document): { indice: number; total: number } {
  const filas = filasDelExpediente(raiz);
  return { indice: filas.findIndex((f) => f.dataset.documento === id) + 1, total: filas.length };
}

/** Id del documento vecino en la dirección indicada, o null si no hay. */
export function idVecino(desde: string | null, direccion: 1 | -1, raiz: ParentNode = document): string | null {
  const filas = filasDelExpediente(raiz);
  const indice = filas.findIndex((f) => f.dataset.documento === desde);
  if (indice === -1) return null;
  return filas[indice + direccion]?.dataset.documento ?? null;
}

function terminarNavegacion() {
  pendiente = null;
  if (limpiezaPendiente) clearTimeout(limpiezaPendiente);
  limpiezaPendiente = null;
  // Un cuadro después, para que el visor nuevo ya esté insertado sin animación
  requestAnimationFrame(() => {
    visorSinAnimacion.value = false;
  });
}

/** Un documento abrió su visor. Cierra el anterior (si era otro) en el mismo instante. */
export function registrarVisorAbierto(id: string, cerrar: () => void): void {
  const anterior = visorActual;
  visorActual = { id, cerrar };
  cursor = id;
  montarTodosLosAnios.value = true;
  if (anterior && anterior.id !== id) anterior.cerrar();
  if (pendiente) terminarNavegacion();
}

/** Un documento cerró su visor. */
export function registrarVisorCerrado(id: string): void {
  if (visorActual?.id === id) visorActual = null;
}

/**
 * El documento al que se quiso ir no pudo abrir su visor y mostró otro aviso (p. ej. «PDF no
 * disponible»): se cierra el visor anterior para que ese aviso quede a la vista.
 */
export function aperturaFallida(id: string): void {
  if (pendiente !== id) return;
  visorActual?.cerrar();
  visorActual = null;
  terminarNavegacion();
}

export function navegacionPendiente(): string | null {
  return pendiente;
}

/** Pasa al documento vecino. Devuelve false si no hay vecino en esa dirección. */
export function irAlDocumento(direccion: 1 | -1, raiz: ParentNode = document): boolean {
  const desde = cursor ?? visorActual?.id ?? null;
  const destino = idVecino(desde, direccion, raiz);
  if (!destino) return false;
  const fila = filasDelExpediente(raiz).find((f) => f.dataset.documento === destino);
  const abrir = fila?.querySelector<HTMLElement>('[data-abrir-documento]');
  if (!abrir) return false;

  cursor = destino;
  pendiente = destino;
  visorSinAnimacion.value = true;
  if (limpiezaPendiente) clearTimeout(limpiezaPendiente);
  // Si no llega a abrirse (p. ej. el PDF aún se genera), se vuelve a animar normalmente
  limpiezaPendiente = setTimeout(terminarNavegacion, ESPERA_MAXIMA_APERTURA_MS);
  abrir.click();
  return true;
}

/** Estado inicial (al salir del expediente o cambiar de trabajador, y en pruebas). */
export function reiniciarNavegacionVisor(): void {
  visorActual = null;
  cursor = null;
  pendiente = null;
  if (limpiezaPendiente) clearTimeout(limpiezaPendiente);
  limpiezaPendiente = null;
  visorSinAnimacion.value = false;
  montarTodosLosAnios.value = false;
}
