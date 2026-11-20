import { inject, unref, type InjectionKey, type Ref } from 'vue';

/**
 * La captura rápida está en curso (punto 38): los pasos no ponen el cursor al montarse (todos
 * se montan a la vez y competirían) y las secciones no limitan su altura.
 */
export const CAPTURA_RAPIDA_KEY: InjectionKey<Readonly<Ref<boolean>> | boolean> =
  Symbol('capturaRapida');

/** ¿El componente se montó dentro de la captura rápida? (Al cambiar de modo, los pasos se vuelven a montar.) */
export function enCapturaRapida(): boolean {
  return unref(inject(CAPTURA_RAPIDA_KEY, false)) === true;
}
