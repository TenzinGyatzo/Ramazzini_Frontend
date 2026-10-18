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

  it('con obesidad y cintura de riesgo registra ambos hallazgos y escribe solo la de obesidad', () => {
    const docs = {
      ...sano,
      exploracionFisica: {
        ...sano.exploracionFisica,
        categoriaIMC: 'Obesidad clase I',
        categoriaCircunferenciaCintura: 'Alto Riesgo',
      },
    };
    expect(detectarHallazgosAptitud(docs)).toEqual(['obesidad', 'cintura']);
    const medidas = medidasPreventivasParaAptitud(docs);
    expect(medidas.map((m) => m.texto)).toEqual([textoDe('obesidad')]);
    expect(medidas[0].hallazgo).toBe('Obesidad y circunferencia de cintura con riesgo');
  });

  it('la presión alta sin antecedente pide confirmar o descartar hipertensión', () => {
    const docs = {
      ...sano,
      exploracionFisica: { ...sano.exploracionFisica, categoriaTensionArterial: 'Hipertensión grado 1' },
    };
    expect(detectarHallazgosAptitud(docs)).toEqual(['presionElevada']);
    expect(textoMedidasPreventivasAptitud(docs)).toBe(textoDe('presionElevada'));
  });

  it('con hipertensión conocida y presión elevada no pide confirmar el diagnóstico: revisa su control', () => {
    const docs = {
      historiaClinica: { ...sano.historiaClinica, hipertensivosPP: 'Si' },
      exploracionFisica: { ...sano.exploracionFisica, categoriaTensionArterial: 'Alta' },
    };
    expect(detectarHallazgosAptitud(docs)).toEqual(['presionElevada', 'hipertension']);
    const texto = textoMedidasPreventivasAptitud(docs);
    expect(texto).toMatch(/^Acudir a valoración médica para revisar el control de la presión arterial/);
    expect(texto).not.toContain('confirmar o descartar');

    // Con la presión controlada en la medición, la medida de hipertensión de siempre
    const controlada = { ...docs, exploracionFisica: sano.exploracionFisica };
    expect(textoMedidasPreventivasAptitud(controlada)).toBe(textoDe('hipertension'));
  });

  it('lumbalgia con molestias solo lumbares escribe solo la de lumbalgia', () => {
    const docs = {
      ...sano,
      historiaClinica: { ...sano.historiaClinica, lumbalgias: 'Si' },
      cuestionarioNordico: { resultado: { regionesMolestia12Meses: ['espaldaBaja'] } },
    };
    expect(detectarHallazgosAptitud(docs)).toEqual(['lumbalgia']);
    expect(textoMedidasPreventivasAptitud(docs)).toBe(textoDe('lumbalgia'));
  });

  it('lumbalgia con molestias en otras regiones se unifica en una sola medida', () => {
    const docs = {
      ...sano,
      historiaClinica: { ...sano.historiaClinica, lumbalgias: 'Si' },
      cuestionarioNordico: { resultado: { regionesMolestia12Meses: ['espaldaBaja', 'cuello'] } },
    };
    expect(detectarHallazgosAptitud(docs)).toEqual(['lumbalgia', 'musculoesqueletico']);
    const medidas = medidasPreventivasParaAptitud(docs);
    expect(medidas).toHaveLength(1);
    expect(medidas[0].texto).toBe(
      'Alternar posturas, realizar pausas de movilidad y ajustar la ergonomía del puesto. Acudir a valoración para el manejo del dolor lumbar y de las demás molestias.',
    );
  });

  it('no omite diabetes ni tabaquismo por coexistir con obesidad o con antecedente respiratorio', () => {
    const docs = {
      historiaClinica: { ...sano.historiaClinica, diabeticosPP: 'Si', respiratorios: 'Si', tabaquismo: 'Si' },
      exploracionFisica: { ...sano.exploracionFisica, categoriaIMC: 'Obesidad clase I' },
    };
    expect(medidasPreventivasParaAptitud(docs).map((m) => m.clave)).toEqual([
      'obesidad',
      'diabetes',
      'respiratorios',
      'tabaquismo',
    ]);
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

  it('con un solo hallazgo escribe solo su medida, sin la recomendación general', () => {
    const docs = { ...sano, historiaClinica: { ...sano.historiaClinica, diabeticosPP: 'Si' } };
    expect(medidasPreventivasParaAptitud(docs).map((m) => m.clave)).toEqual(['diabetes']);
  });

  it('los textos son indicaciones breves: sin «se recomienda» ni laboratorios anuales para todos', () => {
    for (const medida of MEDIDAS_PREVENTIVAS) {
      expect(medida.texto).not.toMatch(/se recomienda|es recomendable|es importante|es esencial|es crucial/i);
    }
    expect(textoDe('generico')).not.toMatch(/laboratorio|gabinete|anual/i);
    expect(textoDe('hernia')).not.toMatch(/fortalec/i);
    expect(textoDe('lumbalgia')).not.toMatch(/soporte/i);
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
