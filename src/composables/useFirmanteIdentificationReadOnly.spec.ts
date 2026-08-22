import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import {
  FIRMANTE_IMMUTABLE_PAYLOAD_FIELDS,
  useFirmanteIdentificationReadOnly,
} from './useFirmanteIdentificationReadOnly';

vi.mock('@/composables/useNom024Fields', () => ({
  useNom024Fields: () => ({
    workerIdentificationImmutable: ref(true),
    isSIRES: ref(true),
  }),
}));

describe('useFirmanteIdentificationReadOnly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('incluye sexoCURP y no incluye sexo biológico en campos inmutables del payload', () => {
    expect(FIRMANTE_IMMUTABLE_PAYLOAD_FIELDS).toContain('sexoCURP');
    expect(FIRMANTE_IMMUTABLE_PAYLOAD_FIELDS).not.toContain('sexo');
  });

  it('preserva sexoCURP almacenado en submit SIRES', () => {
    const firmante = ref({
      _id: 'abc',
      curp: 'ROAJ850102HDFLRN06',
      sexoCURP: 3,
      nombre: 'JUAN',
    });

    const { preserveImmutableIdentificationFields } =
      useFirmanteIdentificationReadOnly(firmante);

    const payload = preserveImmutableIdentificationFields(
      { sexoCURP: 1, nombre: 'PEDRO' },
      firmante.value,
    );

    expect(payload.sexoCURP).toBe(3);
    expect(payload.nombre).toBe('JUAN');
  });

  it('no preserva campos con CURP genérica si no hay documento finalizado', () => {
    const firmante = ref({
      _id: 'abc',
      curp: 'XXXX999999XXXXXX99',
      sexoCURP: 3,
      nombre: 'JUAN',
      tieneDocumentoClinicoFinalizado: false,
    });

    const { preserveImmutableIdentificationFields, isCurpConformationReadOnly } =
      useFirmanteIdentificationReadOnly(firmante);

    expect(isCurpConformationReadOnly.value).toBe(false);
    const payload = preserveImmutableIdentificationFields(
      { sexoCURP: 1, nombre: 'PEDRO' },
      firmante.value,
    );
    expect(payload.nombre).toBe('PEDRO');
  });

  it('preserva campos con CURP genérica si ya finalizó un documento clínico', () => {
    const firmante = ref({
      _id: 'abc',
      curp: 'XXXX999999XXXXXX99',
      sexoCURP: 3,
      nombre: 'JUAN',
      tieneDocumentoClinicoFinalizado: true,
    });

    const { preserveImmutableIdentificationFields, isCurpConformationReadOnly } =
      useFirmanteIdentificationReadOnly(firmante);

    expect(isCurpConformationReadOnly.value).toBe(true);
    const payload = preserveImmutableIdentificationFields(
      { sexoCURP: 1, nombre: 'PEDRO' },
      firmante.value,
    );
    expect(payload.nombre).toBe('JUAN');
    expect(payload.sexoCURP).toBe(3);
  });
});
