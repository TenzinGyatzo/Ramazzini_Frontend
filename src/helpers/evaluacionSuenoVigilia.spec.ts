import { describe, expect, it } from 'vitest';
import {
  ALERTAS_SUENO_VIGILIA,
  AREAS_SUENO_VIGILIA,
  PASOS_SUENO_VIGILIA,
  PASO_AREA_SUENO_VIGILIA,
  PREGUNTAS_SUENO_VIGILIA,
  calcularResultadoEvaluacionSuenoVigilia,
  haySintomasSuenoVigilia,
  normalizarEvaluacionSuenoVigilia,
  preguntasSuenoVigiliaDelModulo,
  textoHorasSuenoVigilia,
  textoResumenEvaluacionSuenoVigilia,
} from './evaluacionSuenoVigilia';
import { validarCamposRequeridos } from './validacionCampos';

const suenoNunca = {
  suenoSuperficial: 0,
  despertarSinDescanso: 0,
  suenoInsuficiente: 0,
  conciliacionTardia: 0,
  despertarNocturno: 0,
  despertarTemprano: 0,
};

const vigiliaNunca = {
  esfuerzoNoDormirse: 0,
  suenoInvoluntario: 0,
  faltaEnergia: 0,
  interrupcionPorAgotamiento: 0,
  dificultadAtencion: 0,
  erroresUOlvidos: 0,
};

const seguridadNegada = {
  ronquidoFuerte: 'No',
  pausasRespiratorias: 'No',
  despertarConAhogo: 'No',
  suenoActividadPeligrosa: 'No',
  accidenteOCasiAccidente: 'No',
};

const todoNegado = {
  minutosSuenoDiarios: 480,
  horarioLaboral: 'Diurno',
  calidadGeneralSueno: 'Buena',
  sueno: suenoNunca,
  vigilia: vigiliaNunca,
  seguridad: seguridadNegada,
};

describe('catálogo', () => {
  it('son 12 preguntas: 6 de sueño y 6 de vigilia, en 5 áreas', () => {
    expect(PREGUNTAS_SUENO_VIGILIA).toHaveLength(12);
    expect(preguntasSuenoVigiliaDelModulo('sueno')).toHaveLength(6);
    expect(preguntasSuenoVigiliaDelModulo('vigilia')).toHaveLength(6);
    expect(AREAS_SUENO_VIGILIA.map((area) => area.clave)).toEqual([
      'calidadDescanso',
      'conciliacionContinuidad',
      'somnolencia',
      'fatiga',
      'concentracion',
    ]);
    expect(ALERTAS_SUENO_VIGILIA).toHaveLength(8);
  });

  it('son 8 pasos: contexto, un paso por área, seguridad y seguimiento', () => {
    expect(PASOS_SUENO_VIGILIA.map((paso) => paso.nombre)).toEqual([
      'Fecha y contexto',
      'Calidad y descanso',
      'Conciliación y continuidad',
      'Somnolencia',
      'Fatiga',
      'Concentración',
      'Seguridad',
      'Seguimiento y observaciones',
    ]);
    // El nombre de cada paso de área es el de su área
    for (const area of AREAS_SUENO_VIGILIA) {
      expect(PASOS_SUENO_VIGILIA[PASO_AREA_SUENO_VIGILIA[area.clave] - 1].nombre).toBe(area.etiqueta);
    }
  });
});

