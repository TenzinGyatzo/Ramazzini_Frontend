/**
 * Pasos del asistente del examen de la vista con secciones (punto 43): uno por sección, según el
 * país (general 4, Guatemala 8). Cada paso lleva el id de su sección y los ids de sus pasos
 * originales (`pasos`), para ubicar los avisos al guardar.
 */
import { defineComponent, h, markRaw, type Component } from 'vue';
import SeccionExamenVista from '@/components/steps/examenVistaSteps/SeccionExamenVista.vue';
import Step1 from '@/components/steps/examenVistaSteps/Step1.vue';
import Step2 from '@/components/steps/examenVistaSteps/Step2.vue';
import Step3 from '@/components/steps/examenVistaSteps/Step3.vue';
import Step4 from '@/components/steps/examenVistaSteps/Step4.vue';
import Step5 from '@/components/steps/examenVistaSteps/Step5.vue';
import Step6 from '@/components/steps/examenVistaSteps/Step6.vue';
import Step7 from '@/components/steps/examenVistaSteps/Step7.vue';
import Step8 from '@/components/steps/examenVistaSteps/Step8.vue';
import Step9 from '@/components/steps/examenVistaSteps/Step9.vue';
import StepAntecedentesGT from '@/components/steps/examenVistaSteps/StepAntecedentesGT.vue';
import StepAnamnesisGT from '@/components/steps/examenVistaSteps/StepAnamnesisGT.vue';
import StepUtilizaAnteojosGT from '@/components/steps/examenVistaSteps/StepUtilizaAnteojosGT.vue';
import { PASO_EV, getEvSecciones, type EvPasoId } from '@/helpers/examenVistaSections';

export const COMPONENTE_PASO_EV: Record<EvPasoId, Component> = {
  evFecha: Step1,
  evAntecedentesGT: StepAntecedentesGT,
  evAnamnesisGT: StepAnamnesisGT,
  evUtilizaAnteojosGT: StepUtilizaAnteojosGT,
  evAvLejanaSin: Step2,
  evAvCercanaSin: Step3,
  evAvLejanaCon: Step4,
  evAvCercanaCon: Step5,
  evIshihara: Step6,
  evFuncionOcular: Step7,
  evReceta: Step8,
  evDiagnostico: Step9,
};

export function buildExamenVistaSectionSteps(esGuatemala: boolean) {
  return getEvSecciones(esGuatemala).map((seccion) => {
    const pasos = seccion.pasos.map((id) => ({ componente: markRaw(COMPONENTE_PASO_EV[id]), legacyStep: PASO_EV[id] }));
    const component = markRaw(
      defineComponent({
        name: `SeccionExamenVista_${seccion.id}`,
        setup: () => () => h(SeccionExamenVista, { titulo: seccion.nombre, icono: seccion.icono, pasos }),
      }),
    );
    return { component, name: seccion.nombre, id: seccion.id, pasos: seccion.pasos };
  });
}
