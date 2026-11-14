import type { Directive } from 'vue';

/**
 * v-valor-de-partida="80" en un <input type="number">: con el campo vacío, la primera flecha
 * (teclado o flechitas del campo) pone ese valor en lugar de arrancar en el mínimo del rango.
 * Lo escrito a mano no se toca. Ver helpers/valorDePartida.ts.
 */

interface ConPartida extends HTMLInputElement {
  _partida?: number | null;
  _anterior?: string;
  _quitarPartida?: () => void;
}

const texto = (valor: number) => String(valor);

/** Escrito a mano o pegado: InputEvent con inputType de inserción o borrado. */
const esTecleado = (e: Event) =>
  typeof InputEvent !== 'undefined' &&
  e instanceof InputEvent &&
  !!e.inputType &&
  e.inputType !== 'insertReplacementText';

/**
 * Desde un campo vacío, las flechitas del navegador dan el mínimo (o el máximo); sin mínimo,
 * un paso desde 0. Cualquier otro valor viene de otra parte y no se toca.
 */
function loQueDanLasFlechitas(el: HTMLInputElement): boolean {
  const n = Number(el.value);
  if (el.min !== '' && n === Number(el.min)) return true;
  if (el.max !== '' && n === Number(el.max)) return true;
  if (el.min === '') {
    const paso = el.step && el.step !== 'any' ? Number(el.step) : 1;
    return Math.abs(Math.abs(n) - paso) < 1e-9;
  }
  return false;
}

export const vValorDePartida: Directive<ConPartida, number | null | undefined> = {
  mounted(el, { value }) {
    el._partida = value ?? null;
    el._anterior = el.value;

    const recordar = () => {
      el._anterior = el.value;
    };

    const alTeclear = (e: KeyboardEvent) => {
      if (el._partida == null || el.readOnly || el.disabled) return;
      if ((e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || el.value !== '') return;
      e.preventDefault();
      el.value = texto(el._partida);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };

    // En captura: corre antes que v-model / @input, que leen ya el valor corregido
    const alCambiar = (e: Event) => {
      if (
        el._partida != null &&
        el._anterior === '' &&
        el.value !== '' &&
        !esTecleado(e) &&
        loQueDanLasFlechitas(el)
      ) {
        // Flechitas del campo con el campo vacío: el navegador puso el mínimo
        el.value = texto(el._partida);
      }
      el._anterior = el.value;
    };

    el.addEventListener('focus', recordar);
    el.addEventListener('keydown', alTeclear);
    el.addEventListener('input', alCambiar, true);
    el._quitarPartida = () => {
      el.removeEventListener('focus', recordar);
      el.removeEventListener('keydown', alTeclear);
      el.removeEventListener('input', alCambiar, true);
    };
  },
  updated(el, { value }) {
    el._partida = value ?? null;
    // El valor pudo cambiar desde el componente (p. ej. copiar de la última exploración)
    if (document.activeElement !== el) el._anterior = el.value;
  },
  beforeUnmount(el) {
    el._quitarPartida?.();
  },
};
