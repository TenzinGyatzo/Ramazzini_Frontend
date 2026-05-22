import { describe, expect, it } from 'vitest';
import type { EscFormCoherenciaInput } from './coherenciaClinicaEsc';
import {
  evaluarCoherenciaEsc,
  limpiarControlAlDesmarcarDiagnostico,
  limpiarControlSinDiagnostico,
  marcarDiagnosticoActivoEsc,
  sincronizarEstadoControlAutomatico,
  textoEstadoCondicionEscVista,
  textoEstadoSugeridoCondicionEscVista,
  tieneControlHuerfano,
} from './coherenciaClinicaEsc';

function form(partial: EscFormCoherenciaInput): EscFormCoherenciaInput {
  return { ...partial };
}

describe('evaluarCoherenciaEsc — hipertensión', () => {
  it('HTA-01: sin dx + TA normal → SIN_DIAGNOSTICO_ACTIVO y botones bloqueados', () => {
    const r = evaluarCoherenciaEsc(
      form({
        signosVitales: {
          tensionArterialSistolica: 118,
          tensionArterialDiastolica: 76,
          categoriaTensionArterial: 'Óptima',
        },
      }),
    ).hipertensionArterial;
    expect(r.estadoCalculado).toBe('SIN_DIAGNOSTICO_ACTIVO');
    expect(r.estadosBloqueados).toEqual(['CONTROLADA', 'NO_CONTROLADA', 'NO_VALORABLE']);
    expect(r.estadosPermitidos).toEqual([]);
  });

  it('HTA-02: sin dx + grado 1 → HALLAZGO_COMPATIBLE, no ALTERACION_DOCUMENTADA', () => {
    const r = evaluarCoherenciaEsc(
      form({
        signosVitales: {
          tensionArterialSistolica: 145,
          tensionArterialDiastolica: 92,
          categoriaTensionArterial: 'Hipertensión grado 1',
        },
      }),
    ).hipertensionArterial;
    expect(r.estadoCalculado).toBe('HALLAZGO_COMPATIBLE');
    expect(r.estadoCalculado).not.toBe('ALTERACION_DOCUMENTADA');
    expect(r.advertencias.some((a) => a.codigo === 'TA_ELEVADA_SIN_DX')).toBe(false);
  });

  it('HTA-02b: sin dx + TA Alta → HALLAZGO_COMPATIBLE, sin advertencia TA_ELEVADA_SIN_DX', () => {
    const r = evaluarCoherenciaEsc(
      form({
        signosVitales: {
          tensionArterialSistolica: 138,
          tensionArterialDiastolica: 88,
          categoriaTensionArterial: 'Alta',
        },
      }),
    ).hipertensionArterial;
    expect(r.estadoCalculado).toBe('HALLAZGO_COMPATIBLE');
    expect(r.advertencias.some((a) => a.codigo === 'TA_ELEVADA_SIN_DX')).toBe(false);
  });

  it('HTA-03: con dx + TA normal → sugerencia CONTROLADA', () => {
    const r = evaluarCoherenciaEsc(
      form({
        diagnosticosActivos: ['HIPERTENSION_ARTERIAL'],
        signosVitales: {
          tensionArterialSistolica: 118,
          tensionArterialDiastolica: 76,
          categoriaTensionArterial: 'Normal',
        },
      }),
    ).hipertensionArterial;
    expect(r.estadoCalculado).toBe('CONTROLADA');
    expect(r.controlSeleccionableManualmente).toBe(false);
    expect(r.estadosPermitidos).toEqual([]);
    expect(
      r.advertencias.some((a) => a.codigo === 'CONTROL_CONTRADICE_OBJETIVO'),
    ).toBe(false);
  });

  it('HTA-03b: CONTROLADA evidente + manual NO_CONTROLADA → sin advertencia de contradicción', () => {
    const r = evaluarCoherenciaEsc(
      form({
        diagnosticosActivos: ['HIPERTENSION_ARTERIAL'],
        signosVitales: {
          tensionArterialSistolica: 120,
          tensionArterialDiastolica: 80,
          categoriaTensionArterial: 'Normal',
        },
        estadoCondiciones: { hipertensionArterial: { control: 'NO_CONTROLADA' } },
      }),
    ).hipertensionArterial;
    expect(r.estadoCalculado).toBe('CONTROLADA');
    expect(r.controlSeleccionableManualmente).toBe(false);
    expect(r.advertencias.some((a) => a.codigo === 'CONTROL_CONTRADICE_OBJETIVO')).toBe(
      false,
    );
  });

  it('HTA-04: con dx + TA elevada → sugerencia NO_CONTROLADA', () => {
    const r = evaluarCoherenciaEsc(
      form({
        diagnosticosActivos: ['HIPERTENSION_ARTERIAL'],
        signosVitales: {
          tensionArterialSistolica: 152,
          tensionArterialDiastolica: 96,
          categoriaTensionArterial: 'Hipertensión grado 1',
        },
      }),
    ).hipertensionArterial;
    expect(r.estadoCalculado).toBe('NO_CONTROLADA');
    expect(r.controlSeleccionableManualmente).toBe(true);
  });

  it('HTA-05: con dx + sin TA → NO_VALORABLE', () => {
    const r = evaluarCoherenciaEsc(
      form({ diagnosticosActivos: ['HIPERTENSION_ARTERIAL'] }),
    ).hipertensionArterial;
    expect(r.estadoCalculado).toBe('NO_VALORABLE');
    expect(r.controlSeleccionableManualmente).toBe(false);
    expect(r.estadosPermitidos).toEqual([]);
    expect(r.advertencias.some((a) => a.codigo === 'TA_FALTANTE')).toBe(true);
  });
});

