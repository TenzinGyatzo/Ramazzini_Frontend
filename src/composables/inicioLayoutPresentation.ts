export function resolveInicioLayoutPresentation(input: {
  routeName: unknown;
  hasActivity: boolean;
  hasTrabajadores?: boolean;
  hasError: boolean;
  userId?: string | null;
  loading: boolean;
  lastFetchedAt: number | null;
}) {
  const isHomeRoute = input.routeName === 'inicio';
  const showInicioHub =
    isHomeRoute && (input.hasActivity || Boolean(input.hasTrabajadores));
  const isInicioLoading =
    isHomeRoute &&
    Boolean(input.userId) &&
    !input.hasActivity &&
    !input.hasTrabajadores &&
    !input.hasError &&
    (input.loading || input.lastFetchedAt === null);
  const showWelcomeHome = isHomeRoute && !showInicioHub && !isInicioLoading;
  const showCompactLogo = !isHomeRoute;

  return {
    isHomeRoute,
    showInicioHub,
    isInicioLoading,
    showWelcomeHome,
    showCompactLogo,
    showNmBanner: !showInicioHub,
  };
}
