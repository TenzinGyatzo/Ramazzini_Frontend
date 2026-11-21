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
}

const CONTROLES = 'input:not([type="hidden"]), select, textarea';

export function esControlDeCaptura(el: EventTarget | null): el is HTMLElement {
  return el instanceof HTMLElement && el.matches(CONTROLES) && !el.matches('[disabled]');
}

export function recordarCampo(el: HTMLElement, seccion: number): CampoRecordado {
  const input = el as HTMLInputElement;
  return {
    seccion,
    id: el.id || '',
    name: input.name || '',
    value: input.value ?? '',
    type: input.type || el.tagName.toLowerCase(),
    campo: el.closest('[data-campo]')?.getAttribute('data-campo')?.split(/\s+/)[0] ?? '',
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
  return null;
}
