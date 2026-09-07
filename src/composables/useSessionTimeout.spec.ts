import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useSessionTimeout } from './useSessionTimeout';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useUserStore } from '@/stores/user';

vi.mock('vue-router', () => ({
  useRoute: () => ({
    name: 'dashboard',
    path: '/dashboard',
  }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

const SIRES_TIMEOUT_MS = 900_000;
const SIN_REGIMEN_TIMEOUT_MS = 1_800_000;

describe('useSessionTimeout', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createSiresPolicy = () => ({
    regime: 'SIRES_NOM024' as const,
    features: {
      sessionTimeoutEnabled: true,
      sessionTimeoutMs: SIRES_TIMEOUT_MS,
      enforceDocumentImmutabilityUI: true,
      documentImmutabilityEnabled: true,
      showSiresUI: true,
      giisExportEnabled: true,
      notaAclaratoriaEnabled: true,
      cluesFieldVisible: true,
    },
    validation: {
      curpFirmantes: 'required' as const,
      workerCurp: 'required_strict' as const,
      cie10Principal: 'required' as const,
      geoFields: 'required' as const,
    },
  });

  const createSinRegimenPolicy = (overrides?: {
    sessionTimeoutEnabled?: boolean;
    sessionTimeoutMs?: number;
  }) => ({
    regime: 'SIN_REGIMEN' as const,
    features: {
      sessionTimeoutEnabled: overrides?.sessionTimeoutEnabled ?? true,
      sessionTimeoutMs: overrides?.sessionTimeoutMs ?? SIN_REGIMEN_TIMEOUT_MS,
      enforceDocumentImmutabilityUI: false,
      documentImmutabilityEnabled: false,
      showSiresUI: false,
      giisExportEnabled: false,
      notaAclaratoriaEnabled: false,
      cluesFieldVisible: false,
    },
    validation: {
      curpFirmantes: 'optional' as const,
      workerCurp: 'optional' as const,
      cie10Principal: 'optional' as const,
      geoFields: 'optional' as const,
    },
  });

  function seedStores(policy: ReturnType<typeof createSiresPolicy> | ReturnType<typeof createSinRegimenPolicy>) {
    const proveedorSaludStore = useProveedorSaludStore();
    const userStore = useUserStore();
    proveedorSaludStore.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: policy,
    } as any;
    userStore.user = {
      _id: 'user-id',
      username: 'test',
    } as any;
    return { proveedorSaludStore, userStore };
  }

  function mountTimeout() {
    let api: ReturnType<typeof useSessionTimeout>;
    const Comp = defineComponent({
      setup() {
        api = useSessionTimeout();
        return () => null;
      },
    });
    const wrapper = mount(Comp);
    return { api: api!, wrapper };
  }

  function unmount(wrapper: VueWrapper) {
    wrapper.unmount();
  }

  it('SIRES_NOM024 no bloquea antes de 15 minutos y bloquea al cumplirlos', () => {
    seedStores(createSiresPolicy());
    const { api, wrapper } = mountTimeout();

    expect(api.isLocked.value).toBe(false);
    expect(api.timeoutMinutes.value).toBe(15);

    vi.advanceTimersByTime(SIRES_TIMEOUT_MS - 1);
    expect(api.isLocked.value).toBe(false);

    vi.advanceTimersByTime(1);
    expect(api.isLocked.value).toBe(true);

    unmount(wrapper);
  });

  it('SIN_REGIMEN no bloquea antes de 30 minutos y bloquea al cumplirlos', () => {
    seedStores(createSinRegimenPolicy());
    const { api, wrapper } = mountTimeout();

    expect(api.isLocked.value).toBe(false);
    expect(api.timeoutMinutes.value).toBe(30);

    vi.advanceTimersByTime(SIN_REGIMEN_TIMEOUT_MS - 1);
    expect(api.isLocked.value).toBe(false);

    vi.advanceTimersByTime(1);
    expect(api.isLocked.value).toBe(true);

    unmount(wrapper);
  });

  it('SIN_REGIMEN no se bloquea al umbral de SIRES (15 minutos)', () => {
    seedStores(createSinRegimenPolicy());
    const { api, wrapper } = mountTimeout();

    vi.advanceTimersByTime(SIRES_TIMEOUT_MS);
    expect(api.isLocked.value).toBe(false);

    unmount(wrapper);
  });

  it('la actividad del usuario reinicia el contador', () => {
    seedStores(createSiresPolicy());
    const { api, wrapper } = mountTimeout();

    vi.advanceTimersByTime(SIRES_TIMEOUT_MS - 1_000);
    window.dispatchEvent(new Event('mousemove'));
    vi.advanceTimersByTime(SIRES_TIMEOUT_MS - 1);
    expect(api.isLocked.value).toBe(false);

    vi.advanceTimersByTime(1);
    expect(api.isLocked.value).toBe(true);

    unmount(wrapper);
  });

  it('unlockSession desbloquea y reinicia el timer en SIRES_NOM024', () => {
    seedStores(createSiresPolicy());
    const { api, wrapper } = mountTimeout();

    vi.advanceTimersByTime(SIRES_TIMEOUT_MS);
    expect(api.isLocked.value).toBe(true);

    api.unlockSession();
    expect(api.isLocked.value).toBe(false);

    vi.advanceTimersByTime(SIRES_TIMEOUT_MS - 1);
    expect(api.isLocked.value).toBe(false);
    vi.advanceTimersByTime(1);
    expect(api.isLocked.value).toBe(true);

    unmount(wrapper);
  });

  it('unlockSession desbloquea y reinicia el timer en SIN_REGIMEN', () => {
    seedStores(createSinRegimenPolicy());
    const { api, wrapper } = mountTimeout();

    vi.advanceTimersByTime(SIN_REGIMEN_TIMEOUT_MS);
    expect(api.isLocked.value).toBe(true);

    api.unlockSession();
    expect(api.isLocked.value).toBe(false);

    vi.advanceTimersByTime(SIN_REGIMEN_TIMEOUT_MS - 1);
    expect(api.isLocked.value).toBe(false);
    vi.advanceTimersByTime(1);
    expect(api.isLocked.value).toBe(true);

    unmount(wrapper);
  });

  it('no bloquea cuando sessionTimeoutEnabled es false', () => {
    const { proveedorSaludStore } = seedStores(
      createSinRegimenPolicy({ sessionTimeoutEnabled: false }),
    );
    const { api, wrapper } = mountTimeout();

    expect(proveedorSaludStore.sessionTimeoutEnabled).toBe(false);
    vi.advanceTimersByTime(SIN_REGIMEN_TIMEOUT_MS);
    expect(api.isLocked.value).toBe(false);

    unmount(wrapper);
  });
});
