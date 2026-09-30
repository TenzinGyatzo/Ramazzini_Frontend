import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/stores/user';

const push = vi.fn();
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));
const exitTenant = vi.fn().mockResolvedValue({ data: {} });
vi.mock('@/api/PlataformaAPI', () => ({
  default: { exitTenant, enterTenant: vi.fn(), getContexto: vi.fn() },
}));

const { default: PlatformTenantBanner } = await import('./PlatformTenantBanner.vue');
const { platformNavigation } = await import('@/composables/usePlatformContext');

describe('PlatformTenantBanner', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    push.mockClear();
    exitTenant.mockClear();
    vi.spyOn(platformNavigation, 'reloadTo').mockImplementation(() => {});
  });

  const mountAs = (user: Record<string, unknown> | null) => {
    useUserStore().user = user as any;
    return mount(PlatformTenantBanner, { global: { plugins: [pinia] } });
  };

  it('usuarios normales: no se muestra nada', () => {
    const wrapper = mountAs({ _id: 'p', role: 'Principal', username: 'p', email: 'p@t.com' });
    expect(wrapper.find('[data-testid="platform-tenant-banner"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="platform-console-banner"]').exists()).toBe(false);
  });

  it('Administrador dentro de un tenant: muestra el nombre del tenant activo', () => {
    const wrapper = mountAs({
      _id: 'a',
      role: 'Administrador',
      username: 'admin',
      email: 'a@t.com',
      platformContext: {
        activeTenant: { id: 'b', nombre: 'Clínica B', regimenRegulatorio: null },
      },
    });
    expect(wrapper.find('[data-testid="platform-tenant-banner-name"]').text()).toBe(
      'Clínica B',
    );
  });

  it('Cambiar abre la consola; Salir a consola sale del tenant', async () => {
    const wrapper = mountAs({
      _id: 'a',
      role: 'Administrador',
      username: 'admin',
      email: 'a@t.com',
      platformContext: {
        activeTenant: { id: 'b', nombre: 'Clínica B', regimenRegulatorio: null },
      },
    });
    await wrapper.find('[data-testid="platform-tenant-banner-change"]').trigger('click');
    expect(push).toHaveBeenCalledWith({ name: 'panel-administrador' });

    await wrapper.find('[data-testid="platform-tenant-banner-exit"]').trigger('click');
    expect(exitTenant).toHaveBeenCalled();
  });

  it('Administrador en la consola: barra de consola', () => {
    const wrapper = mountAs({
      _id: 'a',
      role: 'Administrador',
      username: 'admin',
      email: 'a@t.com',
      platformContext: { activeTenant: null },
    });
    expect(wrapper.find('[data-testid="platform-console-banner"]').exists()).toBe(true);
  });
});
