import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/api/AuthAPI', () => ({
  default: {
    auth: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import AuthAPI from '@/api/AuthAPI';
import { useUserStore } from './user';

const mockUser = {
  _id: 'user-1',
  username: 'medico',
  email: 'medico@test.com',
  role: 'Médico',
};

describe('useUserStore (H-11)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
  });

  it('fetchUser no persiste el usuario en localStorage', async () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem,
      removeItem: vi.fn(),
    });
    vi.mocked(AuthAPI.auth).mockResolvedValue({ data: mockUser });

    const store = useUserStore();
    await store.fetchUser();

    expect(AuthAPI.auth).toHaveBeenCalledTimes(1);
    expect(setItem).not.toHaveBeenCalledWith('user', expect.anything());
    expect(store.user).toEqual(mockUser);
  });

  it('cada fetchUser revalida contra la API', async () => {
    vi.mocked(AuthAPI.auth).mockResolvedValue({ data: mockUser });

    const store = useUserStore();
    await store.fetchUser();
    await store.fetchUser();

    expect(AuthAPI.auth).toHaveBeenCalledTimes(2);
  });
});
