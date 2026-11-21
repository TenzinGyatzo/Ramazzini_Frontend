// @vitest-environment jsdom
/**
 * Punto 43: el mismo examen de la vista, capturado «Con vista previa» (una sección a la vez: se
 * abre, se llena y se cierra; lo preseleccionado se escribe al llegar a cada sección) o en
 * «Captura rápida» (todo abierto desde el principio, nada preseleccionado hasta guardar), manda
 * exactamente lo mismo al servidor. En general y en Guatemala.
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
import { completarRespuestasPorDefecto, prepararExamenVistaParaGuardar } from '@/helpers/examenVistaGuardado';
import { PASO_EV, getEvSecciones, type EvPasoId } from '@/helpers/examenVistaSections';
import Step1 from './Step1.vue';
import Step2 from './Step2.vue';
import Step3 from './Step3.vue';
import Step4 from './Step4.vue';
import Step5 from './Step5.vue';
import Step6 from './Step6.vue';
import Step7 from './Step7.vue';
import Step8 from './Step8.vue';
import Step9 from './Step9.vue';
import StepAntecedentesGT from './StepAntecedentesGT.vue';
import StepAnamnesisGT from './StepAnamnesisGT.vue';
import StepUtilizaAnteojosGT from './StepUtilizaAnteojosGT.vue';

const COMPONENTE_PASO_EV: Record<EvPasoId, Component> = {
  evFecha: Step1,
  evAntecedentesGT: StepAntecedentesGT,
  evAnamnesisGT: StepAnamnesisGT,
  evUtilizaAnteojosGT: StepUtilizaAnteojosGT,
  evAvLejanaSin: Step2,
  evAvCercanaSin: Step3,
  evAvLejanaCon: Step4,
  evAvCercanaCon: Step5,
  evIshihara: Step6,
  evFuncionOcular: Step7,
  evReceta: Step8,
  evDiagnostico: Step9,
};

type Accion = (w: VueWrapper) => Promise<void>;
type Acciones = Partial<Record<EvPasoId, Accion>>;

const numeros = (w: VueWrapper) => w.findAll('input[type="number"]:not([readonly])');
/** Escribe la agudeza del ojo izquierdo (primer campo editable). */
const agudezaOI = (valor: number): Accion => async (w) => {
  await numeros(w)[0].setValue(String(valor));
  await flushPromises();
};
const radio = (valor: string): Accion => async (w) => {
  await w.find(`input[type="radio"][value="${valor}"]`).setValue(true);
  await flushPromises();
};
const texto = (valor: string): Accion => async (w) => {
  await w.find('textarea').setValue(valor);
};

function preparar(esGuatemala: boolean, visitado?: (paso: number) => boolean) {
  setActivePinia(createPinia());
  const t = useTrabajadoresStore() as any;
  t.currentTrabajador = { nombre: 'Ana', sexo: 'Femenino' };
  t.currentTrabajadorId = 'x';
  (useEmpresasStore() as any).currentEmpresa = { nombreComercial: 'Empresa' };
  (useCentrosTrabajoStore() as any).currentCentroTrabajo = { nombreCentro: 'Centro' };
  (useProveedorSaludStore() as any).proveedorSalud = { pais: esGuatemala ? 'GT' : 'MX' };
  const { formDataExamenVista } = useFormDataStore() as any;
  completarRespuestasPorDefecto(formDataExamenVista, { esGuatemala, visitado });
  return formDataExamenVista;
}

function envio(df: Record<string, any>, esGuatemala: boolean) {
  prepararExamenVistaParaGuardar(df, { esGuatemala });
  const datos = JSON.parse(JSON.stringify(df));
  delete datos.fechaExamenVista;
  delete datos.rutaPDF;
  return datos;
}

const montar = (id: EvPasoId, capturaRapida: boolean) =>
  mount(COMPONENTE_PASO_EV[id] as Component, {
    props: { variant: 'compact' },
    global: {
      stubs: { FormKit: true },
      provide: capturaRapida ? { [CAPTURA_RAPIDA_KEY as symbol]: true } : {},
    },
  });

