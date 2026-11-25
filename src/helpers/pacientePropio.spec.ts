import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/DocumentosAPI', () => ({
  default: { getPacientePropio: vi.fn() },
}));

import DocumentosAPI from '@/api/DocumentosAPI';
import {
  bloqueoDocumentoPropio,
  MENSAJE_DOCUMENTO_PROPIO,
  MENSAJE_NOTA_MEDICA_PROPIA,
} from './pacientePropio';

const getPacientePropio = DocumentosAPI.getPacientePropio as unknown as ReturnType<typeof vi.fn>;

describe('bloqueoDocumentoPropio', () => {
  beforeEach(() => {
    getPacientePropio.mockReset();
  });

  it('nota médica para uno mismo: mensaje de la nota médica', async () => {
    getPacientePropio.mockResolvedValue({ data: { esPacientePropio: true } });
    await expect(bloqueoDocumentoPropio('t1', 'notaMedica')).resolves.toBe(
      MENSAJE_NOTA_MEDICA_PROPIA,
    );
  });

  it('otro documento para uno mismo: mensaje general', async () => {
    getPacientePropio.mockResolvedValue({ data: { esPacientePropio: true } });
    await expect(bloqueoDocumentoPropio('t1', 'historiaClinica')).resolves.toBe(
      MENSAJE_DOCUMENTO_PROPIO,
    );
  });

  it('otro paciente: no bloquea', async () => {
    getPacientePropio.mockResolvedValue({ data: { esPacientePropio: false } });
    await expect(bloqueoDocumentoPropio('t1', 'notaMedica')).resolves.toBeNull();
  });

  it('consulta fallida: no bloquea (el servidor revisa al guardar)', async () => {
    getPacientePropio.mockImplementation(async () => {
      throw new Error('sin red');
    });
    const resultado = await bloqueoDocumentoPropio('t1', 'notaMedica');
    expect(resultado).toBeNull();
  });
});
