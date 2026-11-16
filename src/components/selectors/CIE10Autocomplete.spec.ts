import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const { buscarDiagnosticosCIE10 } = vi.hoisted(() => ({ buscarDiagnosticosCIE10: vi.fn() }));
vi.mock('@/api/CatalogsAPI', () => ({
  default: { buscarDiagnosticosCIE10, getCIE10ByCode: vi.fn() },
}));

import CIE10Autocomplete from './CIE10Autocomplete.vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';

/** Punto 37: el buscador de la nota médica solo ofrece lo que se puede guardar y dice por qué oculta. */
describe('CIE10Autocomplete — lo que se oculta (punto 37)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    (useTrabajadoresStore() as any).currentTrabajador = {
      _id: 't1',
      sexo: 'Femenino',
      fechaNacimiento: '1985-03-10T00:00:00.000Z',
    };
  });

  const buscar = async (props: Record<string, unknown>) => {
    buscarDiagnosticosCIE10.mockResolvedValue({
      data: {
        resultados: [{ code: 'E119', description: 'DIABETES MELLITUS TIPO 2' }],
        ocultosPorSexoEdad: 1,
        ocultosPorPersonal: 5,
        ocultosNoPermitidos: 2,
      },
    });
    const w = mount(CIE10Autocomplete, {
      props: { modelValue: '', trabajadorId: 't1', fechaConsulta: '2026-11-10', ...props },
    });
    await w.find('input').setValue('diabetes');
    await vi.runAllTimersAsync();
    await flushPromises();
    return w;
  };

  it('manda el tipo de personal y la relación temporal del diagnóstico principal', async () => {
    await buscar({ tipoPersonal: 6, relacionTemporal: 0, personalEtiqueta: 'enfermería' });
    const opciones = buscarDiagnosticosCIE10.mock.calls[0][1];
    expect(opciones).toMatchObject({ tipoPersonal: 6, relacionTemporal: 0, fecha: '2026-11-10' });
  });

  it('explica lo oculto: sexo o edad, personal y lo que no va en la nota', async () => {
    const w = await buscar({ tipoPersonal: 6, relacionTemporal: 0, personalEtiqueta: 'enfermería' });
    expect(w.find('.cie10-ocultos').text()).toBe(
      '1 diagnóstico no aplica a mujeres de 41 años · 5 no los autoriza el catálogo a enfermería en primera vez · 2 no se registran en la nota médica',
    );
  });

  it('diagnósticos 2 y 3: sin tipo de personal, no se filtra por él', async () => {
    await buscar({});
    const opciones = buscarDiagnosticosCIE10.mock.calls[0][1];
    expect(opciones.tipoPersonal).toBeNull();
    expect(opciones.relacionTemporal).toBeNull();
  });
});
