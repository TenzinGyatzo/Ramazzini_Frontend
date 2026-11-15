// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';

const montar = async () => {
  const { default: Step1 } = await import('./Step1.vue');
  return mount(Step1, { global: { stubs: { FormKit: true } } });
};

const datos = () => useFormDataStore().formDataCertificado as Record<string, unknown>;

// La primera importación del paso compila el componente: con la suite en paralelo tarda
describe('certificado, contenido del certificado', { timeout: 20000 }, () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useTrabajadoresStore().currentTrabajador = { nombre: 'X', sexo: 'Femenino' } as never;
    useEmpresasStore().currentEmpresa = { nombreComercial: 'E' } as never;
    useCentrosTrabajoStore().currentCentroTrabajo = { nombreCentro: 'C' } as never;
  });

  it('documento nuevo: con resultados clínicos, y se guarda desde que se abre el paso', async () => {
    const w = await montar();
    await nextTick();
    expect(datos().modalidadCertificado).toBe('resultadosClinicos');
    expect(w.find('[data-modalidad="resultadosClinicos"]').attributes('aria-checked')).toBe('true');
  });

  it('elegir «por interrogatorio» lo guarda y explica qué cambia', async () => {
    const w = await montar();
    await w.find('[data-modalidad="interrogatorio"]').trigger('click');
    expect(datos().modalidadCertificado).toBe('interrogatorio');
    expect(w.find('[data-ayuda-modalidad]').text()).toContain('interrogatorio médico');
  });

  it('al editar, se respeta la modalidad guardada', async () => {
    useDocumentosStore().currentDocument = {
      fechaCertificado: '2026-11-12',
      modalidadCertificado: 'interrogatorio',
    } as never;
    const w = await montar();
    await nextTick();
    expect(w.find('[data-modalidad="interrogatorio"]').attributes('aria-checked')).toBe('true');
    expect(datos().modalidadCertificado).toBe('interrogatorio');
  });
});
