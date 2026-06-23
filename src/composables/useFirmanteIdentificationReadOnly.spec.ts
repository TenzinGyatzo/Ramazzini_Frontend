import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useFirmanteIdentificationReadOnly } from './useFirmanteIdentificationReadOnly';

describe('useFirmanteIdentificationReadOnly', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const siresPolicy = {
    regime: 'SIRES_NOM024' as const,
    features: {
      workerIdentificationImmutable: true,
    },
    validation: {
      curpFirmantes: 'required' as const,
      workerCurp: 'required_strict' as const,
      geoFields: 'required' as const,
      cie10Principal: 'required' as const,
    },
  };

  const sinRegimenPolicy = {
    regime: 'SIN_REGIMEN' as const,
    features: {
      workerIdentificationImmutable: false,
    },
    validation: {
      curpFirmantes: 'optional' as const,
      workerCurp: 'optional' as const,
      geoFields: 'optional' as const,
      cie10Principal: 'optional' as const,
    },
  };

  const storedFirmante = {
    _id: 'firmante-1',
    curp: 'GALJ900515HDFRPN08',
    nombre: 'JUAN',
    primerApellido: 'GARCIA',
    segundoApellido: 'LOPEZ',
    sexo: 'Masculino',
    entidadNacimiento: '09',
    paisNacimiento: 142,
    fechaNacimiento: '1990-05-15T00:00:00.000Z',
  };

  it('preserva valores almacenados en SIRES cuando data viene vacío', () => {
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: siresPolicy,
    } as any;

    const firmante = ref({ ...storedFirmante });
    const { preserveImmutableIdentificationFields } =
      useFirmanteIdentificationReadOnly(firmante);

    const payload: Record<string, unknown> = {
      nombre: '',
      primerApellido: '',
      segundoApellido: '',
      tituloProfesional: 'Dr.',
    };

    const result = preserveImmutableIdentificationFields(payload, firmante.value);

    expect(result.nombre).toBe('JUAN');
    expect(result.primerApellido).toBe('GARCIA');
    expect(result.segundoApellido).toBe('LOPEZ');
    expect(result.curp).toBe('GALJ900515HDFRPN08');
    expect(result.sexo).toBe('Masculino');
    expect(result.fechaNacimiento).toBe('1990-05-15');
    expect(result.tituloProfesional).toBe('Dr.');
  });

  it('no altera payload en SIN_REGIMEN', () => {
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: sinRegimenPolicy,
    } as any;

    const firmante = ref({ ...storedFirmante });
    const { preserveImmutableIdentificationFields } =
      useFirmanteIdentificationReadOnly(firmante);

    const payload = {
      nombre: '',
      primerApellido: 'NUEVO',
      tituloProfesional: 'Dr.',
    };

    expect(preserveImmutableIdentificationFields(payload, firmante.value)).toEqual(payload);
  });

  it('no altera payload cuando la CURP almacenada es genérica', () => {
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: siresPolicy,
    } as any;

    const firmante = ref({
      ...storedFirmante,
      curp: 'XXXX999999XXXXXX99',
    });
    const { preserveImmutableIdentificationFields } =
      useFirmanteIdentificationReadOnly(firmante);

    const payload = {
      nombre: 'PEDRO',
      curp: 'GALJ900515HDFRPN08',
    };

    expect(preserveImmutableIdentificationFields(payload, firmante.value)).toEqual(payload);
  });
});
