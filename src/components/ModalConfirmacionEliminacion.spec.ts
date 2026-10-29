import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ModalConfirmacionEliminacion from './ModalConfirmacionEliminacion.vue';

function montar(selectedDocuments: { documentType: string; formatoFirmado?: boolean }[]) {
  return mount(ModalConfirmacionEliminacion, {
    props: {
      isVisible: true,
      selectedCount: selectedDocuments.length,
      // Nombres de archivo engañosos: el resumen ya no se arma con ellos
      selectedRoutes: selectedDocuments.map((_d, i) => `ruta/Consentimiento Antidoping ${i}.pdf`),
      selectedDocuments,
    },
    global: { stubs: { Transition: false } },
  });
}

const filas = (w: ReturnType<typeof montar>) =>
  w.findAll('[data-resumen-eliminacion] li').map((li) => [
    li.attributes('data-tipo'),
    li.findAll('span').map((span) => span.text().trim()).filter(Boolean).join(' '),
  ]);

describe('ModalConfirmacionEliminacion', () => {
  it('cuenta por el tipo real de cada documento, no por el nombre del archivo', () => {
    const w = montar([
      { documentType: 'documentoExterno', formatoFirmado: true },
      { documentType: 'documentoExterno', formatoFirmado: true },
      { documentType: 'documentoExterno' },
      { documentType: 'antidoping' },
      { documentType: 'historiaClinica' },
    ]);
    expect(filas(w)).toEqual([
      ['historiaClinica', 'Historia Clínica 1'],
      ['antidoping', 'Antidoping 1'],
      ['formatoFirmado', 'Formato firmado en pantalla 2'],
      ['documentoExterno', 'Documento Externo 1'],
    ]);
  });

  it('el formato firmado lleva el ícono de firma', () => {
    const w = montar([{ documentType: 'documentoExterno', formatoFirmado: true }]);
    expect(w.find('[data-tipo="formatoFirmado"] .fa-signature').exists()).toBe(true);
  });

  it('sin selección no muestra el resumen', () => {
    const w = montar([]);
    expect(w.find('[data-resumen-eliminacion]').exists()).toBe(false);
  });

  it('título con verbo y sustantivo, sin preguntar si está seguro; la X cierra', async () => {
    const w = montar([{ documentType: 'antidoping' }, { documentType: 'historiaClinica' }]);
    expect(w.find('[data-testid="eliminacion-titulo"]').text()).toBe('¿Eliminar 2 documentos?');
    expect(w.find('[data-testid="eliminacion-resumen"]').text()).toBe('No se puede deshacer.');
    expect(w.text()).not.toMatch(/¿Estás seguro\?|Estás a punto/);
    await w.find('button[aria-label="Cerrar"]').trigger('click');
    expect(w.emitted('cancel')).toHaveLength(1);
  });

  it('un solo documento en singular', () => {
    const w = montar([{ documentType: 'antidoping' }]);
    expect(w.find('[data-testid="eliminacion-titulo"]').text()).toBe('¿Eliminar 1 documento?');
  });
});
