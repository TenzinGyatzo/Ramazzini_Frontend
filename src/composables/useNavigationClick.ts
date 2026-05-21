import { useRouter, type RouteLocationRaw } from 'vue-router';

/** Clic modificado: nueva pestaña, ventana o navegación auxiliar del navegador. */
export function isModifiedNavigation(event: MouseEvent): boolean {
  return (
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey ||
    event.button === 1
  );
}

/** Solo interceptar clic izquiero normal para validaciones SPA. */
export function shouldInterceptNavigation(event: MouseEvent): boolean {
  return event.type === 'click' && !isModifiedNavigation(event);
}

export function useNavigationClick() {
  const router = useRouter();

  function resolveHref(to: RouteLocationRaw): string {
    return router.resolve(to).href;
  }

  return {
    isModifiedNavigation,
    shouldInterceptNavigation,
    resolveHref,
  };
}
