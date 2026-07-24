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

function findAnchor(
  root: HTMLElement,
  legacyStep: number,
): HTMLElement | null {
  return root.querySelector(
    `[data-legacy-step="${legacyStep}"]`,
  ) as HTMLElement | null;
}

function focusFirstControl(anchor: HTMLElement): void {
  const el = anchor.querySelector(FOCUSABLE_SELECTOR) as HTMLElement | null;
  if (!el) return;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
}

/**
 * Centra el microstep en el panel scrolleable, un poco por encima del centro (~40%).
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

  const applyPinpoint = async (legacyStep: number | null) => {
    if (legacyStep == null || legacyStep <= 0) return;
    const root = unref(scrollRoot);
    if (!root) return;

    await nextTick();
    const anchor = findAnchor(root, legacyStep);
    if (!anchor) return;

    scrollAnchorTowardCenter(root, anchor);
    await nextTick();
    // No robar el focus si el usuario ya interactúa dentro del ancla (sync bidireccional).
    const active = document.activeElement;
    if (active instanceof Node && anchor.contains(active)) return;
    focusFirstControl(anchor);
  };

  const stopWatch = watch(
    () => steps.focusedLegacyStep,
    (legacyStep) => {
      void applyPinpoint(legacyStep);
    },
  );

  const onFocusIn = (event: FocusEvent) => {
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
    // Si ya hay pinpoint al montar la sección (click desde visualizador), aplicarlo.
    void applyPinpoint(steps.focusedLegacyStep);
  });

  onUnmounted(() => {
    const root = unref(scrollRoot);
    root?.removeEventListener('focusin', onFocusIn);
    stopWatch();
  });
}
