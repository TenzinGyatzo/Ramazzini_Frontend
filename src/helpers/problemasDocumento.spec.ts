import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import {
  aCamposFaltantes,
  campoDeProblemaCie10,
  campoPorPasoDiagnostico,
  INSTRUCCION_EXPLORACION_FISICA,
  problemasExploracionFisica,
  ID_PASO_EXAMEN_VISTA,
  ordenarProblemas,
  problemaDeValidacion,
  problemasPorFaltantes,
  siguienteProblema,
  type ProblemaCampo,
} from './problemasDocumento';
import { getNotaMedicaStepMap } from './notaMedicaStepMap';
import { validarCamposRequeridos, validarNotaMedicaPreSubmit } from './validacionCampos';
import { validateSomatometriaSignosField } from './somatometriaSignosRanges';

const p = (paso: number | null, campo: string, falta = true): ProblemaCampo => ({
  paso,
  campo,
  nombre: campo,
  falta,
  mensaje: `revisar ${campo}`,
});

describe('problemas de la nota médica (faltantes e inválidos igual)', () => {
  it('ordena por paso; el mismo campo aparece una vez y gana el primero (falta)', () => {
    const lista = ordenarProblemas([
      p(9, 'relacionTemporal'),
      null,
      p(3, 'genero'),
      p(7, 'peso'),
      p(7, 'peso', false),
      p(1, 'fechaNotaMedica', false),
    ]);
    expect(lista.map((x) => x.campo)).toEqual(['fechaNotaMedica', 'genero', 'peso', 'relacionTemporal']);
    expect(lista.find((x) => x.campo === 'peso')?.falta).toBe(true);
  });

  it('siguiente: el que sigue; si el actual ya se corrigió, el próximo por paso; al final vuelve al primero', () => {
    const lista = [p(1, 'fechaNotaMedica'), p(3, 'genero'), p(7, 'peso')];
    expect(siguienteProblema(lista, lista[0])?.campo).toBe('genero');
    expect(siguienteProblema(lista, lista[2])?.campo).toBe('fechaNotaMedica');
    // «derechohabiencia» (paso 3) ya se corrigió: sigue el de un paso posterior
    expect(siguienteProblema(lista, p(3, 'derechohabiencia'))?.campo).toBe('peso');
    expect(siguienteProblema([], lista[0])).toBeNull();
    expect(siguienteProblema(lista, null)?.campo).toBe('fechaNotaMedica');
  });

  it('faltantes con instrucción de qué hacer', () => {
    const [peso, otro] = problemasPorFaltantes([
      { nombre: 'Peso', tipo: 'numero', paso: 7, campo: 'peso' },
      { nombre: 'Algo', tipo: 'texto', paso: 2 },
    ]);
    expect(peso).toMatchObject({ campo: 'peso', falta: true, mensaje: 'Escribe el peso; si no se pudo medir, marca «Se desconoce».' });
    expect(otro.mensaje).toBe('Falta: Algo.');
  });

  it('validación con campo → problema «revisar»; válida → nada', () => {
    expect(problemaDeValidacion({ valido: true })).toBeNull();
    expect(
      problemaDeValidacion({ valido: false, mensaje: 'Fuera de rango', paso: 6, campo: 'frecuenciaCardiaca' }),
    ).toMatchObject({ campo: 'frecuenciaCardiaca', falta: false, nombre: 'Frecuencia cardiaca', paso: 6 });
  });

  it('campo por tipo de duplicidad CIE-10 y por paso de diagnóstico', () => {
    expect(campoDeProblemaCie10('diagnostico2_equals_principal')).toBe('codigoCIEDiagnostico2');
    expect(campoDeProblemaCie10('diagnostico3_sin_diagnostico2')).toBe('codigoCIEDiagnostico3');
    expect(campoDeProblemaCie10('principal_in_complementaries')).toBe('codigosCIE10Complementarios');
    const mapa = getNotaMedicaStepMap(true, false);
    expect(campoPorPasoDiagnostico(mapa.diagnostico, mapa, 'codigo')).toBe('codigoCIE10Principal');
    expect(campoPorPasoDiagnostico(mapa.comorbilidad2, mapa, 'confirmacion')).toBe('confirmacionDiagnostica2');
    expect(campoPorPasoDiagnostico(mapa.signos, mapa, 'codigo')).toBeUndefined();
  });

  it('lista «Ver todos»: marca lo que hay que revisar y conserva campo y mensaje', () => {
    const [falta, revisar] = aCamposFaltantes([p(3, 'genero'), p(6, 'temperatura', false)]);
    expect(falta).toMatchObject({ campo: 'genero', revisar: false, paso: 3 });
    expect(revisar).toMatchObject({ campo: 'temperatura', revisar: true, mensaje: 'revisar temperatura' });
  });

  it('cada validación de la nota dice su campo', () => {
    const fueraDeRango = validarNotaMedicaPreSubmit(
      { fechaNotaMedica: format(new Date(), 'yyyy-MM-dd'), frecuenciaCardiaca: 30 },
      { fechaNacimiento: '1990-01-01' },
      true,
      false,
    );
    expect(fueraDeRango).toMatchObject({ valido: false, campo: 'frecuenciaCardiaca' });

    const sinAyunas = validarNotaMedicaPreSubmit(
      {
        fechaNotaMedica: format(new Date(), 'yyyy-MM-dd'),
        glucemia: 100,
        tipoMedicion: null,
        resultadoObtenidoaTravesde: 1,
      },
      { fechaNacimiento: '1990-01-01' },
      true,
      false,
    );
    expect(sinAyunas.campo).toBe('tipoMedicion');

    const faltantes = validarCamposRequeridos('notaMedica', {}, { showSiresUI: true, cie10Required: true });
    expect(faltantes.camposFaltantes.find((c) => c.nombre === 'Género')?.campo).toBe('genero');
  });
});

