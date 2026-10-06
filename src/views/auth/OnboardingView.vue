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
import { PERFILES_PROVEEDOR_SALUD } from "@/constants/perfilProveedorSalud";

const toast = inject("toast");

const isMX = computed(() => formDataProveedorSalud.pais === 'MX');

const currentStep = ref(1);
const showStep2 = ref(false);
const transitioning = ref(false);
const showPassword = ref(false);
const passwordContainer = ref(null);
const toggleButton = ref(null);
const isLoading = ref(false);
const phoneInput = ref(null);
const step1Error = ref("");
const registrationError = ref("");
const establecimientoPrivado = ref(false);
const CLUES_SERVICIOS_MEDICOS_PRIVADOS = "9998";
const formDataUser = reactive({
  username: "",
  perfilProfesional: "Médico",
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
  // CountryPhoneInput no es un input de FormKit: validarlo manualmente
  if (phoneInput.value && !phoneInput.value.validate()) return;
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
    
    const regimen = formDataProveedorSalud.regimenRegulatorio;
    if (regimen !== 'SIRES_NOM024' && regimen !== 'SIN_REGIMEN') {
      toast.open({
        type: "error",
        message: "Elige cómo operará tu cuenta",
        position: "bottom-left",
      });
      return;
    }

    if (regimen === 'SIN_REGIMEN') {
      if (!formDataProveedorSalud.declaracionAceptada) {
        toast.open({
          type: "error",
          message: "Acepta la declaración para continuar",
          position: "bottom-left",
        });
        return;
      }
      formDataProveedorSalud.declaracionAceptadaAt = new Date().toISOString();
      formDataProveedorSalud.declaracionVersion = "1.0";
    }

    if (regimen === 'SIRES_NOM024') {
      if (!formDataProveedorSalud.clues || formDataProveedorSalud.clues.trim() === '') {
        toast.open({
          type: "error",
          message: "Indica el CLUES para continuar",
          position: "bottom-left",
        });
        return;
      }
    }
  }
  
  // Continuar con el submit
  submitProveedorSalud();
};

function apiErrorMessage(error) {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) {
    const text = message.map(String).join(". ").trim();
    if (text) return text;
  }
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }
  const msg = error?.response?.data?.msg;
  if (typeof msg === "string" && msg.trim()) {
    return msg.trim();
  }
  return "No se pudo completar el registro. Revisa los datos e inténtalo de nuevo.";
}

// Campos del paso 1 tal como los nombra el DTO del backend (class-validator
// antepone el nombre de la propiedad a cada mensaje, p. ej. "phone should not be empty")
const STEP1_FIELD_LABELS = {
  username: "nombre",
  email: "correo",
  phone: "teléfono",
  country: "país del teléfono",
  password: "contraseña",
};

// Devuelve un mensaje en español si el error corresponde a datos del paso 1; si no, null
function step1ErrorMessage(error, message) {
  const status = error?.response?.status;

  if (status === 409 && /ya está registrado/i.test(message)) {
    return `${message} Corrige el correo e inténtalo de nuevo, o inicia sesión si esta cuenta ya es tuya.`;
  }

  if (status !== 400) return null;

  const rawMessages = error?.response?.data?.message;
  if (Array.isArray(rawMessages)) {
    const labels = [
      ...new Set(
        rawMessages
          .map((m) => STEP1_FIELD_LABELS[String(m).split(" ")[0]])
          .filter(Boolean),
      ),
    ];
    if (labels.length) {
      return `Revisa estos datos: ${labels.join(", ")}. Corrígelos e inténtalo de nuevo.`;
    }
  }

  if (/^El username/i.test(message)) {
    return `${message.replace(/^El username/i, "El nombre")}. Corrígelo e inténtalo de nuevo.`;
  }

  if (error?.response?.data?.msg && /mayúscula/i.test(message)) {
    return `La contraseña no cumple los requisitos: ${message} Corrígela e inténtalo de nuevo.`;
  }

  return null;
}

