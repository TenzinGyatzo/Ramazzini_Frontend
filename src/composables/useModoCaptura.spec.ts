import { describe, expect, it } from 'vitest';
import {
  claveModoCaptura,
  documentoAdmiteCapturaRapida,
  guardarModoCaptura,
  leerModoCaptura,
} from '@/composables/useModoCaptura';

function almacenFalso() {
  const datos = new Map<string, string>();
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    datos,
  };
}

describe('preferencia de modo de captura (punto 38)', () => {
  it('sin preferencia, con vista previa (como siempre)', () => {
    expect(leerModoCaptura('u1', almacenFalso())).toBe('vistaPrevia');
  });

  it('se recuerda por usuario', () => {
    const almacen = almacenFalso();
    guardarModoCaptura('u1', 'capturaRapida', almacen);
    expect(leerModoCaptura('u1', almacen)).toBe('capturaRapida');
    expect(leerModoCaptura('u2', almacen)).toBe('vistaPrevia');
    expect(almacen.datos.has(claveModoCaptura('u1'))).toBe(true);
  });

  it('un valor raro o un almacén que falla no rompe nada', () => {
    const almacen = almacenFalso();
    almacen.setItem(claveModoCaptura('u1'), 'otraCosa');
    expect(leerModoCaptura('u1', almacen)).toBe('vistaPrevia');
    const roto = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(leerModoCaptura('u1', roto)).toBe('vistaPrevia');
    expect(() => guardarModoCaptura('u1', 'capturaRapida', roto)).not.toThrow();
    expect(leerModoCaptura('u1', null)).toBe('vistaPrevia');
  });

  it('solo la nota médica tiene captura rápida (y con sus secciones)', () => {
    expect(documentoAdmiteCapturaRapida('notaMedica')).toBe(true);
    expect(documentoAdmiteCapturaRapida('notaMedica', { nmLegacy: '1' })).toBe(false);
    expect(documentoAdmiteCapturaRapida('historiaClinica')).toBe(false);
    expect(documentoAdmiteCapturaRapida(null)).toBe(false);
  });
});