describe('orden dentro de un paso: como se ve en pantalla', () => {
  it('en diagnóstico, primero la relación temporal y luego el diagnóstico', () => {
    const mapa = getNotaMedicaStepMap(true, false);
    const faltantes = validarCamposRequeridos('notaMedica', {}, { showSiresUI: true, cie10Required: true });
    const lista = ordenarProblemas(problemasPorFaltantes(faltantes.camposFaltantes));
    const delDiagnostico = lista.filter((x) => x.paso === mapa.diagnostico).map((x) => x.campo);
    expect(delDiagnostico).toEqual(['relacionTemporal', 'codigoCIE10Principal']);
    // Y el resto en el orden de los pasos
    expect(lista.map((x) => x.campo)).toEqual([
      'fechaNotaMedica',
      'motivoConsulta',
      'genero',
      'derechohabiencia',
      'peso',
      'talla',
      'relacionTemporal',
      'codigoCIE10Principal',
    ]);
  });

  it('«Siguiente» tras corregir uno no se salta otro del mismo paso', () => {
    const lista = [p(9, 'relacionTemporal'), p(9, 'codigoCIE10Principal'), p(10, 'codigoCIEDiagnostico2')];
    // Se corrigió la relación temporal: el siguiente es el diagnóstico, del mismo paso
    const sinRelacion = lista.slice(1);
    expect(siguienteProblema(sinRelacion, lista[0])?.campo).toBe('codigoCIE10Principal');
  });

  it('textos: género y derechohabiencia sin aclaraciones; peso y talla dicen cuándo usar «Se desconoce»', () => {
    const r = problemasPorFaltantes([
      { nombre: 'Género', tipo: 'seleccion', paso: 3, campo: 'genero' },
      { nombre: 'Derechohabiencia', tipo: 'seleccion', paso: 3, campo: 'derechohabiencia' },
      { nombre: 'Talla', tipo: 'numero', paso: 7, campo: 'talla' },
    ]);
    expect(r.map((x) => x.mensaje)).toEqual([
      'Elige el género.',
      'Marca la derechohabiencia.',
      'Escribe la talla; si no se pudo medir, marca «Se desconoce».',
    ]);
  });
});

describe('historia clínica', () => {
  it('faltantes: motivo y fecha en el paso 1 (en ese orden) y el resumen al final', () => {
    const faltantes = validarCamposRequeridos('historiaClinica', {}, {});
    const lista = ordenarProblemas(problemasPorFaltantes(faltantes.camposFaltantes));
    expect(lista.map((x) => [x.campo, x.paso])).toEqual([
      ['motivoExamen', 1],
      ['fechaHistoriaClinica', 1],
      ['resumenHistoriaClinica', 46],
    ]);
    expect(lista.map((x) => x.mensaje)).toEqual([
      'Elige el motivo del examen.',
      'Elige la fecha de la historia clínica.',
      'Indica si hay hallazgos por resumir y, si los hay, escríbelos.',
    ]);
  });
});