// Los casos del resultado son los mismos que en `evaluacion-sueno-vigilia-resultado.util.spec.ts` (backend).
describe('calcularResultadoEvaluacionSuenoVigilia', () => {
  it('todo negado: prioridad verde, cinco áreas en verde, sin alertas y completo', () => {
    const resultado = calcularResultadoEvaluacionSuenoVigilia(todoNegado);
    expect(resultado.prioridad).toBe('verde');
    expect(Object.values(resultado.areas)).toEqual(Array(5).fill({ nivel: 'verde', suma: 0 }));
    expect(resultado.alertas).toEqual([]);
    expect(resultado.completo).toBe(true);
  });

  it('el nivel del área es su respuesta más alta, no la suma', () => {
    const resultado = calcularResultadoEvaluacionSuenoVigilia({
      ...todoNegado,
      sueno: {
        ...suenoNunca,
        suenoSuperficial: 1,
        despertarSinDescanso: 1,
        suenoInsuficiente: 1,
        conciliacionTardia: 3,
      },
    });
    expect(resultado.areas.calidadDescanso).toEqual({ nivel: 'amarillo', suma: 3 });
    expect(resultado.areas.conciliacionContinuidad).toEqual({ nivel: 'rojo', suma: 3 });
    expect(resultado.prioridad).toBe('rojo');
  });

  it.each([
    ['suenoActividadPeligrosa', { suenoActividadPeligrosa: 'Sí' }, 'rojo'],
    ['accidenteOCasiAccidente', { accidenteOCasiAccidente: 'Sí' }, 'rojo'],
    ['sintomasRespiratorios', { pausasRespiratorias: 'Sí' }, 'naranja'],
    ['sintomasRespiratorios', { despertarConAhogo: 'Sí' }, 'naranja'],
    ['ronquidoFuerte', { ronquidoFuerte: 'Sí' }, 'amarillo'],
  ])('la alerta %s prevalece aunque las 12 preguntas sean «Nunca»', (alerta, seguridad, prioridad) => {
    const resultado = calcularResultadoEvaluacionSuenoVigilia({
      ...todoNegado,
      seguridad: { ...seguridadNegada, ...seguridad },
    });
    expect(resultado.alertas).toEqual([alerta]);
    expect(resultado.prioridad).toBe(prioridad);
  });

  it('«No sabe» y «No realiza esas actividades» no generan alerta', () => {
    const resultado = calcularResultadoEvaluacionSuenoVigilia({
      ...todoNegado,
      seguridad: {
        ronquidoFuerte: 'No sabe',
        pausasRespiratorias: 'No sabe',
        despertarConAhogo: 'No sabe',
        suenoActividadPeligrosa: 'No realiza esas actividades',
        accidenteOCasiAccidente: 'No',
      },
    });
    expect(resultado.alertas).toEqual([]);
    expect(resultado.completo).toBe(true);
  });

  it('el sueño involuntario ocasional sube la prioridad a naranja', () => {
    const resultado = calcularResultadoEvaluacionSuenoVigilia({
      ...todoNegado,
      vigilia: { ...vigiliaNunca, suenoInvoluntario: 1 },
    });
    expect(resultado.areas.somnolencia.nivel).toBe('amarillo');
    expect(resultado.alertas).toEqual(['suenoInvoluntario']);
    expect(resultado.prioridad).toBe('naranja');
  });

  it('dificultad persistente: conciliación o continuidad frecuente y 3 meses o más', () => {
    const frecuente = { ...todoNegado, sueno: { ...suenoNunca, despertarNocturno: 3 } };
    expect(
      calcularResultadoEvaluacionSuenoVigilia({ ...frecuente, seguimiento: { duracion: '3 meses o más' } }).alertas,
    ).toEqual(['dificultadPersistente']);
    expect(
      calcularResultadoEvaluacionSuenoVigilia({ ...frecuente, seguimiento: { duracion: 'Menos de 1 mes' } }).alertas,
    ).toEqual([]);
  });

  it('los hallazgos informativos no cambian la prioridad', () => {
    const resultado = calcularResultadoEvaluacionSuenoVigilia({
      ...todoNegado,
      minutosSuenoDiarios: 419,
      vigilia: { ...vigiliaNunca, dificultadAtencion: 1 },
      seguimiento: { empeoraAlDormirMal: 'Sí' },
    });
    expect(resultado.alertas).toEqual(['suenoCorto', 'relacionConSueno']);
    expect(resultado.prioridad).toBe('amarillo');
  });

  it('una respuesta que falta no cuenta como cero: el resultado queda incompleto', () => {
    expect(calcularResultadoEvaluacionSuenoVigilia(null).completo).toBe(false);
    expect(calcularResultadoEvaluacionSuenoVigilia({ ...todoNegado, seguridad: {} }).completo).toBe(false);
    expect(
      calcularResultadoEvaluacionSuenoVigilia({ ...todoNegado, vigilia: { ...vigiliaNunca, faltaEnergia: null } })
        .completo,
    ).toBe(false);
  });
});

// Mismos textos que `resumenTablaEvaluacionSuenoVigilia` (backend).
describe('resumen para la aptitud y el expediente', () => {
  it('sin resultado guardado no genera texto', () => {
    expect(textoResumenEvaluacionSuenoVigilia(null)).toBe('');
    expect(textoResumenEvaluacionSuenoVigilia({})).toBe('');
  });

  it('todo negado', () => {
    expect(
      textoResumenEvaluacionSuenoVigilia({ resultado: calcularResultadoEvaluacionSuenoVigilia(todoNegado) }),
    ).toBe('Sin síntomas ni alertas reportadas');
  });

  it('lista las áreas con síntomas y las alertas con color', () => {
    const resultado = calcularResultadoEvaluacionSuenoVigilia({
      ...todoNegado,
      minutosSuenoDiarios: 300,
      sueno: { ...suenoNunca, conciliacionTardia: 3 },
      vigilia: { ...vigiliaNunca, esfuerzoNoDormirse: 2 },
      seguridad: { ...seguridadNegada, suenoActividadPeligrosa: 'Sí' },
    });
    expect(textoResumenEvaluacionSuenoVigilia({ resultado })).toBe(
      'Conciliación y continuidad: frecuente; Somnolencia: semanal; alertas: somnolencia en actividad peligrosa',
    );
  });

  it('solo alertas, sin síntomas en las áreas', () => {
    const resultado = calcularResultadoEvaluacionSuenoVigilia({
      ...todoNegado,
      seguridad: { ...seguridadNegada, ronquidoFuerte: 'Sí' },
    });
    expect(textoResumenEvaluacionSuenoVigilia({ resultado })).toBe('Alertas: ronquido fuerte reportado');
  });
});

