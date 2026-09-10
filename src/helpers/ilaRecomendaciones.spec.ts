import { describe, expect, it } from 'vitest';
import { CONFIRMACION_HALLAZGOS_ILA } from './ilaConclusionDecisiones';
import { validarCamposRequeridos } from './validacionCampos';
import {
  MAX_RECOMENDACIONES_ILA,
  RECOMENDACION_ILA_COMPLEMENTARIOS,
  RECOMENDACION_ILA_EPP,
  RECOMENDACION_ILA_PCA,
  RECOMENDACION_ILA_REPETIR,
  RECOMENDACION_ILA_VIGILANCIA,
  aplicarSugerenciasSiNoInicializadas,
  construirSugerenciasRecomendacionesIla,
  etiquetaLetraRecomendacionIla,
  exposicionRuidoPuestoActualIla,
  leerRecomendacionesIla,
  listasRecomendacionesIlaEquivalentes,
  normalizarRecomendacionesIla,
  persistirRecomendacionesIlaEnPayload,
  recomendacionesIlaEstanInicializadas,
  recomendacionesIlaSonValidas,
} from './ilaRecomendaciones';

const ILA_MINIMO = {
  fechaInformeLongitudinalAudiometrico: '2026-06-01',
  periodoInicio: '2023-01-01',
  periodoFin: '2026-06-01',
  idAudiometriaBasal: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  audiometriasSubsecuentesIncluidas: ['bbbbbbbbbbbbbbbbbbbbbbbb'],
  audiometriaBasalConcentrada: { fechaAudiometria: '2023-03-15' },
  audiometriasSubsecuentesConcentradas: [{ fechaAudiometria: '2024-03-15' }],
  interpretacionOidoDerecho: 'Interpretación del oído derecho.',
  interpretacionOidoIzquierdo: 'Interpretación del oído izquierdo.',
  idTrabajador: 'cccccccccccccccccccccccc',
};

describe('construirSugerenciasRecomendacionesIla', () => {
  it('sin exposición a ruido registrada: solamente vigilancia periódica', () => {
    expect(construirSugerenciasRecomendacionesIla({})).toEqual([
      RECOMENDACION_ILA_VIGILANCIA,
    ]);
    expect(
      construirSugerenciasRecomendacionesIla({
        ruidoEnPuestoActual: false,
        confirmacion: CONFIRMACION_HALLAZGOS_ILA.NO_REQUERIDA,
      }),
    ).toEqual([RECOMENDACION_ILA_VIGILANCIA]);
  });

  it('exposición actual a ruido: vigilancia, programa y protección auditiva', () => {
    expect(
      construirSugerenciasRecomendacionesIla({ ruidoEnPuestoActual: true }),
    ).toEqual([
      RECOMENDACION_ILA_VIGILANCIA,
      RECOMENDACION_ILA_PCA,
      RECOMENDACION_ILA_EPP,
    ]);
  });

  it('confirmación mediante repetición agrega la recomendación correspondiente', () => {
    expect(
      construirSugerenciasRecomendacionesIla({
        confirmacion: CONFIRMACION_HALLAZGOS_ILA.REQUIERE_REPETICION,
      }),
    ).toEqual([RECOMENDACION_ILA_VIGILANCIA, RECOMENDACION_ILA_REPETIR]);
  });

  it('estudios complementarios agregan la recomendación correspondiente', () => {
    expect(
      construirSugerenciasRecomendacionesIla({
        ruidoEnPuestoActual: true,
        confirmacion: CONFIRMACION_HALLAZGOS_ILA.REQUIERE_COMPLEMENTARIOS,
      }),
    ).toEqual([
      RECOMENDACION_ILA_VIGILANCIA,
      RECOMENDACION_ILA_PCA,
      RECOMENDACION_ILA_EPP,
      RECOMENDACION_ILA_COMPLEMENTARIOS,
    ]);
  });

  it('no infiere ruido por ausencia del agente ni por HO', () => {
    expect(exposicionRuidoPuestoActualIla({})).toBe(false);
    expect(exposicionRuidoPuestoActualIla({ agentesRiesgoActuales: ['Polvo'] })).toBe(
      false,
    );
    expect(
      exposicionRuidoPuestoActualIla({
        ruidoEnAgentesRiesgoActuales: false,
        agentesRiesgoActuales: ['ruido'],
      }),
    ).toBe(false);
    expect(
      exposicionRuidoPuestoActualIla({
        ruidoEnAgentesRiesgoActuales: true,
      }),
    ).toBe(true);
    expect(
      exposicionRuidoPuestoActualIla({
        agentesRiesgoActuales: ['Ruido'],
      }),
    ).toBe(true);
  });
});

