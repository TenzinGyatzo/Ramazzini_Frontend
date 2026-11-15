// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const CLAVE = 'ramazzini.antidoping.ultimoTipoPrueba';

const montar = async () => {
  const { default: Step2 } = await import('./Step2.vue');
  return mount(Step2);
};

describe('antidoping, paso de parámetros', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // La configuración de pruebas simula un localStorage vacío; aquí uno que sí guarda
    const memoria = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (memoria.has(k) ? memoria.get(k)! : null),
      setItem: (k: string, v: string) => memoria.set(k, String(v)),
      removeItem: (k: string) => memoria.delete(k),
      clear: () => memoria.clear(),
    });
  });

  it('el set de BZO muestra qué se reporta y lo guarda sin Opiáceos', async () => {
    const w = await montar();
    await w.find('select').setValue('5BZO');
    await nextTick();
    expect(w.find('[data-se-reportan]').text()).toBe(
      'Se reportan: Marihuana, Cocaína, Anfetaminas, Metanfetaminas, Benzodiacepinas',
    );
    const datos = useFormDataStore().formDataAntidoping as Record<string, unknown>;
    expect(datos.benzodiacepinas).toBe('Negativo');
    expect(datos).not.toHaveProperty('opiaceos');
  });

  it('un documento nuevo abre con el último tipo usado en este navegador', async () => {
    localStorage.setItem(CLAVE, '5BZO');
    const w = await montar();
    await nextTick();
    expect((w.find('select').element as HTMLSelectElement).value).toBe('5BZO');
  });

  it('sin preferencia, el predeterminado sigue siendo 5 con OPI', async () => {
    const w = await montar();
    await nextTick();
    expect((w.find('select').element as HTMLSelectElement).value).toBe('5');
  });

  it('al reabrir un documento con el set de BZO no se agrega Opiáceos', async () => {
    useDocumentosStore().currentDocument = {
      marihuana: 'Negativo',
      cocaina: 'Negativo',
      anfetaminas: 'Negativo',
      metanfetaminas: 'Negativo',
      benzodiacepinas: 'Positivo',
    } as never;
    const w = await montar();
    await nextTick();
    expect((w.find('select').element as HTMLSelectElement).value).toBe('5BZO');
    const datos = useFormDataStore().formDataAntidoping as Record<string, unknown>;
    expect(datos).not.toHaveProperty('opiaceos');
    expect(datos.benzodiacepinas).toBe('Positivo');
    // Abrir uno guardado no cambia la preferencia
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });
});
