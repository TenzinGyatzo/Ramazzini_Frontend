import { describe, expect, it } from 'vitest';
import {
  completarRespuestasPorDefecto,
  limpiarTextoDeNo,
  prepararHistoriaClinicaParaGuardar,
  problemasEspecificarHistoriaClinica,
  resumenAutomaticoHistoriaClinica,
  textoResumenPorDefecto,
} from './historiaClinicaGuardado';

describe('historia clínica: respuestas preseleccionadas (punto 39)', () => {
  it('una historia nueva de mujer queda con lo que se ve en pantalla', () => {
    const df = completarRespuestasPorDefecto({}, { esMujer: true });
    expect(df.motivoExamen).toBe('Ingreso');
    expect(df.fechaHistoriaClinica).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(df.nefropatias).toBe('No');
    expect(df.nefropatiasEspecificar).toBe('Negado');
    expect(df.alimentacionDeficiente).toBe('No');
    expect(df.alimentacionDeficienteEspecificar).toBe('Adecuada');
    expect(df.menarca).toBe('12-14 años');
    expect(df.gestas).toBe('0 (Ninguna)');
    expect(df.embarazoActual).toBe('Negado');
    expect(df.vidaSexualActiva).toBe('Negada');
    expect(df.fechaUltimaRegla).toBe('No recuerda');
    expect(df.accidenteLaboral).toBe('No');
    expect(df.accidenteLaboralEspecificar).toBe('Niega haber sufrido riesgos de trabajo');
    expect(df.secuelas).toBe('Sin secuelas');
    expect(df.resumenHistoriaClinicaPregunta).toBe('No');
    expect(df.resumenHistoriaClinica).toBe('Se refiere actualmente asintomática');
  });

  it('a un hombre no se le escribe nada ginecoobstétrico', () => {
    const df = completarRespuestasPorDefecto({}, { esMujer: false });
    expect(df.menarca).toBeUndefined();
    expect(df.embarazoActual).toBeUndefined();
    expect(df.resumenHistoriaClinica).toBe('Se refiere actualmente asintomático');
  });

  it('no toca lo que ya tiene respuesta (documento existente o capturado)', () => {
    const df = completarRespuestasPorDefecto(
      {
        diabeticos: 'Si',
        diabeticosEspecificar: 'Madre',
        menarca: '11 años',
        embarazoActual: '',
        accidenteLaboral: 'Si',
        accidenteLaboralEspecificar: 'Caída en 2020',
      },
      { esMujer: true },
    );
    expect(df.diabeticos).toBe('Si');
    expect(df.diabeticosEspecificar).toBe('Madre');
    expect(df.menarca).toBe('11 años');
    // «Sí» sin especificar sigue vacío (no se vuelve «Negado»)
    expect(df.embarazoActual).toBe('');
    expect(df.accidenteLaboralEspecificar).toBe('Caída en 2020');
    expect(df.secuelas).toBeUndefined();
  });

  it('es idempotente', () => {
    const una = completarRespuestasPorDefecto({}, { esMujer: true });
    const dos = completarRespuestasPorDefecto(JSON.parse(JSON.stringify(una)), { esMujer: true });
    expect(dos).toEqual(una);
  });

  it('al marcar «Sí», «Especifique» no trae el texto de «No»', () => {
    const df = { alergicosEspecificar: 'Negado' };
    limpiarTextoDeNo(df, 'alergicosEspecificar', 'Negado');
    expect(df.alergicosEspecificar).toBe('');
    const otro = { alergicosEspecificar: 'Penicilina' };
    limpiarTextoDeNo(otro, 'alergicosEspecificar', 'Negado');
    expect(otro.alergicosEspecificar).toBe('Penicilina');
  });
});