describe('captura', () => {
  it('detecta síntomas en general y por módulo', () => {
    expect(haySintomasSuenoVigilia(todoNegado)).toBe(false);
    const soloSueno = { ...todoNegado, sueno: { ...suenoNunca, suenoSuperficial: 1 } };
    expect(haySintomasSuenoVigilia(soloSueno)).toBe(true);
    expect(haySintomasSuenoVigilia(soloSueno, 'vigilia')).toBe(false);
  });

  it('expresa las horas de sueño', () => {
    expect(textoHorasSuenoVigilia(undefined)).toBe('No registradas');
    expect(textoHorasSuenoVigilia(390)).toBe('6 h 30 min');
    expect(textoHorasSuenoVigilia(480)).toBe('8 h');
    expect(textoHorasSuenoVigilia(0)).toBe('0 h');
  });

  it('al normalizar quita el seguimiento sin síntomas, las descripciones sin «Sí» y el resultado', () => {
    const normalizado = normalizarEvaluacionSuenoVigilia({
      ...todoNegado,
      seguridad: { ...seguridadNegada, descripcionAccidente: 'ya no aplica' },
      seguimiento: { duracion: '3 meses o más', empeoraAlDormirMal: 'Sí' },
      resultado: { prioridad: 'rojo' },
    } as any);
    expect(normalizado.seguimiento).toBeUndefined();
    expect(normalizado.seguridad).toEqual(seguridadNegada);
    expect((normalizado as any).resultado).toBeUndefined();
  });

  it('con síntomas solo de sueño conserva el seguimiento sin la pregunta de vigilia', () => {
    const normalizado = normalizarEvaluacionSuenoVigilia({
      ...todoNegado,
      sueno: { ...suenoNunca, conciliacionTardia: 2 },
      seguimiento: {
        duracion: 'Menos de 1 mes',
        empeoraAlDormirMal: 'Sí',
        factores: ['Medicamentos'],
        factorOtro: 'sobra',
        productosParaDormir: [],
      },
    });
    expect(normalizado.seguimiento).toEqual({ duracion: 'Menos de 1 mes', factores: ['Medicamentos'] });
  });
});

describe('validación antes de guardar', () => {
  const base = { fechaEvaluacionSuenoVigilia: '2026-10-04', ...todoNegado };
  const nombres = (datos: Record<string, unknown>) =>
    validarCamposRequeridos('evaluacionSuenoVigilia', datos).camposFaltantes.map((campo) => campo.nombre);

  it('acepta una evaluación completa sin síntomas (0 horas y «Nunca» son respuestas válidas)', () => {
    expect(validarCamposRequeridos('evaluacionSuenoVigilia', base).esValido).toBe(true);
    expect(validarCamposRequeridos('evaluacionSuenoVigilia', { ...base, minutosSuenoDiarios: 0 }).esValido).toBe(true);
  });

  it('exige el contexto', () => {
    expect(
      nombres({ ...base, minutosSuenoDiarios: undefined, horarioLaboral: undefined, calidadGeneralSueno: '' }),
    ).toEqual(['Horas de sueño por cada 24 horas', 'Horario laboral', 'Calidad general del sueño']);
  });

  it('exige las preguntas de seguridad y la descripción cuando la respuesta es «Sí»', () => {
    const faltantes = validarCamposRequeridos('evaluacionSuenoVigilia', {
      ...base,
      seguridad: { ...seguridadNegada, ronquidoFuerte: undefined, accidenteOCasiAccidente: 'Sí' },
    }).camposFaltantes;
    expect(faltantes).toEqual([
      expect.objectContaining({ nombre: 'Seguridad: Ronquido fuerte', paso: 7 }),
      expect.objectContaining({ nombre: 'Seguridad: descripción de «Accidente o casi accidente»', paso: 7 }),
    ]);
  });

  it('exige el seguimiento solo cuando hay síntomas', () => {
    expect(nombres({ ...base, sueno: { ...suenoNunca, suenoSuperficial: 1 } })).toEqual([
      'Seguimiento: ¿desde cuándo ocurre?',
    ]);
    expect(nombres({ ...base, vigilia: { ...vigiliaNunca, faltaEnergia: 2 } })).toEqual([
      'Seguimiento: ¿desde cuándo ocurre?',
      'Seguimiento: ¿los síntomas del día empeoran al dormir poco o mal?',
    ]);
  });

  it('señala una pregunta de frecuencia sin contestar, con su área y su paso', () => {
    const faltantes = validarCamposRequeridos('evaluacionSuenoVigilia', {
      ...base,
      vigilia: { ...vigiliaNunca, erroresUOlvidos: undefined },
    }).camposFaltantes;
    expect(faltantes).toHaveLength(1);
    expect(faltantes[0].nombre).toContain('Concentración: …cometió errores');
    expect(faltantes[0].paso).toBe(6);
  });
});
