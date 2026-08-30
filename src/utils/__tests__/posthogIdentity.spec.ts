import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import posthog from 'posthog-js';
import { identifyPostHogUser, resetPostHogIdentity } from '../posthogIdentity';
import { usePostHog } from '@/composables/usePostHog';
import { useUserStore } from '@/stores/user';

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    identify: vi.fn(),
    capture: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/api/AuthAPI', () => ({
  default: {
    logout: vi.fn(() => Promise.resolve()),
    auth: vi.fn(),
  },
}));

describe('identify PostHog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('usa user._id como distinct_id y solo envía email y role', () => {
    identifyPostHogUser({
      _id: 'user-001',
      email: 'medico@example.com',
      role: 'Médico',
    });

    expect(posthog.identify).toHaveBeenCalledTimes(1);
    expect(posthog.identify).toHaveBeenCalledWith('user-001', {
      email: 'medico@example.com',
      role: 'Médico',
    });

    const [, properties] = vi.mocked(posthog.identify).mock.calls[0];
    expect(properties).not.toHaveProperty('id');
    expect(properties).not.toHaveProperty('username');
    expect(properties).not.toHaveProperty('identifier');
    expect(properties).not.toHaveProperty('idProveedorSalud');
    expect(properties).not.toHaveProperty('permisos');
    expect(properties).not.toHaveProperty('phone');
  });

  it('identifyUser del composable no envía propiedades redundantes', () => {
    const userStore = useUserStore();
    userStore.user = {
      _id: 'user-002',
      username: 'edgar.omar',
      email: 'edgar@example.com',
      role: 'Principal',
      idProveedorSalud: 'prov-99',
    };

    const { identifyUser } = usePostHog();
    identifyUser();

    expect(posthog.init).toHaveBeenCalledWith(
      import.meta.env.VITE_POSTHOG_API_KEY,
      expect.objectContaining({
        capture_pageview: false,
        capture_pageleave: false,
        autocapture: false,
        before_send: expect.any(Function),
      }),
    );
    expect(posthog.identify).toHaveBeenCalledWith('user-002', {
      email: 'edgar@example.com',
      role: 'Principal',
    });

    const [, properties] = vi.mocked(posthog.identify).mock.calls[0];
    expect(properties).not.toHaveProperty('id');
    expect(properties).not.toHaveProperty('username');
    expect(properties).not.toHaveProperty('identifier');
    expect(JSON.stringify(properties)).not.toContain('edgar.omar');
    expect(JSON.stringify(properties)).not.toContain('prov-99');
  });

  it('deshabilita Autocapture de forma explícita', () => {
    usePostHog();
    expect(posthog.init).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ autocapture: false }),
    );
  });

  it('no identifica si no hay usuario', () => {
    identifyPostHogUser(null);
    expect(posthog.identify).not.toHaveBeenCalled();
  });
});

describe('reset PostHog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resetPostHogIdentity llama posthog.reset', () => {
    resetPostHogIdentity();
    expect(posthog.reset).toHaveBeenCalledTimes(1);
  });
});
