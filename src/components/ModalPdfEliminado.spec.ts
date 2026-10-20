import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ModalPdfEliminado from './ModalPdfEliminado.vue';

const montar = (props: Record<string, unknown>) =>
  mount(ModalPdfEliminado, {
    props,
    global: { provide: { toast: { open: vi.fn() } } },
  });

describe('ModalPdfEliminado', () => {
  it('aclara que la información sigue guardada y no habla de documentos eliminados', () => {
    const texto = montar({ tipo: 'antidoping', pdfStatus: null }).text();

    expect(texto).toContain('Hay que volver a generar el PDF');
    expect(texto).toContain('Tu información está a salvo.');
    expect(texto).toContain('30 días después de generarlo');
    expect(texto).toContain('Generar PDF');
    expect(texto.toLowerCase()).not.toContain('eliminado');
  });

  it('Generar PDF pide la regeneración y cierra el aviso', async () => {
    const wrapper = montar({ tipo: 'antidoping', pdfStatus: null });
    const boton = wrapper.findAll('button').find((b) => b.text().includes('Generar PDF'));

    await boton!.trigger('click');

    expect(wrapper.emitted('iniciar')).toHaveLength(1);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
