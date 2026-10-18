import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const { buscar, push } = vi.hoisted(() => ({
  buscar: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@/api/BusquedaTrabajadoresAPI', () => ({
  default: { buscar },
  BUSQUEDA_MIN_CARACTERES: 3,
  esNumeroDeEmpleado: (texto: string) => /^[0-9]{1,7}$/.test(texto.trim()),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

import BuscadorTrabajadores from './BuscadorTrabajadores.vue';

const trabajador = (id: string, nombre: string, extra: Record<string, unknown> = {}) => ({
  _id: id,
  primerApellido: 'PÉREZ',
  segundoApellido: 'GARCÍA',
  nombre,
  folio: `T000000${id}`,
  puesto: 'Operador',
  fechaNacimiento: null,
  estadoLaboral: 'Activo',
  idEmpresa: 'e1',
  nombreEmpresa: 'Empresa Demo',
  idCentroTrabajo: 'c1',
  nombreCentro: 'Planta Norte',
  ...extra,
});

function montar() {
  return mount(BuscadorTrabajadores, {
    props: { mostrarBoton: true },
    attachTo: document.body,
  });
}

async function escribir(texto: string) {
  const campo = document.body.querySelector('input[type="search"]') as HTMLInputElement;
  campo.value = texto;
  campo.dispatchEvent(new Event('input'));
  await vi.advanceTimersByTimeAsync(300);
  await flushPromises();
  return campo;
}

describe('BuscadorTrabajadores', () => {
  beforeEach(() => {
    // jsdom no implementa scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
    vi.useFakeTimers();
    buscar.mockReset();
    push.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('el botón abre la búsqueda y con menos de 3 letras no consulta al servidor', async () => {
    const wrapper = montar();
    await wrapper.find('button[aria-label="Buscar trabajador"]').trigger('click');
    await flushPromises();

    await escribir('pe');
    expect(buscar).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Escribe al menos 3 letras');
    wrapper.unmount();
  });

  it('muestra los resultados con empresa y centro, y marca a los dados de baja', async () => {
    buscar.mockResolvedValue({
      data: [trabajador('1', 'JUAN'), trabajador('2', 'JUAN CARLOS', { estadoLaboral: 'Inactivo' })],
    });
    const wrapper = montar();
    await wrapper.find('button[aria-label="Buscar trabajador"]').trigger('click');
    await escribir('perez juan');

    expect(buscar).toHaveBeenCalledTimes(1);
    expect(buscar.mock.calls[0][0]).toBe('perez juan');
    const texto = document.body.textContent ?? '';
    expect(texto).toContain('PÉREZ GARCÍA JUAN');
    expect(texto).toContain('Empresa Demo › Planta Norte');
    expect(texto).toContain('Dado de baja');
    wrapper.unmount();
  });

  it('con las flechas y Enter abre el expediente del trabajador elegido', async () => {
    buscar.mockResolvedValue({ data: [trabajador('1', 'JUAN'), trabajador('2', 'JUAN CARLOS')] });
    const wrapper = montar();
    await wrapper.find('button[aria-label="Buscar trabajador"]').trigger('click');
    const campo = await escribir('perez');

    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await flushPromises();
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await flushPromises();

    expect(push).toHaveBeenCalledWith({
      name: 'expediente-medico',
      params: { idEmpresa: 'e1', idCentroTrabajo: 'c1', idTrabajador: '2' },
    });
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it('un número de empleado busca desde 1 dígito y se muestra en el resultado', async () => {
    buscar.mockResolvedValue({ data: [trabajador('1', 'JUAN', { numeroEmpleado: '7' })] });
    const wrapper = montar();
    await wrapper.find('button[aria-label="Buscar trabajador"]').trigger('click');
    await escribir('7');

    expect(buscar).toHaveBeenCalledTimes(1);
    expect(buscar.mock.calls[0][0]).toBe('7');
    expect(document.body.textContent).toContain('No. 7');
    wrapper.unmount();
  });

  it('avisa cuando no hay resultados', async () => {
    buscar.mockResolvedValue({ data: [] });
    const wrapper = montar();
    await wrapper.find('button[aria-label="Buscar trabajador"]').trigger('click');
    await escribir('zzzz');

    expect(document.body.textContent).toContain('Sin resultados para «zzzz»');
    wrapper.unmount();
  });

  it('Ctrl+K abre y cierra la búsqueda', async () => {
    const wrapper = montar();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    await flushPromises();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    await flushPromises();
    await vi.advanceTimersByTimeAsync(500);
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it('sin mostrarBoton no hay botón, pero el atajo sigue disponible', async () => {
    const wrapper = mount(BuscadorTrabajadores, { props: { mostrarBoton: false }, attachTo: document.body });
    expect(wrapper.find('button[aria-label="Buscar trabajador"]').exists()).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    await flushPromises();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    wrapper.unmount();
  });
});
