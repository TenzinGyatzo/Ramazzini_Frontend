import { describe, expect, it } from 'vitest';
import { esAtajoSubirNivel, vistaPadre } from './navegacionJerarquica';

const ruta = (name: string, params: Record<string, string> = {}) => ({ name, params });
const P = { idEmpresa: 'e1', idCentroTrabajo: 'c1', idTrabajador: 't1' };

describe('subir un nivel', () => {
  it('sigue la cadena documento → expediente → trabajadores → centros → empresas → Inicio', () => {
    expect(vistaPadre(ruta('crear-documento', { ...P, tipoDocumento: 'aptitud' }))).toEqual({
      destino: { name: 'expediente-medico', params: P },
    });
    expect(vistaPadre(ruta('expediente-medico', P))).toEqual({
      destino: { name: 'trabajadores', params: { idEmpresa: 'e1', idCentroTrabajo: 'c1' } },
      recordarTrabajador: ['c1', 't1'],
    });
    expect(vistaPadre(ruta('trabajadores', P))).toEqual({
      destino: { name: 'centros-trabajo', params: { idEmpresa: 'e1' } },
      enfocar: 'c1',
    });
    expect(vistaPadre(ruta('centros-trabajo', { idEmpresa: 'e1' }))).toEqual({
      destino: { name: 'empresas' },
      enfocar: 'e1',
    });
    expect(vistaPadre(ruta('empresas'))).toEqual({ destino: { name: 'inicio' } });
  });

  it('las vistas de una empresa suben a sus centros; las de incapacidades, a incapacidades', () => {
    for (const name of ['incapacidades-empresa', 'dashboard-empresa', 'informes-salud-ocupacional']) {
      expect(vistaPadre(ruta(name, { idEmpresa: 'e1' }))?.destino).toEqual({
        name: 'centros-trabajo',
        params: { idEmpresa: 'e1' },
      });
    }
    expect(vistaPadre(ruta('incapacidades-prima', { idEmpresa: 'e1' }))?.destino).toEqual({
      name: 'incapacidades-empresa',
      params: { idEmpresa: 'e1' },
    });
    expect(vistaPadre(ruta('inventario', P))).toEqual({
      destino: { name: 'centros-trabajo', params: { idEmpresa: 'e1' } },
      enfocar: 'c1',
    });
  });

  it('Inicio y las vistas sueltas no tienen padre', () => {
    expect(vistaPadre(ruta('inicio'))).toBeNull();
    expect(vistaPadre(ruta('modulos-funciones'))).toBeNull();
    expect(vistaPadre(ruta('documento', { idDocumento: 'd1' }))).toBeNull();
    expect(vistaPadre({ name: undefined, params: {} })).toBeNull();
  });

  it('el atajo es Alt + ⌫, sin otras teclas', () => {
    const base = { key: 'Backspace', altKey: true, ctrlKey: false, metaKey: false, shiftKey: false };
    expect(esAtajoSubirNivel(base)).toBe(true);
    expect(esAtajoSubirNivel({ ...base, altKey: false })).toBe(false);
    expect(esAtajoSubirNivel({ ...base, ctrlKey: true })).toBe(false);
    expect(esAtajoSubirNivel({ ...base, shiftKey: true })).toBe(false);
    expect(esAtajoSubirNivel({ ...base, key: 'Delete' })).toBe(false);
  });
});
