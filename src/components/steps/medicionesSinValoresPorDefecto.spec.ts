import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useDocumentosStore } from '@/stores/documentos';

/** Pasos que se importan con Pinia ya activa. */
const montar = async (ruta: string) => mount((await import(ruta)).default, { global: { stubs: { FormKit: true } } });

const valores = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('input[type="number"]').map((i) => (i.element as HTMLInputElement).value);

const ultimaExploracion = {
  idTrabajador: 't1',
  fechaExploracionFisica: '2026-10-13T00:00:00.000Z',
  peso: 74.5,
  altura: 1.68,
  circunferenciaCintura: 88,
};

describe('mediciones sin valores por defecto', { timeout: 20000 }, () => {
  let fd: Record<string, Record<string, any>>;

  beforeEach(() => {
    setActivePinia(createPinia());
    fd = useFormDataStore() as unknown as Record<string, Record<string, any>>;
    useTrabajadoresStore().currentTrabajador = { _id: 't1', sexo: 'Masculino', nombre: 'X' } as never;
  });

  describe('exploración física, somatometría', () => {
    it('documento nuevo: abre vacío, sin IMC ni categorías', async () => {
      const wrapper = await montar('./exploracionFisicaSteps/Step2.vue');
      expect(valores(wrapper).every((v) => v === '')).toBe(true);
      expect(fd.formDataExploracionFisica.peso).toBeUndefined();
      // Sin exploración física previa no se ofrece copiar
      expect(wrapper.find('[data-ultima-exploracion]').exists()).toBe(false);
    });

    it('copia de la última exploración física solo al pulsar el botón', async () => {
      useDocumentosStore().documentsByYear = { 2026: { exploracionesFisicas: [ultimaExploracion] } } as never;
      const wrapper = await montar('./exploracionFisicaSteps/Step2.vue');
      const boton = wrapper.find('[data-ultima-exploracion] button');
      expect(boton.text()).toContain('13 de octubre de 2026');
      expect(fd.formDataExploracionFisica.peso).toBeUndefined();
      await boton.trigger('click');
      await flushPromises();
      expect(fd.formDataExploracionFisica).toMatchObject({
        peso: 74.5,
        altura: 1.68,
        circunferenciaCintura: 88,
        indiceMasaCorporal: 26.4,
        categoriaIMC: 'Sobrepeso',
        categoriaCircunferenciaCintura: 'Bajo Riesgo',
      });
      expect(wrapper.find('[data-ultima-exploracion]').text()).toContain('del 13 de octubre de 2026');
    });

    it('al editar no se ofrece copiar', async () => {
      const documentos = useDocumentosStore();
      documentos.documentsByYear = { 2026: { exploracionesFisicas: [ultimaExploracion] } } as never;
      documentos.currentDocument = { peso: 90, altura: 1.8 } as never;
      const wrapper = await montar('./exploracionFisicaSteps/Step2.vue');
      expect(wrapper.find('[data-ultima-exploracion]').exists()).toBe(false);
    });
  });

  describe('campos calculados vacíos dicen de dónde saldrá el valor', () => {
    const ayudas = (wrapper: ReturnType<typeof mount>) =>
      wrapper.findAll('input[data-calculado]').map((i) => i.attributes('placeholder'));

    it('exploración física: IMC y categorías', async () => {
      expect(ayudas(await montar('./exploracionFisicaSteps/Step2.vue'))).toEqual([
        'Se calcula solo',
        'Según el IMC',
        'Según la cintura',
      ]);
      expect(ayudas(await montar('./exploracionFisicaSteps/Step3.vue'))).toEqual([
        'Según la tensión',
        'Según la frecuencia',
        'Según la frecuencia',
        'Según la saturación',
      ]);
    });

    it('con medición, el campo muestra el valor y no la ayuda', async () => {
      const wrapper = await montar('./exploracionFisicaSteps/Step2.vue');
      const numeros = wrapper.findAll('input[type="number"]:not([readonly])');
      await numeros[0].setValue('80');
      await numeros[1].setValue('1.7');
      const [imc, categoria] = wrapper.findAll('input[data-calculado]');
      expect((imc.element as HTMLInputElement).value).toBe('27.68');
      expect((categoria.element as HTMLInputElement).value).toBe('Sobrepeso');
    });
  });

  describe('certificado expedito', () => {
    it('signos vitales: abren vacíos', async () => {
      const wrapper = await montar('./certificadoExpeditoSteps/Step3.vue');
      expect(valores(wrapper).every((v) => v === '')).toBe(true);
    });

    it('somatometría: abre vacía y al volver al paso conserva lo capturado', async () => {
      const paso = await montar('./certificadoExpeditoSteps/Step4.vue');
      expect(valores(paso).every((v) => v === '')).toBe(true);
      await paso.findAll('input[type="number"]')[0].setValue('81');
      await paso.findAll('input[type="number"]')[1].setValue('1.75');
      paso.unmount();
      // Antes, al regresar al paso se volvía a 80 kg / 1.70 m
      const deNuevo = await montar('./certificadoExpeditoSteps/Step4.vue');
      expect(valores(deNuevo).slice(0, 2)).toEqual(['81', '1.75']);
    });

    it('aptitud: sin opción preseleccionada', async () => {
      const wrapper = await montar('./certificadoExpeditoSteps/Step7.vue');
      expect(wrapper.findAll('input[type="radio"]:checked')).toHaveLength(0);
      wrapper.unmount();
      expect(fd.formDataCertificadoExpedito.aptitudPuesto).toBeUndefined();
    });
  });

  describe('seguimiento cardiometabólico (mediciones opcionales)', () => {
    it('sin exploración física: somatometría y signos vacíos, nada inventado', async () => {
      const somatometria = await montar('./eventoSeguimientoCardiometabolicoSteps/Step3.vue');
      expect(valores(somatometria).every((v) => v === '')).toBe(true);
      const signos = await montar('./eventoSeguimientoCardiometabolicoSteps/Step4.vue');
      expect(valores(signos).every((v) => v === '')).toBe(true);
      const esc = fd.formDataEventoSeguimientoCardiometabolico as Record<string, any>;
      expect(esc.somatometria.peso ?? null).toBeNull();
      expect(esc.signosVitales.tensionArterialSistolica ?? null).toBeNull();
    });

    it('con exploración física: toma sus mediciones, como antes', async () => {
      useDocumentosStore().documentsByYear = { 2026: { exploracionesFisicas: [ultimaExploracion] } } as never;
      await montar('./eventoSeguimientoCardiometabolicoSteps/Step3.vue');
      const esc = fd.formDataEventoSeguimientoCardiometabolico as Record<string, any>;
      expect(esc.somatometria).toMatchObject({ peso: 74.5, altura: 1.68, circunferenciaCintura: 88 });
    });
  });
});
