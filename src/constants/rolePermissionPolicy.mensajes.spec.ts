import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_DISPLAY_NAMES,
  DOCUMENT_PERMISSION_KEYS,
  DOCUMENT_PERMISSION_KEYS_SIN_GRUPO,
  getDocumentRestrictionMessage,
  getGrupoPermisosDeDocumento,
} from '@/constants/rolePermissionPolicy';
import { motivoBloqueoDocumento } from '@/helpers/permisosUsuario';

describe('mensaje de documento sin permiso', () => {
  it('nombra el documento y su grupo de la pantalla de permisos, no la categoría anterior', () => {
    expect(getDocumentRestrictionMessage('notaEnfermeria')).toBe(
      'No tienes permiso para el documento «Nota de Enfermería» (Consulta y prescripción).',
    );
    expect(getDocumentRestrictionMessage('aptitud')).toBe(
      'No tienes permiso para el documento «Aptitud para el Puesto» (Dictámenes y certificados).',
    );
    expect(getDocumentRestrictionMessage('antidoping')).toBe(
      'No tienes permiso para el documento «Antidoping» (Pruebas toxicológicas).',
    );
    expect(getDocumentRestrictionMessage('notaEnfermeria')).not.toMatch(/diagn[oó]stico/i);
  });

  it('ningún documento cae en «evaluación» u «otros documentos»', () => {
    for (const tipo of DOCUMENT_PERMISSION_KEYS) {
      if (DOCUMENT_PERMISSION_KEYS_SIN_GRUPO.includes(tipo)) continue;
      expect(getGrupoPermisosDeDocumento(tipo), tipo).not.toBeNull();
      expect(DOCUMENT_DISPLAY_NAMES[tipo], tipo).toBeTruthy();
      expect(getDocumentRestrictionMessage(tipo)).not.toMatch(/otros documentos|de evaluación|diagnóstico y certificación/);
    }
  });

  it('la nota aclaratoria señala el documento que aclara', () => {
    expect(getDocumentRestrictionMessage('notaAclaratoria', 'historiasClinicas')).toBe(
      'No tienes permiso para el documento «Historia Clínica» (Evaluaciones clínicas), por eso no puedes hacer su nota aclaratoria.',
    );
    expect(getDocumentRestrictionMessage('notaAclaratoria')).toBe(
      'No tienes permiso para el documento «Nota Aclaratoria».',
    );
  });

  it('tipo desconocido: mensaje genérico', () => {
    expect(getDocumentRestrictionMessage('loQueSea')).toBe('No tienes permiso para este tipo de documento.');
  });
});

describe('motivo de bloqueo en la pantalla de permisos', () => {
  it('la Nota de enfermería no dice que la expide un médico', () => {
    expect(motivoBloqueoDocumento('Médico', 'notaEnfermeria')).toBe('Exclusivo del personal de enfermería');
    expect(motivoBloqueoDocumento('Enfermero/a', 'certificado')).toBe('Solo lo expide un médico');
  });
});
