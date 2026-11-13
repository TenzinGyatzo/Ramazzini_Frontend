import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { format } from 'date-fns';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import Step1 from './Step1.vue';

describe('Audiometría, paso 1', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useTrabajadoresStore().currentTrabajador = { nombre: 'X' } as never;
    useEmpresasStore().currentEmpresa = { nombreComercial: 'E' } as never;
    useCentrosTrabajoStore().currentCentroTrabajo = { nombreCentro: 'C' } as never;
  });

  it('al montarse copia al formulario el método y la fecha que se ven (por defecto)', () => {
    const formDataAudiometria = useFormDataStore().formDataAudiometria as Record<string, unknown>;
    mount(Step1, { global: { stubs: { FormKit: true } } });
    expect(formDataAudiometria.metodoAudiometria).toBe('LFT');
    expect(formDataAudiometria.fechaAudiometria).toBe(format(new Date(), 'yyyy-MM-dd'));
  });
});
