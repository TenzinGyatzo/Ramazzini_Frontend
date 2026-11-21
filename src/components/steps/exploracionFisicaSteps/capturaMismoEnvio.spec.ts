// @vitest-environment jsdom
/**
 * Punto 41: la misma exploración física, capturada «Con vista previa» (un paso a la vez: se
 * abre, se llena y se cierra; lo preseleccionado se escribe al llegar a cada sección) o en
 * «Captura rápida» (todos los pasos abiertos desde el principio, nada preseleccionado hasta
 * guardar), manda exactamente lo mismo al servidor.
 */
import { describe, expect, it } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, type Component } from 'vue';
import Step1 from './Step1.vue';
import Step2 from './Step2.vue';
import Step3 from './Step3.vue';
import Step4 from './Step4.vue';
import Step15 from './Step15.vue';
import Step31 from './Step31.vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { CAPTURA_RAPIDA_KEY } from '@/composables/capturaRapidaKey';
import {
  completarRespuestasPorDefecto,
  prepararExploracionFisicaParaGuardar,
} from '@/helpers/exploracionFisicaGuardado';

type Accion = (w: VueWrapper) => Promise<void>;
const nada: Accion = async () => {};

/** «Sí» en la pregunta de hallazgos y la descripción. */
const hallazgo = (texto: string): Accion => async (w) => {
  const si = w.findAll('button').find((b) => b.text() === 'Sí');
  await si!.trigger('click');
  await flushPromises();
  await w.find('textarea').setValue(texto);
};

const medir = (valores: Record<string, number>): Accion => async (w) => {
  for (const [id, valor] of Object.entries(valores)) {
    await w.find(`#${id}`).setValue(String(valor));
  }
  await flushPromises();
};

type Captura = Array<[Component, number, Accion]>;

function preparar(esMujer: boolean, visitado?: (paso: number) => boolean) {
  setActivePinia(createPinia());
  const t = useTrabajadoresStore() as any;
  t.currentTrabajador = { nombre: 'Ana', sexo: esMujer ? 'Femenino' : 'Masculino' };
  t.currentTrabajadorId = 'x';
  (useEmpresasStore() as any).currentEmpresa = { nombreComercial: 'Empresa' };
  (useCentrosTrabajoStore() as any).currentCentroTrabajo = { nombreCentro: 'Centro' };
  const { formDataExploracionFisica } = useFormDataStore() as any;
  completarRespuestasPorDefecto(formDataExploracionFisica, { esMujer, visitado });
  return formDataExploracionFisica;
}

function envio(df: Record<string, any>, esMujer: boolean) {
  prepararExploracionFisicaParaGuardar(df, { esMujer });
  const datos = JSON.parse(JSON.stringify(df));
  // La fecha y la ruta dependen del día y del entorno, no del modo
  delete datos.fechaExploracionFisica;
  delete datos.rutaPDF;
  return datos;
}

async function conVistaPrevia(captura: Captura, esMujer: boolean) {
  const vistos = new Set<number>();
  const visitado = (p: number) => vistos.has(p);
  const df = preparar(esMujer, visitado);
  for (const [paso, numero, accion] of captura) {
    // Como FormStepper al llegar a la sección
    vistos.add(numero);
    completarRespuestasPorDefecto(df, { esMujer, visitado });
    const w = mount(paso, { props: { variant: 'compact' } });
    await flushPromises();
    await accion(w);
    await nextTick();
    w.unmount();
  }
  return envio(df, esMujer);
}

async function conCapturaRapida(captura: Captura, esMujer: boolean) {
  const df = preparar(esMujer, () => false);
  const montados = captura.map(([paso]) =>
    mount(paso, {
      props: { variant: 'compact' },
      global: { provide: { [CAPTURA_RAPIDA_KEY as symbol]: true } },
    }),
  );
  await flushPromises();
  for (let i = 0; i < captura.length; i++) {
    await captura[i][2](montados[i]);
    await flushPromises();
  }
  const resultado = envio(df, esMujer);
  montados.forEach((w) => w.unmount());
  return resultado;
}

describe('exploración física: los dos modos mandan lo mismo', () => {
  const captura: Captura = [
    [Step1, 1, nada],
    [Step2, 2, medir({ peso: 70, altura: 1.7 })],
    [Step3, 3, nada],
    [Step4, 4, hallazgo('Cicatriz frontal')],
    [Step15, 15, nada],
    [Step31, 31, nada],
  ];

  it('con mediciones, un hallazgo y el resto por defecto', async () => {
    const vista = await conVistaPrevia(captura, true);
    const rapida = await conCapturaRapida(captura, true);
    expect(rapida).toEqual(vista);
    expect(vista.peso).toBe(70);
    expect(vista.craneoCaraPregunta).toBe('Si');
    expect(vista.craneoCara).toBe('Cicatriz frontal');
    expect(vista.torax).toBe('Sin hallazgos');
    expect(vista.marcha).toBe('Sin hallazgos');
    // El resumen sigue a los hallazgos
    expect(vista.resumenExploracionFisicaPregunta).toBe('Si');
    expect(vista.resumenExploracionFisica).toBe('Cicatriz frontal.');
  });

  it('sin tocar nada', async () => {
    const sinTocar: Captura = captura.map(([p, n]) => [p, n, nada]);
    const vista = await conVistaPrevia(sinTocar, false);
    expect(await conCapturaRapida(sinTocar, false)).toEqual(vista);
    expect(vista.resumenExploracionFisica).toBe('Se encuentra clínicamente sano');
    expect(vista.ojos).toBe('Sin hallazgos');
  });
});
