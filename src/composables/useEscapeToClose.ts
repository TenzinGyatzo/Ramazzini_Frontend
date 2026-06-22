import { onMounted, onUnmounted, type MaybeRefOrGetter } from 'vue';
import { toValue } from 'vue';

export function useEscapeToClose(
  onClose: () => void,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const handler = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (!toValue(enabled)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    onClose();
  };

  onMounted(() => {
    document.addEventListener('keydown', handler, { capture: true });
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', handler, { capture: true });
  });
}
