// @vitest-environment jsdom
/** Punto 38: el nuevo acomodo de la captura rápida usa los mismos datos y reglas del paso. */
import { describe, expect, it } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';
import OpcionesSegmentadas from './OpcionesSegmentadas.vue';
import Step6 from '../notaMedicaSteps/Step6.vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { CAPTURA_RAPIDA_KEY } from '@/composables/capturaRapidaKey';
import { NOTA_MEDICA_CEX_SENTINEL } from '@/helpers/notaMedicaCexRanges';

describe('OpcionesSegmentadas', () => {
  it('elige con radios de verdad y marca la elegida', async () => {
    const valor = ref<string | number | null>('Inicial');
    const w = mount(OpcionesSegmentadas, {
      props: {
        name: 'tipoNota',
        opciones: [
          { valor: 'Inicial', etiqueta: 'Inicial' },
          { valor: 'Alta', etiqueta: 'Alta' },
        ],
        modelValue: valor.value,
        'onUpdate:modelValue': (v: string | number | null) => {
          valor.value = v;
          w.setProps({ modelValue: v });
        },
      },
    });
    const radios = w.findAll('input[type="radio"]');
    expect(radios).toHaveLength(2);
    await radios[1].setValue(true);
    expect(valor.value).toBe('Alta');
    await nextTick();
    expect(w.findAll('label')[1].classes()).toContain('bg-emerald-50');
  });
});

describe('signos vitales en captura rápida', () => {
  it('«Se desconoce» desactiva el campo y deja el valor de desconocido, como en el paso', async () => {
    setActivePinia(createPinia());
    const formDataNotaMedica = useFormDataStore().formDataNotaMedica as Record<string, unknown>;
    const w = mount(Step6, {
      props: { variant: 'compact' },
      global: { provide: { [CAPTURA_RAPIDA_KEY as symbol]: true } },
    });
    await flushPromises();
    // Etiquetas completas y unidad dentro del campo
    expect(w.text()).toContain('Frecuencia cardiaca');
    expect(w.text()).toContain('lpm');
    const casilla = w.find('[data-campo="frecuenciaCardiaca"] input[type="checkbox"]');
    await casilla.setValue(true);
    await nextTick();
    expect((w.find('#frecuenciaCardiaca').element as HTMLInputElement).disabled).toBe(true);
    expect(formDataNotaMedica.frecuenciaCardiaca).toBe(NOTA_MEDICA_CEX_SENTINEL.frecuenciaCardiaca);
    // Una presión desconocida hace desconocidas las dos
    await w.find('[data-campo="tensionArterialSistolica"] input[type="checkbox"]').setValue(true);
    await nextTick();
    expect((w.find('#tensionArterialDiastolica').element as HTMLInputElement).disabled).toBe(true);
  });
});

describe('las marcas de los campos se conservan en captura rápida', () => {
  it('el aviso al guardar y el índice encuentran cada dato obligatorio', async () => {
    setActivePinia(createPinia());
    const { default: Step7 } = await import('../notaMedicaSteps/Step7.vue');
    const { default: Step8 } = await import('../notaMedicaSteps/Step8.vue');
    const { default: Step3 } = await import('../notaMedicaSteps/Step3.vue');
    const global = { provide: { [CAPTURA_RAPIDA_KEY as symbol]: true } };
    const somatometria = mount(Step7, { props: { variant: 'compact' }, global });
    const glucemia = mount(Step8, { props: { variant: 'compact' }, global });
    const genero = mount(Step3, { props: { variant: 'compact' }, global });
    await flushPromises();
    for (const campo of ['peso', 'talla', 'circunferenciaCintura']) {
      expect(somatometria.find(`[data-campo="${campo}"] input#${campo}`).exists()).toBe(true);
    }
    expect(glucemia.find('[data-campo="glucemia"] input#glucemia').exists()).toBe(true);
    expect(genero.find('[data-campo="genero"] select#genero').exists()).toBe(true);
    expect(genero.find('[data-campo="derechohabiencia"]').exists()).toBe(true);
  });
});

describe('signos vitales con vista previa (mismo diseño, acomodo angosto)', () => {
  it('etiqueta corta, unidad dentro y «Se desconoce» debajo, con las mismas reglas', async () => {
    setActivePinia(createPinia());
    const formDataNotaMedica = useFormDataStore().formDataNotaMedica as Record<string, unknown>;
    const w = mount(Step6, { props: { variant: 'compact' } });
    await flushPromises();
    const fc = w.find('[data-campo="frecuenciaCardiaca"]');
    expect(fc.find('label').text()).toContain('Frec. cardiaca');
    expect(fc.text()).toContain('lpm');
    // La casilla va después del campo
    const html = fc.html();
    expect(html.indexOf('type="number"')).toBeLessThan(html.indexOf('type="checkbox"'));
    await fc.find('input[type="checkbox"]').setValue(true);
    await nextTick();
    expect(formDataNotaMedica.frecuenciaCardiaca).toBe(NOTA_MEDICA_CEX_SENTINEL.frecuenciaCardiaca);
  });
});
