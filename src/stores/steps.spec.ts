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
