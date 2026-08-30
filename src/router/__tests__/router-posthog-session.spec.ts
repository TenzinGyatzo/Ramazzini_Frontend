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
    expect(routerSource).toMatch(/resetPostHogIdentity\(\);\s*next\("\/login"\)/);
  });

  it('no captura fullPath en pageview ni pageleave', () => {
    expect(routerSource).not.toContain('to.fullPath');
    expect(routerSource).not.toContain('from.fullPath');
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
