import { defineStore } from "pinia";
import { ref, markRaw } from "vue";
import { useTrabajadoresStore } from "./trabajadores";
import { useDocumentosStore } from "./documentos";

const trabajadores = useTrabajadoresStore();
const documentos = useDocumentosStore();

// Evento personalizado para campos faltantes
const showMissingFieldsModal = ref(false);

export const useStepsStore = defineStore("steps", () => {
  // Lista de pasos
  const steps = ref<Array<{ component: any; name: string }>>([]);

  // Paso actual
  const currentStep = ref(1);

  /** Legacy step (V1 index) resaltado dentro de la sección V2 activa; null = sin pinpoint. */
  const focusedLegacyStep = ref<number | null>(null);

  // Bandera para evitar múltiples entradas rápidas
  const isNavigating = ref(false);

  const setPinpoint = (legacyStep: number) => {
    focusedLegacyStep.value = legacyStep;
  };

  const clearPinpoint = () => {
    focusedLegacyStep.value = null;
  };

  // Establece los pasos y marca los componentes como no reactivos
  const setSteps = (
    newSteps: Array<{ component: any; name: string }>,
    options?: { preserveCurrentStep?: boolean }
  ) => {
    const prevLen = steps.value.length;
    const prevStep = currentStep.value;

    steps.value = newSteps.map((step) => ({
      ...step,
      component: markRaw(step.component),
    }));

    clearPinpoint();

    if (options?.preserveCurrentStep && prevLen > 0) {
      // Incluir la pantalla «Completado» (paso = length + 1), no solo el último paso del formulario.
      const maxStepInclusive = newSteps.length + 1;
      currentStep.value = Math.min(prevStep, maxStepInclusive);
    } else {
      currentStep.value = 1;
    }
  };

  // Validar los campos visibles del paso actual
  const validateCurrentStep = (): boolean => {
    const visibleInputs = Array.from(
      document.querySelectorAll("input:required, textarea:required, input[type='date']:required")
    )
      // Filtrar inputs visibles y vacíos, excluyendo los específicos
      .filter((input) => {
        const element = input as HTMLInputElement | HTMLTextAreaElement;
  
        // Excluir inputs con un atributo específico
        if (element.hasAttribute("data-skip-validation")) {
          return false; // Excluir este input del proceso de validación
        }
  
        return element.offsetParent !== null && !element.value.trim();
      });
  
    if (visibleInputs.length > 0) {
      showMissingFieldsModal.value = true;
      return false;
    }
  
    return true;
  };  

  // Avanzar al siguiente paso
  const nextStep = () => {
    if (isNavigating.value) return;

    if (!validateCurrentStep()) return; // Detener navegación si la validación falla

    isNavigating.value = true;
    clearPinpoint();

    // Lógica especial para controlPrenatal
    if (documentos.currentTypeOfDocument === 'controlPrenatal') {
      const pasosQueSaltanA84 = [17, 23, 29, 35, 41, 47, 53, 59, 65, 71, 77];
      
      if (pasosQueSaltanA84.includes(currentStep.value)) {
        // Saltar directamente al paso 84 para los pasos de fondo uterino mensual
        currentStep.value = 84;
      } else if (currentStep.value < steps.value.length) {
        // Navegación normal para otros pasos
        currentStep.value++;
      } else {
        currentStep.value = steps.value.length + 1;
      }
    } else {
      // Navegación normal para otros tipos de documento
      if (currentStep.value < steps.value.length) {
        currentStep.value++;
      } else {
        currentStep.value = steps.value.length + 1;
      }
    }

    setTimeout(() => {
      isNavigating.value = false;
    }, 700);
  };

  // Retroceder al paso anterior
  const previousStep = () => {
    if (isNavigating.value) return;

    isNavigating.value = true;
    clearPinpoint();

    if (currentStep.value > 1) {
      currentStep.value--;
    }

    setTimeout(() => {
      isNavigating.value = false;
    }, 300);
  };

  /**
   * Navega a un índice de sección/paso.
   * Con legacyStep → fija pinpoint (edición precisa desde visualizador).
   * Sin legacyStep → limpia pinpoint (p. ej. título de sección o callers legacy).
   */
  const goToSection = (
    sectionIndex: number,
    legacyStep?: number | null,
  ) => {
    // Se usa el mapa de redirección para compensar la diferencia de pasos entre los trabajadores masculinos y femeninos
    // debido a los antecedentes Gineco Obstétricos - SOLO para Historia Clínica granular (V1).
    // En HC por secciones (V2) el array tiene ≤8 pasos y los índices ya son de sección.
    const isHcSectionsMode =
      documentos.currentTypeOfDocument === 'historiaClinica' &&
      steps.value.length > 0 &&
      steps.value.length <= 8;

    const redirectionMap: Record<number, number> = {
      42: 28,
      43: 29,
      44: 30,
      45: 31,
      46: 32,
    };

    let stepNumber = sectionIndex;

    // Solo aplicar redirección si el paso solicitado está en el mapa Y es Historia Clínica V1
    // Para otros documentos como Control Prenatal, no aplicar redirección
    if (
      !isHcSectionsMode &&
      redirectionMap[stepNumber] &&
      trabajadores.currentTrabajador?.sexo !== 'Femenino' &&
      documentos.currentTypeOfDocument === 'historiaClinica'
    ) {
      stepNumber = redirectionMap[stepNumber];
    }

    if (stepNumber >= 1 && stepNumber <= steps.value.length) {
      currentStep.value = stepNumber;
      if (legacyStep != null && legacyStep > 0) {
        setPinpoint(legacyStep);
      } else {
        clearPinpoint();
      }
    } else {
      console.error(`El paso ${stepNumber} no es válido.`);
    }
  };

  /** Wrapper: navega sin pinpoint (limpia). Preferir goToSection cuando se quiera pinpoint. */
  const goToStep = (stepNumber: number) => {
    goToSection(stepNumber, null);
  };

  return {
    steps,
    currentStep,
    focusedLegacyStep,
    setSteps,
    setPinpoint,
    clearPinpoint,
    validateCurrentStep,
    nextStep,
    previousStep,
    goToSection,
    goToStep,
    showMissingFieldsModal,
  };
});