async function conVistaPrevia(esGuatemala: boolean, acciones: Acciones) {
  const vistos = new Set<number>();
  const visitado = (p: number) => vistos.has(p);
  const df = preparar(esGuatemala, visitado);
  for (const seccion of getEvSecciones(esGuatemala)) {
    // Como FormStepper al llegar a la sección
    seccion.pasos.forEach((id) => vistos.add(PASO_EV[id]));
    completarRespuestasPorDefecto(df, { esGuatemala, visitado });
    const montados = seccion.pasos.map((id) => [id, montar(id, false)] as const);
    await flushPromises();
    for (const [id, w] of montados) await acciones[id]?.(w);
    await nextTick();
    montados.forEach(([, w]) => w.unmount());
  }
  return envio(df, esGuatemala);
}

async function conCapturaRapida(esGuatemala: boolean, acciones: Acciones) {
  const df = preparar(esGuatemala, () => false);
  const pasos = getEvSecciones(esGuatemala).flatMap((s) => s.pasos);
  const montados = pasos.map((id) => [id, montar(id, true)] as const);
  await flushPromises();
  for (const [id, w] of montados) {
    await acciones[id]?.(w);
    await flushPromises();
  }
  const resultado = envio(df, esGuatemala);
  montados.forEach(([, w]) => w.unmount());
  return resultado;
}

describe('examen de la vista: los dos modos mandan lo mismo (punto 43)', () => {
  it('general, sin tocar nada', async () => {
    const vista = await conVistaPrevia(false, {});
    expect(await conCapturaRapida(false, {})).toEqual(vista);
    expect(vista).toMatchObject({
      ojoIzquierdoLejanaSinCorreccion: 20,
      sinCorreccionLejanaInterpretacion: 'Visión normal',
      requiereLentesUsoGeneral: 'No',
      placasCorrectas: 14,
      interpretacionIshihara: 'Normal',
    });
    expect(vista.conCorreccionLejanaInterpretacion).toBeUndefined();
  });

  it('general, con una agudeza reducida', async () => {
    const acciones: Acciones = { evAvLejanaSin: agudezaOI(40) };
    const vista = await conVistaPrevia(false, acciones);
    expect(await conCapturaRapida(false, acciones)).toEqual(vista);
    expect(vista.ojoIzquierdoLejanaSinCorreccion).toBe(40);
    expect(vista.sinCorreccionLejanaInterpretacion).toBe('Visión moderadamente reducida');
    expect(vista.requiereLentesUsoGeneral).toBe('Si');
  });

  it('Guatemala: utiliza anteojos, anamnesis y el resto por defecto', async () => {
    const acciones: Acciones = { evUtilizaAnteojosGT: radio('Si'), evAnamnesisGT: texto('Ardor ocular') };
    const vista = await conVistaPrevia(true, acciones);
    expect(await conCapturaRapida(true, acciones)).toEqual(vista);
    expect(vista.utilizaAnteojos).toBe('Si');
    expect(vista.anamnesis).toBe('Ardor ocular');
    // «Utiliza anteojos: Sí» pasa a «usa lentes» en la agudeza con corrección
    expect(vista.conCorreccionLejanaInterpretacion).toBe('Visión normal');
    expect(vista.conCorreccionCercanaInterpretacion).toBe('Visión normal');
    expect(vista.antecedentes).toBeUndefined();
  });

  it('general, con lentes de contacto (regla cruzada entre secciones)', async () => {
    const lentesContacto: Accion = async (w) => {
      await w.findAll('input[type="checkbox"]')[0].setValue(true);
      await flushPromises();
    };
    const acciones: Acciones = { evAvLejanaSin: lentesContacto };
    const vista = await conVistaPrevia(false, acciones);
    expect(await conCapturaRapida(false, acciones)).toEqual(vista);
    expect(vista).toMatchObject({
      sinCorreccionNoEvaluablePorLentesContacto: true,
      ojoIzquierdoLejanaSinCorreccion: null,
      ojoDerechoCercanaSinCorreccion: null,
      sinCorreccionLejanaInterpretacion: 'No evaluable (lentes de contacto)',
      sinCorreccionCercanaInterpretacion: 'No evaluable (lentes de contacto)',
      requiereLentesUsoGeneral: 'Si',
      // Con lentes de contacto se captura con corrección
      conCorreccionLejanaInterpretacion: 'Visión normal',
      ojoIzquierdoCercanaConCorreccion: 20,
    });
  });

  it('Guatemala, sin tocar nada', async () => {
    const vista = await conVistaPrevia(true, {});
    expect(await conCapturaRapida(true, {})).toEqual(vista);
    expect(vista.utilizaAnteojos).toBe('No');
  });
});
