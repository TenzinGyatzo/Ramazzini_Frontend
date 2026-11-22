import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const { documentosState, trabajadoresState } = vi.hoisted(() => ({
  documentosState: {
    currentTypeOfDocument: 'historiaClinica' as string,
  },
  trabajadoresState: {
    currentTrabajador: { sexo: 'Femenino' } as { sexo: string } | null,
  },
}));

vi.mock('./documentos', () => ({
  useDocumentosStore: () => documentosState,
}));

vi.mock('./trabajadores', () => ({
  useTrabajadoresStore: () => trabajadoresState,
}));

import { useStepsStore } from './steps';

describe('useStepsStore pinpoint / goToSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    documentosState.currentTypeOfDocument = 'historiaClinica';
    trabajadoresState.currentTrabajador = { sexo: 'Femenino' };
    vi.useFakeTimers();
  });

  function seedSectionSteps(store: ReturnType<typeof useStepsStore>, count = 7) {
    store.setSteps(
      Array.from({ length: count }, (_, i) => ({
        component: { name: `S${i + 1}` },
        name: `Paso ${i + 1}`,
      })),
    );
  }

  it('goToSection con legacyStep fija focusedLegacyStep', () => {
    const store = useStepsStore();
    seedSectionSteps(store);

    store.goToSection(2, 9);

    expect(store.currentStep).toBe(2);
    expect(store.focusedLegacyStep).toBe(9);
  });

  it('goToSection sin legacyStep limpia el pinpoint', () => {
    const store = useStepsStore();
    seedSectionSteps(store);
    store.goToSection(2, 9);

    store.goToSection(2, null);

    expect(store.currentStep).toBe(2);
    expect(store.focusedLegacyStep).toBeNull();
  });

  it('goToStep limpia el pinpoint (wrapper sin legacy)', () => {
    const store = useStepsStore();
    seedSectionSteps(store);
    store.goToSection(2, 9);

    store.goToStep(3);

    expect(store.currentStep).toBe(3);
    expect(store.focusedLegacyStep).toBeNull();
  });

  it('setSteps limpia el pinpoint', () => {
    const store = useStepsStore();
    seedSectionSteps(store);
    store.goToSection(2, 9);

    seedSectionSteps(store, 5);

    expect(store.focusedLegacyStep).toBeNull();
  });

  it('nextStep limpia el pinpoint', () => {
    const store = useStepsStore();
    seedSectionSteps(store);
    store.goToSection(2, 9);

    store.nextStep();

    expect(store.currentStep).toBe(3);
    expect(store.focusedLegacyStep).toBeNull();
  });

  it('previousStep limpia el pinpoint', () => {
    const store = useStepsStore();
    seedSectionSteps(store);
    store.goToSection(2, 9);

    store.previousStep();
    vi.runAllTimers();

    expect(store.currentStep).toBe(1);
    expect(store.focusedLegacyStep).toBeNull();
  });

  it('setPinpoint / clearPinpoint actualizan el estado', () => {
    const store = useStepsStore();
    seedSectionSteps(store);

    store.setPinpoint(12);
    expect(store.focusedLegacyStep).toBe(12);

    store.clearPinpoint();
    expect(store.focusedLegacyStep).toBeNull();
  });
});

describe('«Siguiente» y el modal de campos pendientes (punto 51)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  /** Un «Especifique» obligatorio y vacío a la vista (jsdom no calcula cajas: offsetParent fijo). */
  function campoObligatorioVacio() {
    const input = document.createElement('input');
    input.required = true;
    document.body.appendChild(input);
    Object.defineProperty(input, 'offsetParent', { get: () => document.body });
  }

  function preparar(tipo: string) {
    documentosState.currentTypeOfDocument = tipo;
    const store = useStepsStore();
    store.setSteps(Array.from({ length: 4 }, (_, i) => ({ component: { name: `S${i}` }, name: `Paso ${i + 1}` })));
    campoObligatorioVacio();
    return store;
  }

  it('en los documentos que al guardar llevan campo por campo, avanza sin el modal', () => {
    for (const tipo of ['historiaClinica', 'exploracionFisica', 'notaMedica', 'examenVista', 'audiometria', 'aptitud', 'notaEnfermeria']) {
      const store = preparar(tipo);
      store.nextStep();
      vi.runAllTimers();
      expect(store.currentStep, tipo).toBe(2);
      expect(store.showMissingFieldsModal, tipo).toBe(false);
    }
  });

  it('en los demás (receta, previo a espirometría, control prenatal…) el modal sigue deteniendo el avance', () => {
    for (const tipo of ['receta', 'previoEspirometria', 'controlPrenatal', 'certificado', 'certificadoExpedito', 'notaAclaratoria']) {
      const store = preparar(tipo);
      store.showMissingFieldsModal = false;
      store.nextStep();
      vi.runAllTimers();
      expect(store.currentStep, tipo).toBe(1);
      expect(store.showMissingFieldsModal, tipo).toBe(true);
    }
  });
});
