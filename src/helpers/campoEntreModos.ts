/**
 * Punto 39: al cambiar entre «Captura rápida» y «Con vista previa» se sigue en el mismo campo.
 * Los dos modos montan los mismos componentes de sección, así que el campo se vuelve a encontrar
 * por su id, por su grupo de opciones (radios) o por su marca `data-campo`.
 */
import { selectorCampo } from '@/helpers/enfocarCampo';

export interface CampoRecordado {
  /** Sección (número de paso del asistente) donde está el campo. */
  seccion: number;
  id: string;
  name: string;
  value: string;
  type: string;
  campo: string;
  /** Sub-paso (pregunta) donde está, para que el asistente apunte ahí y no a la primera. */
  legacyStep: number | null;
  /** Lugar del control dentro de su pregunta (-1 sin control): para casillas sin id ni nombre. */
  indice: number;
}

const CONTROLES = 'input:not([type="hidden"]), select, textarea';

export function esControlDeCaptura(el: EventTarget | null): el is HTMLElement {
  return el instanceof HTMLElement && el.matches(CONTROLES) && !el.matches('[disabled]');
}

/**
 * El control al que va un clic: el mismo control, o el de la etiqueta que se tocó (los botones
 * No/Sí son etiquetas con el radio oculto, y el clic en la etiqueta no siempre lo enfoca).
 */
export function controlDelClic(objetivo: EventTarget | null): HTMLElement | null {
  if (!(objetivo instanceof Element)) return null;
  if (esControlDeCaptura(objetivo)) return objetivo;
  const control = objetivo.closest('label')?.control ?? null;
  return esControlDeCaptura(control) ? control : null;
}

/** Los controles de una pregunta, en orden de pantalla. */
const controlesDe = (raiz: ParentNode): HTMLElement[] =>
  Array.from(raiz.querySelectorAll<HTMLElement>(CONTROLES)).filter((c) => !c.matches('[disabled]'));

/**
 * Lo que se recuerda de un clic o del cursor: la pregunta (sub-paso) y, si lo hay, el control
 * exacto. Un clic en el texto de la pregunta (sin control) también cuenta: es lo que el
 * asistente resalta en azul. Sin pregunta ni control, null.
 */
export function recordarDesde(objetivo: EventTarget | null, seccion: number): CampoRecordado | null {
  if (!(objetivo instanceof Element)) return null;
  const control = controlDelClic(objetivo);
  const pregunta = (control ?? objetivo).closest('[data-legacy-step]');
  if (!control && !pregunta) return null;
  const legacyStep = Number(pregunta?.getAttribute('data-legacy-step')) || null;
  if (!control) {
    return { seccion, legacyStep, indice: -1, id: '', name: '', value: '', type: '', campo: '' };
  }
  return recordarCampo(control, seccion);
}

export function recordarCampo(el: HTMLElement, seccion: number): CampoRecordado {
  const input = el as HTMLInputElement;
  const pregunta = el.closest('[data-legacy-step]');
  return {
    seccion,
    id: el.id || '',
    name: input.name || '',
    value: input.value ?? '',
    type: input.type || el.tagName.toLowerCase(),
    campo: el.closest('[data-campo]')?.getAttribute('data-campo')?.split(/\s+/)[0] ?? '',
    legacyStep: Number(pregunta?.getAttribute('data-legacy-step')) || null,
    indice: pregunta ? controlesDe(pregunta).indexOf(el) : -1,
  };
}

const escapar = (s: string) =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&');

const visible = (el: Element | null): el is HTMLElement =>
  el instanceof HTMLElement && el.getClientRects().length > 0;

/** El mismo campo en la pantalla actual, o null si todavía no está (o ya no existe). */
export function buscarCampo(r: CampoRecordado, raiz: ParentNode = document): HTMLElement | null {
  if (r.type === 'radio' && r.name) {
    const nombre = escapar(r.name);
    const mismo = raiz.querySelector(`input[type="radio"][name="${nombre}"][value="${escapar(r.value)}"]`);
    if (visible(mismo)) return mismo;
    const marcado = raiz.querySelector(`input[type="radio"][name="${nombre}"]:checked`);
    if (visible(marcado)) return marcado;
  }
  if (r.id) {
    const porId = raiz.querySelector(`#${escapar(r.id)}`);
    if (visible(porId)) return porId;
  }
  if (r.campo) {
    const contenedor = raiz.querySelector(selectorCampo(r.campo));
    if (contenedor) {
      const control = contenedor.matches(CONTROLES) ? contenedor : contenedor.querySelector(CONTROLES);
      if (visible(control)) return control;
    }
  }
  if (r.indice >= 0) {
    const pregunta = buscarPregunta(r, raiz);
    const control = pregunta ? controlesDe(pregunta)[r.indice] ?? null : null;
    if (visible(control)) return control;
  }
  return null;
}

/** La pregunta (sub-paso) recordada en la pantalla actual, o null. */
export function buscarPregunta(r: CampoRecordado, raiz: ParentNode = document): HTMLElement | null {
  if (!r.legacyStep) return null;
  const pregunta = raiz.querySelector(`[data-legacy-step="${r.legacyStep}"]`);
  return visible(pregunta) ? pregunta : null;
}

/** El primer contenedor con desplazamiento propio que tiene al elemento, o null (la página). */
function contenedorConScroll(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p;
  }
  return null;
}

/**
 * Lo que se acomoda en pantalla: la pregunta completa (su sub-paso, con etiqueta y ayuda) si
 * cabe con holgura en el panel; si no, solo el campo.
 */
function bloqueDelCampo(el: HTMLElement, altoPanel: number): HTMLElement {
  const pregunta = el.closest<HTMLElement>('[data-legacy-step]');
  return pregunta && pregunta.getBoundingClientRect().height <= altoPanel * 0.6 ? pregunta : el;
}

/**
 * Deja el campo a la vista para seguir capturando: su pregunta centrada en su panel (el área de
 * captura rápida o el panel de la sección con vista previa) y, en la página, solo lo necesario
 * para que se vea (sin mandar arriba el encabezado del asistente). Sin panel, centrada en la página.
 */
export function acomodarCampo(el: HTMLElement): void {
  const panel = contenedorConScroll(el);
  if (!panel) {
    bloqueDelCampo(el, window.innerHeight).scrollIntoView({ block: 'center' });
    return;
  }
  const bloque = bloqueDelCampo(el, panel.clientHeight);
  const r = bloque.getBoundingClientRect();
  const p = panel.getBoundingClientRect();
  const destino = panel.scrollTop + (r.top - p.top) - (panel.clientHeight - r.height) / 2;
  panel.scrollTop = Math.max(0, Math.min(destino, panel.scrollHeight - panel.clientHeight));
  bloque.scrollIntoView({ block: 'nearest' });
}

/** Si la pregunta del campo se ve completa dentro de su panel y de la ventana. */
export function campoALaVista(el: HTMLElement): boolean {
  const panel = contenedorConScroll(el);
  const r = bloqueDelCampo(el, panel?.clientHeight ?? window.innerHeight).getBoundingClientRect();
  const p = panel?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
  return r.top >= Math.max(0, p.top) - 1 && r.bottom <= Math.min(window.innerHeight, p.bottom) + 1;
}
