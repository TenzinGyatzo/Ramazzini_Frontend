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
  opts?: { allowButtonFallback?: boolean },
): Promise<void> {
  const allowButtonFallback = opts?.allowButtonFallback !== false;

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

  if (isStale() || !allowButtonFallback) return;
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

function waitForPointerIdle(root: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      root.removeEventListener('pointerup', done, true);
      root.removeEventListener('pointercancel', done, true);
      window.clearTimeout(timeoutId);
      // Un frame extra: el click se despacha justo después de pointerup.
      requestAnimationFrame(() => resolve());
    };
    root.addEventListener('pointerup', done, true);
    root.addEventListener('pointercancel', done, true);
    const timeoutId = window.setTimeout(done, 320);
  });
}

/**
 * Scroll + focus al microstep pinneado, y sync bidireccional vía focusin/pointerdown.
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
  /** Pointer activo dentro del panel (evita scroll que cancela el click del chip). */
  let pointersDown = 0;

  const pinFromTarget = (target: EventTarget | null) => {
    const root = unref(scrollRoot);
    if (!root || !(target instanceof Element)) return;
    const anchor = target.closest('[data-legacy-step]');
    if (!anchor || !root.contains(anchor)) return;
    const raw = anchor.getAttribute('data-legacy-step');
    const n = raw != null ? Number(raw) : NaN;
    if (!Number.isFinite(n) || n <= 0) return;
    if (steps.focusedLegacyStep !== n) {
      steps.setPinpoint(n);
    }
  };

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

    const active = document.activeElement;
    const activeInAnchor =
      active instanceof Element && anchor.contains(active);
    const deferForUserGesture = pointersDown > 0 || activeInAnchor;

    /**
     * Si el usuario está en medio de un gesto (chip Sí/No) o ya enfocó este
     * microstep, diferir scroll/focus hasta liberar el pointer. Scroll durante
     * mousedown→mouseup cancela el click; no diferir también pierde el
     * autoscroll al abrir el input de «Sí».
     */
    if (deferForUserGesture) {
      if (pointersDown > 0) {
        await waitForPointerIdle(root);
      } else {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 0);
        });
      }
      if (isStale()) return;
    }

    const liveRoot = unref(scrollRoot);
    if (!liveRoot) return;
    const liveAnchor = findAnchor(liveRoot, legacyStep);
    if (!liveAnchor) return;

    scrollAnchorTowardCenter(liveRoot, liveAnchor);
    await nextTick();
    if (isStale()) return;

    suppressFocusin = true;
    try {
      // Tras un click en chip, preferir el input de texto; no robar foco a botones.
      await focusBestControl(liveAnchor, isStale, {
        allowButtonFallback: !deferForUserGesture,
      });
    } finally {
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
    pinFromTarget(event.target);
  };

  const onPointerDownCapture = (event: PointerEvent) => {
    pointersDown += 1;
    pinFromTarget(event.target);
  };

  const onPointerUpCapture = () => {
    pointersDown = Math.max(0, pointersDown - 1);
  };

  onMounted(() => {
    const root = unref(scrollRoot);
    root?.addEventListener('focusin', onFocusIn);
    root?.addEventListener('pointerdown', onPointerDownCapture, true);
    root?.addEventListener('pointerup', onPointerUpCapture, true);
    root?.addEventListener('pointercancel', onPointerUpCapture, true);
    void applyPinpoint(steps.focusedLegacyStep);
  });

  onUnmounted(() => {
    applyGeneration += 1;
    suppressFocusin = false;
    pointersDown = 0;
    const root = unref(scrollRoot);
    root?.removeEventListener('focusin', onFocusIn);
    root?.removeEventListener('pointerdown', onPointerDownCapture, true);
    root?.removeEventListener('pointerup', onPointerUpCapture, true);
    root?.removeEventListener('pointercancel', onPointerUpCapture, true);
    stopWatch();
  });
}
