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

  // Bandera para evitar múltiples entradas rápidas
  const isNavigating = ref(false);

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

    if (options?.preserveCurrentStep && prevLen > 0) {
      // p. ej. trastornos del estado de ánimo: el paso 15 aparece/desaparece según respuestas P1
      currentStep.value = Math.min(prevStep, newSteps.length);
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

    if (currentStep.value > 1) {
      currentStep.value--;
    }

    setTimeout(() => {
      isNavigating.value = false;
    }, 300);
  };

  // Ir a un paso específico
  const goToStep = (stepNumber: number) => {
    // Se usa el mapa de redirección para compensar la diferencia de pasos entre los trabajadores masculinos y femeninos
    // debido a los antecedentes Gineco Obstétricos - SOLO para Historia Clínica
    const redirectionMap: Record<number, number> = {
      42: 28,
      43: 29,
      44: 30,
      45: 31,
      46: 32,
    };
  
    // Solo aplicar redirección si el paso solicitado está en el mapa Y es Historia Clínica
    // Para otros documentos como Control Prenatal, no aplicar redirección
    if (
      redirectionMap[stepNumber] &&
      trabajadores.currentTrabajador?.sexo !== 'Femenino' &&
      // Verificar que sea Historia Clínica usando el tipo de documento actual
      documentos.currentTypeOfDocument === 'historiaClinica'
    ) {
      stepNumber = redirectionMap[stepNumber];
    }
  
    if (stepNumber >= 1 && stepNumber <= steps.value.length) {
      currentStep.value = stepNumber;
    } else {
      console.error(`El paso ${stepNumber} no es válido.`);
    }
  };

  return {
    steps,
    currentStep,
    setSteps,
    validateCurrentStep,
    nextStep,
    previousStep,
    goToStep,
    showMissingFieldsModal,
  };
});
