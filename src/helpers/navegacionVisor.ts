/**
 * Navegación entre documentos desde el visor de PDF o de imagen del expediente.
 *
 * Cada documento (DocumentoItem) tiene su propio visor. Este módulo los coordina:
 * - El orden es el de la pantalla: filas `[data-documento]` en el orden del DOM (respeta el
 *   orden organizado, los subgrupos y el filtro por tipo, porque solo existen las filas visibles).
 * - «Siguiente» pide al documento vecino que se abra exactamente como si se le hiciera clic
 *   (su elemento `[data-abrir-documento]`), así no se toca la lógica de apertura de cada tipo.
 * - Cambio suave: el visor nuevo se abre oculto (`visorEntrante`) y, cuando ya dibujó su
 *   contenido (`visorListo`), se retira el anterior en el mismo instante y el nuevo entra con un
 *   deslizamiento corto. Mientras tanto el visor actual indica a dónde se va (`navegandoHacia`).
 * - El zoom elegido a mano pasa al documento siguiente hasta que se cierra el visor.
 * - Los documentos vecinos se descargan por adelantado (`precargarVecinos`): se les hace clic en
 *   «modo precarga» y su función de apertura solo guarda la descarga para cuando se abran.
 * - Mientras hay un visor abierto se montan todos los años (normalmente se montan al hacer scroll),
 *   para que el recorrido y el «3 de 12» abarquen todo el expediente.
 */
import { ref } from 'vue';

/** Los visores aparecen y se quitan sin animación propia (al pasar de un documento a otro). */
export const visorSinAnimacion = ref(false);
/** Hay un visor abierto: el expediente monta todos los años. */
export const montarTodosLosAnios = ref(false);
/** Documento al que se está yendo (el visor actual lo indica mientras carga). */
export const navegandoHacia = ref<string | null>(null);
/** Visor ya abierto pero oculto, esperando a tener su contenido dibujado. */
export const visorEntrante = ref<string | null>(null);
/** Sentido del último paso, para el deslizamiento de entrada. */
export const direccionNavegacion = ref<1 | -1>(1);

export interface EscalaVisor {
  tipo: 'pdf' | 'imagen';
  valor: number;
}

interface VisorAbierto {
  id: string;
  cerrar: () => void;
  /** Zoom elegido a mano en este visor, o null si sigue en el ajuste automático. */
  escala?: () => EscalaVisor | null;
}

let visorActual: VisorAbierto | null = null;
let entrante: VisorAbierto | null = null;
/** Documento al que se intentó ir; si no se pudo abrir, el siguiente intento parte de él. */
let cursor: string | null = null;
/** Documento que se está abriendo por navegación. */
let pendiente: string | null = null;
let escalaHeredada: EscalaVisor | null = null;
/** Destinos que se rebasaron (se avanzó otra vez antes de que abrieran): se cierran al llegar. */
const destinosRebasados = new Set<string>();
let limpiezaPendiente: ReturnType<typeof setTimeout> | null = null;
let esperaListo: ReturnType<typeof setTimeout> | null = null;
let esperaPrecarga: ReturnType<typeof setTimeout> | null = null;
const teclasAtendidas = new WeakSet<Event>();

const ESPERA_MAXIMA_APERTURA_MS = 4000;
/** Si el visor nuevo no avisa que está listo, se muestra de todos modos. */
const ESPERA_MAXIMA_LISTO_MS = 1500;
const RETRASO_PRECARGA_MS = 300;
const MAXIMO_PRECARGAS = 6;

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

function elementoParaAbrir(id: string, raiz: ParentNode): HTMLElement | null {
  const fila = filasDelExpediente(raiz).find((f) => f.dataset.documento === id);
  return fila?.querySelector<HTMLElement>('[data-abrir-documento]') ?? null;
}

/**
 * Cada visor abierto escucha el teclado; un mismo evento solo se atiende una vez
 * (true si es la primera vez que se ve).
 */
export function atenderTeclaUnaVez(evento: Event): boolean {
  if (teclasAtendidas.has(evento)) return false;
  teclasAtendidas.add(evento);
  return true;
}

function terminarNavegacion() {
  pendiente = null;
  navegandoHacia.value = null;
  escalaHeredada = null;
  if (limpiezaPendiente) clearTimeout(limpiezaPendiente);
  limpiezaPendiente = null;
  // Un cuadro después, para que el cambio ya esté aplicado sin animación
  requestAnimationFrame(() => {
    visorSinAnimacion.value = false;
  });
}

function descartarEntrante() {
  if (esperaListo) clearTimeout(esperaListo);
  esperaListo = null;
  const visor = entrante;
  entrante = null;
  visorEntrante.value = null;
  visor?.cerrar();
}

function programarPrecarga(id: string) {
  if (esperaPrecarga) clearTimeout(esperaPrecarga);
  esperaPrecarga = setTimeout(() => {
    esperaPrecarga = null;
    if (visorActual?.id === id && !pendiente) precargarVecinos(id);
  }, RETRASO_PRECARGA_MS);
}

/**
 * Un documento abrió su visor. Si llegó por navegación y hay otro visor en pantalla, queda oculto
 * hasta que avise con `visorListo`; si no, cierra el anterior en el mismo instante.
 */
