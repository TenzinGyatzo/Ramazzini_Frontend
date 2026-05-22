import { describe, it, expect } from 'vitest';
import {
  aplicarMetadatosDocumentoOrigen,
  inicializarNotaAclaratoriaNueva,
} from './notaAclaratoriaForm';

describe('notaAclaratoriaForm', () => {
  it('inicializa fecha, trabajador, auditoría y metadatos de origen', () => {
    const form: Record<string, unknown> = {};

    inicializarNotaAclaratoriaNueva({
      form,
      trabajadorId: '507f1f77bcf86cd799439011',
      rutaPDF: 'expedientes-medicos/Empresa/Centro/Juan_507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
      documentoOrigenTipo: 'notasMedicas',
      documentoOrigenId: '507f1f77bcf86cd799439013',
      documentoOrigen: {
        fechaNotaMedica: '2026-05-20',
      },
    });

    expect(form.fechaNotaAclaratoria).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(form.idTrabajador).toBe('507f1f77bcf86cd799439011');
    expect(form.createdBy).toBe('507f1f77bcf86cd799439012');
    expect(form.updatedBy).toBe('507f1f77bcf86cd799439012');
    expect(form.documentoOrigenFecha).toBe('2026-05-20');
  });

  it('no sobrescribe valores ya capturados', () => {
    const form: Record<string, unknown> = {
      fechaNotaAclaratoria: '2026-01-15',
      createdBy: 'existing-user-id',
    };

    inicializarNotaAclaratoriaNueva({
      form,
      trabajadorId: '507f1f77bcf86cd799439011',
      rutaPDF: 'ruta/pdf',
      userId: '507f1f77bcf86cd799439012',
    });

    expect(form.fechaNotaAclaratoria).toBe('2026-01-15');
    expect(form.createdBy).toBe('existing-user-id');
    expect(form.updatedBy).toBe('507f1f77bcf86cd799439012');
  });

  it('aplica nombre de documento externo', () => {
    const form: Record<string, unknown> = {};

    aplicarMetadatosDocumentoOrigen(form, 'documentosExternos', {
      nombreDocumento: 'Informe laboratorio',
      fechaDocumento: '2026-03-01',
    });

    expect(form.documentoOrigenNombre).toBe('Informe laboratorio');
    expect(form.documentoOrigenFecha).toBe('2026-03-01');
  });
});
