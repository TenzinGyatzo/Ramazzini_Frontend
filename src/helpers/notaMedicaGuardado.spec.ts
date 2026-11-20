import { describe, expect, it } from 'vitest';
import { prepararNotaMedicaParaGuardar } from '@/helpers/notaMedicaGuardado';

const conRegimen = { showSires: true, esMujer: false };
const sinRegimen = { showSires: false, esMujer: false };

describe('prepararNotaMedicaParaGuardar (punto 38)', () => {
  it('textos sin escribir viajan vacíos y las listas, vacías', () => {
    const df = prepararNotaMedicaParaGuardar({ motivoConsulta: undefined, antecedentes: null }, sinRegimen);
    expect(df.motivoConsulta).toBe('');
    expect(df.antecedentes).toBe('');
    expect(df.exploracionFisica).toBe('');
    expect(df.observaciones).toBe('');
    expect(df.tratamiento).toEqual([]);
    expect(df.recomendaciones).toEqual([]);
  });

  it('no toca lo que sí se capturó', () => {
    const df = prepararNotaMedicaParaGuardar(
      {
        motivoConsulta: 'Dolor lumbar',
        tratamiento: ['Paracetamol'],
        tensionArterialSistolica: 120,
        tensionArterialDiastolica: 80,
        frecuenciaCardiaca: 72,
        glucemia: 95,
        tipoMedicion: 1,
        resultadoObtenidoaTravesde: 2,
      },
      conRegimen,
    );
    expect(df.motivoConsulta).toBe('Dolor lumbar');
    expect(df.tratamiento).toEqual(['Paracetamol']);
    expect(df.tensionArterialSistolica).toBe(120);
    expect(df.tensionArterialDiastolica).toBe(80);
    expect(df.frecuenciaCardiaca).toBe(72);
    expect(df.glucemia).toBe(95);
    expect(df.tipoMedicion).toBe(1);
    expect(df.resultadoObtenidoaTravesde).toBe(2);
  });

  it('signos vitales sin capturar → «Se desconoce» (también sin régimen)', () => {
    const df = prepararNotaMedicaParaGuardar({ frecuenciaCardiaca: 72, temperatura: null }, sinRegimen);
    expect(df.frecuenciaCardiaca).toBe(72);
    expect(df.temperatura).toBe(0);
    expect(df.frecuenciaRespiratoria).toBe(0);
    expect(df.saturacionOxigeno).toBe(0);
    expect(df.tensionArterialSistolica).toBe(0);
    expect(df.tensionArterialDiastolica).toBe(0);
  });

  it('una presión sin capturar → las dos «Se desconoce», como al salir del paso', () => {
    const df = prepararNotaMedicaParaGuardar(
      { tensionArterialSistolica: 120, tensionArterialDiastolica: null },
      sinRegimen,
    );
    expect(df.tensionArterialSistolica).toBe(0);
    expect(df.tensionArterialDiastolica).toBe(0);
  });

  it('glucemia sin capturar → «Se desconoce» solo con régimen', () => {
    const con = prepararNotaMedicaParaGuardar({ glucemia: null, tipoMedicion: null }, conRegimen);
    expect(con.glucemia).toBe(0);
    expect(con.tipoMedicion).toBe(-1);
    expect(con.resultadoObtenidoaTravesde).toBe(-1);

    const sin = prepararNotaMedicaParaGuardar({}, sinRegimen);
    expect(sin.glucemia).toBeUndefined();
  });

  it('embarazo no aplica sin régimen o si no es trabajadora', () => {
    const hombre = prepararNotaMedicaParaGuardar({ relacionTemporalEmbarazo: 0 }, conRegimen);
    expect(hombre.relacionTemporalEmbarazo).toBe(-1);
    expect(hombre.trimestreGestacional).toBe(-1);

    const mujer = prepararNotaMedicaParaGuardar(
      { relacionTemporalEmbarazo: 0, trimestreGestacional: 2 },
      { showSires: true, esMujer: true },
    );
    expect(mujer.relacionTemporalEmbarazo).toBe(0);
    expect(mujer.trimestreGestacional).toBe(2);
  });

  it('quita lo que no viaja y lo que no aplica', () => {
    const df = prepararNotaMedicaParaGuardar(
      {
        relacionTemporal: 0,
        primeraVezUneme: 1,
        primeraVezUnemeAplica: false,
        esPrimeraVezAnioPreview: true,
        primeraVezAnio: true,
      },
      sinRegimen,
    );
    expect('relacionTemporal' in df).toBe(false);
    expect('primeraVezUneme' in df).toBe(false);
    expect('esPrimeraVezAnioPreview' in df).toBe(false);
    expect('primeraVezAnio' in df).toBe(false);
  });

  it('diagnóstico 2 sin registrar se limpia', () => {
    const df = prepararNotaMedicaParaGuardar(
      { codigoCIEDiagnostico2: 'J00X', primeraVezDiagnostico2: undefined },
      conRegimen,
    );
    expect(df.codigoCIEDiagnostico2 || '').toBe('');
  });

  it('aplicarla dos veces da lo mismo', () => {
    const una = prepararNotaMedicaParaGuardar({ tensionArterialSistolica: 120 }, conRegimen);
    const copia = JSON.parse(JSON.stringify(una));
    expect(prepararNotaMedicaParaGuardar(una, conRegimen)).toEqual(copia);
  });
});
