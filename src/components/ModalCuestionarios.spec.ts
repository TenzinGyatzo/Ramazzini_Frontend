import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';

const navigateWithTreatmentConsent = vi.fn().mockResolvedValue(undefined);
const validateDocumentCreation = vi.fn(() => true);
const controlPrenatalEnabled = ref(true);

vi.mock('@/composables/usePermissionRestrictions', () => ({
  usePermissionRestrictions: () => ({
    validateDocumentCreation,
    executeIfCanManageOtrosDocumentos: (callback: () => void) => callback(),
  }),
}));
vi.mock('@/composables/useProfessionalDataValidation', () => ({
  useProfessionalDataValidation: () => ({
    validationResult: ref({ missingFields: [], routeName: '', firmanteTypeLabel: '' }),
    loadFirmanteData: vi.fn().mockResolvedValue(undefined),
    ensureProfessionalDataReady: vi.fn().mockResolvedValue({ isValid: true }),
  }),
}));
vi.mock('@/composables/useNavigateWithTreatmentConsent', () => ({
  useNavigateWithTreatmentConsent: () => ({
    navigateWithTreatmentConsent,
    showModal: ref(false),
    modalTrabajadorId: ref(''),
    modalTrabajadorNombre: ref(''),
    handleConsentRegistered: vi.fn(),
    handleConsentCancel: vi.fn(),
  }),
}));
vi.mock('@/composables/useRegulatoryPolicy', () => ({
  useRegulatoryPolicy: () => ({ controlPrenatalEnabled }),
}));
vi.mock('@/stores/empresas', () => ({ useEmpresasStore: () => ({ currentEmpresaId: 'emp1' }) }));
vi.mock('@/stores/centrosTrabajo', () => ({ useCentrosTrabajoStore: () => ({ currentCentroTrabajoId: 'ct1' }) }));
vi.mock('@/stores/trabajadores', () => ({
  useTrabajadoresStore: () => ({
    currentTrabajadorId: 'trab1',
    currentTrabajador: {
      nombre: 'Ana',
      primerApellido: 'López',
      segundoApellido: 'Ruiz',
      puesto: 'Operadora de montacargas',
      sexo: 'Femenino',
    },
  }),
}));
vi.mock('@/stores/proveedorSalud', () => ({
  useProveedorSaludStore: () => ({ isMX: true, notaAclaratoriaEnabled: false }),
}));

import ModalCuestionarios from './ModalCuestionarios.vue';

const montar = () =>
  mount(ModalCuestionarios, {
    global: {
      provide: { toast: { open: vi.fn() } },
      stubs: { ModalDatosProfesionales: true, TreatmentConsentModal: true, Transition: false },
    },
  });

const opciones = (wrapper: ReturnType<typeof montar>) =>
  wrapper.findAll('[data-opcion]').map((b) => b.attributes('data-opcion'));

describe('ModalCuestionarios', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    navigateWithTreatmentConsent.mockClear();
    validateDocumentCreation.mockClear();
    controlPrenatalEnabled.value = true;
  });

  it('identifica al trabajador y lista los documentos por sección', () => {
    const wrapper = montar();

    expect(wrapper.find('[data-trabajador]').text()).toContain('Operadora de montacargas');
    expect(wrapper.find('[data-trabajador]').text()).toContain('Ana');
    expect(wrapper.findAll('[data-seccion]')).toHaveLength(5);
    expect(opciones(wrapper)).toEqual(
      expect.arrayContaining(['receta', 'inasistencias', 'cuestionarioNordico', 'evaluacionSuenoVigilia']),
    );
    // Ya no existe el acceso a «Citas»
    expect(wrapper.text()).not.toContain('Citas');
  });

  it('oculta las opciones que el proveedor no tiene habilitadas', async () => {
    expect(opciones(montar())).toContain('controlPrenatal');
    expect(opciones(montar())).not.toContain('notaAclaratoria');

    controlPrenatalEnabled.value = false;
    expect(opciones(montar())).not.toContain('controlPrenatal');
  });

  it('el buscador filtra sin importar acentos y oculta las secciones vacías', async () => {
    const wrapper = montar();

    await wrapper.find('input[type="search"]').setValue('audiometria');
    expect(opciones(wrapper)).toEqual(['historiaOtologica', 'informeLongitudinalAudiometrico']);
    expect(wrapper.findAll('[data-seccion]')).toHaveLength(1);

    await wrapper.find('input[type="search"]').setValue('kuorinka');
    expect(opciones(wrapper)).toEqual(['cuestionarioNordico']);

    await wrapper.find('input[type="search"]').setValue('zzz');
    expect(opciones(wrapper)).toEqual([]);
    expect(wrapper.find('[data-sin-resultados]').exists()).toBe(true);
  });

  it('una opción de documento navega a su captura y cierra el modal', async () => {
    const wrapper = montar();

    await wrapper.find('[data-opcion="cuestionarioNordico"]').trigger('click');
    await vi.waitFor(() => expect(wrapper.emitted('closeModal')).toBeTruthy());

    expect(validateDocumentCreation).toHaveBeenCalledWith('cuestionarioNordico');
    expect(navigateWithTreatmentConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        trabajadorId: 'trab1',
        to: {
          name: 'crear-documento',
          params: {
            idEmpresa: 'emp1',
            idCentroTrabajo: 'ct1',
            idTrabajador: 'trab1',
            tipoDocumento: 'cuestionarioNordico',
          },
        },
      }),
    );
  });

  it('las rutas que no llevan centro de trabajo se conservan sin él', async () => {
    const wrapper = montar();

    await wrapper.find('[data-opcion="receta"]').trigger('click');
    await vi.waitFor(() => expect(navigateWithTreatmentConsent).toHaveBeenCalled());

    expect(navigateWithTreatmentConsent.mock.calls[0][0].to.params).toEqual({
      idEmpresa: 'emp1',
      idTrabajador: 'trab1',
      tipoDocumento: 'receta',
    });
  });

  it('«Inasistencia a seguimiento» abre el registro de inasistencias en lugar de crear un documento', async () => {
    const wrapper = montar();

    await wrapper.find('[data-opcion="inasistencias"]').trigger('click');

    expect(wrapper.emitted('openInasistencias')).toHaveLength(1);
    expect(wrapper.emitted('closeModal')).toHaveLength(1);
    expect(navigateWithTreatmentConsent).not.toHaveBeenCalled();
  });

  it('Enter en el buscador abre el primer resultado', async () => {
    const wrapper = montar();
    const buscador = wrapper.find('input[type="search"]');

    await buscador.setValue('inasistencia');
    await buscador.trigger('keydown', { key: 'Enter' });

    expect(wrapper.emitted('openInasistencias')).toHaveLength(1);
  });
});
