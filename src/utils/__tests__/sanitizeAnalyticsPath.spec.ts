import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import {
  buildAnalyticsPageProperties,
  sanitizeAnalyticsPath,
} from '../sanitizeAnalyticsPath';

const Dummy = { template: '<div />' };

function createAnalyticsTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: Dummy },
      {
        path: '/auth',
        name: 'auth',
        component: Dummy,
        children: [
          {
            path: 'confirmar-cuenta/:token',
            name: 'confirm-account',
            component: Dummy,
          },
          {
            path: 'olvide-password',
            name: 'forgot-password',
            component: Dummy,
          },
          {
            path: 'olvide-password/:token',
            name: 'new-password',
            component: Dummy,
          },
        ],
      },
      {
        path: '/',
        component: Dummy,
        children: [
          { path: '', name: 'inicio', component: Dummy },
          { path: 'empresas', name: 'empresas', component: Dummy },
          {
            path: '/empresas/:idEmpresa/centros-trabajo',
            name: 'centros-trabajo',
            component: Dummy,
          },
          {
            path: '/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/trabajadores',
            name: 'trabajadores',
            component: Dummy,
          },
          {
            path: '/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/expediente-medico/:idTrabajador',
            name: 'expediente-medico',
            component: Dummy,
          },
          {
            path: '/crear-documento/:idEmpresa/:idCentroTrabajo/:idTrabajador/:tipoDocumento/:idDocumento?',
            name: 'crear-documento',
            component: Dummy,
          },
          {
            path: '/documento/:idDocumento',
            name: 'documento',
            component: Dummy,
          },
          {
            path: 'dashboard/:idEmpresa',
            name: 'dashboard-empresa',
            component: Dummy,
          },
        ],
      },
    ],
  });
}

const FORBIDDEN_VALUES = [
  'abc123empresa',
  'centroNoObjectId',
  'trabajador-xyz',
  'documento-999',
  'token-confirmacion-secreto',
  'token-reset-secreto',
  'notaMedica',
  'curp=ABCD',
  'foo=bar',
  '#seccion-clinica',
];

function expectSafeAnalyticsPayload(
  payload: { path: string; name: unknown },
  expectedPath: string,
  expectedName: string,
) {
  expect(payload.path).toBe(expectedPath);
  expect(payload.name).toBe(expectedName);
  for (const forbidden of FORBIDDEN_VALUES) {
    expect(payload.path).not.toContain(forbidden);
  }
}

describe('sanitizeAnalyticsPath', () => {
  it('sustituye IDs reales por el template de Vue Router', async () => {
    const router = createAnalyticsTestRouter();

    await router.push('/empresas/abc123empresa/centros-trabajo');
    expect(sanitizeAnalyticsPath(router.currentRoute.value)).toBe(
      '/empresas/:idEmpresa/centros-trabajo',
    );

    await router.push(
      '/empresas/abc123empresa/centros-trabajo/centroNoObjectId/trabajadores',
    );
    expect(sanitizeAnalyticsPath(router.currentRoute.value)).toBe(
      '/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/trabajadores',
    );

    await router.push(
      '/empresas/abc123empresa/centros-trabajo/centroNoObjectId/expediente-medico/trabajador-xyz',
    );
    expect(sanitizeAnalyticsPath(router.currentRoute.value)).toBe(
      '/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/expediente-medico/:idTrabajador',
    );

    await router.push(
      '/crear-documento/abc123empresa/centroNoObjectId/trabajador-xyz/notaMedica/documento-999',
    );
    expect(sanitizeAnalyticsPath(router.currentRoute.value)).toBe(
      '/crear-documento/:idEmpresa/:idCentroTrabajo/:idTrabajador/:tipoDocumento/:idDocumento?',
    );
  });

  it('no envía query strings ni fragments', async () => {
    const router = createAnalyticsTestRouter();
    await router.push({
      path: '/empresas/abc123empresa/centros-trabajo',
      query: { foo: 'bar', curp: 'ABCD' },
      hash: '#seccion-clinica',
    });

    const payload = buildAnalyticsPageProperties(router.currentRoute.value);
    expectSafeAnalyticsPayload(
      payload,
      '/empresas/:idEmpresa/centros-trabajo',
      'centros-trabajo',
    );
    expect(payload.path).not.toContain('?');
    expect(payload.path).not.toContain('#');
    expect(payload).not.toHaveProperty('query');
    expect(payload).not.toHaveProperty('fullPath');
  });

  it('nunca incluye el token real de confirmación de cuenta', async () => {
    const router = createAnalyticsTestRouter();
    await router.push('/auth/confirmar-cuenta/token-confirmacion-secreto');

    const payload = buildAnalyticsPageProperties(router.currentRoute.value);
    expectSafeAnalyticsPayload(
      payload,
      '/auth/confirmar-cuenta/:token',
      'confirm-account',
    );
  });

  it('nunca incluye el token real de recuperación de contraseña', async () => {
    const router = createAnalyticsTestRouter();
    await router.push('/auth/olvide-password/token-reset-secreto');

    const payload = buildAnalyticsPageProperties(router.currentRoute.value);
    expectSafeAnalyticsPayload(
      payload,
      '/auth/olvide-password/:token',
      'new-password',
    );
  });

  it('conserva rutas estáticas útiles', async () => {
    const router = createAnalyticsTestRouter();

    await router.push('/login');
    expect(buildAnalyticsPageProperties(router.currentRoute.value)).toEqual({
      path: '/login',
      name: 'login',
    });

    await router.push('/empresas');
    expect(buildAnalyticsPageProperties(router.currentRoute.value)).toEqual({
      path: '/empresas',
      name: 'empresas',
    });

    await router.push('/');
    expect(buildAnalyticsPageProperties(router.currentRoute.value)).toEqual({
      path: '/',
      name: 'inicio',
    });
  });

  it('no usa fullPath aunque venga en el objeto de ruta', () => {
    const payload = buildAnalyticsPageProperties({
      path: '/documento/documento-999',
      fullPath: '/documento/documento-999?curp=ABCD#seccion-clinica',
      hash: '#seccion-clinica',
      name: 'documento',
      params: { idDocumento: 'documento-999' },
      matched: [{ path: '/documento/:idDocumento' }],
    });

    expectSafeAnalyticsPayload(payload, '/documento/:idDocumento', 'documento');
  });
});