export function registrarVisorAbierto(
  id: string,
  cerrar: () => void,
  escala?: () => EscalaVisor | null,
): void {
  if (destinosRebasados.delete(id)) {
    cerrar();
    return;
  }
  montarTodosLosAnios.value = true;
  cursor = id;

  if (pendiente === id && visorActual && visorActual.id !== id) {
    if (entrante && entrante.id !== id) descartarEntrante();
    entrante = { id, cerrar, escala };
    visorEntrante.value = id;
    if (esperaListo) clearTimeout(esperaListo);
    esperaListo = setTimeout(() => visorListo(id), ESPERA_MAXIMA_LISTO_MS);
    return;
  }

  const anterior = visorActual;
  visorActual = { id, cerrar, escala };
  if (anterior && anterior.id !== id) anterior.cerrar();
  if (pendiente) terminarNavegacion();
  programarPrecarga(id);
}

/** El visor que entra ya dibujó su contenido: se muestra y se retira el anterior. */
export function visorListo(id: string): void {
  if (!entrante || entrante.id !== id) return;
  if (esperaListo) clearTimeout(esperaListo);
  esperaListo = null;
  const anterior = visorActual;
  visorActual = entrante;
  entrante = null;
  visorEntrante.value = null;
  if (anterior && anterior.id !== id) anterior.cerrar();
  terminarNavegacion();
  programarPrecarga(id);
}

/** Un documento cerró su visor. */
export function registrarVisorCerrado(id: string): void {
  if (entrante?.id === id) {
    if (esperaListo) clearTimeout(esperaListo);
    esperaListo = null;
    entrante = null;
    visorEntrante.value = null;
  }
  if (visorActual?.id === id) {
    visorActual = null;
    // Se cerró el visor por completo (no fue un cambio de documento)
    if (!entrante && !pendiente) {
      precargas.clear();
      if (esperaPrecarga) clearTimeout(esperaPrecarga);
      esperaPrecarga = null;
    }
  }
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

/**
 * Un destino rebasado no pudo abrir y quiere mostrar su aviso: true si debe callarse
 * (el usuario ya siguió de largo).
 */
export function avisoDeDestinoRebasado(id: string): boolean {
  return destinosRebasados.delete(id);
}

export function navegacionPendiente(): string | null {
  return pendiente;
}

/** Zoom que el documento debe usar al abrirse por navegación (el del visor anterior), si aplica. */
export function escalaParaAbrir(id: string, tipo: EscalaVisor['tipo']): number | null {
  if (pendiente !== id || !escalaHeredada || escalaHeredada.tipo !== tipo) return null;
  return escalaHeredada.valor;
}

/** Pasa al documento vecino. Devuelve false si no hay vecino en esa dirección. */
export function irAlDocumento(direccion: 1 | -1, raiz: ParentNode = document): boolean {
  const desde = cursor ?? visorActual?.id ?? null;
  const destino = idVecino(desde, direccion, raiz);
  if (!destino) return false;
  const abrir = elementoParaAbrir(destino, raiz);
  if (!abrir) return false;

  // Si otro documento se estaba preparando, se deja de lado
  if (entrante) descartarEntrante();
  if (!pendiente) escalaHeredada = visorActual?.escala?.() ?? null;
  else if (pendiente !== destino) destinosRebasados.add(pendiente);
  // Si se regresa a un documento que se había rebasado y aún no responde, vuelve a contar
  destinosRebasados.delete(destino);

  cursor = destino;
  pendiente = destino;
  navegandoHacia.value = destino;
  direccionNavegacion.value = direccion;
  visorSinAnimacion.value = true;
  if (limpiezaPendiente) clearTimeout(limpiezaPendiente);
  // Si no llega a abrirse (p. ej. el PDF aún se genera), todo vuelve a la normalidad
  limpiezaPendiente = setTimeout(terminarNavegacion, ESPERA_MAXIMA_APERTURA_MS);
  abrir.click();
  return true;
}

// ---------------------------------------------------------------------------------------------
// Precarga de los documentos vecinos

let modoPrecarga = false;
const precargas = new Map<string, Promise<unknown>>();

/** La función de apertura lo consulta al empezar: si es true, solo debe descargar y guardar. */
export function enModoPrecarga(): boolean {
  return modoPrecarga;
}

export function hayPrecarga(url: string): boolean {
  return precargas.has(url);
}

export function guardarPrecarga(url: string, descarga: Promise<unknown>): void {
  descarga.catch(() => {}); // el error se atiende al abrir
  precargas.set(url, descarga);
  while (precargas.size > MAXIMO_PRECARGAS) {
    precargas.delete(precargas.keys().next().value as string);
  }
}

/** Descarga guardada para esa dirección (se entrega una sola vez). */
export function tomarPrecarga<T>(url: string): Promise<T> | null {
  const descarga = precargas.get(url) as Promise<T> | undefined;
  if (!descarga) return null;
  precargas.delete(url);
  return descarga;
}

/** Descarga por adelantado el documento anterior y el siguiente. */
export function precargarVecinos(desde: string, raiz: ParentNode = document): void {
  for (const direccion of [1, -1] as const) {
    const id = idVecino(desde, direccion, raiz);
    const abrir = id ? elementoParaAbrir(id, raiz) : null;
    if (!abrir) continue;
    modoPrecarga = true;
    try {
      abrir.click();
    } finally {
      modoPrecarga = false;
    }
  }
}

/** Estado inicial (al salir del expediente o cambiar de trabajador, y en pruebas). */
export function reiniciarNavegacionVisor(): void {
  visorActual = null;
  entrante = null;
  cursor = null;
  pendiente = null;
  escalaHeredada = null;
  for (const t of [limpiezaPendiente, esperaListo, esperaPrecarga]) if (t) clearTimeout(t);
  limpiezaPendiente = null;
  esperaListo = null;
  esperaPrecarga = null;
  precargas.clear();
  destinosRebasados.clear();
  modoPrecarga = false;
  visorSinAnimacion.value = false;
  montarTodosLosAnios.value = false;
  navegandoHacia.value = null;
  visorEntrante.value = null;
}
