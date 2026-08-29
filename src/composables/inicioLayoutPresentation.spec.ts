import { describe, expect, it } from 'vitest';
import { resolveInicioLayoutPresentation } from './inicioLayoutPresentation';

describe('LayOut — presentación Inicio', () => {
  const loading = {
    routeName: 'inicio',
    hasActivity: false,
    hasError: false,
    userId: 'u1',
    loading: true,
    lastFetchedAt: null as number | null,
  };

  it('en carga no muestra Brand grande ni logo compacto', () => {
    const view = resolveInicioLayoutPresentation(loading);
    expect(view.isInicioLoading).toBe(true);
    expect(view.showWelcomeHome).toBe(false);
    expect(view.showInicioHub).toBe(false);
    expect(view.showCompactLogo).toBe(false);
  });

  it('en hub oculta ambos logos y el banner de notas médicas', () => {
    const view = resolveInicioLayoutPresentation({
      ...loading,
      hasActivity: true,
      loading: false,
      lastFetchedAt: Date.now(),
    });
    expect(view.showInicioHub).toBe(true);
    expect(view.showWelcomeHome).toBe(false);
    expect(view.showCompactLogo).toBe(false);
    expect(view.showNmBanner).toBe(false);
  });

  it('en bienvenida muestra Brand grande y permite el banner', () => {
    const view = resolveInicioLayoutPresentation({
      ...loading,
      loading: false,
      lastFetchedAt: Date.now(),
    });
    expect(view.showWelcomeHome).toBe(true);
    expect(view.showCompactLogo).toBe(false);
    expect(view.showNmBanner).toBe(true);
  });

  it('el hub vacío con trabajadores no es bienvenida', () => {
    const view = resolveInicioLayoutPresentation({
      ...loading,
      hasActivity: false,
      hasTrabajadores: true,
      loading: false,
      lastFetchedAt: Date.now(),
    });
    expect(view.showInicioHub).toBe(true);
    expect(view.showWelcomeHome).toBe(false);
    expect(view.isInicioLoading).toBe(false);
    expect(view.showNmBanner).toBe(false);
  });

  it('en otras rutas muestra logo compacto y el banner puede aparecer', () => {
    const view = resolveInicioLayoutPresentation({
      routeName: 'empresas',
      hasActivity: true,
      hasError: false,
      userId: 'u1',
      loading: false,
      lastFetchedAt: Date.now(),
    });
    expect(view.showCompactLogo).toBe(true);
    expect(view.showWelcomeHome).toBe(false);
    expect(view.showInicioHub).toBe(false);
    expect(view.showNmBanner).toBe(true);
  });
});
