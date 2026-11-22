import { describe, expect, it } from 'vitest';
import type { ContextoAptitud } from './aptitudContexto';
import {
  INICIO_RESULTADOS,
  completarRespuestasPorDefecto,
  elegirAptitudPorDefectoAlSalir,
  prepararAptitudParaGuardar,
  redactarAlteraciones,
  redactarMedidas,
  redactarResultados,
  volverAGenerar,
} from './aptitudGuardado';

const HOY = '2026-11-21';

const HC = { fechaHistoriaClinica: '2026-11-10', resumenHistoriaClinica: 'Sin antecedentes de importancia' };
const EF = {
  fechaExploracionFisica: '2026-11-12',
  categoriaIMC: 'Sobrepeso',
  indiceMasaCorporal: 27.4,
  circunferenciaCintura: 95,
  categoriaCircunferenciaCintura: 'Riesgo Aumentado',
  categoriaTensionArterial: 'Normal',
  tensionArterialSistolica: 120,
  tensionArterialDiastolica: 80,
  resumenExploracionFisica: 'Se encuentra clínicamente sana',
};

const contexto = (cambios: Partial<ContextoAptitud> = {}): ContextoAptitud => ({
  vecinos: { historiaClinica: [HC], exploracionFisica: [EF] },
  motivoExamen: 'Ingreso',
  tamizajes: { entrevistaPsicologica: [], trastornosEstadoAnimo: [], cuestionarioProdromalBreve: [], trastornoLimitePersonalidad: [] },
  ...cambios,
});

describe('aptitud: textos generados (punto 45)', () => {
  it('alteraciones con los documentos más cercanos; sin historia o exploración, nada', () => {
    const texto = redactarAlteraciones(contexto(), { fechaAptitudPuesto: HOY }, 'Femenino')!;
    expect(texto.startsWith('La trabajadora presenta sobrepeso con un índice de masa corporal (IMC) de 27.4.')).toBe(true);
    expect(texto).toContain('circunferencia de cintura de 95 cm por lo que tiene riesgo aumentado');
    expect(texto).toContain('presión arterial normal con una medición de 120/80 mmHg.');
    expect(texto).toContain('Sin antecedentes de importancia. Se encuentra clínicamente sana.');
    expect(redactarAlteraciones(contexto({ vecinos: { historiaClinica: [HC] } }), { fechaAptitudPuesto: HOY }, 'Femenino')).toBeNull();
    // Documentos de otro año no cuentan
    expect(redactarAlteraciones(contexto(), { fechaAptitudPuesto: '2025-06-01' }, 'Femenino')).toBeNull();
  });

  it('resultados según la aptitud, el sexo, las evaluaciones y el motivo del examen', () => {
    expect(redactarResultados(contexto(), { fechaAptitudPuesto: HOY }, 'Masculino')).toBeNull();
    expect(redactarResultados(contexto(), { fechaAptitudPuesto: HOY, aptitudPuesto: 'Apto Sin Restricciones' }, 'Femenino')).toBe(
      `${INICIO_RESULTADOS}se encuentra clínicamente SANA Y APTA PARA LABORAR SIN RESTRICCIONES en las actividades del puesto al que aspira. `,
    );
    expect(
      redactarResultados(
        contexto({ motivoExamen: 'Periódico' }),
        { fechaAptitudPuesto: HOY, aptitudPuesto: 'Apto Con Restricciones', evaluacionAdicional1: 'Audiometría' },
        'Masculino',
      ),
    ).toBe(
      `${INICIO_RESULTADOS}se encuentra médicamente APTO PARA LABORAR CON RESTRICCIONES en las actividades del puesto que desempeña. Aunque apto para el trabajo, requiere medidas adicionales para garantizar su seguridad y bienestar en el entorno laboral. `,
    );
  });

  it('medidas sugeridas por hallazgo', () => {
    expect(redactarMedidas(contexto(), { fechaAptitudPuesto: HOY })).toBeTruthy();
    expect(redactarMedidas(contexto({ vecinos: {} }), { fechaAptitudPuesto: HOY })).toBeNull();
  });
});

