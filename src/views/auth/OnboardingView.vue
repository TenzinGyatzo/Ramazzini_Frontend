<script setup>
import { ref, reactive, inject, nextTick, watch, onMounted, onUnmounted, computed } from "vue";
import { useProveedorSaludStore } from "@/stores/proveedorSalud";
import { useUserStore } from "@/stores/user";
import { useRouter } from "vue-router";
import CountryPhoneInput from "@/components/CountryPhoneInput.vue";
import CountrySelect from "@/components/CountrySelect.vue";
import RegimenRegulatorioSelector from "@/components/onboarding/RegimenRegulatorioSelector.vue";
import CLUESAutocomplete from "@/components/selectors/CLUESAutocomplete.vue";
import { useHtmlDarkMode } from "@/composables/useHtmlDarkMode";

const toast = inject("toast");

const isMX = computed(() => formDataProveedorSalud.pais === 'MX');

const currentStep = ref(1);
const showStep2 = ref(false);
const transitioning = ref(false);
const showPassword = ref(false);
const passwordContainer = ref(null);
const toggleButton = ref(null);
const isLoading = ref(false);
const showCountryMessage = ref(false);
const formDataUser = reactive({
  username: "",
  email: "",
  phone: "",
  country: "MX", // País por defecto México
  password: "",
});
const formDataProveedorSalud = reactive({
  nombre: "",
  pais: "",
  clues: "",
  perfilProveedorSalud: "",
  semaforizacionActivada: true,
  referenciaPlan: "BÁSICO",
  estadoSuscripcion: "pending",
  fechaInicioTrial: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000) - (7 * 60 * 60 * 1000)),
  periodoDePruebaFinalizado: false,
  addOns: [],
  mercadoPagoSubscriptionId: "",
  payerEmail: "",
  termsAccepted: false,
  acceptedAt: new Date().toISOString(),
  termsVersion: "1.0",
  regimenRegulatorio: null,
  declaracionAceptada: false,
  declaracionAceptadaAt: null,
  declaracionVersion: "1.0",
});

// Acceso a los stores
const proveedorSaludStore = useProveedorSaludStore();
const userStore = useUserStore();
const router = useRouter();
const isHtmlDark = useHtmlDarkMode();

const handleSubmitStep1 = async (data) => {
  Object.assign(formDataUser, data); // Guardar datos del usuario temporalmente
  transitioning.value = true;
  currentStep.value = 2; // Avanzar al paso 2
};

const handleSubmitStep2 = async (data) => {
  Object.assign(formDataProveedorSalud, data); // Guardar datos del Proveedor de Salud
  
  // Lógica de régimen regulatorio para México
  if (isMX.value) {
    // Normalizar valores antiguos
    if (formDataProveedorSalud.regimenRegulatorio === 'NO_SUJETO_SIRES') {
      formDataProveedorSalud.regimenRegulatorio = 'SIN_REGIMEN';
    }
    
    // Si no se seleccionó régimen explícitamente, asignar SIN_REGIMEN implícitamente
    if (formDataProveedorSalud.regimenRegulatorio === null) {
      formDataProveedorSalud.regimenRegulatorio = 'SIN_REGIMEN';
    }
    
    // Si seleccionó SIN_REGIMEN, validar declaración
    if (formDataProveedorSalud.regimenRegulatorio === 'SIN_REGIMEN') {
      if (!formDataProveedorSalud.declaracionAceptada) {
        toast.open({
          type: "error",
          message: "Debes aceptar la declaración de contexto operativo para continuar",
          position: "bottom-left",
        });
        return;
      }
      // Asignar timestamp y versión de la declaración
      formDataProveedorSalud.declaracionAceptadaAt = new Date().toISOString();
      formDataProveedorSalud.declaracionVersion = "1.0";
    }
    
    // Si seleccionó SIRES_NOM024, validar CLUES
    if (formDataProveedorSalud.regimenRegulatorio === 'SIRES_NOM024') {
      if (!formDataProveedorSalud.clues || formDataProveedorSalud.clues.trim() === '') {
        toast.open({
          type: "error",
          message: "El código CLUES es obligatorio para el régimen SIRES (NOM-024)",
          position: "bottom-left",
        });
        return;
      }
    }
  }
  
  // Continuar con el submit
  submitProveedorSalud();
};

