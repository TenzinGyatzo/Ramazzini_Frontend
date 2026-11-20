// @vitest-environment jsdom
/**
 * Punto 38: la misma nota, capturada «Con vista previa» (un paso a la vez: se abre, se llena
 * y se cierra) o en «Captura rápida» (todos los pasos montados a la vez y sin cerrarse),
 * manda exactamente lo mismo al servidor.
 */
import { describe, expect, it } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, type Component } from 'vue';
import Step2 from './Step2.vue';
import Step6 from './Step6.vue';
import Step8 from './Step8.vue';
import Step14 from './Step14.vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { prepararNotaMedicaParaGuardar } from '@/helpers/notaMedicaGuardado';
import { CAPTURA_RAPIDA_KEY } from '@/composables/capturaRapidaKey';

type Accion = (w: VueWrapper) => Promise<void>;

const escribir = (selector: string, valor: string): Accion => async (w) => {
  await w.find(selector).setValue(valor);
};
const nada: Accion = async () => {};

/** Lo que el usuario hace en cada paso. */
type Captura = Array<[Component, Accion]>;

async function enviarConVistaPrevia(captura: Captura) {
  setActivePinia(createPinia());
  const { formDataNotaMedica } = useFormDataStore();
  for (const [paso, accion] of captura) {
    const w = mount(paso, { props: { variant: 'compact' } });
    await flushPromises();
    await accion(w);
    await nextTick();
    w.unmount();
  }
  return envio(formDataNotaMedica);
}

async function enviarConCapturaRapida(captura: Captura) {
  setActivePinia(createPinia());
  const { formDataNotaMedica } = useFormDataStore();
  const montados = captura.map(([paso]) =>
    mount(paso, {
      props: { variant: 'compact' },
      global: { provide: { [CAPTURA_RAPIDA_KEY as symbol]: true } },
    }),
  );
  await flushPromises();
  for (let i = 0; i < captura.length; i++) await captura[i][1](montados[i]);
  await nextTick();
  const resultado = envio(formDataNotaMedica);
  montados.forEach((w) => w.unmount());
  return resultado;
}

/** Igual que FormStepper: reglas de guardado y lo que viaja (sin undefined). */
function envio(df: Record<string, any>) {
  prepararNotaMedicaParaGuardar(df, { showSires: true, esMujer: false });
  return JSON.parse(JSON.stringify(df));
}

describe('los dos modos de captura mandan lo mismo', () => {
  it('con datos capturados y otros sin capturar', async () => {
    const captura: Captura = [
      [Step2, escribir('textarea', 'Dolor lumbar de 3 días')],
      [
        Step6,
        async (w) => {
          await escribir('#tensionArterialSistolica', '120')(w);
          await escribir('#frecuenciaCardiaca', '72')(w);
        },
      ],
      [Step8, nada],
      [Step14, nada],
    ];
    const conVistaPrevia = await enviarConVistaPrevia(captura);
    const conCapturaRapida = await enviarConCapturaRapida(captura);

    expect(conCapturaRapida).toEqual(conVistaPrevia);
    // Y lo que se manda es lo esperado
    expect(conVistaPrevia.motivoConsulta).toBe('Dolor lumbar de 3 días');
    expect(conVistaPrevia.frecuenciaCardiaca).toBe(72);
    // Sin diastólica: las dos presiones «Se desconoce», como al salir del paso
    expect(conVistaPrevia.tensionArterialSistolica).toBe(0);
    expect(conVistaPrevia.tensionArterialDiastolica).toBe(0);
    expect(conVistaPrevia.glucemia).toBe(0);
    expect(conVistaPrevia.observaciones).toBe('');
  });

  it('sin tocar nada', async () => {
    const captura: Captura = [
      [Step2, nada],
      [Step6, nada],
      [Step8, nada],
      [Step14, nada],
    ];
    expect(await enviarConCapturaRapida(captura)).toEqual(await enviarConVistaPrevia(captura));
  });
});
