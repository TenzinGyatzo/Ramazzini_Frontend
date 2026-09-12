import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/stores/user';
import { useEmpresasStore } from '@/stores/empresas';
import { resetPostHogIdentity } from '@/utils/posthogIdentity';
import AuthAPI from '@/api/AuthAPI';

const push = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/api/AuthAPI', () => ({
  default: {
    logout: vi.fn(() => Promise.resolve()),
    auth: vi.fn(),
  },
}));

vi.mock('@/utils/posthogIdentity', () => ({
  resetPostHogIdentity: vi.fn(),
}));

describe('logout y PostHog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('ejecuta posthog.reset en el logout normal (Sidebar / SessionLockScreen)', async () => {
    const userStore = useUserStore();
    userStore.user = {
      _id: 'user-001',
      username: 'edgar.omar',
      email: 'edgar@example.com',
      role: 'Principal',
    };
    const empresas = useEmpresasStore();
    empresas.currentEmpresaId = 'emp-otro-tenant';
    empresas.currentEmpresa = { _id: 'emp-otro-tenant', nombreComercial: 'Otra' } as any;

    await userStore.logout();

    expect(resetPostHogIdentity).toHaveBeenCalledTimes(1);
    expect(AuthAPI.logout).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/login');
    expect(userStore.user).toBeNull();
    expect(empresas.currentEmpresaId).toBeNull();
    expect(empresas.currentEmpresa).toBeNull();
  });
});
