import {
  type Ref,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  unref,
} from 'vue';
import { useStepsStore } from '@/stores/steps';

const FOCUSABLE_SELECTOR =
  'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Preferir campo de texto (detalle ya redactado) sobre chips Sí/No. */
const TEXT_FOCUS_SELECTOR =
  'textarea:not([disabled]), input:not([disabled]):not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="radio"]):not([type="checkbox"])';

function findAnchor(
  root: HTMLElement,
  legacyStep: number,
): HTMLElement | null {
  return root.querySelector(
    `[data-legacy-step="${legacyStep}"]`,
  ) as HTMLElement | null;
}

function focusElement(el: HTMLElement): void {
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
}

/**
 * Espera a que exista textarea/input (hidratación Si en onMounted del Step)
 * y enfoca una sola vez. Evita enfocar chips intermedios (dispara focusin en cascada).
 */
async function focusBestControl(
  anchor: HTMLElement,
  isStale: () => boolean,
): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt++) {
    if (isStale()) return;

    const text = anchor.querySelector(
      TEXT_FOCUS_SELECTOR,
    ) as HTMLElement | null;
    if (text) {
      // Ya escribe el usuario en este campo: no reenfocar.
      const active = document.activeElement;
      if (active === text) return;
      focusElement(text);
      return;
    }

    if (attempt === 0) await nextTick();
    else if (attempt === 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    } else {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 40);
      });
    }
  }

  if (isStale()) return;
  const fallback = anchor.querySelector(
    FOCUSABLE_SELECTOR,
  ) as HTMLElement | null;
  if (fallback) focusElement(fallback);
}

/**
 * Centra el microstep en el panel scrolleable, un poco por encima del centro.
 * Solo mueve `root` (no el scroll de la página).
 */
function scrollAnchorTowardCenter(root: HTMLElement, anchor: HTMLElement): void {
  const rootRect = root.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const anchorTopInContent =
    anchorRect.top - rootRect.top + root.scrollTop;
  const anchorMid = anchorTopInContent + anchorRect.height / 2;
  const targetFromTop = root.clientHeight * 0.3;
  const maxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
  const nextTop = Math.min(
    maxScroll,
    Math.max(0, anchorMid - targetFromTop),
  );
  root.scrollTo({ top: nextTop, behavior: 'smooth' });
}

/**
 * Scroll + focus al microstep pinneado, y sync bidireccional vía focusin.
 * Montar en cada *SectionStep.vue pasando el contenedor scrolleable.
 */
export function useSectionPinpoint(
  scrollRoot: Ref<HTMLElement | null | undefined>,
) {
  const steps = useStepsStore();

  /** Ignorar focusin mientras aplicamos pinpoint programático (evita bucles). */
  let suppressFocusin = false;
  /** Cancela applies en vuelo cuando cambia el target. */
  let applyGeneration = 0;

  const applyPinpoint = async (legacyStep: number | null) => {
    const generation = ++applyGeneration;
    const isStale = () => generation !== applyGeneration;

    if (legacyStep == null || legacyStep <= 0) return;
    const root = unref(scrollRoot);
    if (!root) return;

    await nextTick();
    if (isStale()) return;

    const anchor = findAnchor(root, legacyStep);
    if (!anchor) return;

    scrollAnchorTowardCenter(root, anchor);
    await nextTick();
    if (isStale()) return;

    const active = document.activeElement;
    if (
      active instanceof Element &&
      anchor.contains(active) &&
      active.matches(TEXT_FOCUS_SELECTOR)
    ) {
      return;
    }

    suppressFocusin = true;
    try {
      await focusBestControl(anchor, isStale);
    } finally {
      // Liberar tras el tick de focusin síncrono.
      await nextTick();
      suppressFocusin = false;
    }
  };

  const stopWatch = watch(
    () => steps.focusedLegacyStep,
    (legacyStep) => {
      void applyPinpoint(legacyStep);
    },
  );

  const onFocusIn = (event: FocusEvent) => {
    if (suppressFocusin) return;
    const root = unref(scrollRoot);
    if (!root) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest('[data-legacy-step]');
    if (!anchor || !root.contains(anchor)) return;
    const raw = anchor.getAttribute('data-legacy-step');
    const n = raw != null ? Number(raw) : NaN;
    if (!Number.isFinite(n) || n <= 0) return;
    if (steps.focusedLegacyStep !== n) {
      steps.setPinpoint(n);
    }
  };

  onMounted(() => {
    const root = unref(scrollRoot);
    root?.addEventListener('focusin', onFocusIn);
    void applyPinpoint(steps.focusedLegacyStep);
  });

  onUnmounted(() => {
    applyGeneration += 1;
    suppressFocusin = false;
    const root = unref(scrollRoot);
    root?.removeEventListener('focusin', onFocusIn);
    stopWatch();
  });
}
