import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const routerSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../index.ts'),
  'utf8',
);

describe('terminación de sesión en el router', () => {
  it('resetea PostHog en el catch que redirige a /login', () => {
    expect(routerSource).toContain(
      'import { resetPostHogIdentity } from "@/utils/posthogIdentity"',
    );
    expect(routerSource).toContain('resetSessionScopedState()');
    // El login recibe la ruta de regreso; PostHog la ve sin consulta (sanitizePosthogEvent)
    expect(routerSource).toMatch(
      /resetPostHogIdentity\(\);[\s\S]{0,200}next\(urlLoginConRegreso\(to\.fullPath\)\)/,
    );
  });

  it('no captura fullPath en pageview ni pageleave', () => {
    // fullPath solo se permite para la ruta de regreso del login, nunca en la analítica
    const usosDeFullPath = routerSource
      .split('\n')
      .filter((linea) => linea.includes('fullPath'));
    expect(usosDeFullPath.every((linea) => linea.includes('urlLoginConRegreso('))).toBe(true);
    expect(routerSource).not.toMatch(/posthog\.capture\([^)]*fullPath/);
    expect(routerSource).toContain('buildAnalyticsPageProperties(to)');
    expect(routerSource).toContain('buildAnalyticsPageProperties(from)');
  });

  it('registra el router para before_send antes de inicializar PostHog', () => {
    const registerIdx = routerSource.indexOf('registerAnalyticsRouter(router)');
    const initIdx = routerSource.indexOf('usePostHog()');
    expect(registerIdx).toBeGreaterThan(-1);
    expect(initIdx).toBeGreaterThan(registerIdx);
  });
});
