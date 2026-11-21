// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import Step1 from './Step1.vue';

function preparar(pais?: string) {
  setActivePinia(createPinia());
  useTrabajadoresStore().currentTrabajador = { nombre: 'X' } as never;
  useEmpresasStore().currentEmpresa = { nombreComercial: 'E' } as never;
  useCentrosTrabajoStore().currentCentroTrabajo = { nombreCentro: 'C' } as never;
  (useProveedorSaludStore() as any).proveedorSalud = pais ? { pais } : null;
  return useFormDataStore().formDataAudiometria as Record<string, unknown>;
}
const metodoMarcado = (w: ReturnType<typeof mount>) =>
  (w.findAll('input[type="radio"]').find((r) => (r.element as HTMLInputElement).checked)?.element as HTMLInputElement)
    ?.value;

describe('Audiometría, paso 1 (punto 44)', () => {
  beforeEach(() => preparar());

  it('no escribe al abrirse: muestra LFT en México y AMA en otro país', () => {
    const mx = preparar('MX');
    const w = mount(Step1, { global: { stubs: { FormKit: true } } });
    expect(metodoMarcado(w)).toBe('LFT');
    expect(mx.metodoAudiometria).toBeUndefined();
    expect(mx.fechaAudiometria).toBeUndefined();

    preparar('GT');
    expect(metodoMarcado(mount(Step1, { global: { stubs: { FormKit: true } } }))).toBe('AMA');
    preparar();
    expect(metodoMarcado(mount(Step1, { global: { stubs: { FormKit: true } } }))).toBe('LFT');
  });

  it('escribe el método cuando el usuario lo cambia', async () => {
    const df = preparar('MX');
    const w = mount(Step1, { global: { stubs: { FormKit: true } } });
    await w.find('input[type="radio"][value="AMA"]').setValue(true);
    expect(df.metodoAudiometria).toBe('AMA');
  });
});
