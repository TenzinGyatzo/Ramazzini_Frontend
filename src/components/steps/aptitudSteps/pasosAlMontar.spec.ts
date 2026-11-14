import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { format } from 'date-fns';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import Step1 from './Step1.vue';
import Step8 from './Step8.vue';

describe('Aptitud: lo que se ve llega al formulario al abrir el paso', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useTrabajadoresStore().currentTrabajador = { nombre: 'X' } as never;
    useEmpresasStore().currentEmpresa = { nombreComercial: 'E' } as never;
    useCentrosTrabajoStore().currentCentroTrabajo = { nombreCentro: 'C' } as never;
  });

  it('paso 1: la fecha de hoy (documento nuevo)', () => {
    const datos = useFormDataStore().formDataAptitud as Record<string, unknown>;
    mount(Step1, { global: { stubs: { FormKit: true } } });
    expect(datos.fechaAptitudPuesto).toBe(format(new Date(), 'yyyy-MM-dd'));
  });

  it('paso 1: al volver conserva la fecha ya elegida', () => {
    const datos = useFormDataStore().formDataAptitud as Record<string, unknown>;
    datos.fechaAptitudPuesto = '2026-11-02';
    mount(Step1, { global: { stubs: { FormKit: true } } });
    expect(datos.fechaAptitudPuesto).toBe('2026-11-02');
  });

  it('paso 8: sin aptitud preseleccionada (se elige de forma explícita)', () => {
    const datos = useFormDataStore().formDataAptitud as Record<string, unknown>;
    const wrapper = mount(Step8);
    expect(datos.aptitudPuesto).toBeUndefined();
    expect(wrapper.findAll('input[type="radio"]:checked')).toHaveLength(0);
  });

  it('paso 8: al editar o volver, muestra la aptitud ya elegida', async () => {
    const datos = useFormDataStore().formDataAptitud as Record<string, unknown>;
    datos.aptitudPuesto = 'No Apto';
    const wrapper = mount(Step8);
    expect((wrapper.find('input[value="No Apto"]').element as HTMLInputElement).checked).toBe(true);
    await wrapper.find('input[value="Apto Con Precaución"]').setValue(true);
    expect(datos.aptitudPuesto).toBe('Apto Con Precaución');
  });
});