describe('exploración física', () => {
  const motivo = (campo: string, valor: unknown) =>
    validateSomatometriaSignosField(campo as never, valor);

  it('vacío se pide; con valor fuera de rango se dice el rango', () => {
    const datos = { fechaExploracionFisica: '2026-11-13', peso: 20, frecuenciaCardiaca: '' };
    const faltantes = validarCamposRequeridos('exploracionFisica', datos, {}).camposFaltantes;
    const lista = ordenarProblemas(problemasExploracionFisica(faltantes, datos, motivo));
    const peso = lista.find((x) => x.campo === 'peso')!;
    expect(peso).toMatchObject({ falta: false, mensaje: 'Debe ser mínimo 30 kg' });
    expect(lista.find((x) => x.campo === 'frecuenciaCardiaca')).toMatchObject({
      falta: true,
      mensaje: 'Escribe la frecuencia cardiaca.',
    });
    // Sin altura no se pide el IMC aparte (se calcula)
    expect(lista.some((x) => x.campo === 'indiceMasaCorporal')).toBe(false);
    // En somatometría, en el orden de pantalla
    expect(lista.filter((x) => x.paso === 2).map((x) => x.campo)).toEqual([
      'peso',
      'altura',
      'circunferenciaCintura',
    ]);
  });

  it('el peso de la exploración se pide distinto que en la nota médica', () => {
    const [ef] = problemasPorFaltantes(
      [{ nombre: 'Peso', tipo: 'medida', paso: 2, campo: 'peso' }],
      INSTRUCCION_EXPLORACION_FISICA,
    );
    const [nm] = problemasPorFaltantes([{ nombre: 'Peso', tipo: 'numero', paso: 7, campo: 'peso' }]);
    expect(ef.mensaje).toBe('Escribe el peso.');
    expect(nm.mensaje).toBe('Escribe el peso; si no se pudo medir, marca «Se desconoce».');
  });
});

describe('examen de la vista', () => {
  it('obligatorios con instrucción, en orden de pasos', () => {
    const faltantes = validarCamposRequeridos('examenVista', {}, {}).camposFaltantes;
    const lista = ordenarProblemas(problemasPorFaltantes(faltantes));
    expect(lista.map((x) => [x.campo, x.mensaje])).toEqual([
      ['fechaExamenVista', 'Elige la fecha del examen.'],
      ['sinCorreccionLejanaInterpretacion', 'Captura la agudeza visual lejana sin lentes.'],
      ['sinCorreccionCercanaInterpretacion', 'Captura la agudeza visual cercana sin lentes.'],
      ['interpretacionIshihara', 'Captura las placas correctas de la prueba de Ishihara.'],
    ]);
  });

  it('cada paso de la lista tiene su identificador (el orden cambia por país)', () => {
    const faltantes = validarCamposRequeridos('examenVista', {}, {}).camposFaltantes;
    expect(faltantes.map((c) => ID_PASO_EXAMEN_VISTA[c.paso!])).toEqual([
      'evFecha',
      'evAvLejanaSin',
      'evAvCercanaSin',
      'evIshihara',
    ]);
  });
});

describe('audiometría', () => {
  it('obligatorios con instrucción, en orden de pasos (método antes que la fecha)', () => {
    const faltantes = validarCamposRequeridos('audiometria', {}, {}).camposFaltantes;
    const lista = ordenarProblemas(problemasPorFaltantes(faltantes));
    expect(lista.map((x) => [x.paso, x.campo, x.mensaje])).toEqual([
      [1, 'metodoAudiometria', 'Elige el método de la audiometría.'],
      [1, 'fechaAudiometria', 'Elige la fecha de la audiometría.'],
      [2, 'oidoDerecho125', 'Captura los valores del oído derecho.'],
      [3, 'oidoIzquierdo125', 'Captura los valores del oído izquierdo.'],
      [6, 'diagnosticoAudiometria', 'Escribe el diagnóstico.'],
    ]);
  });
});

describe('aptitud', () => {
  it('obligatorios con instrucción, en orden de pasos; cada uno en su sección', async () => {
    const { legacyStepToSectionIndex } = await import('./aptitudSections');
    const faltantes = validarCamposRequeridos('aptitud', {}, {}).camposFaltantes;
    const lista = ordenarProblemas(problemasPorFaltantes(faltantes));
    expect(lista.map((x) => [x.campo, x.mensaje])).toEqual([
      ['fechaAptitudPuesto', 'Elige la fecha de valoración.'],
      ['aptitudPuesto', 'Elige la aptitud al puesto.'],
      ['alteracionesSalud', 'Describe las alteraciones de salud encontradas.'],
      ['resultados', 'Escribe los resultados.'],
      ['medidasPreventivas', 'Escribe las medidas preventivas.'],
    ]);
    // Con secciones: fecha, (evaluaciones), aptitud, alteraciones, resultados, medidas
    const secciones = lista.map((x) => legacyStepToSectionIndex(x.paso!));
    expect(new Set(secciones).size).toBe(5);
    expect([...secciones].sort((a, b) => a - b)).toEqual(secciones);
  });
});