describe('inicialización y conservación', () => {
  it('elimina todas y permanecen vacías al navegar, guardar y reabrir', () => {
    const vacia = aplicarSugerenciasSiNoInicializadas([], true, [
      RECOMENDACION_ILA_VIGILANCIA,
    ]);
    expect(vacia.aplico).toBe(false);
    expect(vacia.items).toEqual([]);

    const payload = persistirRecomendacionesIlaEnPayload({
      recomendacionesSeguimientoAudiometrico: [],
      recomendacionesIlaInicializadas: true,
    });
    expect(payload.recomendacionesSeguimientoAudiometrico).toEqual([]);
    expect(payload.recomendacionesIlaInicializadas).toBe(true);

    const reabierta = aplicarSugerenciasSiNoInicializadas(
      payload.recomendacionesSeguimientoAudiometrico as string[],
      payload.recomendacionesIlaInicializadas as boolean,
      [RECOMENDACION_ILA_VIGILANCIA, RECOMENDACION_ILA_PCA],
    );
    expect(reabierta.aplico).toBe(false);
    expect(reabierta.items).toEqual([]);
  });

  it('no sobrescribe una modificación manual', () => {
    const editadas = ['Vigilancia personalizada del médico.'];
    const r = aplicarSugerenciasSiNoInicializadas(editadas, true, [
      RECOMENDACION_ILA_VIGILANCIA,
    ]);
    expect(r.aplico).toBe(false);
    expect(r.items).toEqual(editadas);
  });

  it('restablece sugeridas solo de forma explícita', () => {
    const actuales = ['Texto editado por el médico.'];
    const vigentes = construirSugerenciasRecomendacionesIla({
      ruidoEnPuestoActual: true,
    });
    expect(listasRecomendacionesIlaEquivalentes(actuales, vigentes)).toBe(false);
    expect(vigentes).toEqual([
      RECOMENDACION_ILA_VIGILANCIA,
      RECOMENDACION_ILA_PCA,
      RECOMENDACION_ILA_EPP,
    ]);
  });

  it('campo ausente sí inicializa sugeridas', () => {
    const r = aplicarSugerenciasSiNoInicializadas(
      undefined,
      undefined,
      [RECOMENDACION_ILA_VIGILANCIA],
    );
    expect(r.aplico).toBe(true);
    expect(r.items).toEqual([RECOMENDACION_ILA_VIGILANCIA]);
  });
});

describe('normalización, validación y legado', () => {
  it('máximo de cinco elementos', () => {
    expect(MAX_RECOMENDACIONES_ILA).toBe(5);
    expect(recomendacionesIlaSonValidas(['a', 'b', 'c', 'd', 'e'])).toBe(true);
    expect(recomendacionesIlaSonValidas(['a', 'b', 'c', 'd', 'e', 'f'])).toBe(false);
    const r = validarCamposRequeridos('informeLongitudinalAudiometrico', {
      ...ILA_MINIMO,
      recomendacionesSeguimientoAudiometrico: ['a', 'b', 'c', 'd', 'e', 'f'],
      recomendacionesIlaInicializadas: true,
    });
    expect(r.esValido).toBe(false);
    expect(
      validarCamposRequeridos('informeLongitudinalAudiometrico', {
        ...ILA_MINIMO,
        recomendacionesSeguimientoAudiometrico: [],
        recomendacionesIlaInicializadas: true,
      }).esValido,
    ).toBe(true);
  });

  it('abre un informe anterior con recomendaciones en formato texto como un solo elemento', () => {
    const legado = 'Vigilancia. Uso de EPP, y control en el programa.';
    expect(recomendacionesIlaEstanInicializadas(legado)).toBe(true);
    expect(leerRecomendacionesIla(legado)).toEqual([legado]);
    expect(normalizarRecomendacionesIla(legado)).toEqual([legado]);
    expect(recomendacionesIlaEstanInicializadas('')).toBe(true);
    expect(leerRecomendacionesIla('')).toEqual([]);
  });

  it('vista previa y PDF con una, tres y cinco recomendaciones respetan el orden y las letras', () => {
    const una = ['Primera recomendación'];
    const tres = ['Primera', 'Segunda', 'Tercera'];
    const cinco = ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco'];
    expect(normalizarRecomendacionesIla(una)).toEqual(una);
    expect(normalizarRecomendacionesIla(tres)).toEqual(tres);
    expect(normalizarRecomendacionesIla(cinco)).toEqual(cinco);
    expect(etiquetaLetraRecomendacionIla(0)).toBe('a');
    expect(etiquetaLetraRecomendacionIla(2)).toBe('c');
    expect(etiquetaLetraRecomendacionIla(4)).toBe('e');
  });

  it('recorta, omite vacíos y evita duplicados exactos sin alterar el orden médico', () => {
    expect(
      normalizarRecomendacionesIla([
        '  Primera  ',
        '',
        '   ',
        'primera',
        'Segunda',
        'Segunda',
      ]),
    ).toEqual(['Primera', 'Segunda']);
  });
});
