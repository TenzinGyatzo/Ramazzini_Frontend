import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/stores/documentos', () => ({
  useDocumentosStore: () => ({ currentTypeOfDocument: 'informeLongitudinalAudiometrico' }),
}));
vi.mock('@/stores/trabajadores', () => ({
  useTrabajadoresStore: () => ({ currentTrabajador: null }),
}));

import { useStepsStore } from '@/stores/steps';
import { validarCamposRequeridos } from '@/helpers/validacionCampos';
import { snapshotExposicionRuidoIla } from '@/helpers/informeLongitudinalAudiometrico';
import { MAX_CHARS_CONCLUSIONES_ILA } from '@/helpers/ilaConclusionDecisiones';

const helpersDir = path.dirname(fileURLToPath(import.meta.url));
const stepsDir = path.resolve(helpersDir, '../components/steps');

function leer(rel: string): string {
  return readFileSync(path.resolve(stepsDir, rel), 'utf8');
}

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

describe('flujo ILA de cinco pasos', () => {
  it('registra cinco pasos: periodo, OD, OI, conclusiones y recomendaciones', () => {
    const src = leer('FormStepper.vue');
    expect(src).not.toContain("name: 'Contexto y revisión'");
    expect(src).not.toContain('Step4ContextoIla');
    expect(src).toContain("name: 'Conclusiones'");
    expect(src).toContain("name: 'Recomendaciones'");
    expect(src).toContain('Step5DecisionesConclusionIla');
    expect(src).toContain('Step6RecomendacionesIla');
    const setSteps = src.slice(
      src.indexOf('{ component: Step1InformeLongitudinalAudiometrico'),
      src.indexOf('{ component: Step6RecomendacionesIla') + 80,
    );
    expect(setSteps.match(/component:/g)?.length).toBe(5);
  });

  it('calcula 60 % en el paso 4, 80 % en el 5 y 100 % en Completado', () => {
    const pct = (step: number, len = 5) =>
      Math.round((Math.max(0, step - 1) / len) * 100);
    expect(pct(4)).toBe(60);
    expect(pct(5)).toBe(80);
    expect(pct(6)).toBe(100);
  });

  it('el visualizador lleva conclusiones al paso 4 y recomendaciones al 5', () => {
    const src = leer('VisualizadorInformeLongitudinalAudiometrico.vue');
    expect(src).toContain('goToStep(4)');
    expect(src).toContain('goToStep(5)');
    expect(src).toContain('currentStep === 4');
    expect(src).toContain('currentStep === 5');
    expect(src).toContain('conclusionesSeguimientoAudiometrico');
    expect(src).toContain('recomendacionesPreview');
    expect(src).toContain('etiquetaLetraRecomendacionIla');
    expect(src).toContain('+ Agregar Recomendaciones');
    expect(src).not.toContain('Sin recomendaciones registradas.');
    expect(src).not.toMatch(/decisionesConclusionIla/);
    expect(src).not.toContain('goToStep(6)');
  });

  it('goToStep 4 y 5 son válidos cuando hay cinco pasos', () => {
    setActivePinia(createPinia());
    const store = useStepsStore();
    store.setSteps(
      Array.from({ length: 5 }, (_, i) => ({
        component: { name: `S${i + 1}` },
        name: `Paso ${i + 1}`,
      })),
    );
    store.goToStep(4);
    expect(store.currentStep).toBe(4);
    store.goToStep(5);
    expect(store.currentStep).toBe(5);
  });

  it('conclusiones no muestran chips de ficha, preguntas ni enlaces a oídos', () => {
    const src = leer('informeLongitudinalAudiometricoSteps/Step5DecisionesConclusionIla.vue');
    expect(src).not.toContain('ContextoRevisionIla');
    expect(src).not.toContain('Ficha actual');
    expect(src).not.toContain('Ver oído derecho');
    expect(src).not.toContain('historia otológica elegible');
    expect(src).toContain('Evolución del seguimiento');
    expect(src).toContain('Distribución de los hallazgos');
  });
});

describe('contrato de rendimiento y proyección viva', () => {
  it('el paso de recomendaciones usa lista editable sin HTTP', () => {
    const src = leer('informeLongitudinalAudiometricoSteps/Step6RecomendacionesIla.vue');
    expect(src).toContain('Restablecer sugeridas');
    expect(src).toContain('Agregar recomendación');
    expect(src).toContain('MAX_RECOMENDACIONES_ILA');
    expect(src).toContain('aplicarSugerenciasSiNoInicializadas');
    expect(src).not.toContain('type="textarea"');
    expect(src).not.toMatch(/DocumentosAPI|axios|fetch\(|getById|findDocument/);
  });

  it('conclusiones y recomendaciones no disparan HTTP', () => {
    const archivos = [
      'informeLongitudinalAudiometricoSteps/Step5DecisionesConclusionIla.vue',
      'informeLongitudinalAudiometricoSteps/Step6RecomendacionesIla.vue',
    ];
    for (const rel of archivos) {
      const src = leer(rel);
      expect(src).not.toMatch(/DocumentosAPI|axios|fetch\(|getById|findDocument/);
    }
  });

  it('el constructor de conclusiones no lee cambioUmbralOido ni sugiere empeoramiento', () => {
    const src = leer('informeLongitudinalAudiometricoSteps/Step5DecisionesConclusionIla.vue');
    expect(src).not.toMatch(/cambioUmbralOido(Derecho|Izquierdo)/);
    expect(src).not.toMatch(/empeoramiento descrito|sugerencia/i);
    expect(src).toContain('claveDecisiones');
    expect(src).not.toMatch(/watch\([^)]*conclusionesSeguimientoAudiometrico/);
  });

  it('el snapshot de empate no atribuye id de HO', () => {
    const snap = snapshotExposicionRuidoIla({
      fechaInforme: '2026-06-01',
      historias: [
        {
          _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
          fechaHistoriaOtologica: '2025-05-12',
          estado: 'finalizado',
          trabajoAmbientesRuidosos: 'SI',
        },
        {
          _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
          fechaHistoriaOtologica: '2025-05-12',
          estado: 'finalizado',
          trabajoAmbientesRuidosos: 'NO',
        },
      ],
    });
    expect(snap.idHistoriaOtologica).toBeUndefined();
    expect(snap.fuente).not.toBe('historiaOtologica');
    expect(snap.trabajoAmbientesRuidosos).toBeUndefined();
  });
});

describe('validación de conclusiones', () => {
  it('no bloquea nextStep ni guardado si hay 801 caracteres', () => {
    const r = validarCamposRequeridos('informeLongitudinalAudiometrico', {
      ...ILA_MINIMO,
      conclusionesSeguimientoAudiometrico: 'x'.repeat(801),
    });
    expect(r.esValido).toBe(true);
    expect(MAX_CHARS_CONCLUSIONES_ILA).toBe(4000);
  });
});
