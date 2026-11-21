// @vitest-environment jsdom
/**
 * Punto 39: la misma historia clínica, capturada «Con vista previa» (un paso a la vez: se abre,
 * se llena y se cierra) o en «Captura rápida» (todos los pasos abiertos desde el principio),
 * manda exactamente lo mismo al servidor. En la captura rápida el resumen está abierto antes de
 * capturar los antecedentes: debe seguir a los hallazgos.
 */
import { describe, expect, it } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, type Component } from 'vue';
import Step1 from './Step1.vue';
import Step2 from './Step2.vue';
import Step15 from './Step15.vue';
import Step25 from './Step25.vue';
import Step28 from './Step28.vue';
import Step37 from './Step37.vue';
import Step45 from './Step45.vue';
import Step46 from './Step46.vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { CAPTURA_RAPIDA_KEY } from '@/composables/capturaRapidaKey';
import {
  completarRespuestasPorDefecto,
  prepararHistoriaClinicaParaGuardar,
} from '@/helpers/historiaClinicaGuardado';

type Accion = (w: VueWrapper) => Promise<void>;
const nada: Accion = async () => {};

/** Marca «Sí» en los botones de la pregunta y escribe el detalle. */
/** Elige «Sí» en los botones juntos de la pregunta (son radios). */
const marcarSi = async (w: VueWrapper) => {
  await w.find('input[type="radio"][value="Si"]').setValue(true);
  await flushPromises();
};

const siCon = (texto: string): Accion => async (w) => {
  await marcarSi(w);
  await w.find('input[type="text"]').setValue(texto);
};

/** Marca «Sí» y deja «Especifique» vacío. */
const siSinDetalle: Accion = async (w) => {
  await marcarSi(w);
};

type Captura = Array<[Component, Accion]>;

const PASO = new Map<Component, number>([
  [Step1, 1],
  [Step2, 2],
  [Step15, 15],
  [Step25, 25],
  [Step28, 28],
  [Step37, 37],
  [Step45, 45],
  [Step46, 46],
]);

function preparar(esMujer: boolean, visitado?: (paso: number) => boolean) {
  setActivePinia(createPinia());
  const t = useTrabajadoresStore() as any;
  t.currentTrabajador = { nombre: 'Ana', sexo: esMujer ? 'Femenino' : 'Masculino' };
  t.currentTrabajadorId = 'x';
  (useEmpresasStore() as any).currentEmpresa = { nombreComercial: 'Empresa' };
  (useCentrosTrabajoStore() as any).currentCentroTrabajo = { nombreCentro: 'Centro' };
  const { formDataHistoriaClinica } = useFormDataStore() as any;
  // Como FormStepper al abrir el documento (con vista previa, solo lo ya visitado)
  completarRespuestasPorDefecto(formDataHistoriaClinica, { esMujer, visitado });
  return formDataHistoriaClinica;
}

function envio(df: Record<string, any>, esMujer: boolean) {
  prepararHistoriaClinicaParaGuardar(df, { esMujer });
  const datos = JSON.parse(JSON.stringify(df));
  // La fecha y la ruta dependen del día y del entorno, no del modo
  delete datos.fechaHistoriaClinica;
  delete datos.rutaPDF;
  return datos;
}

async function conVistaPrevia(captura: Captura, esMujer: boolean) {
  const vistos = new Set<number>();
  const visitado = (p: number) => vistos.has(p);
  const df = preparar(esMujer, visitado);
  for (const [paso, accion] of captura) {
    // Como FormStepper al llegar a la sección
    vistos.add(PASO.get(paso)!);
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
  // Todas las secciones montadas, sin lo preseleccionado: se llena al revisarlas o al guardar
  const df = preparar(esMujer, () => false);
  const montados = captura.map(([paso]) =>
    mount(paso, {
      props: { variant: 'compact' },
      global: { provide: { [CAPTURA_RAPIDA_KEY as symbol]: true } },
    }),
  );
  await flushPromises();
  for (let i = 0; i < captura.length; i++) {
    await captura[i][1](montados[i]);
    await flushPromises();
  }
  const resultado = envio(df, esMujer);
  montados.forEach((w) => w.unmount());
  return resultado;
}

describe('historia clínica: los dos modos mandan lo mismo', () => {
  const captura: Captura = [
    [Step1, nada],
    [Step2, siCon('Madre')],
    [Step15, siCon('Penicilina')],
    [Step25, nada],
    [Step28, nada],
    [Step37, nada],
    [Step45, nada],
    [Step46, nada],
  ];

  it('mujer, con antecedentes capturados y el resto por defecto', async () => {
    const vista = await conVistaPrevia(captura, true);
    const rapida = await conCapturaRapida(captura, true);
    expect(rapida).toEqual(vista);
    expect(vista.nefropatias).toBe('Si');
    expect(vista.nefropatiasEspecificar).toBe('Madre');
    expect(vista.alergicosEspecificar).toBe('Penicilina');
    expect(vista.alimentacionDeficienteEspecificar).toBe('Adecuada');
    expect(vista.menarca).toBe('12-14 años');
    expect(vista.embarazoActual).toBe('Negado');
    expect(vista.secuelas).toBe('Sin secuelas');
    // El resumen sigue a los hallazgos aunque estuviera abierto desde el principio
    expect(vista.resumenHistoriaClinicaPregunta).toBe('Si');
    expect(vista.resumenHistoriaClinica).toBe('Penicilina.');
    expect(vista.motivoExamen).toBe('Ingreso');
  });

  it('hombre, sin tocar nada', async () => {
    const sinTocar: Captura = captura.filter(([p]) => p !== Step28 && p !== Step37).map(([p]) => [p, nada]);
    const vista = await conVistaPrevia(sinTocar, false);
    expect(await conCapturaRapida(sinTocar, false)).toEqual(vista);
    expect(vista.menarca).toBeUndefined();
    expect(vista.resumenHistoriaClinica).toBe('Se refiere actualmente asintomático');
  });

  it('con vista previa, lo no visitado no aparece hasta guardar', async () => {
    const vistos = new Set([1, 2]);
    const df = preparar(true, (p) => vistos.has(p));
    expect(df.nefropatias).toBe('No');
    expect(df.alergicos).toBeUndefined();
    expect(df.menarca).toBeUndefined();
    expect(df.accidenteLaboral).toBeUndefined();
    expect(df.resumenHistoriaClinica).toBeUndefined();
    const datos = envio(df, true);
    expect(datos.alergicos).toBe('No');
    expect(datos.menarca).toBe('12-14 años');
    expect(datos.resumenHistoriaClinica).toBe('Se refiere actualmente asintomática');
  });

  it('«Sí» sin detalle queda vacío (no «Negado»), para que se pida al guardar', async () => {
    const vista = await conVistaPrevia([[Step2, siSinDetalle]], false);
    expect(vista.nefropatias).toBe('Si');
    expect(vista.nefropatiasEspecificar).toBe('');
  });
});
