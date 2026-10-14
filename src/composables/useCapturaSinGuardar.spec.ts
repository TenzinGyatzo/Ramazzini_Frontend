import { describe, expect, it } from 'vitest';
import { crearVigilanteDeCaptura } from './useCapturaSinGuardar';

describe('crearVigilanteDeCaptura', () => {
  it('sin interacción del usuario no hay cambios aunque el sistema rellene campos', () => {
    const form: Record<string, unknown> = {};
    const vigilante = crearVigilanteDeCaptura(() => form);
    form.rutaPDF = '/expedientes/x/';
    form.fechaExamen = '2026-10-13';
    expect(vigilante.hayCambios()).toBe(false);
  });

  it('hay cambios cuando el usuario modifica algo después de interactuar', () => {
    const form: Record<string, unknown> = { fechaExamen: '2026-10-13' };
    const vigilante = crearVigilanteDeCaptura(() => form);
    vigilante.registrarInteraccion();
    form.motivo = 'Ingreso';
    expect(vigilante.hayCambios()).toBe(true);
  });

  it('interactuar sin cambiar nada (p. ej. solo enfocar un campo) no cuenta', () => {
    const form: Record<string, unknown> = { motivo: '' };
    const vigilante = crearVigilanteDeCaptura(() => form);
    vigilante.registrarInteraccion();
    expect(vigilante.hayCambios()).toBe(false);
  });

  it('volver al valor original deja de contar como cambio', () => {
    const form: Record<string, unknown> = { motivo: 'Ingreso' };
    const vigilante = crearVigilanteDeCaptura(() => form);
    vigilante.registrarInteraccion();
    form.motivo = 'Periódico';
    form.motivo = 'Ingreso';
    expect(vigilante.hayCambios()).toBe(false);
  });

  it('la referencia se toma en la primera interacción, no en las siguientes', () => {
    const form: Record<string, unknown> = { motivo: '' };
    const vigilante = crearVigilanteDeCaptura(() => form);
    vigilante.registrarInteraccion();
    form.motivo = 'Ingreso';
    vigilante.registrarInteraccion();
    expect(vigilante.hayCambios()).toBe(true);
  });

  it('reiniciar olvida la referencia (otro documento en la misma pantalla)', () => {
    const form: Record<string, unknown> = { motivo: '' };
    const vigilante = crearVigilanteDeCaptura(() => form);
    vigilante.registrarInteraccion();
    form.motivo = 'Ingreso';
    vigilante.reiniciar();
    expect(vigilante.hayCambios()).toBe(false);
  });
});
