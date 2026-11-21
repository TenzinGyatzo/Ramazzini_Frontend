// @vitest-environment jsdom
/**
 * Punto 43: la ceguera total es del ojo. Lejana y cercana sin corrección están en la misma
 * sección; basta marcarla (o quitarla) en una de las dos distancias.
 */
import { describe, expect, it } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useFormDataStore } from '@/stores/formDataStore';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { CAPTURA_RAPIDA_KEY } from '@/composables/capturaRapidaKey';
import Step2 from './Step2.vue';
import Step3 from './Step3.vue';

function montarAmbas() {
  setActivePinia(createPinia());
  (useProveedorSaludStore() as any).proveedorSalud = { pais: 'MX' };
  const { formDataExamenVista } = useFormDataStore() as any;
  const opciones = {
    props: { variant: 'compact' },
    global: { provide: { [CAPTURA_RAPIDA_KEY as symbol]: true } },
  };
  return { df: formDataExamenVista, lejana: mount(Step2, opciones), cercana: mount(Step3, opciones) };
}

/** Casillas «Ceguera total» (en lejana la primera casilla es «Lentes de contacto»). */
const cegueras = (w: ReturnType<typeof mount>) =>
  w.findAll('label').filter((l) => l.text().includes('Ceguera total')).map((l) => l.find('input[type="checkbox"]'));

describe('examen de la vista: ceguera total una sola vez (punto 43)', () => {
  it('marcada en lejana, aplica también a cercana', async () => {
    const { df, lejana, cercana } = montarAmbas();
    await flushPromises();
    await cegueras(lejana)[0].trigger('change');
    await flushPromises();

    expect(df.ojoIzquierdoCegueraTotal).toBe(true);
    expect((cegueras(cercana)[0].element as HTMLInputElement).checked).toBe(true);
    expect(cercana.find('#ojoIzquierdoCercanaSinCorreccion').exists()).toBe(false);
    expect(df.ojoIzquierdoLejanaSinCorreccion).toBeNull();
    expect(df.ojoIzquierdoCercanaSinCorreccion).toBeNull();
    expect(df.sinCorreccionLejanaInterpretacion).toBe('OD: Visión normal');
    expect(df.sinCorreccionCercanaInterpretacion).toBe('OD: Visión normal');
  });

  it('marcada en cercana, aplica a lejana; y se quita en las dos a la vez', async () => {
    const { df, lejana, cercana } = montarAmbas();
    await flushPromises();
    await cegueras(cercana)[1].trigger('change');
    await flushPromises();
    expect(df.ojoDerechoCegueraTotal).toBe(true);
    expect((cegueras(lejana)[1].element as HTMLInputElement).checked).toBe(true);
    expect(df.ojoDerechoLejanaSinCorreccion).toBeNull();

    await cegueras(lejana)[1].trigger('change');
    await flushPromises();
    expect(df.ojoDerechoCegueraTotal).toBe(false);
    expect((cegueras(cercana)[1].element as HTMLInputElement).checked).toBe(false);
    expect(cercana.find('#ojoDerechoCercanaSinCorreccion').exists()).toBe(true);
  });
});
