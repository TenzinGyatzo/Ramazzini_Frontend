import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Ref sincronizada con `document.documentElement.classList.contains('dark-mode')`
 * (MutationObserver para reaccionar al toggle de tema sin recargar).
 */
export function useHtmlDarkMode() {
  const isDark = ref(
    typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark-mode'),
  );

  const sync = () => {
    isDark.value =
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark-mode');
  };

  onMounted(() => {
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    onUnmounted(() => observer.disconnect());
  });

  return isDark;
}
