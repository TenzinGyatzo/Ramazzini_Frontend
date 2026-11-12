import { describe, expect, it } from 'vitest';
import {
  validateNotaMedicaCexField,
  validateNotaMedicaCexQuantities,
  mensajeErrorCexField,
  isCexUnknown,
  puedeMostrarImcNotaMedica,
  hidratarPesoTallaDesconocidoNotaMedica,
  pesoTallaCapturado,
  aplicarSeDesconocePesoTalla,
} from './notaMedicaCexRanges';
import { validarNotaMedicaPreSubmit } from './validacionCampos';

function ymd(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('notaMedicaCexRanges', () => {
  it('isCexUnknown reconoce null/0/999 según campo', () => {
    expect(isCexUnknown('peso', null)).toBe(true);
    expect(isCexUnknown('peso', 999)).toBe(true);
    expect(isCexUnknown('peso', 70)).toBe(false);
    expect(isCexUnknown('glucemia', 0)).toBe(true);
    expect(isCexUnknown('frecuenciaCardiaca', 0)).toBe(true);
  });

  it('mensajeErrorCexField vacío si seDesconoce', () => {
    expect(mensajeErrorCexField('peso', 0, true)).toBe('');
    expect(mensajeErrorCexField('peso', 0, false)).toContain('mínimo');
  });

  it('acepta SpO2 65 y FR 70 (CEX, no util genérico)', () => {
    expect(validateNotaMedicaCexField('saturacionOxigeno', 65)).toBeNull();
    expect(validateNotaMedicaCexField('frecuenciaRespiratoria', 70)).toBeNull();
  });

  it('valida glucemia condicional', () => {
    // Sin elegir si fue en ayunas no se acepta; -1 es «Se desconoce» elegido
    expect(
      validateNotaMedicaCexQuantities({
        glucemia: 90,
        tipoMedicion: null,
        resultadoObtenidoaTravesde: 1,
      }),
    ).toBeTruthy();
    expect(
      validateNotaMedicaCexQuantities({
        glucemia: 90,
        tipoMedicion: -1,
        resultadoObtenidoaTravesde: 1,
      }),
    ).toBeNull();
    expect(
      validateNotaMedicaCexQuantities({
        glucemia: 90,
        tipoMedicion: 1,
        resultadoObtenidoaTravesde: 1,
      }),
    ).toBeNull();
  });

  it('rechaza 999 tecleado en peso y talla, no en glucemia', () => {
    expect(validateNotaMedicaCexField('peso', 999)).toContain('máximo');
    expect(validateNotaMedicaCexField('talla', 999)).toContain('máxima');
    expect(validateNotaMedicaCexField('glucemia', 999)).toBeNull();
    expect(mensajeErrorCexField('peso', 999, false)).toContain('máximo');
    expect(mensajeErrorCexField('peso', 999, true)).toBe('');
  });

  it('no muestra ni hidrata IMC si peso o talla son 999', () => {
    expect(puedeMostrarImcNotaMedica(999, 170)).toBe(false);
    expect(puedeMostrarImcNotaMedica(70, 999)).toBe(false);
    expect(puedeMostrarImcNotaMedica(70, 170)).toBe(true);

    const hidratado = hidratarPesoTallaDesconocidoNotaMedica({
      peso: 999,
      talla: 170,
      indiceMasaCorporal: 10.01,
      categoriaIMC: 'Bajo peso',
    });
    expect(hidratado.peso).toBeNull();
    expect(hidratado.talla).toBe(170);
    expect(hidratado.indiceMasaCorporal).toBeNull();
    expect(hidratado.categoriaIMC).toBeNull();

    const valido = hidratarPesoTallaDesconocidoNotaMedica({
      peso: 70,
      talla: 170,
      indiceMasaCorporal: 24.22,
      categoriaIMC: 'Normal',
    });
    expect(valido.indiceMasaCorporal).toBe(24.22);
    expect(valido.categoriaIMC).toBe('Normal');
  });
});

describe('validarNotaMedicaPreSubmit CEX', () => {
  it('bloquea rango inválido y apunta a signos', () => {
    const r = validarNotaMedicaPreSubmit(
      {
        fechaNotaMedica: ymd(),
        frecuenciaCardiaca: 30,
      },
      { fechaNacimiento: '1990-01-01' },
      true,
      false,
    );
    expect(r.valido).toBe(false);
    expect(r.mensaje).toContain('40');
    expect(r.paso).toBe(6); // SIRES hombre: signos = 6
  });

  it('bloquea glucemia sin tipoMedicion en SIRES', () => {
    const r = validarNotaMedicaPreSubmit(
      {
        fechaNotaMedica: ymd(),
        glucemia: 100,
        tipoMedicion: null,
        resultadoObtenidoaTravesde: 1,
      },
      { fechaNacimiento: '1990-01-01' },
      true,
      false,
    );
    expect(r.valido).toBe(false);
    expect(r.paso).toBe(8);
  });

  it('no valida somatometría/glucemia en SIN_REGIMEN', () => {
    const r = validarNotaMedicaPreSubmit(
      {
        fechaNotaMedica: '2024-01-15',
        glucemia: 5,
        tipoMedicion: -1,
      },
      { fechaNacimiento: '1990-01-01' },
      false,
      false,
    );
    expect(r.valido).toBe(true);
  });

  it('acepta payload CEX válido', () => {
    const r = validarNotaMedicaPreSubmit(
      {
        fechaNotaMedica: ymd(),
        tensionArterialSistolica: 120,
        tensionArterialDiastolica: 80,
        frecuenciaCardiaca: 72,
        frecuenciaRespiratoria: 18,
        temperatura: 36.5,
        saturacionOxigeno: 65,
        peso: 70.5,
        talla: 170,
        circunferenciaCintura: 80,
        glucemia: 100,
        tipoMedicion: 1,
        resultadoObtenidoaTravesde: 2,
      },
      { fechaNacimiento: '1990-01-01' },
      true,
      false,
    );
    expect(r.valido).toBe(true);
  });

  it('bloquea peso 999 tecleado en SIRES', () => {
    const r = validarNotaMedicaPreSubmit(
      {
        fechaNotaMedica: ymd(),
        peso: 999,
        talla: 170,
      },
      { fechaNacimiento: '1990-01-01' },
      true,
      false,
    );
    expect(r.valido).toBe(false);
    expect(r.mensaje).toContain('400');
    expect(r.paso).toBe(7);
  });

  it('acepta peso/talla desconocidos (null) sin IMC', () => {
    const r = validarNotaMedicaPreSubmit(
      {
        fechaNotaMedica: ymd(),
        peso: null,
        talla: null,
        indiceMasaCorporal: null,
      },
      { fechaNacimiento: '1990-01-01' },
      true,
      false,
    );
    expect(r.valido).toBe(true);
  });
});

describe('peso y talla: valor o «Se desconoce» marcado', () => {
  it('capturado: número o casilla; vacío no', () => {
    expect(pesoTallaCapturado('peso', { peso: 70 })).toBe(true);
    expect(pesoTallaCapturado('peso', { peso: null, pesoSeDesconoce: true })).toBe(true);
    expect(pesoTallaCapturado('peso', { peso: null, pesoSeDesconoce: false })).toBe(false);
    expect(pesoTallaCapturado('talla', { talla: '' })).toBe(false);
    expect(pesoTallaCapturado('talla', {})).toBe(false);
  });

  it('al enviar, la casilla se vuelve 999 y no viaja', () => {
    const out = aplicarSeDesconocePesoTalla({
      peso: null,
      talla: 170,
      pesoSeDesconoce: true,
      tallaSeDesconoce: false,
    });
    expect(out).toEqual({ peso: 999, talla: 170 });
    expect(aplicarSeDesconocePesoTalla({ peso: null })).toEqual({ peso: null });
  });

  it('al editar, lo guardado como 999 llega con la casilla marcada', () => {
    const doc = hidratarPesoTallaDesconocidoNotaMedica({ peso: 999, talla: 170 }) as any;
    expect(doc.pesoSeDesconoce).toBe(true);
    expect(doc.tallaSeDesconoce).toBe(false);
  });
});