const submitProveedorSalud = async () => {
  isLoading.value = true;
  step1Error.value = "";
  registrationError.value = "";
  let idProveedorSalud = null;
  let onboardingDiscardToken = null;

  try {
    // 1. Crear Proveedor Salud y obtener idProveedorSalud
    const respuesta = await proveedorSaludStore.createProveedor(
      formDataProveedorSalud
    );
    const proveedorSalud = respuesta.data;
    idProveedorSalud = proveedorSalud._id;
    onboardingDiscardToken =
      typeof respuesta.onboardingDiscardToken === "string"
        ? respuesta.onboardingDiscardToken
        : null;

    if (!idProveedorSalud) {
      throw respuesta.error ?? new Error("No se pudo crear el proveedor de salud");
    }

    // 2. Crear usuario
    const userPayload = {
      ...formDataUser,
      role: "Principal",
      idProveedorSalud,
    };

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
    console.error("Error al registrar:", error);
    const message = apiErrorMessage(error);
    const step1Message = step1ErrorMessage(error, message);
    toast.open({
      type: "error",
      message: step1Message ?? message,
      position: "bottom-left",
    });

    if (step1Message) {
      step1Error.value = step1Message;
      goBackToStep1();
      window.setTimeout(() => {
        document
          .getElementById("onboarding-step1-error")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 350);
    } else {
      registrationError.value = `${message} Puedes corregir los datos e intentarlo de nuevo.`;
      nextTick(() => {
        document
          .getElementById("onboarding-registration-error")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }

    if (idProveedorSalud && onboardingDiscardToken) {
      try {
        await proveedorSaludStore.discardEmptyOnboardingProveedor(
          idProveedorSalud,
          onboardingDiscardToken,
        );
      } catch (discardError) {
        console.error(
          "No se descartó el proveedor de onboarding vacío",
          discardError,
        );
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

// Profesión del usuario Principal: define sus permisos clínicos y su tipo de firmante
const perfilesProfesionales = [
  { label: "Médico", value: "Médico" },
  { label: "Enfermero/a", value: "Enfermero/a" },
  { label: "Técnico Evaluador", value: "Técnico Evaluador" },
  { label: "Administrativo (no clínico)", value: "Administrativo" },
];

const perfiles = PERFILES_PROVEEDOR_SALUD;

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

watch(
  () => [formDataUser.username, formDataUser.email, formDataUser.phone, formDataUser.password],
  () => {
    step1Error.value = "";
  },
);

// Watcher para sincronizar el país del paso 1 con el paso 2
watch(() => formDataUser.country, (newCountry) => {
  if (newCountry) {
    formDataProveedorSalud.pais = newCountry;
  }
}, { immediate: true });

watch(establecimientoPrivado, (checked) => {
  if (formDataProveedorSalud.regimenRegulatorio !== "SIRES_NOM024") return;
  if (checked) {
    formDataProveedorSalud.clues = CLUES_SERVICIOS_MEDICOS_PRIVADOS;
  } else if (formDataProveedorSalud.clues === CLUES_SERVICIOS_MEDICOS_PRIVADOS) {
    formDataProveedorSalud.clues = "";
  }
});

watch(() => formDataProveedorSalud.regimenRegulatorio, (regimen) => {
  if (regimen === "SIRES_NOM024") return;
  establecimientoPrivado.value = false;
  if (formDataProveedorSalud.clues === CLUES_SERVICIOS_MEDICOS_PRIVADOS) {
    formDataProveedorSalud.clues = "";
  }
});

function campoLleno(value) {
  return typeof value === "string" && value.trim() !== "";
}

function regimenPaso2() {
  if (formDataProveedorSalud.regimenRegulatorio === "NO_SUJETO_SIRES") {
    return "SIN_REGIMEN";
  }
  return formDataProveedorSalud.regimenRegulatorio;
}

const step2Checks = computed(() => {
  const checks = [
    campoLleno(formDataProveedorSalud.nombre),
    campoLleno(formDataProveedorSalud.pais),
    campoLleno(formDataProveedorSalud.perfilProveedorSalud),
  ];

  if (isMX.value) {
    const regimen = regimenPaso2();
    const elegido = regimen === "SIRES_NOM024" || regimen === "SIN_REGIMEN";
    checks.push(elegido);
    if (regimen === "SIRES_NOM024") {
      checks.push(campoLleno(formDataProveedorSalud.clues));
    }
    if (regimen === "SIN_REGIMEN") {
      checks.push(Boolean(formDataProveedorSalud.declaracionAceptada));
    }
  }

  checks.push(Boolean(formDataProveedorSalud.termsAccepted));
  return checks;
});

const canSubmitStep2 = computed(() => {
  if (isLoading.value) return false;
  return step2Checks.value.every(Boolean);
});

const step2Blocker = computed(() => {
  if (isLoading.value || canSubmitStep2.value) return "";
  if (
    !campoLleno(formDataProveedorSalud.nombre) ||
    !campoLleno(formDataProveedorSalud.pais) ||
    !campoLleno(formDataProveedorSalud.perfilProveedorSalud)
  ) {
    return "";
  }

  if (isMX.value) {
    const regimen = regimenPaso2();
    if (regimen !== "SIRES_NOM024" && regimen !== "SIN_REGIMEN") {
      return "Elige cómo operará tu cuenta";
    }
    if (regimen === "SIRES_NOM024" && !campoLleno(formDataProveedorSalud.clues)) {
      return "Indica el CLUES";
    }
    if (regimen === "SIN_REGIMEN" && !formDataProveedorSalud.declaracionAceptada) {
      return "Acepta la declaración";
    }
  }

  if (!formDataProveedorSalud.termsAccepted) {
    return "Acepta los términos";
  }

  return "";
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
    const checks = step2Checks.value;
    const completos = checks.filter(Boolean).length;
    return 50 + Math.round((completos / checks.length) * 50);
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
  <div
    class="mx-auto w-full"
    :class="currentStep === 2 ? 'max-w-lg mt-6' : 'max-w-sm mt-20'"
  >
  <img
    :src="isHtmlDark ? '/img/logosRamazzini/RamazziniLogoClaroNoBg.png' : '/img/logosRamazzini/RamazziniLogoNoBg.png'"
    alt="Ramazzini Logo"
    class="object-contain p-2 mx-auto"
    :class="currentStep === 2 ? 'max-w-[140px] max-h-[72px]' : 'max-w-[250px] max-h-[250px]'"
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
        <div
          v-if="step1Error"
          id="onboarding-step1-error"
          role="alert"
          class="p-3 bg-red-50 border-l-4 border-red-500 rounded"
        >
          <p class="text-sm text-red-800">{{ step1Error }}</p>
        </div>
        <FormKit
          type="text"
          label="¿Cuál es tu nombre?"
          name="username"
          placeholder="Ej. Jorge González"
          validation="required|length:5"
          :validation-messages="{
            required: 'Este campo es obligatorio',
            length: 'El nombre debe tener al menos 5 caracteres',
          }"
          v-model="formDataUser.username"
          aria-label="Nombre completo"
          autocomplete="name"
        />

        <FormKit
          type="select"
          label="¿Cuál es tu perfil?"
          name="perfilProfesional"
          :options="perfilesProfesionales"
          validation="required"
          :validation-messages="{ required: 'Este campo es obligatorio' }"
          v-model="formDataUser.perfilProfesional"
          aria-label="Perfil profesional"
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
          ref="phoneInput"
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
        <div
          v-if="registrationError"
          id="onboarding-registration-error"
          role="alert"
          class="p-3 bg-red-50 border-l-4 border-red-500 rounded"
        >
          <p class="text-sm text-red-800">{{ registrationError }}</p>
        </div>
        <FormKit
          type="text"
          label="Razón social"
          name="nombre"
          placeholder="Ej. Ramazzini S.A."
          validation="required"
          :validation-messages="{ required: 'Este campo es obligatorio' }"
          v-model="formDataProveedorSalud.nombre"
          aria-label="Razón social de la empresa"
          autocomplete="organization"
        />
        <CountrySelect
          label="País"
          placeholder="Selecciona tu país"
          v-model="formDataProveedorSalud.pais"
          validation="required"
        />

        <FormKit
          type="select"
          label="Tipo de proveedor"
          name="perfilProveedorSalud"
          placeholder="Selecciona:"
          :options="perfiles"
          validation="required"
          :validation-messages="{ required: 'Este campo es obligatorio' }"
          v-model="formDataProveedorSalud.perfilProveedorSalud"
        />

        <RegimenRegulatorioSelector
          v-if="isMX"
          v-model="formDataProveedorSalud.regimenRegulatorio"
          @update:declaracion="formDataProveedorSalud.declaracionAceptada = $event"
        >
          <template #sires-extra>
            <label class="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 bg-white p-3">
              <input
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                v-model="establecimientoPrivado"
              />
              <span class="text-sm text-gray-700">
                Es un establecimiento privado.
                <span class="block text-xs text-gray-500 mt-1">
                  Se registrará el CLUES 9998 - SERVICIOS MEDICOS PRIVADOS.
                </span>
              </span>
            </label>
            <CLUESAutocomplete
              v-if="!establecimientoPrivado"
              v-model="formDataProveedorSalud.clues"
              :required="true"
              :show-private-clues-note="false"
            />
          </template>
        </RegimenRegulatorioSelector>
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
          <button
            type="button"
            @click="formDataProveedorSalud.termsAccepted = !formDataProveedorSalud.termsAccepted"
            :class="formDataProveedorSalud.termsAccepted ? 'bg-emerald-500' : 'bg-gray-300'"
            class="relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 shrink-0"
            :aria-label="formDataProveedorSalud.termsAccepted ? 'Términos aceptados' : 'Aceptar términos y condiciones'"
            :aria-pressed="formDataProveedorSalud.termsAccepted"
          >
            <span
              class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"
              :class="formDataProveedorSalud.termsAccepted ? 'translate-x-6' : ''"
            ></span>
          </button>
          <span
            class="text-sm cursor-pointer"
            :class="formDataProveedorSalud.termsAccepted ? 'text-emerald-600' : 'text-gray-500'"
            @click="formDataProveedorSalud.termsAccepted = !formDataProveedorSalud.termsAccepted"
          >
            He leído y acepto los
            <a
              href="https://get.ramazzini.app/terminos-y-condiciones.html"
              target="_blank"
              class="text-blue-500 hover:underline"
              @click.stop
            >Términos y Condiciones</a>
          </span>
        </div>

        <div class="sticky bottom-0 z-20 mt-4 bg-white/95 pt-2 pb-2">
          <FormKit type="submit" :disabled="!canSubmitStep2">
            <span v-if="!isLoading" class="mr-2">Finalizar</span>
            <span v-else class="mr-2">Procesando registro...</span>
            <i v-if="!isLoading" class="fa-solid fa-check"></i>
            <i v-else class="fas fa-spinner fa-spin"></i>
          </FormKit>
          <p v-if="step2Blocker" class="mt-2 text-center text-xs text-gray-500">
            {{ step2Blocker }}
          </p>
          <button
            type="button"
            class="text-sm block mx-auto text-center font-light mt-3 text-sky-500 cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 rounded px-2 py-1"
            aria-label="Regresar al paso anterior"
            @click="goBackToStep1"
          >
            Regresar
          </button>
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
  </div>
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
