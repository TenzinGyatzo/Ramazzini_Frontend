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
  resolveFirmanteTipo: (role?: string, perfil?: string | null) => {
    if (role === 'Médico') return 'medico';
    if (role === 'Enfermero/a') return 'enfermera';
    if (role === 'Técnico Evaluador') return 'tecnico';
    if (role === 'Principal') return perfil === 'enfermeria' ? 'enfermera' : 'medico';
    return null;
  },
}));

const { useProfessionalDataValidation, buildProfessionalDataValidation } = await import(
  './useProfessionalDataValidation'
);

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

  it('el resultado informa el documento evaluado', async () => {
    medicoStore.medicoFirmante = { ...completo, idUser: 'u1' };
    const result = await useProfessionalDataValidation().ensureProfessionalDataReady('receta');
    expect(result.tipoDocumento).toBe('receta');
  });
});

describe('cédula profesional según el documento', () => {
  const sinCedula = { ...completo, numeroCedulaProfesional: '' };

  it('enfermería sin cédula puede crear documentos que no son la Nota médica', () => {
    for (const tipo of ['notaEnfermeria', 'receta', 'cuestionarioNordico', 'notaAclaratoria']) {
      const r = buildProfessionalDataValidation('Enfermero/a', sinCedula, null, tipo);
      expect(r.isValid).toBe(true);
    }
  });

  it('enfermería sin cédula no puede crear la Nota médica', () => {
    const r = buildProfessionalDataValidation('Enfermero/a', sinCedula, null, 'notaMedica');
    expect(r.isValid).toBe(false);
    expect(r.missingFields).toEqual(['numeroCedulaProfesional']);
  });

  it('el Principal con perfil de enfermería sigue la misma regla', () => {
    expect(buildProfessionalDataValidation('Principal', sinCedula, 'enfermeria', 'receta').isValid).toBe(true);
    expect(buildProfessionalDataValidation('Principal', sinCedula, 'enfermeria', 'notaMedica').isValid).toBe(false);
  });

  it('enfermería sigue necesitando nombre, apellido y título en cualquier documento', () => {
    const r = buildProfessionalDataValidation('Enfermero/a', { ...sinCedula, tituloProfesional: '' }, null, 'receta');
    expect(r.missingFields).toEqual(['tituloProfesional']);
  });

  it('el médico necesita la cédula en todos los documentos', () => {
    expect(buildProfessionalDataValidation('Médico', sinCedula, null, 'receta').isValid).toBe(false);
    expect(buildProfessionalDataValidation('Principal', sinCedula, 'medicina', 'receta').isValid).toBe(false);
  });

  it('el técnico no necesita la cédula', () => {
    expect(buildProfessionalDataValidation('Técnico Evaluador', sinCedula, null, 'audiometria').isValid).toBe(true);
  });
});
