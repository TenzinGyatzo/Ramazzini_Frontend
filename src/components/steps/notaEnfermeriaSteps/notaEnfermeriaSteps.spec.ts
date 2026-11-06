import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const inventarioApi = vi.hoisted(() => ({ getExistencias: vi.fn() }));
vi.mock('@/api/InventarioAPI', () => ({ default: inventarioApi }));
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, params: { idCentroTrabajo: 'centro1' } }),
  useRouter: () => ({ push: vi.fn() }),
}));

import { useFormDataStore } from '@/stores/formDataStore';
import { useInventarioStore } from '@/stores/inventario';

/** Los pasos se importan con Pinia ya activa: algunos módulos usan un store al cargarse. */
const montar = async (ruta: string) => mount((await import(ruta)).default, { global: { stubs: { FormKit: true } } });

// La primera importación de cada paso compila el componente: con la suite completa en paralelo tarda
describe('pasos de la nota de enfermería', { timeout: 20000 }, () => {
  let fd: Record<string, any>;

  beforeEach(() => {
    setActivePinia(createPinia());
    fd = useFormDataStore().formDataNotaEnfermeria as Record<string, any>;
    inventarioApi.getExistencias.mockReset();
    // El paso 4 incluye los medicamentos: sin esto consultaría la configuración real del inventario
    const inventario = useInventarioStore() as any;
    inventario.cargarConfiguracion = vi.fn().mockResolvedValue(undefined);
    inventario.llevaInventario = () => false;
  });

  it('el aparato o sistema se elige con un clic entre las trece opciones a la vista', async () => {
    const wrapper = await montar('./Step2.vue');
    const opciones = wrapper.findAll('[data-opcion]');
    expect(opciones).toHaveLength(13);
    // «General» es la etiqueta más larga: va al final y ocupa las dos columnas
    expect(opciones.at(-1)!.attributes('data-opcion')).toBe('general');
    expect(opciones.at(-1)!.classes()).toContain('col-span-2');
    await wrapper.find('[data-opcion="oido"]').trigger('click');
    expect(fd.sistema).toBe('oido');
    expect(wrapper.find('[data-opcion="oido"]').attributes('aria-pressed')).toBe('true');
  });

  it('elegir «Otro» pide su descripción; quitarlo la borra', async () => {
    const wrapper = await montar('./Step5.vue');
    const otro = wrapper.findAll('button').find((b) => b.text() === 'Otro')!;
    await otro.trigger('click');
    expect(fd.procedimientos).toEqual(['otro']);
    await wrapper.find('[data-campo="procedimientoOtro"]').setValue('Retiro de anillo');
    expect(fd.procedimientoOtro).toBe('Retiro de anillo');
    await otro.trigger('click');
    expect(fd.procedimientos).toEqual([]);
    expect(fd).not.toHaveProperty('procedimientoOtro');
  });

  it('las tomas de control llevan hora y son hasta tres', async () => {
    const wrapper = await montar('./Step4.vue');
    for (let i = 0; i < 3; i++) await wrapper.find('[data-agregar-toma]').trigger('click');
    expect(fd.tomasControl).toHaveLength(3);
    expect(fd.tomasControl.every((t: any) => /^\d{2}:\d{2}$/.test(t.hora))).toBe(true);
    expect(wrapper.find('[data-agregar-toma]').exists()).toBe(false);
    // Un signo vacío no se guarda
    await wrapper.find('[data-toma-control="1"] [data-signo="dolor"]').setValue('4');
    expect(fd.tomasControl[0].dolor).toBe(4);
    await wrapper.find('[data-toma-control="1"] [data-signo="dolor"]').setValue('');
    expect(fd.tomasControl[0]).not.toHaveProperty('dolor');
  });

  it('un signo fuera de rango muestra su aviso debajo del campo', async () => {
    const wrapper = await montar('./Step4.vue');
    await wrapper.find('[data-signo="frecuenciaCardiaca"]').setValue('300');
    expect(wrapper.find('[data-error-signo="frecuenciaCardiaca"]').text()).toBe('Debe estar entre 40 y 220');
    await wrapper.find('[data-signo="frecuenciaCardiaca"]').setValue('80');
    expect(wrapper.find('[data-error-signo="frecuenciaCardiaca"]').exists()).toBe(false);
  });

  it('con catálogo, un medicamento nuevo empieza sin elegir y «Otro» pide el nombre', async () => {
    (useInventarioStore() as any).llevaInventario = () => true;
    inventarioApi.getExistencias.mockResolvedValue({
      data: [{ insumo: { _id: 'ins1', nombre: 'Paracetamol', activo: true }, existencia: 2 }],
    });
    const wrapper = await montar('./MedicamentosNotaEnfermeria.vue');
    await flushPromises();
    await wrapper.find('[data-agregar-medicamento]').trigger('click');
    expect((wrapper.find('select[aria-label="Medicamento 1"]').element as HTMLSelectElement).value).toBe('');
    expect(wrapper.find('input[aria-label="Nombre del medicamento 1"]').exists()).toBe(false);
    // Más de lo que hay: avisa, pero deja guardar
    await wrapper.find('select[aria-label="Medicamento 1"]').setValue('ins1');
    await wrapper.find('input[aria-label="Cantidad del medicamento 1"]').setValue('3');
    expect(wrapper.text()).toContain('Solo hay');
    // El uso se elige con dos botones
    await wrapper.findAll('[role="group"] button').find((b) => b.text() === 'Entregado')!.trigger('click');
    expect(fd.medicamentos[0].uso).toBe('ENTREGADO');
  });

  it('el mismo medicamento va una vez administrado y otra entregado', async () => {
    (useInventarioStore() as any).llevaInventario = () => true;
    inventarioApi.getExistencias.mockResolvedValue({
      data: [{ insumo: { _id: 'ins1', nombre: 'Paracetamol', activo: true }, existencia: 10 }],
    });
    const wrapper = await montar('./MedicamentosNotaEnfermeria.vue');
    await flushPromises();
    await wrapper.find('[data-agregar-medicamento]').trigger('click');
    await wrapper.find('select[aria-label="Medicamento 1"]').setValue('ins1');
    await wrapper.find('[data-agregar-medicamento]').trigger('click');
    // Sigue en la lista del segundo renglón y, al elegirlo, toma el otro uso
    await wrapper.find('select[aria-label="Medicamento 2"]').setValue('ins1');
    expect(fd.medicamentos.map((m: any) => [m.idInsumo, m.uso])).toEqual([
      ['ins1', 'ADMINISTRADO'],
      ['ins1', 'ENTREGADO'],
    ]);
    // Cambiarlo a administrado lo duplicaría: el botón queda deshabilitado
    const administrado2 = wrapper.findAll('[aria-label="Uso del medicamento 2"] button').find((b) => b.text() === 'Administrado')!;
    expect(administrado2.attributes('disabled')).toBeDefined();
    // Con los dos usos ocupados ya no se ofrece en un tercer renglón
    await wrapper.find('[data-agregar-medicamento]').trigger('click');
    expect(wrapper.find('select[aria-label="Medicamento 3"] option[value="ins1"]').exists()).toBe(false);
  });

  it('sin inventario los medicamentos se escriben a mano', async () => {
    const wrapper = await montar('./MedicamentosNotaEnfermeria.vue');
    await flushPromises();
    await wrapper.find('[data-agregar-medicamento]').trigger('click');
    expect(wrapper.find('select[aria-label="Medicamento 1"]').exists()).toBe(false);
    await wrapper.find('input[aria-label="Nombre del medicamento 1"]').setValue('Paracetamol');
    expect(fd.medicamentos[0]).toMatchObject({ nombre: 'Paracetamol', cantidad: 1, uso: 'ADMINISTRADO' });
    expect(inventarioApi.getExistencias).not.toHaveBeenCalled();
  });

  it('con inventario se elige del catálogo y el nombre viaja con el renglón', async () => {
    (useInventarioStore() as any).llevaInventario = () => true;
    inventarioApi.getExistencias.mockResolvedValue({
      data: [{ insumo: { _id: 'ins1', nombre: 'Paracetamol', presentacion: '500 mg', activo: true }, existencia: 10 }],
    });
    const wrapper = await montar('./MedicamentosNotaEnfermeria.vue');
    await flushPromises();
    await wrapper.find('[data-agregar-medicamento]').trigger('click');
    await wrapper.find('select[aria-label="Medicamento 1"]').setValue('ins1');
    expect(fd.medicamentos[0]).toMatchObject({ idInsumo: 'ins1', nombre: 'Paracetamol 500 mg' });
    expect(wrapper.find('input[aria-label="Nombre del medicamento 1"]').exists()).toBe(false);
    // «Otro» vuelve a texto libre
    await wrapper.find('select[aria-label="Medicamento 1"]').setValue('__otro__');
    expect(fd.medicamentos[0]).not.toHaveProperty('idInsumo');
    expect(wrapper.find('input[aria-label="Nombre del medicamento 1"]').exists()).toBe(true);
  });
});

describe('aviso a los médicos', () => {
  it('ofrece abrir la Nota médica o cerrar', async () => {
    const { default: Modal } = await import('@/components/ModalNotaEnfermeriaSoloEnfermeria.vue');
    const wrapper = mount(Modal, { props: { open: true }, global: { stubs: { Teleport: true } } });
    expect(wrapper.text()).toContain('usa la Nota médica');
    await wrapper.find('[data-test="abrir-nota-medica"]').trigger('click');
    expect(wrapper.emitted('abrir-nota-medica')).toHaveLength(1);
  });
});
