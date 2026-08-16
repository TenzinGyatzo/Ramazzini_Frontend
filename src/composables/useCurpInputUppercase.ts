import { nextTick, watch, type Ref } from 'vue';

/** Normaliza texto CURP: mayúsculas (RENAPO). */
export function normalizeCurpInput(value: string | null | undefined): string {
  return String(value ?? '').toUpperCase();
}

function captureActiveInputSelection(): {
  input: HTMLInputElement;
  start: number;
  end: number;
} | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement)) {
    return null;
  }

  const start = active.selectionStart;
  const end = active.selectionEnd;
  if (start === null || end === null) {
    return null;
  }

  return { input: active, start, end };
}

function restoreInputSelection(
  input: HTMLInputElement,
  start: number,
  end: number,
): void {
  void nextTick(() => {
    if (document.activeElement !== input) {
      return;
    }

    try {
      input.setSelectionRange(start, end);
    } catch {
      // El input puede haber sido desmontado o no aceptar selección.
    }
  });
}

/** Aplica mayúsculas conservando la posición del cursor si el input tiene foco. */
function applyCurpUppercasePreservingCursor(
  normalized: string,
  apply: (value: string) => void,
): void {
  const selection = captureActiveInputSelection();
  apply(normalized);

  if (selection) {
    restoreInputSelection(selection.input, selection.start, selection.end);
  }
}

/** Convierte a mayúsculas al tipear o pegar en un ref de CURP. */
export function useCurpInputUppercase(curpRef: Ref<string>): void {
  watch(curpRef, (val) => {
    const normalized = normalizeCurpInput(val);
    if (val !== normalized) {
      applyCurpUppercasePreservingCursor(normalized, (value) => {
        curpRef.value = value;
      });
    }
  });
}

/** Igual que arriba para CURP en objeto reactivo (p. ej. formulario firmante). */
export function useCurpFieldUppercase(
  getCurp: () => string,
  setCurp: (value: string) => void,
): void {
  watch(getCurp, (val) => {
    const normalized = normalizeCurpInput(val);
    if (val !== normalized) {
      applyCurpUppercasePreservingCursor(normalized, setCurp);
    }
  });
}
