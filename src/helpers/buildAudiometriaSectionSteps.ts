/**
 * Pasos del asistente de la audiometría con secciones (punto 44): uno por sección (5). Cada paso
 * lleva el id de su sección y los números de sus pasos de siempre (`pasos`), para ubicar los
 * avisos al guardar. La sección se dibuja con la misma pieza que el examen de la vista (título,
 * ícono y cada paso en su ancla de pregunta).
 */
import { defineComponent, h, markRaw, type Component } from 'vue';
import SeccionExamenVista from '@/components/steps/examenVistaSteps/SeccionExamenVista.vue';
import Step1 from '@/components/steps/audiometriaSteps/Step1.vue';
import Step2 from '@/components/steps/audiometriaSteps/Step2.vue';
import Step3 from '@/components/steps/audiometriaSteps/Step3.vue';
import Step4 from '@/components/steps/audiometriaSteps/Step4.vue';
import Step5 from '@/components/steps/audiometriaSteps/Step5.vue';
import Step6 from '@/components/steps/audiometriaSteps/Step6.vue';
import Step7 from '@/components/steps/audiometriaSteps/Step7.vue';
import { AU_SECCIONES } from '@/helpers/audiometriaSections';

export const COMPONENTE_PASO_AU: Record<number, Component> = {
  1: Step1,
  2: Step2,
  3: Step3,
  4: Step4,
  5: Step5,
  6: Step6,
  7: Step7,
};

export function buildAudiometriaSectionSteps() {
  return AU_SECCIONES.map((seccion) => {
    const pasos = seccion.pasos.map((n) => ({ componente: markRaw(COMPONENTE_PASO_AU[n]), legacyStep: n }));
    const component = markRaw(
      defineComponent({
        name: `SeccionAudiometria_${seccion.id}`,
        setup: () => () => h(SeccionExamenVista, { titulo: seccion.nombre, icono: seccion.icono, pasos }),
      }),
    );
    return { component, name: seccion.nombre, id: seccion.id, pasos: seccion.pasos };
  });
}
