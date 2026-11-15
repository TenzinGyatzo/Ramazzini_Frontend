import { describe, expect, it } from 'vitest';
import {
  conclusionConstanciaAdmision,
  fechaConDiaDeLaSemana,
  lugarDelProveedor,
  nombreArchivoConstanciaExamenAdmision,
  nombreConstanciaAdmision,
} from './constanciaExamenAdmision';
import {
  GRUPOS_PERMISOS_DOCUMENTOS,
  isDocumentBlockedForFirmante,
  mensajeBloqueoPorPerfil,
} from '@/constants/rolePermissionPolicy';
import { TIPOS_DOCUMENTO_EXPEDIENTE } from './documentosExpediente';
import { obtenerNombreArchivo } from './rutas';

describe('Constancia de examen médico de admisión (punto 35)', () => {
  it('mismos textos que el PDF', () => {
    expect(fechaConDiaDeLaSemana('2026-11-16')).toBe('lunes, 16 de noviembre de 2026');
    expect(fechaConDiaDeLaSemana('2026-11-16T00:00:00.000Z')).toBe('lunes, 16 de noviembre de 2026');
    expect(fechaConDiaDeLaSemana('')).toBe('');
    expect(lugarDelProveedor({ municipio: 'AHOME', estado: 'SINALOA' })).toBe('Ahome, Sinaloa');
    expect(nombreConstanciaAdmision({ primerApellido: 'Pérez', segundoApellido: '', nombre: 'José' })).toBe('PÉREZ JOSÉ');
    expect(conclusionConstanciaAdmision('Femenino')).toBe('CLÍNICAMENTE SANA Y APTA PARA EL PUESTO');
    expect(conclusionConstanciaAdmision('Masculino')).toBe('CLÍNICAMENTE SANO Y APTO PARA EL PUESTO');
  });

  it('el nombre del archivo coincide con el del servidor, también el que arma el expediente', () => {
    expect(nombreArchivoConstanciaExamenAdmision('2026-11-16')).toBe('Constancia Examen Admision 16-11-2026.pdf');
    const definicion = TIPOS_DOCUMENTO_EXPEDIENTE.find((d) => d.tipo === 'constanciaExamenAdmision')!;
    expect(definicion.clave).toBe('constanciasExamenAdmision');
    expect(obtenerNombreArchivo({}, definicion.etiquetaRuta, '16-11-2026')).toBe(
      'Constancia Examen Admision 16-11-2026.pdf',
    );
  });

  it('médicos y enfermeras la elaboran; técnicos no, con el motivo', () => {
    expect(isDocumentBlockedForFirmante('Médico', null, 'constanciaExamenAdmision')).toBe(false);
    expect(isDocumentBlockedForFirmante('Enfermero/a', null, 'constanciaExamenAdmision')).toBe(false);
    expect(isDocumentBlockedForFirmante('Principal', 'Enfermero/a', 'constanciaExamenAdmision')).toBe(false);
    expect(isDocumentBlockedForFirmante('Técnico Evaluador', null, 'constanciaExamenAdmision')).toBe(true);
    expect(mensajeBloqueoPorPerfil('Técnico Evaluador', null, 'constanciaExamenAdmision')).toBe(
      'La Constancia de examen médico de admisión la expide personal médico o de enfermería.',
    );
    // El certificado sigue siendo solo de médicos
    expect(isDocumentBlockedForFirmante('Enfermero/a', null, 'certificado')).toBe(true);
  });

  it('su permiso va en «Dictámenes y certificados»', () => {
    const grupo = GRUPOS_PERMISOS_DOCUMENTOS.find((g) => g.titulo === 'Dictámenes y certificados')!;
    expect(grupo.tipos).toContain('constanciaExamenAdmision');
  });
});
