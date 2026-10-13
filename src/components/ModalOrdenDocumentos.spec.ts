import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { TIPOS_DOCUMENTO_EXPEDIENTE } from '@/helpers/documentosExpediente';
import ModalOrdenDocumentos from './ModalOrdenDocumentos.vue';

const updateOrden = vi.hoisted(() => vi.fn());
vi.mock('@/api/ProveedorSaludAPI', () => ({
  default: { updateOrdenDocumentosExpediente: updateOrden },
}));

const ORDEN_POR_DEFECTO = TIPOS_DOCUMENTO_EXPEDIENTE.map((d) => d.tipo);

describe('ModalOrdenDocumentos', () => {
  let pinia: ReturnType<typeof createPinia>;
  let toast: { open: ReturnType<typeof vi.fn> };

  function configurar(proveedor: Record<string, unknown> = {}) {
    useProveedorSaludStore().proveedorSalud = {
      _id: 'prov-1',
      regulatoryPolicy: { regime: 'SIN_REGIMEN', features: { controlPrenatalEnabled: true }, validation: {} },
      ...proveedor,
    } as any;
  }

  function montar() {
    return mount(ModalOrdenDocumentos, {
      props: { visible: true },
      global: {
        plugins: [pinia],
        provide: { toast },
        stubs: { Teleport: true, Transition: false },
      },
    });
  }

  const tipos = (wrapper: ReturnType<typeof montar>) =>
    wrapper.findAll('li').map((fila) => fila.attributes('data-tipo'));
  const boton = (wrapper: ReturnType<typeof montar>, texto: string) =>
    wrapper.findAll('button').find((b) => b.text().includes(texto))!;
  const fila = (wrapper: ReturnType<typeof montar>, tipo: string) => wrapper.find(`li[data-tipo="${tipo}"]`);

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    toast = { open: vi.fn() };
    updateOrden.mockReset();
    updateOrden.mockImplementation((_id: string, orden: string[]) =>
      Promise.resolve({ data: { ordenDocumentosExpediente: orden } }),
    );
    configurar();
  });

  it('abre con el orden de siempre cuando el proveedor no ha guardado uno', () => {
    const wrapper = montar();
    expect(tipos(wrapper)).toEqual(ORDEN_POR_DEFECTO);
    expect(boton(wrapper, 'Guardar orden').attributes('disabled')).toBeDefined();
    expect(boton(wrapper, 'Restablecer').attributes('disabled')).toBeDefined();
  });

  it('abre con el orden guardado por el proveedor', () => {
    configurar({ ordenDocumentosExpediente: [...ORDEN_POR_DEFECTO].reverse() });
    expect(tipos(montar())).toEqual([...ORDEN_POR_DEFECTO].reverse());
  });

  it('no muestra control prenatal si el proveedor no lo usa', () => {
    configurar({
      regulatoryPolicy: { regime: 'SIRES_NOM024', features: { controlPrenatalEnabled: false }, validation: {} },
    });
    expect(tipos(montar())).not.toContain('controlPrenatal');
  });

  it('las flechas mueven un tipo y los extremos no se pueden pasar', async () => {
    const wrapper = montar();
    const primero = ORDEN_POR_DEFECTO[0];
    const segundo = ORDEN_POR_DEFECTO[1];

    expect(fila(wrapper, primero).find('button[title="Subir"]').attributes('disabled')).toBeDefined();
    await fila(wrapper, primero).find('button[title="Bajar"]').trigger('click');

    expect(tipos(wrapper).slice(0, 2)).toEqual([segundo, primero]);
    const ultimo = tipos(wrapper).at(-1)!;
    expect(fila(wrapper, ultimo).find('button[title="Bajar"]').attributes('disabled')).toBeDefined();
  });

  it('arrastrar un tipo sobre otro lo coloca en ese lugar', async () => {
    const wrapper = montar();
    await fila(wrapper, 'aptitud').trigger('dragstart');
    await fila(wrapper, 'notaMedica').trigger('dragenter');
    await fila(wrapper, 'notaMedica').trigger('drop');

    const orden = tipos(wrapper);
    expect(orden.indexOf('aptitud')).toBe(ORDEN_POR_DEFECTO.indexOf('notaMedica'));
    expect(orden.indexOf('notaMedica')).toBe(orden.indexOf('aptitud') - 1);
    expect(orden).toHaveLength(ORDEN_POR_DEFECTO.length);
  });

  it('guarda el orden nuevo, lo deja en el almacén y cierra', async () => {
    const wrapper = montar();
    await fila(wrapper, ORDEN_POR_DEFECTO[0]).find('button[title="Bajar"]').trigger('click');
    await boton(wrapper, 'Guardar orden').trigger('click');
    await flushPromises();

    const esperado = [ORDEN_POR_DEFECTO[1], ORDEN_POR_DEFECTO[0], ...ORDEN_POR_DEFECTO.slice(2)];
    expect(updateOrden).toHaveBeenCalledWith('prov-1', esperado);
    expect(useProveedorSaludStore().ordenTiposDocumento).toEqual(esperado);
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('restablecer y guardar quita la personalización del proveedor', async () => {
    configurar({ ordenDocumentosExpediente: [...ORDEN_POR_DEFECTO].reverse() });
    const wrapper = montar();
    await boton(wrapper, 'Restablecer').trigger('click');
    expect(tipos(wrapper)).toEqual(ORDEN_POR_DEFECTO);

    await boton(wrapper, 'Guardar orden').trigger('click');
    await flushPromises();

    expect(updateOrden).toHaveBeenCalledWith('prov-1', []);
    expect(useProveedorSaludStore().ordenDocumentosPersonalizado).toBe(false);
  });

  it('si el servidor rechaza el cambio avisa y no cierra', async () => {
    updateOrden.mockRejectedValue({ response: { data: { message: 'No tiene permiso para configurar el orden de los documentos' } } });
    const wrapper = montar();
    await fila(wrapper, ORDEN_POR_DEFECTO[0]).find('button[title="Bajar"]').trigger('click');
    await boton(wrapper, 'Guardar orden').trigger('click');
    await flushPromises();

    expect(toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    expect(wrapper.emitted('close')).toBeUndefined();
    expect(useProveedorSaludStore().ordenTiposDocumento).toEqual(ORDEN_POR_DEFECTO);
  });

  it('cancelar descarta lo movido: al reabrir vuelve el orden guardado', async () => {
    const wrapper = montar();
    await fila(wrapper, ORDEN_POR_DEFECTO[0]).find('button[title="Bajar"]').trigger('click');
    await boton(wrapper, 'Cancelar').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(updateOrden).not.toHaveBeenCalled();

    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ visible: true });
    expect(tipos(wrapper)).toEqual(ORDEN_POR_DEFECTO);
  });
});