describe('evaluarCoherenciaEsc — DM2', () => {
  it('DM2-01: sin dx + glucosa 95 + HbA1c 5.4 → SIN_DIAGNOSTICO_ACTIVO', () => {
    const r = evaluarCoherenciaEsc(
      form({
        laboratorio: { glucosaMgDl: 95, categoriaGlucosa: 'Normal', hba1cPorcentaje: 5.4 },
      }),
    ).diabetesMellitusTipo2;
    expect(r.estadoCalculado).toBe('SIN_DIAGNOSTICO_ACTIVO');
  });

  it('DM2-02: sin dx + glucosa 110 → HALLAZGO_COMPATIBLE', () => {
    const r = evaluarCoherenciaEsc(
      form({ laboratorio: { glucosaMgDl: 110, categoriaGlucosa: 'Alterada' } }),
    ).diabetesMellitusTipo2;
    expect(r.estadoCalculado).toBe('HALLAZGO_COMPATIBLE');
  });

  it('DM2-02b: sin dx + HbA1c 5.9 → HALLAZGO_COMPATIBLE', () => {
    const r = evaluarCoherenciaEsc(
      form({ laboratorio: { hba1cPorcentaje: 5.9, categoriaHbA1c: 'Prediabetes' } }),
    ).diabetesMellitusTipo2;
    expect(r.estadoCalculado).toBe('HALLAZGO_COMPATIBLE');
  });

  it('DM2-03: sin dx + glucosa >=126 → ALTERACION_DOCUMENTADA', () => {
    const r = evaluarCoherenciaEsc(
      form({ laboratorio: { glucosaMgDl: 130, categoriaGlucosa: 'Elevada' } }),
    ).diabetesMellitusTipo2;
    expect(r.estadoCalculado).toBe('ALTERACION_DOCUMENTADA');
    expect(r.advertencias.some((a) => a.accionSugerida === 'MARCAR_DIAGNOSTICO_ACTIVO')).toBe(true);
  });

  it('DM2-04: sin dx + HbA1c >=6.5 → ALTERACION_DOCUMENTADA', () => {
    const r = evaluarCoherenciaEsc(
      form({ laboratorio: { hba1cPorcentaje: 7.2, categoriaHbA1c: 'Compatible con diabetes' } }),
    ).diabetesMellitusTipo2;
    expect(r.estadoCalculado).toBe('ALTERACION_DOCUMENTADA');
    expect(r.advertencias.some((a) => a.accionSugerida === 'MARCAR_DIAGNOSTICO_ACTIVO')).toBe(true);
  });

  it('DM2-05: sin dx + glucosa y HbA1c documentadas → MARCAR_DIAGNOSTICO_ACTIVO fuerte', () => {
    const r = evaluarCoherenciaEsc(
      form({
        laboratorio: {
          glucosaMgDl: 140,
          categoriaGlucosa: 'Elevada',
          hba1cPorcentaje: 7.5,
          categoriaHbA1c: 'Compatible con diabetes',
        },
      }),
    ).diabetesMellitusTipo2;
    expect(r.estadoCalculado).toBe('ALTERACION_DOCUMENTADA');
    expect(r.advertencias.some((a) => a.codigo === 'DM2_AMBOS_CRITERIOS')).toBe(true);
    expect(r.advertencias.some((a) => a.accionSugerida === 'MARCAR_DIAGNOSTICO_ACTIVO')).toBe(true);
  });

  it('DM2-06: con dx + sin lab → NO_VALORABLE con persistencia automática', () => {
    const r = evaluarCoherenciaEsc(
      form({ diagnosticosActivos: ['DIABETES_MELLITUS_TIPO_2'] }),
    ).diabetesMellitusTipo2;
    expect(r.estadoCalculado).toBe('NO_VALORABLE');
    expect(r.persistirControlAutomatico).not.toBe(false);
  });

  it('DM2-07: con dx + lab desfavorable → NO_CONTROLADA', () => {
    const r = evaluarCoherenciaEsc(
      form({
        diagnosticosActivos: ['DIABETES_MELLITUS_TIPO_2'],
        laboratorio: { hba1cPorcentaje: 7.5, categoriaHbA1c: 'Compatible con diabetes' },
      }),
    ).diabetesMellitusTipo2;
    expect(r.estadoCalculado).toBe('NO_CONTROLADA');
    expect(r.advertencias.some((a) => a.codigo === 'VALORACION_ORIENTATIVA')).toBe(false);
  });

  it('DM2-07b: con dx + glucosa 140 → NO_CONTROLADA', () => {
    const r = evaluarCoherenciaEsc(
      form({
        diagnosticosActivos: ['DIABETES_MELLITUS_TIPO_2'],
        laboratorio: { glucosaMgDl: 140, categoriaGlucosa: 'Elevada' },
      }),
    ).diabetesMellitusTipo2;
    expect(r.estadoCalculado).toBe('NO_CONTROLADA');
  });

  it('DM2-08: con dx + glucosa 110 y HbA1c 5.9 → NO_CONTROLADA intermedio con selección manual', () => {
    const r = evaluarCoherenciaEsc(
      form({
        diagnosticosActivos: ['DIABETES_MELLITUS_TIPO_2'],
        laboratorio: {
          glucosaMgDl: 110,
          categoriaGlucosa: 'Alterada',
          hba1cPorcentaje: 5.9,
          categoriaHbA1c: 'Prediabetes',
        },
      }),
    ).diabetesMellitusTipo2;
    expect(r.estadoCalculado).toBe('NO_CONTROLADA');
    expect(r.controlSeleccionableManualmente).toBe(true);
    expect(r.advertencias.some((a) => a.codigo === 'DM2_RANGO_INTERMEDIO')).toBe(true);
  });
});

