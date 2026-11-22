import { describe, expect, it } from 'vitest';
import {
  PRESELECCION_HISTORIA_OTOLOGICA,
  PRESELECCION_PREVIO_ESPIROMETRIA,
  prepararHistoriaOtologicaParaGuardar,
  prepararPrevioEspirometriaParaGuardar,
} from './cuestionariosRespiratorioOtologico';
import { validarCamposRequeridos } from './validacionCampos';
import { problemasHistoriaOtologica, problemasPrevioEspirometria } from './problemasDocumento';

describe('previo a espirometría e historia otológica al guardar sin recorrer (punto 52)', () => {
  it('completa lo preseleccionado y solo falta el resultado del cuestionario', () => {
    const previo = prepararPrevioEspirometriaParaGuardar({ fechaPrevioEspirometria: '2026-11-22' });
    expect(previo).toMatchObject(PRESELECCION_PREVIO_ESPIROMETRIA);
    expect(validarCamposRequeridos('previoEspirometria', previo).camposFaltantes.map((c) => c.campo)).toEqual(['resultadoCuestionario']);
    const oto = prepararHistoriaOtologicaParaGuardar({ fechaHistoriaOtologica: '2026-11-22' });
    expect(oto).toMatchObject(PRESELECCION_HISTORIA_OTOLOGICA);
    expect(validarCamposRequeridos('historiaOtologica', oto).camposFaltantes.map((c) => c.campo)).toEqual(['resultadoCuestionario']);
  });

  it('no pisa lo contestado', () => {
    const df = prepararPrevioEspirometriaParaGuardar({ tabaquismo: 'FUMA', cigarrosSemana: '<10', asma: 'SI' });
    expect(df.tabaquismo).toBe('FUMA');
    expect(df.cigarrosSemana).toBe('<10');
    expect(df.asma).toBe('SI');
    expect(df.tosCronica).toBe('NO');
  });

  it('«Otro» como resultado pide escribirlo', () => {
    expect(problemasHistoriaOtologica({ resultadoCuestionario: 'OTRO', resultadoCuestionarioPersonalizado: '' }).map((p) => [p.paso, p.campo])).toEqual([[25, 'resultadoCuestionarioPersonalizado']]);
    expect(problemasPrevioEspirometria({ resultadoCuestionario: 'OTRO' }).map((p) => [p.paso, p.campo])).toEqual([[28, 'resultadoCuestionarioPersonalizado']]);
    expect(problemasHistoriaOtologica({ resultadoCuestionario: 'PROCEDENTE' })).toEqual([]);
  });
});
