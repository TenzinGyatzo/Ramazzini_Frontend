import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';

const medicoStore = reactive({
  medicoFirmante: null as Record<string, unknown> | null,
  loading: false,
  loadMedicoFirmante: vi.fn(),
});
const userStore = reactive({ user: { _id: 'u1', role: 'Médico' } as Record<string, unknown> | null });
const vacio = () => reactive({ loading: false, enfermeraFirmante: null, tecnicoFirmante: null });

vi.mock('@/stores/medicoFirmante', () => ({ useMedicoFirmanteStore: () => medicoStore }));
vi.mock('@/stores/enfermeraFirmante', () => ({ useEnfermeraFirmanteStore: vacio }));
vi.mock('@/stores/tecnicoFirmante', () => ({ useTecnicoFirmanteStore: vacio }));
vi.mock('pinia', async () => {
  const { toRefs } = await import('vue');
  return { storeToRefs: (store: object) => toRefs(store) };
});
vi.mock('@/composables/useCurrentUser', async () => {
  const { computed } = await import('vue');
  return {
    useCurrentUser: () => ({
      currentUser: computed(() => userStore.user),
      ensureUserLoaded: async () => userStore.user?._id ?? null,
    }),
  };
});
vi.mock('@/constants/rolePermissionPolicy', () => ({
  resolveFirmanteTipo: (role?: string) => (role === 'Médico' ? 'medico' : null),
}));

const { useProfessionalDataValidation } = await import('./useProfessionalDataValidation');

const completo = { nombre: 'Ana', primerApellido: 'Pérez', tituloProfesional: 'Dra.', numeroCedulaProfesional: '123' };

describe('validación de datos profesionales al crear un documento', () => {
  beforeEach(() => {
    medicoStore.loadMedicoFirmante.mockReset();
    medicoStore.medicoFirmante = null;
    userStore.user = { _id: 'u1', role: 'Médico' };
  });

  it('con los datos de este usuario ya cargados y completos no espera al servidor', async () => {
    medicoStore.medicoFirmante = { ...completo, idUser: 'u1' };
    const result = await useProfessionalDataValidation().ensureProfessionalDataReady();
    expect(result.isValid).toBe(true);
    expect(medicoStore.loadMedicoFirmante).not.toHaveBeenCalled();
  });

  it('si faltan datos vuelve a consultar (pudo completarlos en otra pestaña)', async () => {
    medicoStore.medicoFirmante = { ...completo, numeroCedulaProfesional: '', idUser: 'u1' };
    medicoStore.loadMedicoFirmante.mockImplementation(async () => {
      medicoStore.medicoFirmante = { ...completo, idUser: 'u1' };
    });
    const result = await useProfessionalDataValidation().ensureProfessionalDataReady();
    expect(medicoStore.loadMedicoFirmante).toHaveBeenCalledWith('u1');
    expect(result.isValid).toBe(true);
  });

  it('los datos cargados de otro usuario no cuentan', async () => {
    medicoStore.medicoFirmante = { ...completo, idUser: 'otro' };
    await useProfessionalDataValidation().ensureProfessionalDataReady();
    expect(medicoStore.loadMedicoFirmante).toHaveBeenCalledWith('u1');
  });
});
