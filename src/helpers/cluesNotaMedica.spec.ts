import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/DocumentosAPI', () => ({
  default: { getCluesNotaMedica: vi.fn() },
}));

import DocumentosAPI from '@/api/DocumentosAPI';
import { bloqueoCluesNotaMedica } from './cluesNotaMedica';

const getCluesNotaMedica = DocumentosAPI.getCluesNotaMedica as unknown as ReturnType<typeof vi.fn>;

describe('bloqueoCluesNotaMedica (punto 8)', () => {
  beforeEach(() => {
    getCluesNotaMedica.mockReset();
  });

  it('CLUES que no está en operación: no deja iniciar y usa el mensaje del servidor', async () => {
    getCluesNotaMedica.mockResolvedValue({
      data: { permitido: false, mensaje: 'No se puede iniciar la nota médica: CLUES X' },
    });
    await expect(bloqueoCluesNotaMedica('t1', 'notaMedica')).resolves.toBe(
      'No se puede iniciar la nota médica: CLUES X',
    );
  });

  it('CLUES en operación: deja iniciar', async () => {
    getCluesNotaMedica.mockResolvedValue({ data: { permitido: true } });
    await expect(bloqueoCluesNotaMedica('t1', 'notaMedica')).resolves.toBeNull();
  });

  it('otros documentos no se revisan', async () => {
    await expect(bloqueoCluesNotaMedica('t1', 'historiaClinica')).resolves.toBeNull();
    expect(getCluesNotaMedica).not.toHaveBeenCalled();
  });

  it('consulta fallida: no bloquea (el servidor revisa al crear el borrador)', async () => {
    getCluesNotaMedica.mockRejectedValue(new Error('red'));
    await expect(bloqueoCluesNotaMedica('t1', 'notaMedica')).resolves.toBeNull();
  });
});
