const MEDIA_QUERY = '(min-width: 768px)';

let enabled =
  typeof window !== 'undefined' ? window.matchMedia(MEDIA_QUERY).matches : true;

let cleanup: (() => void) | null = null;

export function isExpedienteTooltipEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return enabled;
}

export function initExpedienteTooltipViewportListener(): () => void {
  if (typeof window === 'undefined') return () => {};

  if (cleanup) {
    cleanup();
  }

  const mediaQueryList = window.matchMedia(MEDIA_QUERY);
  const sync = () => {
    enabled = mediaQueryList.matches;
  };

  sync();
  mediaQueryList.addEventListener('change', sync);

  cleanup = () => {
    mediaQueryList.removeEventListener('change', sync);
    cleanup = null;
  };

  return cleanup;
}

export function useExpedienteTooltipEnabled() {
  return {
    isExpedienteTooltipEnabled,
    initExpedienteTooltipViewportListener,
  };
}