describe('aptitud: escritura en el formulario', () => {
  it('sin contexto no escribe textos; la fecha solo al revisar su sección', () => {
    const df = completarRespuestasPorDefecto({}, { hoy: HOY, visitado: () => false });
    expect(df).toEqual({});
    completarRespuestasPorDefecto(df, { hoy: HOY, visitado: (p) => p === 1 });
    expect(df.fechaAptitudPuesto).toBe(HOY);
  });

  it('con contexto, los tres textos aunque no se haya revisado su sección; la aptitud no se pone sola', () => {
    const df = completarRespuestasPorDefecto({ aptitudPuesto: 'No Apto' }, { contexto: contexto(), sexo: 'Femenino', hoy: HOY, visitado: () => false });
    expect(df.alteracionesSalud).toContain('La trabajadora presenta sobrepeso');
    expect(df.resultados).toContain('NO APTA PARA LABORAR');
    expect(df.medidasPreventivas).toBeTruthy();
    expect(prepararAptitudParaGuardar({}, { contexto: contexto(), sexo: 'Femenino' }).aptitudPuesto).toBeUndefined();
  });

  it('al cambiar la aptitud se rehace resultados, salvo que se haya editado', () => {
    const df: Record<string, any> = { fechaAptitudPuesto: HOY, aptitudPuesto: 'Apto Sin Restricciones' };
    completarRespuestasPorDefecto(df, { contexto: contexto(), sexo: 'Masculino' });
    df.aptitudPuesto = 'No Apto';
    completarRespuestasPorDefecto(df, { contexto: contexto(), sexo: 'Masculino' });
    expect(df.resultados).toContain('NO APTO PARA LABORAR');
    df.resultados = 'Texto del médico';
    df.aptitudPuesto = 'Apto Con Precaución';
    completarRespuestasPorDefecto(df, { contexto: contexto(), sexo: 'Masculino' });
    expect(df.resultados).toBe('Texto del médico');
    volverAGenerar(df, 'resultados', contexto(), 'Masculino');
    expect(df.resultados).toContain('APTO PARA LABORAR CON PRECAUCIÓN');
  });

  it('un documento guardado conserva sus textos (no trae lo generado)', () => {
    const df = completarRespuestasPorDefecto(
      { fechaAptitudPuesto: HOY, aptitudPuesto: 'No Apto', alteracionesSalud: 'Guardado', resultados: 'Guardado', medidasPreventivas: 'Guardado' },
      { contexto: contexto(), sexo: 'Masculino' },
    );
    expect([df.alteracionesSalud, df.resultados, df.medidasPreventivas]).toEqual(['Guardado', 'Guardado', 'Guardado']);
  });

  it('el mismo envío revisando las secciones una por una o ninguna', () => {
    const base = () => ({ aptitudPuesto: 'Apto Con Precaución', evaluacionAdicional1: 'Espirometría' });
    const vistos = new Set<number>();
    const porSecciones = base();
    for (const paso of [1, 2, 8, 9, 10, 11]) {
      vistos.add(paso);
      completarRespuestasPorDefecto(porSecciones, { contexto: contexto(), sexo: 'Femenino', hoy: HOY, visitado: (p) => vistos.has(p) });
    }
    const deUnaVez = completarRespuestasPorDefecto(base(), { contexto: contexto(), sexo: 'Femenino', hoy: HOY, visitado: () => false });
    // Con la misma fecha de hoy (antes tomaba la del reloj y fallaba al cambiar el día)
    prepararAptitudParaGuardar(porSecciones, { contexto: contexto(), sexo: 'Femenino', hoy: HOY });
    expect(prepararAptitudParaGuardar(deUnaVez, { contexto: contexto(), sexo: 'Femenino', hoy: HOY })).toEqual(porSecciones);
  });
});

describe('aptitud por defecto al salir del paso (con vista previa)', () => {
  it('sin elegir queda «Apto Sin Restricciones»; lo elegido no se toca', () => {
    const vacia: Record<string, any> = {};
    expect(elegirAptitudPorDefectoAlSalir(vacia)).toBe(true);
    expect(vacia.aptitudPuesto).toBe('Apto Sin Restricciones');
    const elegida: Record<string, any> = { aptitudPuesto: 'No Apto' };
    expect(elegirAptitudPorDefectoAlSalir(elegida)).toBe(false);
    expect(elegida.aptitudPuesto).toBe('No Apto');
  });
});
