import { describe, expect, it } from 'vitest';
import {
  MEDIDAS_PREVENTIVAS,
  detectarHallazgosAptitud,
  medidasPreventivasParaAptitud,
  textoMedidasPreventivasAptitud,
} from './medidasPreventivasAptitud';

const textoDe = (clave: string) => MEDIDAS_PREVENTIVAS.find((m) => m.clave === clave)!.texto;

const sano = {
  historiaClinica: {
    lumbalgias: 'No',
    diabeticosPP: 'No',
    cardiopaticosPP: 'No',
    hipertensivosPP: 'No',
    respiratorios: 'No',
    alcoholismo: 'No',
    tabaquismo: 'No',
  },
  exploracionFisica: {
    categoriaIMC: 'Normal',
    categoriaCircunferenciaCintura: 'Bajo Riesgo',
    categoriaTensionArterial: 'Normal',
  },
};

describe('medidas preventivas de la aptitud', () => {
  it('sin hallazgos solo propone la recomendación general', () => {
    expect(detectarHallazgosAptitud(sano)).toEqual([]);
    expect(textoMedidasPreventivasAptitud(sano)).toBe(textoDe('generico'));
  });

  it('el sobrepeso no dispara la medida de obesidad; la obesidad sí', () => {
    const conSobrepeso = { ...sano, exploracionFisica: { ...sano.exploracionFisica, categoriaIMC: 'Sobrepeso' } };
    expect(detectarHallazgosAptitud(conSobrepeso)).not.toContain('obesidad');

    const conObesidad = { ...sano, exploracionFisica: { ...sano.exploracionFisica, categoriaIMC: 'Obesidad clase II' } };
    expect(detectarHallazgosAptitud(conObesidad)).toContain('obesidad');
  });

  it('con obesidad no repite la recomendación de cintura', () => {
    const docs = {
      ...sano,
      exploracionFisica: {
        ...sano.exploracionFisica,
        categoriaIMC: 'Obesidad clase I',
        categoriaCircunferenciaCintura: 'Alto Riesgo',
      },
    };
    expect(detectarHallazgosAptitud(docs)).toEqual(['obesidad']);
  });

  it('la presión alta sin antecedente no dispara la medida de hipertensión', () => {
    const docs = {
      ...sano,
      exploracionFisica: { ...sano.exploracionFisica, categoriaTensionArterial: 'Hipertensión grado 1' },
    };
    expect(detectarHallazgosAptitud(docs)).toEqual(['presionElevada']);
  });

  it('el antecedente de hipertensión dispara su medida y no la de presión elevada', () => {
    const docs = {
      historiaClinica: { ...sano.historiaClinica, hipertensivosPP: 'Si' },
      exploracionFisica: { ...sano.exploracionFisica, categoriaTensionArterial: 'Alta' },
    };
    expect(detectarHallazgosAptitud(docs)).toEqual(['hipertension']);
  });

  it('la lumbalgia sale una sola vez aunque la reporten la historia clínica y el Nórdico', () => {
    const docs = {
      ...sano,
      historiaClinica: { ...sano.historiaClinica, lumbalgias: 'Si' },
      cuestionarioNordico: { resultado: { regionesMolestia12Meses: ['espaldaBaja', 'cuello'] } },
    };
    expect(detectarHallazgosAptitud(docs)).toEqual(['lumbalgia', 'musculoesqueletico']);
  });

  it('clasifica la audiometría con el umbral de su método', () => {
    const con = (audiometria: Record<string, unknown>) => detectarHallazgosAptitud({ ...sano, audiometria });
    expect(con({ metodoAudiometria: 'AMA', perdidaAuditivaBilateralAMA: 25 })).toEqual([]);
    expect(con({ metodoAudiometria: 'AMA', perdidaAuditivaBilateralAMA: 26 })).toEqual(['hipoacusia']);
    expect(con({ metodoAudiometria: 'LFT', hipoacusiaBilateralCombinada: 9 })).toEqual([]);
    expect(con({ metodoAudiometria: 'LFT', hipoacusiaBilateralCombinada: 10 })).toEqual(['hipoacusia']);
  });

  it('detecta vista, visión cromática, sueño, tabaco y alcohol', () => {
    const docs = {
      ...sano,
      historiaClinica: { ...sano.historiaClinica, tabaquismo: 'Si', alcoholismo: 'Si' },
      examenVista: {
        sinCorreccionLejanaInterpretacion: 'Visión ligeramente reducida',
        requiereLentesUsoGeneral: 'Si',
        porcentajeIshihara: 60,
      },
      evaluacionSuenoVigilia: { resultado: { prioridad: 'naranja' } },
    };
    expect(detectarHallazgosAptitud(docs)).toEqual(['vista', 'visionCromatica', 'sueno', 'tabaquismo', 'alcohol']);
  });

  it('la agudeza visual ya corregida con lentes no dispara medida', () => {
    const examenVista = {
      sinCorreccionLejanaInterpretacion: 'Visión moderadamente reducida',
      requiereLentesUsoGeneral: 'Si',
      ojoIzquierdoLejanaConCorreccion: 20,
      ojoDerechoLejanaConCorreccion: 20,
    };
    expect(detectarHallazgosAptitud({ ...sano, examenVista })).toEqual([]);
    expect(
      detectarHallazgosAptitud({
        ...sano,
        examenVista: { ...examenVista, ojoIzquierdoLejanaConCorreccion: null, ojoDerechoLejanaConCorreccion: null },
      }),
    ).toEqual(['vista']);
  });

  it('con un solo hallazgo cierra con la recomendación general', () => {
    const docs = { ...sano, historiaClinica: { ...sano.historiaClinica, diabeticosPP: 'Si' } };
    expect(medidasPreventivasParaAptitud(docs).map((m) => m.clave)).toEqual(['diabetes', 'generico']);
  });

  it('con dos o más hallazgos escribe solo las específicas, en el orden del catálogo', () => {
    const docs = {
      historiaClinica: { ...sano.historiaClinica, diabeticosPP: 'Si', respiratorios: 'Si' },
      exploracionFisica: { ...sano.exploracionFisica, categoriaIMC: 'Obesidad clase III' },
    };
    expect(medidasPreventivasParaAptitud(docs).map((m) => m.clave)).toEqual([
      'obesidad',
      'diabetes',
      'respiratorios',
    ]);
    expect(textoMedidasPreventivasAptitud(docs)).toBe(
      [textoDe('obesidad'), textoDe('diabetes'), textoDe('respiratorios')].join(' '),
    );
  });

  it('la hernia nunca se propone sola: no hay dato estructurado que la dispare', () => {
    expect(medidasPreventivasParaAptitud(sano).map((m) => m.clave)).not.toContain('hernia');
  });
});