describe('evaluarCoherenciaEsc — dislipidemia', () => {
  it('DIS-01: sin dx + perfil normal → SIN_DIAGNOSTICO_ACTIVO', () => {
    const r = evaluarCoherenciaEsc(
      form({
        laboratorio: {
          ldlMgDl: 100,
          categoriaLDL: 'Óptimo',
          trigliceridosMgDl: 120,
          categoriaTrigliceridos: 'Normal',
        },
      }),
    ).dislipidemia;
    expect(r.estadoCalculado).toBe('SIN_DIAGNOSTICO_ACTIVO');
  });

  it('DIS-02: sin dx + LDL límite → HALLAZGO_COMPATIBLE', () => {
    const r = evaluarCoherenciaEsc(
      form({
        laboratorio: { ldlMgDl: 140, categoriaLDL: 'Límite alto' },
      }),
    ).dislipidemia;
    expect(r.estadoCalculado).toBe('HALLAZGO_COMPATIBLE');
  });

  it('DIS-03: sin dx + TG 365 + HDL 39 → ALTERACION_DOCUMENTADA', () => {
    const r = evaluarCoherenciaEsc(
      form({
        laboratorio: {
          colesterolTotalMgDl: 235,
          ldlMgDl: 152,
          hdlMgDl: 39,
          trigliceridosMgDl: 365,
        },
      }),
    ).dislipidemia;
    expect(r.estadoCalculado).toBe('ALTERACION_DOCUMENTADA');
    expect(r.advertencias.some((a) => a.accionSugerida === 'MARCAR_DIAGNOSTICO_ACTIVO')).toBe(true);
  });

  it('DIS-04: sin dx + LDL >=160 → ALTERACION_DOCUMENTADA', () => {
    const r = evaluarCoherenciaEsc(
      form({ laboratorio: { ldlMgDl: 165 } }),
    ).dislipidemia;
    expect(r.estadoCalculado).toBe('ALTERACION_DOCUMENTADA');
  });

  it('DIS-05: sin dx + TG >=500 → ALTERACION_DOCUMENTADA + advertencia fuerte', () => {
    const r = evaluarCoherenciaEsc(
      form({ laboratorio: { trigliceridosMgDl: 520 } }),
    ).dislipidemia;
    expect(r.estadoCalculado).toBe('ALTERACION_DOCUMENTADA');
    expect(r.advertencias.some((a) => a.codigo === 'DIS_TG_MUY_ALTO')).toBe(true);
  });

  it('DIS-06: con dx + sin lípidos → NO_VALORABLE', () => {
    const r = evaluarCoherenciaEsc(
      form({ diagnosticosActivos: ['DISLIPIDEMIA'] }),
    ).dislipidemia;
    expect(r.estadoCalculado).toBe('NO_VALORABLE');
  });

  it('DIS-07: con dx + LDL alto → NO_CONTROLADA', () => {
    const r = evaluarCoherenciaEsc(
      form({
        diagnosticosActivos: ['DISLIPIDEMIA'],
        laboratorio: { ldlMgDl: 190, categoriaLDL: 'Muy alto' },
      }),
    ).dislipidemia;
    expect(r.estadoCalculado).toBe('NO_CONTROLADA');
  });

  it('DIS-08: HDL bajo aislado en mujer → HALLAZGO_COMPATIBLE', () => {
    const r = evaluarCoherenciaEsc(
      form({ laboratorio: { hdlMgDl: 45 } }),
      { sexoPaciente: 'Femenino' },
    ).dislipidemia;
    expect(r.estadoCalculado).toBe('HALLAZGO_COMPATIBLE');
    expect(r.estadoCalculado).not.toBe('ALTERACION_DOCUMENTADA');
  });

  it('DIS-08b: sin dx + HDL 39 solo → HALLAZGO_COMPATIBLE', () => {
    const r = evaluarCoherenciaEsc(
      form({ laboratorio: { hdlMgDl: 39, categoriaHDL: 'Bajo' } }),
    ).dislipidemia;
    expect(r.estadoCalculado).toBe('HALLAZGO_COMPATIBLE');
  });
});

