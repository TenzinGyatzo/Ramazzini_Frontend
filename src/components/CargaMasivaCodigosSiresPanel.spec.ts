import { describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CargaMasivaCodigosSiresPanel from './CargaMasivaCodigosSiresPanel.vue';

vi.mock('@/api/CatalogsAPI', () => ({
  default: {
    listCatalog: vi.fn().mockResolvedValue({ data: [{ code: '142', description: 'México' }] }),
    searchPaises: vi.fn().mockResolvedValue({ data: [] }),
    getEstados: vi.fn().mockResolvedValue({ data: [{ code: '09', description: 'Ciudad de México' }] }),
    searchEstados: vi.fn().mockResolvedValue({ data: [] }),
    getMunicipios: vi.fn().mockResolvedValue({ data: [] }),
    searchMunicipios: vi.fn().mockResolvedValue({ data: [] }),
    getLocalidades: vi.fn().mockResolvedValue({ data: [] }),
    exportImportReferenceCatalog: vi.fn(),
  },
}));

describe('CargaMasivaCodigosSiresPanel', () => {
  it('renderiza secciones de consulta y descarga', () => {
    const wrapper = mount(CargaMasivaCodigosSiresPanel, {
      global: {
        provide: {
          toast: { open: vi.fn() },
        },
      },
    });

    expect(wrapper.text()).toContain('Consultar códigos para la plantilla');
    expect(wrapper.text()).toContain('Descargar catálogos de referencia');
    expect(wrapper.text()).toContain('paisNacimiento');
  });

  it('copia código al portapapeles', async () => {
    const toastOpen = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText },
    });

    const wrapper = mount(CargaMasivaCodigosSiresPanel, {
      global: {
        provide: {
          toast: { open: toastOpen },
        },
      },
    });

    const paisInput = wrapper.find('input[placeholder="Buscar país..."]');
    await paisInput.trigger('focus');
    await flushPromises();

    const copyButton = wrapper.find('button.text-emerald-700');
    await copyButton.trigger('click');
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith('142');
    expect(toastOpen).toHaveBeenCalled();
  });
});
