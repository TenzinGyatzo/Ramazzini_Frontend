import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_PERMISSION_KEYS,
  DOCUMENT_PERMISSION_KEYS_SIN_GRUPO,
  GRUPOS_PERMISOS_DOCUMENTOS,
  canCreateDocumentType,
  resolveDocumentPermissions,
  sanitizePermissionsForRole,
} from '@/constants/rolePermissionPolicy';
import {
  agregarEmpresa,
  alternarCentro,
  aplicarAGrupo,
  asignacionesCambiaron,
  asignacionesDe,
  marcarCentrosDeEmpresa,
  quitarEmpresa,
  cargaParaGuardar,
  contarAjustesRespectoAlRol,
  estadoGrupo,
  gruposVisibles,
  motivoBloqueoDocumento,
  permisosEditablesDe,
  predeterminadosDelRol,
} from './permisosUsuario';

const opciones = { esMexico: true, controlPrenatalHabilitado: true, inventarioHabilitado: true };
const grupo = (id: string) => GRUPOS_PERMISOS_DOCUMENTOS.find((g) => g.id === id)!;

describe('grupos de permisos por documento', () => {
  it('cada permiso por documento está en exactamente un grupo, salvo los retirados', () => {
    const tipos = GRUPOS_PERMISOS_DOCUMENTOS.flatMap((g) => g.tipos);
    expect(new Set(tipos).size).toBe(tipos.length);
    const esperados = DOCUMENT_PERMISSION_KEYS.filter((k) => !DOCUMENT_PERMISSION_KEYS_SIN_GRUPO.includes(k));
    expect([...tipos].sort()).toEqual([...esperados].sort());
  });

  it('oculta lo que el proveedor no tiene y el grupo que queda vacío', () => {
    const sinPrenatal = gruposVisibles({ ...opciones, controlPrenatalHabilitado: false });
    expect(sinPrenatal.flatMap((g) => g.tipos)).not.toContain('controlPrenatal');
    expect(sinPrenatal.map((g) => g.id)).not.toContain('materna');
  });
});

describe('usuarios con permisos anteriores', () => {
  // Guardado antes del cambio: solo las cuatro categorías
  const tecnicoAnterior = sanitizePermissionsForRole('Técnico Evaluador', {
    gestionarDocumentosEvaluacion: true,
    gestionarOtrosDocumentos: false,
  });

  it('se editan con lo que hoy pueden hacer', () => {
    const { documentos } = permisosEditablesDe('Técnico Evaluador', tecnicoAnterior);
    expect(documentos.audiometria).toBe(true);
    expect(documentos.resultadoClinico).toBe(true);
    expect(documentos.cuestionarioNordico).toBe(false);
    expect(documentos.aptitud).toBe(false);
  });

  it('cambiar solo un permiso general no los pasa a permisos por documento', () => {
    const antes = permisosEditablesDe('Técnico Evaluador', tecnicoAnterior);
    const despues = { ...antes, generales: { ...antes.generales, accesoDashboardSalud: false } };
    const carga = cargaParaGuardar(antes, despues, false);
    expect(carga.documentos).toBeUndefined();
    expect(carga.accesoDashboardSalud).toBe(false);
  });

  it('al cambiar un documento se envían todos y conserva lo demás', () => {
    const antes = permisosEditablesDe('Técnico Evaluador', tecnicoAnterior);
    const despues = { ...antes, documentos: { ...antes.documentos, audiometria: false } };
    const carga = cargaParaGuardar(antes, despues, false);
    expect(Object.keys(carga.documentos!).sort()).toEqual([...DOCUMENT_PERMISSION_KEYS].sort());
    const guardado = sanitizePermissionsForRole('Técnico Evaluador', carga);
    const efectivos = resolveDocumentPermissions('Técnico Evaluador', guardado);
    const anteriores = resolveDocumentPermissions('Técnico Evaluador', tecnicoAnterior);
    expect({ ...efectivos, audiometria: true }).toEqual(anteriores);
    expect(canCreateDocumentType('Técnico Evaluador', guardado, 'audiometria')).toBe(false);
    expect(canCreateDocumentType('Técnico Evaluador', guardado, 'examenVista')).toBe(true);
  });
});