const submitProveedorSalud = async () => {
  isLoading.value = true;
  let idProveedorSalud = null; // Variable para almacenar el ID del proveedor de salud

  try {
    // 1. Crear Proveedor Salud y obtener idProveedorSalud
    const respuesta = await proveedorSaludStore.createProveedor(
      formDataProveedorSalud
    );
    const proveedorSalud = respuesta.data;
    idProveedorSalud = proveedorSalud._id;

    if (!idProveedorSalud) {
      throw respuesta.error; // Lanzar el error para manejarlo en el catch
    }

    // 2. Crear usuario
    const userPayload = {
      ...formDataUser,
      role: "Principal",
      idProveedorSalud,
    };

    console.log('User payload:', userPayload); // Debug
    const resultado = await userStore.registerUser(userPayload);

    // Verificar si el registro fue exitoso
    if (!resultado.success) {
      throw resultado.error; // Lanzar el error para manejarlo en el catch
    }

    // Mostrar mensaje de éxito en el toast (solo si todo fue exitoso)
    toast.open({
      message: "Registro completado con éxito",
      position: "bottom-left",
    });

    currentStep.value = 3;
  } catch (error) {
    console.error('Error al registrar:', error);
    // Mostrar mensaje de error en el toast
    toast.open({
      type: "error",
      message: `Error: ${error.response?.data?.message || error.message || 'Error al registrar'}`,
      position: "bottom-left",
    });

    // Si hay un error y el proveedor de salud ya fue creado, eliminarlo
    if (idProveedorSalud) {
      try {
        await proveedorSaludStore.removeProveedorById(idProveedorSalud);
        console.log("Proveedor de salud eliminado debido a error en el registro del usuario o de la suscripcion");
      } catch (deleteError) {
        console.error("Error al eliminar el proveedor de salud:", deleteError);
      }
    }
  } finally {
    isLoading.value = false;
  }
};

const goBackToStep1 = () => {
  transitioning.value = true;
  currentStep.value = 1;
  showStep2.value = false;
};

const resetTransitionState = () => {
  transitioning.value = false;
};

const perfiles = [
  "Médico único de empresa",
  "Médico independiente que brinda servicios a empresas",
  "Empresa de salud ocupacional",
  "Equipo Médico Interno de la Empresa",
  "Otro",
];

// Función para reposicionar el toggle cuando cambie el layout
const repositionToggle = () => {
  if (passwordContainer.value && toggleButton.value) {
    const container = passwordContainer.value;
    const button = toggleButton.value;
    
    // Obtener la posición del input dentro del contenedor
    const input = container.querySelector('input');
    if (input) {
      const inputRect = input.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Calcular la posición relativa del input dentro del contenedor
      const inputTop = inputRect.top - containerRect.top;
      const inputHeight = inputRect.height;
      
      // Posicionar el botón en el centro del input
      button.style.top = `${inputTop + (inputHeight / 2)}px`;
      button.style.transform = 'translateY(-50%)';
    }
  }
};

// Función para alternar la visibilidad de la contraseña
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
  // Reposicionar después del cambio para asegurar que esté centrado
  nextTick(() => {
    repositionToggle();
  });
};

// Watcher para reposicionar el toggle cuando cambie el valor de la contraseña
watch(() => formDataUser.password, () => {
  nextTick(() => {
    repositionToggle();
  });
});

// Watcher para sincronizar el país del paso 1 con el paso 2
watch(() => formDataUser.country, (newCountry) => {
  if (newCountry) {
    formDataProveedorSalud.pais = newCountry;
  }
}, { immediate: true });

// Watcher para mostrar mensaje cuando se selecciona México
watch(() => formDataProveedorSalud.pais, (newPais) => {
  if (newPais === 'MX' && currentStep.value === 2) {
    showCountryMessage.value = true;
    setTimeout(() => {
      showCountryMessage.value = false;
    }, 5000);
  } else {
    showCountryMessage.value = false;
  }
});

// Computed para validar si se puede enviar el formulario del paso 2
const canSubmitStep2 = computed(() => {
  if (isLoading.value) return false;
  
  // Términos deben estar aceptados
  if (!formDataProveedorSalud.termsAccepted) {
    return false;
  }
  
  // Si es México
  if (isMX.value) {
    // Normalizar valores antiguos
    if (formDataProveedorSalud.regimenRegulatorio === 'NO_SUJETO_SIRES') {
      formDataProveedorSalud.regimenRegulatorio = 'SIN_REGIMEN';
    }
    
    // Si seleccionó SIN_REGIMEN, debe aceptar la declaración
    if (formDataProveedorSalud.regimenRegulatorio === 'SIN_REGIMEN') {
      if (!formDataProveedorSalud.declaracionAceptada) {
        return false;
      }
    }
    
    // Si seleccionó SIRES_NOM024, debe tener CLUES
    if (formDataProveedorSalud.regimenRegulatorio === 'SIRES_NOM024') {
      if (!formDataProveedorSalud.clues || formDataProveedorSalud.clues.trim() === '') {
        return false;
      }
    }
  }
  
  return true;
});

