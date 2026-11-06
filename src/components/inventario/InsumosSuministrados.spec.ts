import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const inventarioApi = vi.hoisted(() => ({ getExistencias: vi.fn() }));
vi.mock('@/api/InventarioAPI', () => ({ default: inventarioApi }));
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, params: { idCentroTrabajo: 'centro1' } }),
}));

import { useFormDataStore } from '@/stores/formDataStore';
import { useInventarioStore } from '@/stores/inventario';

describe('insumos suministrados de la nota médica', { timeout: 20000 }, () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const inventario = useInventarioStore() as any;
    inventario.cargarConfiguracion = vi.fn().mockResolvedValue(undefined);
    inventario.llevaInventario = () => true;
    inventarioApi.getExistencias.mockResolvedValue({
      data: [{ insumo: { _id: 'ins1', nombre: 'Paracetamol', unidad: 'tabletas', activo: true }, existencia: 5 }],
    });
  });

  it('el mismo insumo va una vez administrado y otra entregado, y la existencia suma los dos', async () => {
    const { default: Componente } = await import('./InsumosSuministrados.vue');
    const wrapper = mount(Componente);
    await flushPromises();
    const boton = wrapper.findAll('button').find((b) => b.text().includes('Agregar insumo'))!;

    await boton.trigger('click');
    await wrapper.find('select[aria-label="Insumo 1"]').setValue('ins1');
    await boton.trigger('click');
    // Sigue en la lista del segundo renglón y, al elegirlo, toma el otro uso
    await wrapper.find('select[aria-label="Insumo 2"]').setValue('ins1');
    await wrapper.find('select[aria-label="Insumo 2"]').trigger('change');
    await wrapper.find('input[aria-label="Cantidad del insumo 2"]').setValue('6');

    const nota = useFormDataStore().formDataNotaMedica as Record<string, any>;
    expect(nota.insumosSuministrados).toEqual([
      { idInsumo: 'ins1', cantidad: 1, uso: 'ADMINISTRADO' },
      { idInsumo: 'ins1', cantidad: 6, uso: 'ENTREGADO' },
    ]);
    // Cambiarlo a administrado lo duplicaría
    expect(
      wrapper.find('select[aria-label="Uso del insumo 2"] option[value="ADMINISTRADO"]').attributes('disabled'),
    ).toBeDefined();
    // 1 + 6 supera las 5 que hay
    expect(wrapper.text()).toContain('Solo hay');
  });
});
