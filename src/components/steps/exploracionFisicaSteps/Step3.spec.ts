import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Step3 from './Step3.vue';
import { useFormDataStore } from '@/stores/formDataStore';

describe('Exploración física, paso 3 (signos vitales)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('documento nuevo: abre vacío, sin valores por defecto ni categorías', () => {
    const { formDataExploracionFisica } = useFormDataStore();
    const wrapper = mount(Step3);
    // Antes abría con 120/80, 80, 17 y 97: se guardaban aunque nadie los midiera
    expect(formDataExploracionFisica).toMatchObject({
      tensionArterialSistolica: null,
      tensionArterialDiastolica: null,
      frecuenciaCardiaca: null,
      frecuenciaRespiratoria: null,
      saturacionOxigeno: null,
      categoriaTensionArterial: '',
      categoriaFrecuenciaCardiaca: '',
      categoriaFrecuenciaRespiratoria: '',
      categoriaSaturacionOxigeno: '',
    });
    for (const input of wrapper.findAll('input[type="number"]')) {
      expect((input.element as HTMLInputElement).value).toBe('');
    }
  });

  it('sin diastólica, la categoría sale de la sistólica (antes caía en grado 3)', () => {
    const { formDataExploracionFisica } = useFormDataStore();
    Object.assign(formDataExploracionFisica, {
      tensionArterialSistolica: 118,
      tensionArterialDiastolica: null,
    });
    mount(Step3);
    expect((formDataExploracionFisica as Record<string, unknown>).categoriaTensionArterial).toBe('Óptima');
  });

  it('con datos previos en el formulario los conserva', () => {
    const { formDataExploracionFisica } = useFormDataStore();
    Object.assign(formDataExploracionFisica, {
      tensionArterialSistolica: 145,
      tensionArterialDiastolica: 92,
      frecuenciaCardiaca: 70,
      frecuenciaRespiratoria: 18,
      saturacionOxigeno: 95,
    });
    mount(Step3);
    expect(formDataExploracionFisica).toMatchObject({
      tensionArterialSistolica: 145,
      tensionArterialDiastolica: 92,
      categoriaTensionArterial: 'Hipertensión grado 1',
    });
  });
});
