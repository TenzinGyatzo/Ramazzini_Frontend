import { describe, expect, it } from 'vitest';
import {
  canCreateDocumentType,
  canManageDocumentPermission,
  mensajeBloqueoPorPerfil,
} from '@/constants/rolePermissionPolicy';
import { MENSAJE_NOTA_ENFERMERIA_PARA_MEDICOS, normalizarNotaEnfermeria } from '@/helpers/notaEnfermeria';
import { validarCamposRequeridos } from '@/helpers/validacionCampos';

const permisos = { gestionarDocumentosDiagnostico: true };

describe('Nota de enfermería: perfil y permisos (igual que el servidor)', () => {
  it('solo la elabora quien firma como enfermera', () => {
    expect(canCreateDocumentType('Enfermero/a', permisos, 'notaEnfermeria')).toBe(true);
    expect(canCreateDocumentType('Principal', permisos, 'notaEnfermeria', 'Enfermero/a')).toBe(true);
    expect(canCreateDocumentType('Médico', permisos, 'notaEnfermeria')).toBe(false);
    expect(canCreateDocumentType('Principal', permisos, 'notaEnfermeria')).toBe(false);
    expect(canCreateDocumentType('Técnico Evaluador', permisos, 'notaEnfermeria')).toBe(false);
  });

  it('a los médicos les indica la Nota médica; a los demás, solo que es de enfermería', () => {
    expect(mensajeBloqueoPorPerfil('Médico', null, 'notaEnfermeria')).toBe(MENSAJE_NOTA_ENFERMERIA_PARA_MEDICOS);
    expect(mensajeBloqueoPorPerfil('Técnico Evaluador', null, 'notaEnfermeria')).toBe(
      'La Nota de enfermería es exclusiva del personal de enfermería.',
    );
    expect(mensajeBloqueoPorPerfil('Enfermero/a', null, 'notaEnfermeria')).toBe('');
  });

  it('la Nota médica y los certificados siguen igual', () => {
    expect(canCreateDocumentType('Médico', permisos, 'notaMedica')).toBe(true);
    expect(canCreateDocumentType('Enfermero/a', permisos, 'notaMedica')).toBe(true);
    expect(canCreateDocumentType('Enfermero/a', permisos, 'certificado')).toBe(false);
    expect(mensajeBloqueoPorPerfil('Enfermero/a', null, 'certificado')).toBe(
      'Los certificados médicos solo puede expedirlos un médico.',
    );
  });

  it('el permiso del documento (sin perfil) lo tiene el médico, para anularla', () => {
    expect(canManageDocumentPermission('Médico', permisos, 'notaEnfermeria')).toBe(true);
  });
});

describe('normalizarNotaEnfermeria', () => {
  it('quita tomas, renglones y textos que no aplican', () => {
    const nota = normalizarNotaEnfermeria({
      signosVitales: {},
      tomasControl: [{ hora: '10:00' }, { hora: '10:30', dolor: 2 }],
      medicamentos: [
        { nombre: '  ', cantidad: 1, uso: 'ADMINISTRADO' },
        { nombre: 'Paracetamol', cantidad: 1, uso: 'ADMINISTRADO', via: undefined, dosis: ' ', hora: '' },
        { idInsumo: 'abc', nombre: 'Gasas', cantidad: 2, uso: 'ENTREGADO' },
      ],
      procedimientos: ['curacion'],
      procedimientoOtro: 'quedó de antes',
    });
    expect(nota).not.toHaveProperty('signosVitales');
    expect(nota.tomasControl).toEqual([{ hora: '10:30', dolor: 2 }]);
    expect(nota.medicamentos).toEqual([
      { nombre: 'Paracetamol', cantidad: 1, uso: 'ADMINISTRADO' },
      { idInsumo: 'abc', nombre: 'Gasas', cantidad: 2, uso: 'ENTREGADO' },
    ]);
    expect(nota).not.toHaveProperty('procedimientoOtro');
  });

  it('sin medicamentos ni tomas no manda las listas', () => {
    const nota = normalizarNotaEnfermeria({ medicamentos: [], tomasControl: [] });
    expect(nota).not.toHaveProperty('medicamentos');
    expect(nota).not.toHaveProperty('tomasControl');
  });
});

describe('campos obligatorios de la nota de enfermería', () => {
  const completa = {
    fechaNotaEnfermeria: '2026-11-05',
    horaAtencion: '09:30',
    relacionTemporal: 'primeraVez',
    motivoAtencion: 'Cefalea',
    tipoProblema: 'sintoma',
    sistema: 'neurologico',
    origen: 'enfermedadGeneral',
    habitusExterior: 'Sin alteraciones',
    destino: 'regresaPuesto',
  };

  it('sin signos vitales ni medicamentos la nota está completa', () => {
    expect(validarCamposRequeridos('notaEnfermeria', completa).esValido).toBe(true);
  });

  it('dice qué falta y en qué paso', () => {
    const { camposFaltantes } = validarCamposRequeridos('notaEnfermeria', {
      ...completa,
      sistema: '',
      destino: undefined,
      procedimientos: ['otro'],
    });
    expect(camposFaltantes).toEqual([
      expect.objectContaining({ nombre: 'Aparato o sistema', paso: 2 }),
      expect.objectContaining({ nombre: 'Descripción del procedimiento «Otro»', paso: 4 }),
      expect.objectContaining({ nombre: 'Destino del trabajador', paso: 5 }),
    ]);
  });
});

describe('nota de enfermería en el expediente', () => {
  it('el archivo lleva la hora, igual que el servidor', async () => {
    const { obtenerNombreArchivo } = await import('@/helpers/rutas');
    expect(obtenerNombreArchivo({ horaAtencion: '09:30' }, 'Nota Enfermeria', '05-11-2026')).toBe(
      'Nota Enfermeria 05-11-2026 0930.pdf',
    );
    expect(obtenerNombreArchivo({}, 'Nota Enfermeria', '05-11-2026')).toBe('Nota Enfermeria 05-11-2026.pdf');
  });

  it('va después de la nota médica y se agrupa sola desde dos notas', async () => {
    const { TIPOS_DOCUMENTO_EXPEDIENTE, REGLAS_SUBGRUPOS_AUTOMATICOS } = await import('@/helpers/documentosExpediente');
    const tipos = TIPOS_DOCUMENTO_EXPEDIENTE.map((d) => d.tipo);
    expect(tipos.indexOf('notaEnfermeria')).toBe(tipos.indexOf('notaMedica') + 1);
    const regla = REGLAS_SUBGRUPOS_AUTOMATICOS.find((r) => r.id === 'auto-notas-enfermeria')!;
    expect(regla.aplica((t) => (t === 'notaEnfermeria' ? 1 : 0))).toBe(false);
    expect(regla.aplica((t) => (t === 'notaEnfermeria' ? 2 : 0))).toBe(true);
  });

  it('un médico puede hacerle nota aclaratoria', () => {
    expect(canCreateDocumentType('Médico', permisos, 'notaAclaratoria', null, 'notaEnfermeria')).toBe(true);
  });
});
