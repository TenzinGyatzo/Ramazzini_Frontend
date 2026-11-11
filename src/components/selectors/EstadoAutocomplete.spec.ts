import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const searchEstados = vi.fn();
const getEstados = vi.fn();

vi.mock('@/api/CatalogsAPI', () => ({
  default: {
    searchEstados: (...args: unknown[]) => searchEstados(...args),
    getEstados: (...args: unknown[]) => getEstados(...args),
    getEstadoByCode: vi.fn().mockResolvedValue({ data: null }),
  },
}));

const { default: EstadoAutocomplete } = await import('./EstadoAutocomplete.vue');

async function buscar(texto: string, catalogo: { code: string; description: string }[]) {
  searchEstados.mockResolvedValue({ data: catalogo });
  const wrapper = mount(EstadoAutocomplete, {
    props: { paisNacimiento: 142, geoContext: 'trabajador' },
  });
  const input = wrapper.find('input');
  await input.setValue(texto);
  await vi.advanceTimersByTimeAsync(350);
  await flushPromises();
  return wrapper.findAll('[role="option"]').map((li) => li.text());
}

describe('EstadoAutocomplete: búsqueda en entidad de nacimiento', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchEstados.mockReset();
    getEstados.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('«se ign» muestra SE IGNORA una sola vez aunque también venga del catálogo', async () => {
    const opciones = await buscar('se ign', [{ code: '99', description: 'SE IGNORA' }]);
    expect(opciones.filter((o) => o.includes('SE IGNORA'))).toHaveLength(1);
  });

  it('«no es» muestra NO ESPECIFICADO una sola vez', async () => {
    const opciones = await buscar('no es', [{ code: '00', description: 'NO ESPECIFICADO' }]);
    expect(opciones.filter((o) => o.includes('NO ESPECIFICADO'))).toHaveLength(1);
  });

  it('los estados siguen apareciendo una vez', async () => {
    const opciones = await buscar('jal', [{ code: '14', description: 'JALISCO' }]);
    expect(opciones).toHaveLength(1);
    expect(opciones[0]).toContain('JALISCO');
  });
});
