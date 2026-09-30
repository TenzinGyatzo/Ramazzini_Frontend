import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const routerSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../index.ts'),
  'utf8',
);

describe('«Ver planes» solo con pago en línea habilitado', () => {
  it('la ruta de planes exige el permiso y sin él lleva a «Mi Suscripción»', () => {
    expect(routerSource).toMatch(
      /name: "subscription",\s*component: [^\n]+\n\s*meta: \{ requiresPagoEnLinea: true \}/,
    );
    expect(routerSource).toMatch(
      /if \(!proveedorSaludStore\.pagoEnLineaHabilitado\) \{\s*return next\(\{ name: "suscripcion-activa" \}\);/,
    );
  });

  it('«Mi Suscripción» y la página de pago exitoso no dependen del permiso', () => {
    const activa = routerSource.slice(routerSource.indexOf('name: "suscripcion-activa"'));
    expect(activa.slice(0, activa.indexOf('}'))).not.toContain('requiresPagoEnLinea');
    const exito = routerSource.slice(routerSource.indexOf('name: "subscription-success"'));
    expect(exito.slice(0, exito.indexOf('}'))).not.toContain('requiresPagoEnLinea');
  });
});
