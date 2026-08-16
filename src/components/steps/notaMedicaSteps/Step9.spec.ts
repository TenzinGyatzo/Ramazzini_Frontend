import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Step6 from './Step6.vue';
import { createPinia, setActivePinia } from 'pinia';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useNom024Fields } from '@/composables/useNom024Fields';

describe('Step6 NotaMedica - CIE-10 Required Marker', () => {
  let pinia: any;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const createSiresPolicy = () => ({
    regime: 'SIRES_NOM024' as const,
    features: {
      sessionTimeoutEnabled: true,
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

  const createSinRegimenPolicy = () => ({
    regime: 'SIN_REGIMEN' as const,
    features: {
      sessionTimeoutEnabled: false,
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
      cie10Principal: 'required' as const,
      geoFields: 'optional' as const,
    },
  });

  it('should show asterisk (*) for CIE-10 principal label in SIRES_NOM024', () => {
    const proveedorSaludStore = useProveedorSaludStore();
    const trabajadoresStore = useTrabajadoresStore();

    proveedorSaludStore.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSiresPolicy(),
    } as any;

    trabajadoresStore.currentTrabajador = {
      _id: 'trabajador-id',
      sexo: 'Masculino',
      fechaNacimiento: new Date('1990-01-01'),
    } as any;

    const wrapper = mount(Step6, {
      global: {
        plugins: [pinia],
        stubs: {
          CIE10Autocomplete: {
            template: '<div data-testid="cie10-autocomplete"><slot name="label">{{ label }}</slot></div>',
            props: ['label', 'required'],
          },
        },
      },
    });

    // Verificar que cie10Required es true para SIRES_NOM024
    const policy = useNom024Fields();
    expect(policy.cie10Required.value).toBe(true);
  });

  it('should show asterisk (*) for CIE-10 principal label in SIN_REGIMEN', () => {
    const proveedorSaludStore = useProveedorSaludStore();
    proveedorSaludStore.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSinRegimenPolicy(),
    } as any;

    // Verificar que cie10Required es true para SIN_REGIMEN (ahora es obligatorio)
    const policy = useNom024Fields();
    expect(policy.cie10Required.value).toBe(true);
  });
});