describe('evaluarCoherenciaEsc — obesidad', () => {
  it('OBE-01: IMC normal → SIN_OBESIDAD', () => {
    const r = evaluarCoherenciaEsc(
      form({
        somatometria: { indiceMasaCorporal: 22, categoriaIMC: 'Normal' },
      }),
    ).obesidad;
    expect(r.estadoCalculado).toBe('SIN_OBESIDAD');
  });

  it('OBE-02: sobrepeso → SOBREPESO', () => {
    const r = evaluarCoherenciaEsc(
      form({
        somatometria: { indiceMasaCorporal: 27, categoriaIMC: 'Sobrepeso' },
      }),
    ).obesidad;
    expect(r.estadoCalculado).toBe('SOBREPESO');
  });

  it('OBE-03: IMC 32 → OBESIDAD_I', () => {
    const r = evaluarCoherenciaEsc(
      form({
        somatometria: { indiceMasaCorporal: 32, categoriaIMC: 'Obesidad clase I' },
        diagnosticosActivos: ['OBESIDAD'],
      }),
    ).obesidad;
    expect(r.estadoCalculado).toBe('OBESIDAD_I');
  });

  it('OBE-04: dx obesidad + IMC 28 → warning REVISAR', () => {
    const r = evaluarCoherenciaEsc(
      form({
        diagnosticosActivos: ['OBESIDAD'],
        somatometria: { indiceMasaCorporal: 28, categoriaIMC: 'Sobrepeso' },
      }),
    ).obesidad;
    const w = r.advertencias.find((a) => a.codigo === 'DX_OBESIDAD_IMC_NORMAL');
    expect(w?.severidad).toBe('warning');
    expect(w?.accionSugerida).toBe('REVISAR');
  });

  it('OBE-05: sin IMC → NO_VALORABLE', () => {
    const r = evaluarCoherenciaEsc(form({})).obesidad;
    expect(r.estadoCalculado).toBe('NO_VALORABLE');
  });
});

