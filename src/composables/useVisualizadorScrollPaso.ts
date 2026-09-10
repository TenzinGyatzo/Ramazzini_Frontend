import {
  type MaybeRefOrGetter,
  type Ref,
  nextTick,
  toValue,
  watch,
} from 'vue';

function escapeAttr(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function scrollVisualizadorAPaso(
  root: HTMLElement | null | undefined,
  paso: string | number | null | undefined,
): boolean {
  if (!root || paso == null || paso === '') return false;
  const key = String(paso);
  if (!key || key === '0') return false;
  const anchor = root.querySelector(
    `[data-paso="${escapeAttr(key)}"]`,
  ) as HTMLElement | null;
  if (!anchor) return false;
  const offset = anchor.getBoundingClientRect().top - root.getBoundingClientRect().top;
  root.scrollTo({
    top: Math.max(0, root.scrollTop + offset - 8),
    behavior: 'smooth',
  });
  return true;
}

/**
 * Scroll suave del visualizador hacia el bloque del paso activo (`data-paso`).
 * No corre en el montaje inicial para no animar al abrir el documento.
 */
export function useVisualizadorScrollPaso(
  scrollRoot: Ref<HTMLElement | null | undefined>,
  getPaso: MaybeRefOrGetter<string | number | null | undefined>,
) {
  watch(
    () => toValue(getPaso),
    (paso) => {
      nextTick(() => scrollVisualizadorAPaso(scrollRoot.value, paso));
    },
  );
}