describe('estado de cada grupo', () => {
  it('distingue todos, ninguno, algunos y bloqueado por rol', () => {
    const { documentos } = predeterminadosDelRol('Técnico Evaluador');
    expect(estadoGrupo('Técnico Evaluador', documentos, grupo('auditiva').tipos)).toBe('todos');
    expect(estadoGrupo('Técnico Evaluador', documentos, grupo('dictamenes').tipos)).toBe('bloqueado');
    const algunos = { ...documentos, audiometria: false };
    expect(estadoGrupo('Técnico Evaluador', algunos, grupo('auditiva').tipos)).toBe('algunos');
    const ninguno = aplicarAGrupo('Técnico Evaluador', documentos, grupo('auditiva').tipos, false);
    expect(estadoGrupo('Técnico Evaluador', ninguno, grupo('auditiva').tipos)).toBe('ninguno');
  });

  it('marcar un grupo no toca lo que el rol no puede tener', () => {
    const { documentos } = predeterminadosDelRol('Enfermero/a');
    const marcado = aplicarAGrupo('Enfermero/a', documentos, grupo('dictamenes').tipos, true);
    expect(marcado.aptitud).toBe(true);
    expect(marcado.certificado).toBe(documentos.certificado);
    expect(motivoBloqueoDocumento('Enfermero/a', 'certificado')).toBe('Solo lo expide un médico');
    expect(estadoGrupo('Enfermero/a', marcado, grupo('dictamenes').tipos)).toBe('todos');
  });

  it('Administrativo solo puede tener documentos externos', () => {
    const { documentos } = predeterminadosDelRol('Administrativo');
    for (const g of GRUPOS_PERMISOS_DOCUMENTOS) {
      const esperado = g.id === 'resultadosExternos' ? 'todos' : 'bloqueado';
      expect(estadoGrupo('Administrativo', documentos, g.tipos)).toBe(esperado);
    }
    expect(motivoBloqueoDocumento('Administrativo', 'resultadoClinico')).toBe(
      'No disponible para el rol Administrativo',
    );
  });
});

describe('ajustes respecto al rol', () => {
  it('cuenta solo lo visible y editable', () => {
    const base = predeterminadosDelRol('Médico');
    expect(contarAjustesRespectoAlRol('Médico', base, opciones)).toBe(0);
    const ajustado = {
      generales: { ...base.generales, gestionarEmpresas: true },
      // Detección ya no se muestra: no cuenta como ajuste
      documentos: { ...base.documentos, receta: false, deteccion: false, controlPrenatal: false },
    };
    expect(contarAjustesRespectoAlRol('Médico', ajustado, opciones)).toBe(3);
    expect(
      contarAjustesRespectoAlRol('Médico', ajustado, { ...opciones, controlPrenatalHabilitado: false }),
    ).toBe(2);
  });
});

describe('asignaciones', () => {
  const vacias = { empresas: [] as string[], centros: [] as string[] };

  it('agregar una empresa asigna todos sus centros y quitarla los quita', () => {
    const conA = agregarEmpresa(vacias, 'A', ['a1', 'a2']);
    expect(conA).toEqual({ empresas: ['A'], centros: ['a1', 'a2'] });
    const conB = agregarEmpresa(conA, 'B', ['b1']);
    expect(quitarEmpresa(conB, 'A', ['a1', 'a2'])).toEqual({ empresas: ['B'], centros: ['b1'] });
    expect(agregarEmpresa(conA, 'A', ['a1', 'a2'])).toBe(conA);
  });

  it('alterna y marca centros sin tocar los de otras empresas', () => {
    const base = { empresas: ['A', 'B'], centros: ['a1', 'a2', 'b1'] };
    expect(alternarCentro(base, 'a1').centros).toEqual(['a2', 'b1']);
    expect(alternarCentro(base, 'a3').centros).toEqual(['a1', 'a2', 'b1', 'a3']);
    expect(marcarCentrosDeEmpresa(base, ['a1', 'a2', 'a3'], false).centros).toEqual(['b1']);
    expect(marcarCentrosDeEmpresa(base, ['a1', 'a2', 'a3'], true).centros.sort()).toEqual(['a1', 'a2', 'a3', 'b1']);
  });

  it('el orden no cuenta como cambio y los ids se normalizan a texto', () => {
    const guardadas = asignacionesDe({ empresasAsignadas: ['A', 'B'], centrosTrabajoAsignados: [1 as unknown as string] });
    expect(guardadas.centros).toEqual(['1']);
    expect(asignacionesCambiaron(guardadas, { empresas: ['B', 'A'], centros: ['1'] })).toBe(false);
    expect(asignacionesCambiaron(guardadas, { empresas: ['A'], centros: ['1'] })).toBe(true);
  });
});
