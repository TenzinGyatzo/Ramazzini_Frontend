// @vitest-environment jsdom
/**
 * Cada antecedente (pasos 2–27) copia su «Sí» al formulario, en los dos modos. Autoinmunes no
 * lo hacía: la vista previa no marcaba «XX» y lo preseleccionado volvía a poner «Negado».
 */
import { describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { CAPTURA_RAPIDA_KEY } from '@/composables/capturaRapidaKey';
import { PREGUNTAS_ANTECEDENTES, completarRespuestasPorDefecto } from '@/helpers/historiaClinicaGuardado';

const pasos = import.meta.glob('./Step*.vue');

describe('antecedentes: el «Sí» llega al formulario', () => {
  for (const capturaRapida of [false, true]) {
    it.each(PREGUNTAS_ANTECEDENTES.map((p) => [p.campo, p.paso, p.especificar] as const))(
      `${capturaRapida ? 'captura rápida' : 'vista previa'}: %s`,
      async (campo, paso, especificar) => {
        setActivePinia(createPinia());
        (useTrabajadoresStore() as any).currentTrabajador = { nombre: 'X', sexo: 'Masculino' };
        const df = (useFormDataStore() as any).formDataHistoriaClinica;
        const Paso = ((await pasos[`./Step${paso}.vue`]()) as any).default;
        const w = mount(Paso, {
          props: { variant: 'compact' },
          global: { provide: { [CAPTURA_RAPIDA_KEY as symbol]: capturaRapida } },
        });
        await flushPromises();
        await w.find('input[type="radio"][value="Si"]').setValue(true);
        await flushPromises();
        expect(df[campo]).toBe('Si');
        // Lo preseleccionado no vuelve a escribir el texto de «No»
        completarRespuestasPorDefecto(df, { esMujer: false });
        expect(df[campo]).toBe('Si');
        expect(df[especificar] ?? '').not.toBe('Negado');
        w.unmount();
      },
    );
  }
});
