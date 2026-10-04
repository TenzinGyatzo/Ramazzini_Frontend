import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/api/SeguimientoProgramadoCardiometabolicoAPI', () => ({ default: api }));
vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({ ensureUserLoaded: vi.fn().mockResolvedValue('user1') }),
}));
vi.mock('@/stores/trabajadores', () => ({
  useTrabajadoresStore: () => ({
    currentTrabajadorId: 'trab1',
    currentTrabajador: { nombre: 'Ana', primerApellido: 'López', puesto: 'Operadora' },
  }),
}));

import ModalInasistenciasCardiometabolicas from './ModalInasistenciasCardiometabolicas.vue';

const toast = { open: vi.fn() };

const montar = async () => {
  const wrapper = mount(ModalInasistenciasCardiometabolicas, {
    props: { visible: true, trabajadorId: 'trab1' },
    global: {
      provide: { toast, requestEliminacion: vi.fn() },
      stubs: { Teleport: true, Transition: false },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('ModalInasistenciasCardiometabolicas', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    toast.open.mockReset();
    api.list.mockResolvedValue({
      data: [{ _id: 'i1', fechaProgramada: '2026-09-10T18:00:00.000Z', estado: 'No asistió', observaciones: 'Avisó' }],
    });
    api.create.mockResolvedValue({ data: {} });
    api.update.mockResolvedValue({ data: {} });
  });

  it('lista las inasistencias y no ofrece estados de cita', async () => {
    const wrapper = await montar();

    expect(wrapper.findAll('[data-inasistencia]')).toHaveLength(1);
    expect(wrapper.text()).toContain('10/09/2026');
    expect(wrapper.text()).toContain('Avisó');
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(0);
    for (const estado of ['Programada', 'Realizada', 'Cancelada']) {
      expect(wrapper.text()).not.toContain(estado);
    }
  });

  it('registra la inasistencia solo con fecha y observaciones', async () => {
    const wrapper = await montar();

    await wrapper.find('#inasistencia-fecha').setValue('2026-08-15');
    await wrapper.find('#inasistencia-observaciones').setValue('  No se presentó  ');
    await wrapper.find('[data-formulario-inasistencia]').trigger('submit');
    await flushPromises();

    expect(api.create).toHaveBeenCalledTimes(1);
    const [trabajadorId, cuerpo] = api.create.mock.calls[0];
    expect(trabajadorId).toBe('trab1');
    expect(Object.keys(cuerpo).sort()).toEqual(['createdBy', 'fechaProgramada', 'observaciones', 'updatedBy']);
    expect(cuerpo.observaciones).toBe('No se presentó');
    expect(String(cuerpo.fechaProgramada)).toContain('2026-08-15');
    // Recarga la lista tras guardar
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('no permite una fecha futura', async () => {
    const wrapper = await montar();

    await wrapper.find('#inasistencia-fecha').setValue('2999-01-01');
    await wrapper.find('[data-formulario-inasistencia]').trigger('submit');
    await flushPromises();

    expect(api.create).not.toHaveBeenCalled();
    expect(toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('corrige una inasistencia existente', async () => {
    const wrapper = await montar();

    await wrapper.find('[data-inasistencia="i1"] button[title="Corregir"]').trigger('click');
    expect((wrapper.find('#inasistencia-observaciones').element as HTMLInputElement).value).toBe('Avisó');

    await wrapper.find('#inasistencia-observaciones').setValue('Avisó por teléfono');
    await wrapper.find('[data-formulario-inasistencia]').trigger('submit');
    await flushPromises();

    expect(api.create).not.toHaveBeenCalled();
    expect(api.update).toHaveBeenCalledWith(
      'trab1',
      'i1',
      expect.objectContaining({ observaciones: 'Avisó por teléfono', updatedBy: 'user1' }),
    );
  });
});
