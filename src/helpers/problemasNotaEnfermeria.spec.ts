import { describe, expect, it } from 'vitest';
import { problemasNotaEnfermeria, ordenarProblemas } from './problemasDocumento';
import { normalizarNotaEnfermeria } from './notaEnfermeria';
import { validarCamposRequeridos } from './validacionCampos';

/** Como en FormStepper: obligatorios sobre lo que se enviará, detalle sobre lo capturado. */
const problemas = (nota: Record<string, any>) =>
  ordenarProblemas(
    problemasNotaEnfermeria(
      validarCamposRequeridos('notaEnfermeria', normalizarNotaEnfermeria(nota)).camposFaltantes,
      nota,
    ),
  );

const completa = () => ({
  fechaNotaEnfermeria: '2026-11-10',
  horaAtencion: '09:30',
  relacionTemporal: 'primeraVez',
  motivoAtencion: 'Cefalea',
  tipoProblema: 'sintoma',
  sistema: 'neurologico',
  origen: 'enfermedadGeneral',
  habitusExterior: 'Consciente y orientado',
  destino: 'regresaPuesto',
  signosVitales: {},
});

describe('problemasNotaEnfermeria', () => {
  it('nota completa: nada pendiente', () => {
    expect(problemas(completa())).toEqual([]);
  });

  it('vacía: pide cada dato en el orden de los pasos y de la pantalla, con su instrucción', () => {
    const lista = problemas({ signosVitales: {} });
    expect(lista.map((p) => p.campo)).toEqual([
      'fechaNotaEnfermeria',
      'horaAtencion',
      'relacionTemporal',
      'motivoAtencion',
      'tipoProblema',
      'sistema',
      'origen',
      'habitusExterior',
      'destino',
    ]);
    expect(lista[2].mensaje).toBe('Indica si es la primera vez que se le atiende por este motivo.');
    expect(lista.every((p) => p.falta)).toBe(true);
  });

  it('signos vitales: lleva al signo exacto de cada toma, con el motivo', () => {
    const lista = problemas({
      ...completa(),
      signosVitales: { frecuenciaCardiaca: 300, tensionArterialSistolica: 120 },
      tomasControl: [{ hora: '10:00', temperatura: 36.55 }],
    });
    expect(lista).toEqual([
      expect.objectContaining({
        paso: 4,
        campo: 'signosVitales.frecuenciaCardiaca',
        nombre: 'Frecuencia cardiaca (toma inicial)',
        falta: false,
        mensaje: 'Frecuencia cardiaca: debe estar entre 40 y 220.',
      }),
      expect.objectContaining({
        campo: 'signosVitales.tensionArterialDiastolica',
        falta: true,
        mensaje: 'Escribe la tensión arterial diastólica; la tensión arterial lleva las dos cifras.',
      }),
      expect.objectContaining({
        campo: 'tomasControl.0.temperatura',
        nombre: 'Temperatura (toma de control 1)',
        mensaje: 'Temperatura: solo un decimal.',
      }),
    ]);
  });

  it('una sistólica sola no se pierde al guardar: se pide la diastólica', () => {
    const lista = problemas({ ...completa(), signosVitales: { tensionArterialSistolica: 120 } });
    expect(lista.map((p) => p.campo)).toEqual(['signosVitales.tensionArterialDiastolica']);
  });

  it('toma de control con signos y sin hora: pide la hora de esa toma; vacía no se pide', () => {
    const lista = problemas({
      ...completa(),
      tomasControl: [{}, { hora: '', dolor: 3 }],
    });
    expect(lista).toEqual([
      expect.objectContaining({
        campo: 'tomasControl.1.hora',
        mensaje: 'Escribe la hora de la toma de control 2.',
      }),
    ]);
  });

  it('medicamentos: lleva a la cantidad del renglón; los renglones vacíos no se piden', () => {
    const lista = problemas({
      ...completa(),
      medicamentos: [
        { nombre: '', cantidad: '' },
        { nombre: 'Paracetamol', cantidad: '' },
        { idInsumo: 'ins1', nombre: 'Ibuprofeno', cantidad: 1.5 },
      ],
    });
    expect(lista).toEqual([
      expect.objectContaining({
        paso: 6,
        campo: 'medicamentos.1.cantidad',
        falta: true,
        mensaje: 'Escribe la cantidad del medicamento 2.',
      }),
      expect.objectContaining({
        campo: 'medicamentos.2.cantidad',
        falta: false,
        mensaje: 'La cantidad del medicamento 3 debe ser un número entero desde 1.',
      }),
    ]);
  });

  it('procedimiento «Otro» sin descripción', () => {
    const lista = problemas({ ...completa(), procedimientos: ['otro'] });
    expect(lista).toEqual([
      expect.objectContaining({
        paso: 5,
        campo: 'procedimientoOtro',
        mensaje: 'Escribe qué otro procedimiento se realizó.',
      }),
    ]);
  });
});
