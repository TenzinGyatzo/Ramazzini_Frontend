import { ref, type MaybeRefOrGetter, type Ref } from 'vue';
import { toValue } from 'vue';
import { useEscapeToClose } from '@/composables/useEscapeToClose';

const PULSE_DURATION_MS = 80;

interface UseModalDirtyGuardOptions {
  isDirty: Ref<boolean>;
  onClose: () => void;
  enabled?: MaybeRefOrGetter<boolean>;
  /** Si se define, controla cuándo Esc se captura (p. ej. mientras el modal está abierto). Por defecto usa `enabled`. */
  escapeActive?: MaybeRefOrGetter<boolean>;
  onEscapeWhenDisabled?: () => void;
}

export function useModalDirtyGuard(options: UseModalDirtyGuardOptions) {
  const showDiscardConfirm = ref(false);
  const dismissPulse = ref(false);
  let pulseTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingDiscardAction: (() => void) | null = null;

  const isEnabled = () => toValue(options.enabled ?? true);

  const clearPendingDiscardAction = () => {
    pendingDiscardAction = null;
  };

  const triggerDismissPulse = () => {
    dismissPulse.value = true;

    if (pulseTimeout) {
      clearTimeout(pulseTimeout);
    }

    pulseTimeout = setTimeout(() => {
      dismissPulse.value = false;
    }, PULSE_DURATION_MS);
  };

  const forceClose = () => {
    showDiscardConfirm.value = false;
    dismissPulse.value = false;
    clearPendingDiscardAction();
    options.onClose();
  };

  const resolveDiscardAction = (onDiscard?: unknown) =>
    typeof onDiscard === 'function' ? (onDiscard as () => void) : undefined;

  const requestDismiss = (onDiscard?: unknown) => {
    if (!isEnabled()) return;

    if (showDiscardConfirm.value) return;

    const discardAction = resolveDiscardAction(onDiscard);

    if (!options.isDirty.value) {
      if (discardAction) {
        discardAction();
        return;
      }

      forceClose();
      return;
    }

    pendingDiscardAction = discardAction ?? null;
    triggerDismissPulse();
    showDiscardConfirm.value = true;
  };

  const continueEditing = () => {
    showDiscardConfirm.value = false;
    clearPendingDiscardAction();
  };

  const confirmDiscard = () => {
    const discardAction = pendingDiscardAction;
    clearPendingDiscardAction();
    showDiscardConfirm.value = false;
    dismissPulse.value = false;

    if (discardAction) {
      discardAction();
      return;
    }

    options.onClose();
  };

  const handleEscape = () => {
    if (!isEnabled()) {
      options.onEscapeWhenDisabled?.();
      return;
    }

    if (showDiscardConfirm.value) {
      continueEditing();
      return;
    }

    requestDismiss();
  };

  const isEscapeActive = () =>
    options.escapeActive !== undefined
      ? toValue(options.escapeActive)
      : toValue(options.enabled ?? true);

  useEscapeToClose(handleEscape, isEscapeActive);

  return {
    showDiscardConfirm,
    dismissPulse,
    requestDismiss,
    forceClose,
    continueEditing,
    confirmDiscard,
  };
}
