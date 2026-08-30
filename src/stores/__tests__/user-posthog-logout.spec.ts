import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/stores/user';
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

  it('ejecuta posthog.reset en el logout normal (Sidebar / SessionLockScreen)', () => {
    const userStore = useUserStore();
    userStore.user = {
      _id: 'user-001',
      username: 'edgar.omar',
      email: 'edgar@example.com',
      role: 'Principal',
    };

    userStore.logout();

    expect(resetPostHogIdentity).toHaveBeenCalledTimes(1);
    expect(AuthAPI.logout).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/login');
    expect(userStore.user).toBeNull();
  });
});
