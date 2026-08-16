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

  it('incluye sexoCURP en campos inmutables del payload', () => {
    expect(FIRMANTE_IMMUTABLE_PAYLOAD_FIELDS).toContain('sexoCURP');
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
});
