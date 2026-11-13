import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useFormDataStore } from '@/stores/formDataStore';
import Step6 from './Step6.vue';
import { format } from 'date-fns';

describe('Examen de la vista: lo que se ve llega al formulario al montar el paso', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('paso 6 (Ishihara) con valores por defecto', () => {
    const formDataExamenVista = useFormDataStore().formDataExamenVista as Record<string, unknown>;
    mount(Step6);
    expect(formDataExamenVista).toMatchObject({
      placasCorrectas: 14,
      porcentajeIshihara: 100,
      interpretacionIshihara: 'Normal',
    });
  });
});

describe('Examen de la vista, paso 1: fecha', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetModules();
  });

  const montar = async () => {
    const { default: Step1 } = await import('./Step1.vue');
    const { useTrabajadoresStore } = await import('@/stores/trabajadores');
    const { useEmpresasStore } = await import('@/stores/empresas');
    const { useCentrosTrabajoStore } = await import('@/stores/centrosTrabajo');
    useTrabajadoresStore().currentTrabajador = { nombre: 'X' } as never;
    useEmpresasStore().currentEmpresa = { nombreComercial: 'E' } as never;
    useCentrosTrabajoStore().currentCentroTrabajo = { nombreCentro: 'C' } as never;
    mount(Step1, { global: { stubs: { FormKit: true } } });
  };

  it('examen nuevo: la fecha de hoy que se ve llega al formulario', async () => {
    const formDataExamenVista = useFormDataStore().formDataExamenVista as Record<string, unknown>;
    await montar();
    expect(formDataExamenVista.fechaExamenVista).toBe(format(new Date(), 'yyyy-MM-dd'));
  });

  it('al volver al paso conserva la fecha ya elegida', async () => {
    const formDataExamenVista = useFormDataStore().formDataExamenVista as Record<string, unknown>;
    formDataExamenVista.fechaExamenVista = '2026-11-02';
    await montar();
    expect(formDataExamenVista.fechaExamenVista).toBe('2026-11-02');
  });
});
