import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

const { actualizarCodigosFormato } = vi.hoisted(() => ({ actualizarCodigosFormato: vi.fn() }));
vi.mock('@/api/ModulosFuncionesAPI', () => ({ default: { actualizarCodigosFormato } }));

import ModalCodigosFormato from './ModalCodigosFormato.vue';

const toast = { open: vi.fn() };

function montar(codigos: Record<string, { codigo: string; lineaAdicional?: string }> = {}) {
  return mount(ModalCodigosFormato, {
    props: { visible: true, codigos },
    global: { provide: { toast }, stubs: { Teleport: true, Transition: false } },
  });
}

const fila = (w: ReturnType<typeof montar>, tipo: string) => w.find(`[data-tipo="${tipo}"]`);
const campo = (w: ReturnType<typeof montar>, tipo: string, cual: 'codigo' | 'lineaAdicional') =>
  fila(w, tipo).find(`[data-campo="${cual}"]`);

describe('ModalCodigosFormato (punto 34)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    useProveedorSaludStore().proveedorSalud = { _id: 'p1' } as any;
  });

  it('una fila por documento con PDF y por formato para firma, con los códigos guardados', () => {
    const w = montar({ notaMedica: { codigo: 'FCPE-022', lineaAdicional: 'Revisión: 01' } });
    // 25 documentos con PDF + 3 formatos para firma
    expect(w.findAll('[data-tipo]').length).toBe(28);
    expect(fila(w, 'documentoExterno').exists()).toBe(false);
    expect(fila(w, 'DECLARACION_VERACIDAD').exists()).toBe(true);
    expect((campo(w, 'notaMedica', 'codigo').element as HTMLInputElement).value).toBe('FCPE-022');
    expect((campo(w, 'notaMedica', 'lineaAdicional').element as HTMLInputElement).value).toBe('Revisión: 01');
    expect(campo(w, 'notaMedica', 'codigo').attributes('maxlength')).toBe('30');
    expect(campo(w, 'notaMedica', 'lineaAdicional').attributes('maxlength')).toBe('40');
  });

  it('al abrir, la vista previa empieza en el primer tipo con código', () => {
    const w = montar({ receta: { codigo: 'FCPE-030' } });
    expect(w.find('[data-vista-codigo]').text()).toBe('FCPE-030');
    expect(fila(w, 'receta').classes()).toContain('modal-codigos-formato__fila--activa');
  });

  it('la vista previa muestra la fila en la que se escribe', async () => {
    const w = montar();
    expect(w.find('[data-vista-codigo]').exists()).toBe(false);
    await campo(w, 'receta', 'codigo').trigger('focus');
    await campo(w, 'receta', 'codigo').setValue('FCPE-030');
    await campo(w, 'receta', 'lineaAdicional').setValue('  Rev.   02 ');
    expect(w.find('[data-vista-previa]').text()).toContain('RECETA');
    expect(w.find('[data-vista-codigo]').text()).toBe('FCPE-030');
    expect(w.find('[data-vista-linea]').text()).toBe('Rev. 02');
  });

  it('Guardar se habilita con cambios y manda solo los tipos con código, ya recortados', async () => {
    const estado = { codigosFormatoHabilitado: true, codigosFormato: { receta: { codigo: 'FCPE-030' } } };
    actualizarCodigosFormato.mockResolvedValue({ data: estado });
    const w = montar();
    expect(w.find('[data-guardar]').attributes('disabled')).toBeDefined();
    await campo(w, 'receta', 'codigo').setValue(' FCPE-030 ');
    await campo(w, 'notaMedica', 'lineaAdicional').setValue('Rev. 01');
    // Una línea adicional sin código se avisa y no se manda
    expect(fila(w, 'notaMedica').text()).toContain('Sin código no se imprime la línea adicional.');
    expect(w.find('[data-con-codigo]').text()).toBe('1 tipo con código');
    await w.find('[data-guardar]').trigger('click');
    await flushPromises();
    expect(actualizarCodigosFormato).toHaveBeenCalledWith({ codigosFormato: { receta: { codigo: 'FCPE-030' } } });
    expect(w.emitted('guardado')?.[0]).toEqual([estado]);
    expect(w.emitted('close')).toBeTruthy();
  });

  it('si el servidor rechaza un tipo, lo dice en su fila y no cierra', async () => {
    actualizarCodigosFormato.mockRejectedValue({
      response: {
        data: {
          message: 'El código no puede pasar de 30 caracteres.',
          details: [{ tipo: 'receta', mensaje: 'El código no puede pasar de 30 caracteres.' }],
        },
      },
    });
    const w = montar();
    await campo(w, 'receta', 'codigo').setValue('FCPE-030');
    await w.find('[data-guardar]').trigger('click');
    await flushPromises();
    expect(fila(w, 'receta').text()).toContain('El código no puede pasar de 30 caracteres.');
    expect(w.emitted('close')).toBeFalsy();
    expect(toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('borrar un código también es un cambio que se guarda', async () => {
    actualizarCodigosFormato.mockResolvedValue({ data: { codigosFormatoHabilitado: true, codigosFormato: {} } });
    const w = montar({ receta: { codigo: 'FCPE-030' } });
    await campo(w, 'receta', 'codigo').setValue('');
    await w.find('[data-guardar]').trigger('click');
    await flushPromises();
    expect(actualizarCodigosFormato).toHaveBeenCalledWith({ codigosFormato: {} });
  });
});
