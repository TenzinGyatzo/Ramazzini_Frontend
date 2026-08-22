import { describe, it, expect } from 'vitest';
import {
  getWorkerImmutablePayloadFields,
  WORKER_IMMUTABLE_PAYLOAD_FIELDS,
} from './workerPaisNacimientoImmutability';

const REAL_CURP = 'ROAJ850102HDFLRN06';
const GENERIC_CURP = 'XXXX999999XXXXXX99';

describe('getWorkerImmutablePayloadFields', () => {
  it('incluye sexoCURP y no incluye sexo con CURP real sin atención', () => {
    const fields = getWorkerImmutablePayloadFields({ curp: REAL_CURP });
    expect(fields).toEqual([...WORKER_IMMUTABLE_PAYLOAD_FIELDS]);
    expect(fields).toContain('sexoCURP');
    expect(fields).not.toContain('sexo');
  });

  it('no bloquea campos con CURP genérica sin atención', () => {
    expect(getWorkerImmutablePayloadFields({ curp: GENERIC_CURP })).toEqual([]);
  });

  it('bloquea lista común más sexo cuando hay documento clínico finalizado', () => {
    const fields = getWorkerImmutablePayloadFields(
      { curp: GENERIC_CURP, tieneDocumentoClinicoFinalizado: true },
    );
    expect(fields).toContain('curp');
    expect(fields).toContain('sexoCURP');
    expect(fields).toContain('sexo');
    expect(fields).toContain('paisNacimiento');
  });
});
