import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Step3 from './Step3.vue';
import { useFormDataStore } from '@/stores/formDataStore';

describe('Exploración física, paso 3 (signos vitales)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('al montarse copia al formulario los valores que muestra (por defecto)', () => {
    const { formDataExploracionFisica } = useFormDataStore();
    mount(Step3);
    // Sin esto, al guardar se pedían datos que sí se ven en pantalla
    expect(formDataExploracionFisica).toMatchObject({
      tensionArterialSistolica: 120,
      tensionArterialDiastolica: 80,
      frecuenciaCardiaca: 80,
      frecuenciaRespiratoria: 17,
      saturacionOxigeno: 97,
      categoriaTensionArterial: 'Óptima',
    });
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
