// @vitest-environment jsdom
/**
 * Punto (58): al cambiar entre captura con vista previa y captura rápida los pasos se vuelven a
 * montar. Deben mostrar lo capturado en la sesión (documento nuevo) y, al editar, lo ya
 * cambiado, no lo guardado. Función ocular, receta y diagnóstico aparecían vacíos.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import Step2 from './Step2.vue';
import Step3 from './Step3.vue';
import Step4 from './Step4.vue';
import Step6 from './Step6.vue';
import Step7 from './Step7.vue';
import Step8 from './Step8.vue';
import Step9 from './Step9.vue';

const valoresDeCampos = (w: ReturnType<typeof mount>) =>
  w.findAll('input, textarea').map((i) => (i.element as HTMLInputElement).value).filter((v) => v !== '');

let df: Record<string, any>;
beforeEach(() => {
  setActivePinia(createPinia());
  (useProveedorSaludStore() as any).proveedorSalud = { pais: 'GT' };
  df = (useFormDataStore() as any).formDataExamenVista;
});

const SESION = {
  testEstereopsis: 'Normal',
  testCampoVisual: 'Sin alteraciones',
  coverTest: 'Ortoforia',
  esferaOjoIzquierdo: '+1.25',
  cilindroOjoDerecho: '-0.50',
  diagnosticoRecomendaciones: 'Miopía leve; uso de lentes',
};

describe('examen de la vista: al volver a montarse conserva lo de la sesión', () => {
  it('documento nuevo: función ocular, receta y diagnóstico', async () => {
    Object.assign(df, SESION);
    const textos = [Step7, Step8, Step9].flatMap((Paso) => {
      const w = mount(Paso, { props: { variant: 'compact' } });
      return w;
    });
    await flushPromises();
    const vistos = textos.flatMap(valoresDeCampos);
    for (const valor of Object.values(SESION)) expect(vistos).toContain(valor);
    // Montarse no borra nada del formulario
    expect(df).toMatchObject(SESION);
  });

  it('al editar: lo ya cambiado en la sesión, no lo guardado', async () => {
    (useDocumentosStore() as any).currentDocument = {
      _id: 'd1',
      diagnosticoRecomendaciones: 'Guardado',
      coverTest: 'Guardado',
      placasCorrectas: 14,
      porcentajeIshihara: 100,
      interpretacionIshihara: 'Normal',
      ojoIzquierdoLejanaSinCorreccion: 20,
      ojoDerechoLejanaSinCorreccion: 20,
      ojoIzquierdoCercanaSinCorreccion: 20,
      ojoDerechoCercanaSinCorreccion: 20,
      conCorreccionLejanaInterpretacion: 'Visión normal',
      ojoIzquierdoLejanaConCorreccion: 20,
      ojoDerechoLejanaConCorreccion: 20,
    };
    Object.assign(df, {
      _id: 'd1',
      diagnosticoRecomendaciones: 'Cambiado',
      coverTest: 'Cambiado',
      placasCorrectas: 10,
      porcentajeIshihara: 71,
      interpretacionIshihara: 'Daltonismo',
      ojoIzquierdoLejanaSinCorreccion: 40,
      ojoDerechoLejanaSinCorreccion: 50,
      ojoIzquierdoCercanaSinCorreccion: 30,
      ojoDerechoCercanaSinCorreccion: 25,
      conCorreccionLejanaInterpretacion: 'Visión normal',
      ojoIzquierdoLejanaConCorreccion: 25,
      ojoDerechoLejanaConCorreccion: 30,
    });
    const w9 = mount(Step9, { props: { variant: 'compact' } });
    const w7 = mount(Step7, { props: { variant: 'compact' } });
    const w6 = mount(Step6, { props: { variant: 'compact' } });
    await flushPromises();
    expect(valoresDeCampos(w9)).toContain('Cambiado');
    expect(valoresDeCampos(w7)).toContain('Cambiado');
    expect(valoresDeCampos(w6)).toContain('10');
    expect(df.diagnosticoRecomendaciones).toBe('Cambiado');
    expect(df.placasCorrectas).toBe(10);

    for (const Paso of [Step2, Step3, Step4]) mount(Paso, { props: { variant: 'compact' } });
    await flushPromises();
    expect(df).toMatchObject({
      ojoIzquierdoLejanaSinCorreccion: 40,
      ojoDerechoLejanaSinCorreccion: 50,
      ojoIzquierdoCercanaSinCorreccion: 30,
      ojoDerechoCercanaSinCorreccion: 25,
      ojoIzquierdoLejanaConCorreccion: 25,
      ojoDerechoLejanaConCorreccion: 30,
    });
  });

  it('al editar, si el formulario aún no trae el documento, se muestra lo guardado', async () => {
    (useDocumentosStore() as any).currentDocument = { _id: 'd1', diagnosticoRecomendaciones: 'Guardado' };
    const w = mount(Step9, { props: { variant: 'compact' } });
    await flushPromises();
    expect(valoresDeCampos(w)).toContain('Guardado');
  });
});