describe('advertencias y limpieza', () => {
  it('ADV-01: control sin diagnóstico → error CORREGIR', () => {
    const r = evaluarCoherenciaEsc(
      form({
        estadoCondiciones: { hipertensionArterial: { control: 'CONTROLADA' } },
      }),
    ).hipertensionArterial;
    const a = r.advertencias.find((x) => x.codigo === 'CONTROL_SIN_DIAGNOSTICO');
    expect(a?.severidad).toBe('error');
    expect(a?.accionSugerida).toBe('CORREGIR');
  });

  it('TEC-01: limpiarControlSinDiagnostico elimina los tres tipos de control huérfanos', () => {
    const f = form({
      estadoCondiciones: {
        hipertensionArterial: { control: 'CONTROLADA' },
        diabetesMellitusTipo2: { control: 'NO_VALORABLE' },
        dislipidemia: { control: 'NO_CONTROLADA' },
      },
    });
    expect(tieneControlHuerfano(f)).toBe(true);
    limpiarControlSinDiagnostico(f);
    expect(tieneControlHuerfano(f)).toBe(false);
    expect(f.estadoCondiciones).toBeUndefined();
  });

  it('TEC-02: evaluar no muta el formulario', () => {
    const f = form({
      diagnosticosActivos: ['HIPERTENSION_ARTERIAL'],
      signosVitales: {
        tensionArterialSistolica: 120,
        tensionArterialDiastolica: 80,
        categoriaTensionArterial: 'Normal',
      },
    });
    const antes = JSON.stringify(f);
    evaluarCoherenciaEsc(f);
    expect(JSON.stringify(f)).toBe(antes);
  });

  it('VISTA-01: texto vista sin dx muestra Sin diagnóstico activo', () => {
    const t = textoEstadoCondicionEscVista(
      form({
        signosVitales: {
          tensionArterialSistolica: 118,
          tensionArterialDiastolica: 76,
          categoriaTensionArterial: 'Óptima',
        },
      }),
      'hipertensionArterial',
    );
    expect(t).toBe('Sin diagnóstico activo');
  });

  it('VISTA-02: texto vista alteración documentada DM2', () => {
    const t = textoEstadoCondicionEscVista(
      form({ laboratorio: { glucosaMgDl: 130 } }),
      'diabetesMellitusTipo2',
    );
    expect(t).toBe('Alteración documentada');
  });

  it('VISTA-03: con CONTROLADA evidente, vista ignora manual NO_CONTROLADA', () => {
    const f = form({
      diagnosticosActivos: ['HIPERTENSION_ARTERIAL'],
      signosVitales: {
        tensionArterialSistolica: 118,
        tensionArterialDiastolica: 76,
        categoriaTensionArterial: 'Normal',
      },
      estadoCondiciones: { hipertensionArterial: { control: 'NO_CONTROLADA' } },
    });
    expect(
      textoEstadoSugeridoCondicionEscVista(f, 'hipertensionArterial'),
    ).toBe('Controlada');
    expect(textoEstadoCondicionEscVista(f, 'hipertensionArterial')).toBe('Controlada');
    sincronizarEstadoControlAutomatico(f);
    expect(f.estadoCondiciones?.hipertensionArterial?.control).toBe('CONTROLADA');
  });

  it('SYNC-01: sincronizar asigna NO_VALORABLE con dx sin TA', () => {
    const f = form({ diagnosticosActivos: ['HIPERTENSION_ARTERIAL'] });
    sincronizarEstadoControlAutomatico(f);
    expect(f.estadoCondiciones?.hipertensionArterial?.control).toBe('NO_VALORABLE');
  });

  it('SYNC-02: sincronizar elimina control sin diagnóstico activo', () => {
    const f = form({
      estadoCondiciones: { hipertensionArterial: { control: 'CONTROLADA' } },
    });
    sincronizarEstadoControlAutomatico(f);
    expect(f.estadoCondiciones).toBeUndefined();
  });

  it('SYNC-03: sincronizar no persiste ALTERACION_DOCUMENTADA', () => {
    const f = form({
      laboratorio: { glucosaMgDl: 140, categoriaGlucosa: 'Elevada' },
    });
    sincronizarEstadoControlAutomatico(f);
    expect(f.estadoCondiciones).toBeUndefined();
  });

  it('SYNC-04: sincronizar fuerza CONTROLADA cuando los datos son favorables', () => {
    const f = form({
      diagnosticosActivos: ['HIPERTENSION_ARTERIAL'],
      signosVitales: {
        tensionArterialSistolica: 118,
        tensionArterialDiastolica: 76,
        categoriaTensionArterial: 'Normal',
      },
      estadoCondiciones: { hipertensionArterial: { control: 'NO_CONTROLADA' } },
    });
    sincronizarEstadoControlAutomatico(f);
    expect(f.estadoCondiciones?.hipertensionArterial?.control).toBe('CONTROLADA');
  });

  it('SYNC-04c: sincronizar preselecciona NO_CONTROLADA cuando la sugerencia es no controlada', () => {
    const f = form({
      diagnosticosActivos: ['HIPERTENSION_ARTERIAL'],
      signosVitales: {
        tensionArterialSistolica: 152,
        tensionArterialDiastolica: 96,
        categoriaTensionArterial: 'Hipertensión grado 1',
      },
    });
    sincronizarEstadoControlAutomatico(f);
    expect(f.estadoCondiciones?.hipertensionArterial?.control).toBe('NO_CONTROLADA');
  });

  it('SYNC-04d: sincronizar no sobrescribe CONTROLADA manual con sugerencia NO_CONTROLADA', () => {
    const f = form({
      diagnosticosActivos: ['HIPERTENSION_ARTERIAL'],
      signosVitales: {
        tensionArterialSistolica: 152,
        tensionArterialDiastolica: 96,
        categoriaTensionArterial: 'Hipertensión grado 1',
      },
      estadoCondiciones: { hipertensionArterial: { control: 'CONTROLADA' } },
    });
    sincronizarEstadoControlAutomatico(f);
    expect(f.estadoCondiciones?.hipertensionArterial?.control).toBe('CONTROLADA');
  });

  it('SYNC-04b: sincronizar asigna CONTROLADA en DM2 con lab favorable', () => {
    const f = form({
      diagnosticosActivos: ['DIABETES_MELLITUS_TIPO_2'],
      laboratorio: {
        glucosaMgDl: 95,
        categoriaGlucosa: 'Normal',
        hba1cPorcentaje: 5.4,
        categoriaHbA1c: 'Normal',
      },
    });
    sincronizarEstadoControlAutomatico(f);
    expect(f.estadoCondiciones?.diabetesMellitusTipo2?.control).toBe('CONTROLADA');
  });

  it('SYNC-05: DM2 intermedio con dx auto-persiste NO_CONTROLADA', () => {
    const f = form({
      diagnosticosActivos: ['DIABETES_MELLITUS_TIPO_2'],
      laboratorio: {
        glucosaMgDl: 110,
        categoriaGlucosa: 'Alterada',
        hba1cPorcentaje: 5.9,
        categoriaHbA1c: 'Prediabetes',
      },
    });
    sincronizarEstadoControlAutomatico(f);
    expect(f.estadoCondiciones?.diabetesMellitusTipo2?.control).toBe('NO_CONTROLADA');
  });

  it('MARCAR-01: marcarDiagnosticoActivoEsc añade dx y preselecciona control según datos', () => {
    const f = form({
      laboratorio: { glucosaMgDl: 140, categoriaGlucosa: 'Elevada' },
    });
    marcarDiagnosticoActivoEsc(f, 'diabetesMellitusTipo2');
    expect(f.diagnosticosActivos).toContain('DIABETES_MELLITUS_TIPO_2');
    expect(f.estadoCondiciones?.diabetesMellitusTipo2?.control).toBe('NO_CONTROLADA');
  });

  it('limpiarControlAlDesmarcarDiagnostico elimina control de la condición', () => {
    const f = form({
      diagnosticosActivos: ['HIPERTENSION_ARTERIAL'],
      estadoCondiciones: { hipertensionArterial: { control: 'CONTROLADA' } },
    });
    const cleared = limpiarControlAlDesmarcarDiagnostico(f, 'HIPERTENSION_ARTERIAL');
    expect(cleared).toBe(true);
    expect(f.estadoCondiciones?.hipertensionArterial).toBeUndefined();
  });
});
