import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import {
  registerAnalyticsRouter,
  sanitizeAnalyticsUrl,
  sanitizePosthogCapture,
  sanitizeRawPathname,
  sanitizeReferrer,
  UNMATCHED_ANALYTICS_PATH,
} from '../sanitizePosthogEvent';

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
            path: '/documento/:idDocumento',
            name: 'documento',
            component: Dummy,
          },
        ],
      },
    ],
  });
}

const TOKEN = 'TOKEN_FICTICIO_NO_REAL';
const ID_EMPRESA = 'abc123empresa';
const ID_CENTRO = 'centroNoObjectId';
const RAW_TRABAJADORES = `/empresas/${ID_EMPRESA}/centros-trabajo/${ID_CENTRO}/trabajadores`;
const RAW_TOKEN_PATH = `/auth/olvide-password/${TOKEN}`;

function expectNoSecrets(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain(TOKEN);
  expect(serialized).not.toContain(ID_EMPRESA);
  expect(serialized).not.toContain(ID_CENTRO);
  expect(serialized).not.toContain('foo=bar');
  expect(serialized).not.toContain('#seccion');
}

describe('sanitizePosthogEvent', () => {
  beforeEach(() => {
    registerAnalyticsRouter(createAnalyticsTestRouter());
  });

  describe('$current_url', () => {
    it('sustituye IDs reales por template y elimina query/hash', () => {
      const sanitized = sanitizeAnalyticsUrl(
        `https://ramazzini.app${RAW_TRABAJADORES}?foo=bar#seccion`,
      );
      expect(sanitized).toBe(
        'https://ramazzini.app/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/trabajadores',
      );
      expectNoSecrets(sanitized);
    });

    it('elimina el token real', () => {
      const sanitized = sanitizeAnalyticsUrl(
        `https://ramazzini.app${RAW_TOKEN_PATH}?foo=bar#x`,
      );
      expect(sanitized).toBe(
        'https://ramazzini.app/auth/olvide-password/:token',
      );
      expectNoSecrets(sanitized);
    });
  });

  describe('$pathname', () => {
    it('sustituye IDs reales por template', () => {
      expect(sanitizeRawPathname(RAW_TRABAJADORES)).toBe(
        '/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/trabajadores',
      );
    });

    it('elimina el token real', () => {
      expect(sanitizeRawPathname(RAW_TOKEN_PATH)).toBe(
        '/auth/olvide-password/:token',
      );
      expect(sanitizeRawPathname(RAW_TOKEN_PATH)).not.toContain(TOKEN);
    });
  });

  describe('$prev_pageview_pathname', () => {
    it('sanitiza el valor recibido (ruta anterior), no la ruta actual', () => {
      const event = sanitizePosthogCapture({
        event: '$pageview',
        properties: {
          path: '/empresas',
          $pathname: '/empresas',
          $prev_pageview_pathname: RAW_TOKEN_PATH,
        },
      });

      expect(event?.properties?.$pathname).toBe('/empresas');
      expect(event?.properties?.$prev_pageview_pathname).toBe(
        '/auth/olvide-password/:token',
      );
      expectNoSecrets(event);
    });
  });

  describe('$initial_current_url / $initial_pathname', () => {
    it('elimina token, query y hash del URL inicial', () => {
      const event = sanitizePosthogCapture({
        event: '$identify',
        properties: {
          $set_once: {
            $initial_current_url: `https://ramazzini.app${RAW_TOKEN_PATH}?foo=bar#x`,
            $initial_pathname: RAW_TOKEN_PATH,
          },
        },
        $set_once: {
          $initial_current_url: `https://ramazzini.app${RAW_TOKEN_PATH}?next=1`,
          $initial_pathname: RAW_TOKEN_PATH,
        },
      });

      expect(event?.$set_once?.$initial_current_url).toBe(
        'https://ramazzini.app/auth/olvide-password/:token',
      );
      expect(event?.$set_once?.$initial_pathname).toBe(
        '/auth/olvide-password/:token',
      );
      expect(event?.properties?.$set_once).toEqual({
        $initial_current_url:
          'https://ramazzini.app/auth/olvide-password/:token',
        $initial_pathname: '/auth/olvide-password/:token',
      });
      expectNoSecrets(event);
    });
  });

  describe('fail-closed', () => {
    it('nunca devuelve el pathname crudo de una ruta desconocida', () => {
      const raw = '/ruta-desconocida/secreto-xyz';
      expect(sanitizeRawPathname(raw)).toBe(UNMATCHED_ANALYTICS_PATH);
      expect(sanitizeRawPathname(raw)).not.toContain('secreto-xyz');
      expect(
        sanitizeAnalyticsUrl(`https://ramazzini.app${raw}?leak=1`),
      ).toBe(`https://ramazzini.app${UNMATCHED_ANALYTICS_PATH}`);
    });
  });

  describe('eventos', () => {
    it('sanitiza $pageview, $pageleave, $identify/$set y autocapture', () => {
      const events = ['$pageview', '$pageleave', '$identify', '$set', '$autocapture', '$rageclick'];

      for (const eventName of events) {
        const event = sanitizePosthogCapture({
          event: eventName,
          properties: {
            path: RAW_TRABAJADORES,
            $current_url: `https://ramazzini.app${RAW_TOKEN_PATH}?foo=bar`,
            $pathname: RAW_TOKEN_PATH,
            $prev_pageview_pathname: RAW_TRABAJADORES,
            $session_entry_url: `https://ramazzini.app${RAW_TOKEN_PATH}`,
            $session_entry_pathname: RAW_TOKEN_PATH,
            email: 'medico@example.com',
            role: 'Médico',
          },
          $set: {
            email: 'medico@example.com',
            role: 'Médico',
          },
        });

        expect(event?.properties?.path).toBe(
          '/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/trabajadores',
        );
        expect(event?.properties?.$current_url).toBe(
          'https://ramazzini.app/auth/olvide-password/:token',
        );
        expect(event?.properties?.$pathname).toBe('/auth/olvide-password/:token');
        expect(event?.properties?.$prev_pageview_pathname).toBe(
          '/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/trabajadores',
        );
        expect(event?.properties?.$session_entry_url).toBe(
          'https://ramazzini.app/auth/olvide-password/:token',
        );
        expect(event?.properties?.$session_entry_pathname).toBe(
          '/auth/olvide-password/:token',
        );
        expect(event?.properties?.email).toBe('medico@example.com');
        expect(event?.$set?.email).toBe('medico@example.com');
        expect(event?.$set?.role).toBe('Médico');
        expectNoSecrets(event);
      }
    });
  });

  describe('regresión', () => {
    it('path manual ya sanitizado permanece como template', () => {
      const event = sanitizePosthogCapture({
        event: '$pageview',
        properties: {
          path: '/empresas/:idEmpresa/centros-trabajo',
          name: 'centros-trabajo',
        },
      });
      expect(event?.properties?.path).toBe(
        '/empresas/:idEmpresa/centros-trabajo',
      );
      expect(event?.properties?.name).toBe('centros-trabajo');
    });

    it('no altera email ni role de identify/$set', () => {
      const event = sanitizePosthogCapture({
        event: '$identify',
        properties: {
          $set: { email: 'a@b.com', role: 'Médico' },
        },
        $set: { email: 'a@b.com', role: 'Médico' },
      });
      expect(event?.$set).toEqual({ email: 'a@b.com', role: 'Médico' });
      expect(event?.properties?.$set).toEqual({
        email: 'a@b.com',
        role: 'Médico',
      });
    });
  });

  describe('$referrer', () => {
    it('conserva $direct y sanitiza referrer same-origin con token', () => {
      expect(sanitizeReferrer('$direct')).toBe('$direct');

      const originalHost = window.location.host;
      const sameOrigin = `${window.location.protocol}//${originalHost}${RAW_TOKEN_PATH}?foo=bar`;
      expect(sanitizeReferrer(sameOrigin)).toBe(
        `${window.location.protocol}//${originalHost}/auth/olvide-password/:token`,
      );
      expect(sanitizeReferrer(sameOrigin)).not.toContain(TOKEN);
    });

    it('no reescribe un referrer de otro origen como ruta Vue', () => {
      expect(sanitizeReferrer('https://accounts.google.com/o/oauth2')).toBe(
        'https://accounts.google.com',
      );
    });
  });
});