// Computed para porcentaje de progreso
const progresoOnboarding = computed(() => {
  if (currentStep.value === 1) {
    const camposCompletos = [
      formDataUser.username,
      formDataUser.email,
      formDataUser.phone,
      formDataUser.password
    ].filter(v => v && v.trim() !== '').length;
    return Math.round((camposCompletos / 4) * 50);
  } else if (currentStep.value === 2) {
    const camposCompletos = [
      formDataProveedorSalud.nombre,
      formDataProveedorSalud.pais,
      formDataProveedorSalud.perfilProveedorSalud
    ].filter(v => v && v.trim() !== '').length;
    const base = 50;
    const adicional = Math.round((camposCompletos / 3) * 50);
    return base + adicional;
  }
  return 100;
});

// Reposicionar el toggle cuando el componente se monte
onMounted(() => {
  nextTick(() => {
    repositionToggle();
    
    // Observer para detectar cambios en el DOM que puedan afectar el posicionamiento
    if (passwordContainer.value) {
      const observer = new MutationObserver(() => {
        repositionToggle();
      });
      
      // Observar cambios en el contenedor y sus hijos
      observer.observe(passwordContainer.value, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      
      // Limpiar el observer cuando el componente se desmonte
      onUnmounted(() => {
        observer.disconnect();
      });
    }
  });
});
</script>

<template>
  <img
    :src="isHtmlDark ? '/img/logosRamazzini/RamazziniLogoClaroNoBg.png' : '/img/logosRamazzini/RamazziniLogoNoBg.png'"
    alt="Ramazzini Logo"
    class="max-w-[250px] max-h-[250px] object-contain p-2 mx-auto"
  />

  <div
    v-if="currentStep === 3"
    class="flex flex-col items-center justify-center p-6 w-full mx-auto"
  >
    <!-- Mensaje de éxito -->
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold text-emerald-600 mb-4">
        ¡Registro exitoso!
      </h2>
      <p class="text-gray-600 mb-3">
        Te has registrado correctamente en nuestra plataforma.
        <strong
          >Para activar tu cuenta, por favor revisa tu correo
          electrónico</strong
        >
        y haz clic en el enlace de verificación que te hemos enviado.
      </p>
      <p class="text-sm text-gray-600">
        Si no encuentras el correo, revisa tu carpeta de spam o solicita un
        nuevo enlace de verificación.
      </p>
    </div>

    <!-- Botón de redirección al login -->
    <div class="mt-6">
      <button
        @click="router.push({ name: 'login' })"
        class="w-full sm:text-xl md:text-2xl bg-emerald-600 hover:bg-emerald-700 text-white uppercase rounded-lg px-8 py-1 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg hover:text-gray-200"
      >
        Ir al inicio de sesión
      </button>
    </div>
  </div>

  <div v-else class="auth-green-submit-match-login" role="main" aria-label="Formulario de registro">
    <!-- Indicador de pasos -->
    <div class="flex justify-center items-center gap-3 my-3" role="progressbar" :aria-valuenow="currentStep" aria-valuemin="1" aria-valuemax="2" :aria-label="`Paso ${currentStep} de 2`">
      <div class="flex flex-col items-center">
        <div
          :class="[
            'w-8 h-8 flex items-center justify-center rounded-full',
            currentStep === 1
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-300 text-black',
          ]"
        >
          1
        </div>
      </div>

      <div
        class="w-32 h-0.5 bg-gray-300"
        :class="currentStep === 1 ? 'bg-gray-300' : 'bg-emerald-300'"
      ></div>

      <div class="flex flex-col items-center">
        <div
          :class="[
            'w-8 h-8 flex items-center justify-center rounded-full',
            currentStep === 2
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-300 text-black',
          ]"
        >
          2
        </div>
      </div>
    </div>

    <div class="flex justify-center items-center gap-0 mb-4">
      <div class="flex flex-col items-center">
        <span
          :class="[currentStep === 1 ? 'text-emerald-500' : 'text-gray-400']"
          class="text-sm mt-1 font-medium"
          >&nbsp;&nbsp;Crear una cuenta</span
        >
      </div>

      <div class="w-16 h-0.1 bg-gray-300"></div>

      <div class="flex flex-col items-center">
        <span
          :class="[currentStep === 2 ? 'text-emerald-500' : 'text-gray-400']"
          class="text-sm mt-1 font-medium"
          >&nbsp;Registra tu empresa</span
        >
      </div>
    </div>
    
    <!-- Barra de progreso -->
    <div class="mb-6 px-4">
      <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>Progreso</span>
        <span>{{ progresoOnboarding }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          class="bg-emerald-500 h-2 rounded-full transition-all duration-500 ease-out"
          :style="{ width: `${progresoOnboarding}%` }"
        ></div>
      </div>
    </div>

    <!-- Formulario Paso 1 -->
    <Transition name="fade-slide" mode="out-in" @after-leave="showStep2 = true">
      <FormKit
        v-if="currentStep === 1 && !transitioning"
        type="form"
        :actions="false"
        incomplete-message="Por favor, valide que los datos sean correctos*"
        @submit="handleSubmitStep1"
      >
        <div class="grid gap-3">
        <FormKit
          type="text"
          label="¿Cuál es tu nombre?"
          name="username"
          placeholder="Ej. Jorge González"
          validation="required"
          :validation-messages="{
            required: 'Este campo es obligatorio',
          }"
          v-model="formDataUser.username"
          aria-label="Nombre completo"
          autocomplete="name"
        />

        <FormKit
          type="email"
          label="¿Qué correo deseas registrar?"
          name="email"
          placeholder="usuario@tuempresa.com"
          validation="required|emailValidation"
          :validation-messages="{
            required: 'Este campo es obligatorio',
            emailValidation: 'Por favor ingresa un correo válido',
          }"
          v-model="formDataUser.email"
          aria-label="Correo electrónico"
          autocomplete="email"
        />

        <CountryPhoneInput
          label="¿Cuál es tu teléfono?"
          placeholder="Número local"
          v-model="formDataUser.phone"
          @update:country="formDataUser.country = $event"
          validation="required"
        />

        <div class="relative" ref="passwordContainer">
          <FormKit
            :type="showPassword ? 'text' : 'password'"
            label="¿Qué contraseña deseas usar?"
            name="password"
            placeholder="Contraseña de usuario"
            validation="required|passwordValidation"
            :validation-messages="{
              required: 'Este campo es obligatorio',
              passwordValidation: 'Mín. 8 dígitos, 1 mayúscula y 1 número.',
            }"
            v-model="formDataUser.password"
          />
          <button
            type="button"
            @click="togglePasswordVisibility"
            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-md p-2 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center"
            :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            ref="toggleButton"
          >
            <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
          </button>
        </div>
        </div>

        <div class="w-full pr-2 mt-4">
          <FormKit type="submit" aria-label="Continuar al siguiente paso">
            <span class="mr-2">Siguiente</span>
            <i class="fa-solid fa-arrow-right-long"></i>
          </FormKit>
        </div>
      </FormKit>
    </Transition>

    <!-- Formulario Paso 2 -->
    <Transition
      name="fade-slide-right"
      mode="out-in"
      @after-leave="resetTransitionState"
    >
      <FormKit
        v-if="currentStep === 2 && showStep2"
        type="form"
        :actions="false"
        incomplete-message="Por favor, valide los datos*"
        @submit="handleSubmitStep2"
      >
        <div class="grid gap-3">
        <FormKit
          type="text"
          label="¿Cuál es tu nombre o razón social?"
          name="nombre"
          placeholder="Ej. Ramazzini S.A."
          validation="required"
          :validation-messages="{ required: 'Este campo es obligatorio' }"
          v-model="formDataProveedorSalud.nombre"
          aria-label="Nombre o razón social de la empresa"
          autocomplete="organization"
        />
        <CountrySelect
          label="¿En qué país te encuentras?"
          placeholder="Selecciona tu país"
          v-model="formDataProveedorSalud.pais"
          validation="required"
        />
        
        <!-- Mensaje informativo cuando se selecciona México -->
        <Transition name="fade">
          <div 
            v-if="showCountryMessage && isMX" 
            class="p-3 bg-blue-50 border-l-4 border-blue-500 rounded flex items-start gap-2"
          >
            <i class="fas fa-info-circle text-blue-600 mt-0.5"></i>
            <p class="text-sm text-blue-800">
              <strong>México seleccionado:</strong> Por favor, selecciona el régimen regulatorio aplicable a tu operación.
            </p>
          </div>
        </Transition>
        
        <FormKit
          type="select"
          label="¿Cuál describe mejor al proveedor de salud ocupacional que registras?"
          name="perfilProveedorSalud"
          placeholder="Selecciona:"
          :options="perfiles"
          validation="required"
          :validation-messages="{ required: 'Este campo es obligatorio' }"
          v-model="formDataProveedorSalud.perfilProveedorSalud"
        />

        <!-- Selector de Régimen Regulatorio (solo para México) -->
        <Transition name="fade">
          <RegimenRegulatorioSelector
            v-if="isMX"
            v-model="formDataProveedorSalud.regimenRegulatorio"
            @update:declaracion="formDataProveedorSalud.declaracionAceptada = $event"
          />
        </Transition>
        </div>
        
        <FormKit
          type="hidden"
          name="termsAccepted"
          v-model="formDataProveedorSalud.termsAccepted"
          validation="required"
          :validation-messages="{
            required: 'Debes aceptar los términos y condiciones'
          }"
        />

        <FormKit type="hidden" name="acceptedAt" v-model="formDataProveedorSalud.acceptedAt" />
        <FormKit type="hidden" name="termsVersion" v-model="formDataProveedorSalud.termsVersion" />

        <div class="flex items-center justify-center gap-4 mt-4">
          <span class="text-sm" :class="formDataProveedorSalud.termsAccepted ? 'text-emerald-600' : 'text-gray-500'">
            He leído y acepto los <a href="https://get.ramazzini.app/terminos-y-condiciones.html" target="_blank" class="text-sm text-blue-500 hover:underline">Términos y Condiciones</a>
          </span>

          <button 
            type="button"
            @click="formDataProveedorSalud.termsAccepted = !formDataProveedorSalud.termsAccepted" 
            :class="formDataProveedorSalud.termsAccepted ? 'bg-emerald-500' : 'bg-gray-300'"
            class="relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 min-w-[48px] min-h-[24px]"
            :aria-label="formDataProveedorSalud.termsAccepted ? 'Términos aceptados' : 'Aceptar términos y condiciones'"
            :aria-pressed="formDataProveedorSalud.termsAccepted"
          >
            <span 
              class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"
              :class="formDataProveedorSalud.termsAccepted ? 'translate-x-6' : ''">
            </span>
          </button>
        </div>

        <div class="w-full mt-3">
          <FormKit type="submit" :disabled="!canSubmitStep2">
            <span v-if="!isLoading" class="mr-2">Finalizar</span>
            <span v-else class="mr-2">Procesando registro...</span>
            <i v-if="!isLoading" class="fa-solid fa-check"></i>
            <i v-else class="fas fa-spinner fa-spin"></i>
          </FormKit>
        </div>
      </FormKit>
    </Transition>
    <nav
      v-if="currentStep === 1"
      class="text-sm block mx-auto text-center font-light mt-5 text-sky-500"
    >
      ¿Ya tienes cuenta?
      <RouterLink :to="{ name: 'login' }"
        ><strong class="hover:underline">Inicia sesión</strong></RouterLink
      >
    </nav>
    <button
      v-else
      @click="goBackToStep1"
      class="text-sm block mx-auto text-center font-light mt-5 text-sky-500 cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 rounded px-2 py-1"
      aria-label="Regresar al paso anterior"
    >
      Regresar
    </button>
  </div>
</template>

<style scoped>
.fade-slide-left-enter-active,
.fade-slide-left-leave-active,
.fade-slide-right-enter-active,
.fade-slide-right-leave-active {
  transition: all 0.3s ease, filter 0.3s ease;
}

.fade-slide-left-enter-from,
.fade-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-20%);
  filter: blur(10px);
}

.fade-slide-left-enter-to,
.fade-slide-left-leave-from {
  opacity: 1;
  transform: translateX(0);
  filter: blur(0);
}

.fade-slide-right-enter-from,
.fade-slide-right-leave-to {
  opacity: 0;
  transform: translateX(20%);
  filter: blur(10px);
}

.fade-slide-right-enter-to,
.fade-slide-right-leave-from {
  opacity: 1;
  transform: translateX(0);
  filter: blur(0);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

:deep(.formkit-label),
:deep(.country-phone-input-label),
:deep(.country-select-label) {
  margin-bottom: 0.25rem;
}
</style>