describe('historia clínica: resumen al guardar', () => {
  it('«No» → texto por defecto aunque se haya escrito algo antes', () => {
    const df = prepararHistoriaClinicaParaGuardar(
      { resumenHistoriaClinicaPregunta: 'No', resumenHistoriaClinica: 'algo' },
      { esMujer: false },
    );
    expect(df.resumenHistoriaClinica).toBe(textoResumenPorDefecto(false));
  });

  it('«Sí» → lo escrito o, si está vacío, los hallazgos', () => {
    const conTexto = prepararHistoriaClinicaParaGuardar(
      { resumenHistoriaClinicaPregunta: 'Si', resumenHistoriaClinica: 'Propio' },
      { esMujer: false },
    );
    expect(conTexto.resumenHistoriaClinica).toBe('Propio');
    const vacio = prepararHistoriaClinicaParaGuardar(
      { resumenHistoriaClinicaPregunta: 'Si', alergicos: 'Si', alergicosEspecificar: 'Penicilina' },
      { esMujer: false },
    );
    expect(vacio.resumenHistoriaClinica).toBe('Penicilina.');
  });

  it('el resumen automático ignora «Negado» y «Sin secuelas»', () => {
    expect(
      resumenAutomaticoHistoriaClinica({
        lumbalgiasEspecificar: 'Negado',
        quirurgicosEspecificar: 'Apendicectomía',
        secuelas: 'Sin secuelas',
      }),
    ).toBe('Apendicectomía.');
  });
});

describe('historia clínica: «Especifique» obligatorio con «Sí»', () => {
  it('pide especificar en antecedentes, gineco y accidente laboral', () => {
    const problemas = problemasEspecificarHistoriaClinica(
      {
        diabeticos: 'Si',
        diabeticosEspecificar: '',
        alergicos: 'Si',
        alergicosEspecificar: 'Negado',
        tabaquismo: 'Si',
        tabaquismoEspecificar: '10 al día',
        embarazoActual: '',
        accidenteLaboral: 'Si',
      },
      { esMujer: true },
    );
    expect(problemas.map((p) => p.campo)).toEqual([
      'diabeticosEspecificar',
      'alergicosEspecificar',
      'embarazoActual',
      'accidenteLaboralEspecificar',
      'descripcionDelDano',
      'secuelas',
    ]);
    expect(problemas[0].mensaje).toBe('Falta especificar diabetes (heredofamiliares).');
    expect(problemas[0].paso).toBe(3);
  });

  it('riesgo de trabajo: daño y secuelas se exigen igual que la descripción («Sin secuelas» vale)', () => {
    const base = { accidenteLaboral: 'Si', accidenteLaboralEspecificar: 'Caída', descripcionDelDano: 'Fractura' };
    expect(problemasEspecificarHistoriaClinica({ ...base, secuelas: '  ' }, { esMujer: false }).map((p) => p.mensaje)).toEqual([
      'Falta describir las secuelas del RT.',
    ]);
    expect(
      problemasEspecificarHistoriaClinica({ accidenteLaboral: 'Si' }, { esMujer: false }).map((p) => [p.nombre, p.mensaje]),
    ).toEqual([
      ['Especificar riesgo de trabajo', 'Falta describir el RT.'],
      ['Especificar el daño del RT', 'Falta describir el daño del RT.'],
      ['Especificar las secuelas del RT', 'Falta describir las secuelas del RT.'],
    ]);
    expect(problemasEspecificarHistoriaClinica({ ...base, secuelas: 'Sin secuelas' }, { esMujer: false })).toEqual([]);
    expect(
      problemasEspecificarHistoriaClinica({ accidenteLaboral: 'No', descripcionDelDano: '' }, { esMujer: false }),
    ).toEqual([]);
  });

  it('sin «Sí», nada pendiente; a un hombre no se le revisa lo ginecoobstétrico', () => {
    const df = completarRespuestasPorDefecto({}, { esMujer: true });
    expect(problemasEspecificarHistoriaClinica(df, { esMujer: true })).toEqual([]);
    expect(problemasEspecificarHistoriaClinica({ embarazoActual: '' }, { esMujer: false })).toEqual([]);
  });
});
