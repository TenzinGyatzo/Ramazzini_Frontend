// @vitest-environment jsdom
/**
 * Punto 44: la misma audiometría, capturada «Con vista previa» (una sección a la vez: se abre,
 * se llena y se cierra; lo preseleccionado se escribe al llegar a cada sección) o en «Captura
 * rápida» (todo abierto desde el principio, nada preseleccionado hasta guardar), manda
 * exactamente lo mismo al servidor. En México (LFT) y fuera (AMA).
 */
import { describe, expect, it } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, type Component } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { CAPTURA_RAPIDA_KEY } from '@/composables/capturaRapidaKey';
import { completarRespuestasPorDefecto, prepararAudiometriaParaGuardar } from '@/helpers/audiometriaGuardado';
import { AU_SECCIONES } from '@/helpers/audiometriaSections';
import Step1 from './Step1.vue';
import Step2 from './Step2.vue';
import Step3 from './Step3.vue';
import Step4 from './Step4.vue';
import Step5 from './Step5.vue';
import Step6 from './Step6.vue';
import Step7 from './Step7.vue';

const PASO: Record<number, Component> = { 1: Step1, 2: Step2, 3: Step3, 4: Step4, 5: Step5, 6: Step6, 7: Step7 };
const FRECUENCIAS = [125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000];

type Accion = (w: VueWrapper) => Promise<void>;
type Acciones = Partial<Record<number, Accion>>;

const umbrales = (valores: number[]): Accion => async (w) => {
  const campos = w.findAll('input[type="number"]');
  for (let i = 0; i < valores.length; i++) {
    await campos[i].setValue(String(valores[i]));
    await campos[i].trigger('blur');
  }
};
const texto = (valor: string): Accion => async (w) => {
  await w.find('textarea').setValue(valor);
};
const metodo = (valor: string): Accion => async (w) => {
  await w.find(`input[type="radio"][value="${valor}"]`).setValue(true);
};

const OD = [10, 10, 15, 15, 20, 40, 55, 45, 30];
const OI = [10, 10, 10, 10, 10, 15, 15, 15, 15];
const BASE: Acciones = {
  2: umbrales(OD),
  3: umbrales(OI),
  4: texto('Refiere exposición a ruido.'),
  6: texto('Hipoacusia neurosensorial derecha.'),
};

function preparar(pais: string, visitado?: (paso: number) => boolean) {
  setActivePinia(createPinia());
  const t = useTrabajadoresStore() as any;
  t.currentTrabajador = { nombre: 'Ana', sexo: 'Femenino' };
  t.currentTrabajadorId = 'x';
  (useEmpresasStore() as any).currentEmpresa = { nombreComercial: 'Empresa' };
  (useCentrosTrabajoStore() as any).currentCentroTrabajo = { nombreCentro: 'Centro' };
  (useProveedorSaludStore() as any).proveedorSalud = { pais };
  const { formDataAudiometria } = useFormDataStore() as any;
  completarRespuestasPorDefecto(formDataAudiometria, { pais, visitado });
  return formDataAudiometria;
}

function envio(df: Record<string, any>, pais: string) {
  prepararAudiometriaParaGuardar(df, { pais });
  const datos = JSON.parse(JSON.stringify(df));
  delete datos.fechaAudiometria;
  delete datos.rutaPDF;
  return datos;
}

const montar = (paso: number, capturaRapida: boolean) =>
  mount(PASO[paso], {
    props: { variant: 'compact' },
    global: {
      stubs: { FormKit: true },
      provide: capturaRapida ? { [CAPTURA_RAPIDA_KEY as symbol]: true } : {},
    },
  });

async function conVistaPrevia(pais: string, acciones: Acciones) {
  const vistos = new Set<number>();
  const df = preparar(pais, (p) => vistos.has(p));
  for (const seccion of AU_SECCIONES) {
    // Como FormStepper al llegar a la sección (y a cada cambio del formulario)
    seccion.pasos.forEach((p) => vistos.add(p));
    completarRespuestasPorDefecto(df, { pais, visitado: (p) => vistos.has(p) });
    const montados = seccion.pasos.map((p) => [p, montar(p, false)] as const);
    await flushPromises();
    for (const [p, w] of montados) {
      await acciones[p]?.(w);
      completarRespuestasPorDefecto(df, { pais, visitado: (p) => vistos.has(p) });
    }
    await nextTick();
    montados.forEach(([, w]) => w.unmount());
  }
  return envio(df, pais);
}

async function conCapturaRapida(pais: string, acciones: Acciones) {
  const df = preparar(pais, () => false);
  const montados = AU_SECCIONES.flatMap((s) => s.pasos).map((p) => [p, montar(p, true)] as const);
  await flushPromises();
  for (const [p, w] of montados) {
    await acciones[p]?.(w);
    completarRespuestasPorDefecto(df, { pais, visitado: () => false });
    await flushPromises();
  }
  const resultado = envio(df, pais);
  montados.forEach(([, w]) => w.unmount());
  return resultado;
}

describe('audiometría: los dos modos mandan lo mismo (punto 44)', () => {
  it('México (LFT)', async () => {
    const vista = await conVistaPrevia('MX', BASE);
    expect(await conCapturaRapida('MX', BASE)).toEqual(vista);
    expect(vista).toMatchObject({
      metodoAudiometria: 'LFT',
      oidoDerecho4000: 55,
      oidoIzquierdo125: 10,
      porcentajePerdidaOD: 32,
      porcentajePerdidaOI: 11,
      hipoacusiaBilateralCombinada: 14,
      observacionesAudiometria: 'Refiere exposición a ruido.',
      diagnosticoAudiometria: 'Hipoacusia neurosensorial derecha.',
    });
    expect(vista.interpretacionAudiometrica).toBeTruthy();
    expect(vista.recomendacionesAudiometria).toHaveLength(3);
  });

  it('Guatemala (AMA)', async () => {
    const vista = await conVistaPrevia('GT', BASE);
    expect(await conCapturaRapida('GT', BASE)).toEqual(vista);
    expect(vista.metodoAudiometria).toBe('AMA');
    expect(vista.perdidaAuditivaBilateralAMA).toBeTypeOf('number');
  });

  it('cambio de método y recomendaciones vaciadas', async () => {
    const acciones: Acciones = {
      ...BASE,
      1: metodo('AMA'),
      7: async (w) => {
        const limpiar = w.findAll('button').find((b) => b.text().includes('Limpiar todas'));
        await limpiar!.trigger('click');
      },
    };
    const vista = await conVistaPrevia('MX', acciones);
    expect(await conCapturaRapida('MX', acciones)).toEqual(vista);
    expect(vista.metodoAudiometria).toBe('AMA');
    expect(vista.recomendacionesAudiometria).toEqual([]);
  });

  it('umbrales sin capturar: se mandan vacíos (el guardado los pide), igual en los dos modos', async () => {
    const vista = await conVistaPrevia('MX', {});
    expect(await conCapturaRapida('MX', {})).toEqual(vista);
    for (const f of FRECUENCIAS) expect(vista[`oidoDerecho${f}`]).toBeUndefined();
  });
});
