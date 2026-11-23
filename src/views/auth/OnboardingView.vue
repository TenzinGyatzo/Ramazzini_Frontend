<script setup>
import { ref, reactive, inject, nextTick, watch, onMounted, onUnmounted, computed } from "vue";
import { useProveedorSaludStore } from "@/stores/proveedorSalud";
import { useUserStore } from "@/stores/user";
import { useRouter } from "vue-router";
import CountryPhoneInput from "@/components/CountryPhoneInput.vue";
import CountrySelect from "@/components/CountrySelect.vue";
import CLUESAutocomplete from "@/components/selectors/CLUESAutocomplete.vue";
import OpcionesSegmentadas from "@/components/steps/captura/OpcionesSegmentadas.vue";
import EtiquetaOnboarding from "@/components/onboarding/EtiquetaOnboarding.vue";
import PalomitaCompleto from "@/components/PalomitaCompleto.vue";
import { normalizarCorreo } from "@/helpers/normalizarCampo";
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
// Punto (60): «¿Tu establecimiento tiene CLUES?». La mayoría son privados sin CLUES: «No»
// elegido de entrada registra la 9998; con «Sí» aparece el buscador. Lo buscado se recuerda
// si se cambia de respuesta.
const tieneClues = ref("No");
const OPCIONES_TIENE_CLUES = [
  { valor: "No", etiqueta: "No, es privado" },
  { valor: "Si", etiqueta: "Sí" },
];
let cluesBuscada = "";
const contenedorClues = ref(null);
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
  
  // Punto (60): no se elige régimen. En México la cuenta opera con cumplimiento normativo y
  // pide la CLUES (o establecimiento privado, 9998); fuera de México, sin régimen.
  formDataProveedorSalud.regimenRegulatorio = isMX.value ? "SIRES_NOM024" : "SIN_REGIMEN";
  formDataProveedorSalud.declaracionAceptada = false;
  formDataProveedorSalud.declaracionAceptadaAt = null;
  if (isMX.value && !campoLleno(formDataProveedorSalud.clues)) {
    toast.open({
      type: "error",
      message: "Busca y elige la CLUES de tu establecimiento",
      position: "bottom-left",
    });
    return;
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

function aplicarTieneClues() {
  if (!isMX.value) {
    // Fuera de México no hay CLUES
    formDataProveedorSalud.clues = "";
    return;
  }
  formDataProveedorSalud.clues = tieneClues.value === "Si" ? cluesBuscada : CLUES_SERVICIOS_MEDICOS_PRIVADOS;
}
watch([tieneClues, isMX], aplicarTieneClues, { immediate: true });
// Lo que se busque se recuerda para cuando se regrese a «Sí»
watch(
  () => formDataProveedorSalud.clues,
  (clues) => {
    if (tieneClues.value === "Si" && isMX.value) cluesBuscada = clues || "";
  },
);
// El cursor va al buscador cuando el usuario elige «Sí», al terminar de aparecer
let enfocarBuscador = false;
function alElegirTieneClues(valor) {
  enfocarBuscador = valor === "Si";
}
function alAparecerClues() {
  if (!enfocarBuscador || tieneClues.value !== "Si") return;
  enfocarBuscador = false;
  contenedorClues.value?.querySelector("input")?.focus();
}

function campoLleno(value) {
  return typeof value === "string" && value.trim() !== "";
}

const step2Checks = computed(() => {
  const checks = [
    campoLleno(formDataProveedorSalud.nombre),
    campoLleno(formDataProveedorSalud.pais),
    campoLleno(formDataProveedorSalud.perfilProveedorSalud),
  ];

  if (isMX.value) {
    checks.push(campoLleno(formDataProveedorSalud.clues));
  }

  checks.push(Boolean(formDataProveedorSalud.termsAccepted));
  return checks;
});

const canSubmitStep2 = computed(() => {
  if (isLoading.value) return false;
  return step2Checks.value.every(Boolean);
});


// Punto (60): qué dato está completo (válido, no solo lleno), con las mismas reglas que los
// campos: palomita junto a la etiqueta, «Falta: …» bajo el botón y el conteo de la barra.
const RE_CORREO = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
const RE_CONTRASENA = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
const RE_TELEFONO = /^\+?[1-9]\d{3,14}$/;
const completo = computed(() => ({
  username: (formDataUser.username || "").trim().length >= 5,
  perfilProfesional: campoLleno(formDataUser.perfilProfesional),
  email: RE_CORREO.test(normalizarCorreo(formDataUser.email || "")),
  phone: RE_TELEFONO.test(formDataUser.phone || ""),
  password: RE_CONTRASENA.test(formDataUser.password || ""),
  nombre: campoLleno(formDataProveedorSalud.nombre),
  pais: campoLleno(formDataProveedorSalud.pais),
  perfilProveedorSalud: campoLleno(formDataProveedorSalud.perfilProveedorSalud),
  clues: campoLleno(formDataProveedorSalud.clues),
  termsAccepted: Boolean(formDataProveedorSalud.termsAccepted),
}));

/** Los datos de cada paso, en el orden de la pantalla (cómo se nombran en «Falta: …»). */
const datosDelPaso = computed(() =>
  currentStep.value === 1
    ? [
        { clave: "username", nombre: "nombre" },
        { clave: "perfilProfesional", nombre: "perfil" },
        { clave: "email", nombre: "correo" },
        { clave: "phone", nombre: "teléfono" },
        { clave: "password", nombre: "contraseña" },
      ]
    : [
        { clave: "nombre", nombre: "razón social" },
        { clave: "pais", nombre: "país" },
        { clave: "perfilProveedorSalud", nombre: "tipo de proveedor" },
        ...(isMX.value ? [{ clave: "clues", nombre: "CLUES" }] : []),
        { clave: "termsAccepted", nombre: "aceptar los términos" },
      ],
);
const faltantes = computed(() => datosDelPaso.value.filter((d) => !completo.value[d.clave]));
const completosDelPaso = computed(() => datosDelPaso.value.length - faltantes.value.length);

// La barra: mitad por paso, según los datos completos
const progresoOnboarding = computed(() => {
  const avance = completosDelPaso.value / datosDelPaso.value.length;
  return Math.round((currentStep.value === 1 ? 0 : 50) + avance * 50);
});

/** «Falta: …»: lleva al campo y pone el cursor en él. */
const SELECTOR_CAMPO = {
  username: 'input[name="username"]',
  perfilProfesional: 'select[name="perfilProfesional"]',
  email: 'input[name="email"]',
  phone: ".country-phone-input input",
  password: 'input[name="password"]',
  nombre: 'input[name="nombre"]',
  pais: ".country-select select",
  perfilProveedorSalud: 'select[name="perfilProveedorSalud"]',
  clues: '[data-campo="clues"] input:not([type="radio"])',
  termsAccepted: '[data-campo="termsAccepted"]',
};
function irACampo(clave) {
  const el = document.querySelector(SELECTOR_CAMPO[clave]);
  if (!el) return;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.focus({ preventScroll: true });
}

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
    :src="isHtmlDark ? '/img/logosRamazzini/RamazziniLogoClaroNoBg-1000.webp' : '/img/logosRamazzini/RamazziniLogoNoBg-1000.webp'"
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
        <span>Paso {{ currentStep }} de 2</span>
        <span>{{ completosDelPaso }} de {{ datosDelPaso.length }} datos</span>
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
          name="username" normalizar="texto"
          placeholder="Ej. Jorge González"
          validation="required|length:5"
          :validation-messages="{
            required: 'Este campo es obligatorio',
            length: 'El nombre debe tener al menos 5 caracteres',
          }"
          v-model="formDataUser.username"
          aria-label="Nombre completo"
          autocomplete="name"
        >
          <template #label="ctx"><EtiquetaOnboarding :para="ctx.id" texto="¿Cuál es tu nombre?" :completo="completo.username" /></template>
        </FormKit>

        <FormKit
          type="select"
          label="¿Cuál es tu perfil?"
          name="perfilProfesional"
          :options="perfilesProfesionales"
          validation="required"
          :validation-messages="{ required: 'Este campo es obligatorio' }"
          v-model="formDataUser.perfilProfesional"
          aria-label="Perfil profesional"
        >
          <template #label="ctx"><EtiquetaOnboarding :para="ctx.id" texto="¿Cuál es tu perfil?" :completo="completo.perfilProfesional" /></template>
        </FormKit>

        <FormKit
          type="email"
          label="¿Qué correo deseas registrar?"
          name="email" normalizar="correo"
          placeholder="usuario@tuempresa.com"
          validation="required|emailValidation"
          :validation-messages="{
            required: 'Este campo es obligatorio',
            emailValidation: 'Por favor ingresa un correo válido',
          }"
          v-model="formDataUser.email"
          aria-label="Correo electrónico"
          autocomplete="email"
        >
          <template #label="ctx"><EtiquetaOnboarding :para="ctx.id" texto="¿Qué correo deseas registrar?" :completo="completo.email" /></template>
        </FormKit>

        <CountryPhoneInput
          ref="phoneInput"
          label="¿Cuál es tu teléfono?"
          placeholder="Número local"
          v-model="formDataUser.phone"
          @update:country="formDataUser.country = $event"
          validation="required"
          :completo="completo.phone"
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
              passwordValidation: 'Mín. 8 caracteres, 1 mayúscula y 1 número, sin espacios.',
            }"
            v-model="formDataUser.password"
          >
          <template #label="ctx"><EtiquetaOnboarding :para="ctx.id" texto="¿Qué contraseña deseas usar?" :completo="completo.password" /></template>
        </FormKit>
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
          <p v-if="faltantes.length && !isLoading" class="mt-2 text-center text-xs text-gray-500" data-faltan>
            Falta:
            <template v-for="(dato, i) in faltantes" :key="dato.clave">
              <span v-if="i > 0" aria-hidden="true"> · </span>
              <button
                type="button"
                class="underline decoration-dotted underline-offset-2 hover:text-gray-700"
                @click="irACampo(dato.clave)"
              >{{ dato.nombre }}</button>
            </template>
          </p>
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
          name="nombre" normalizar="texto"
          placeholder="Ej. Ramazzini S.A."
          validation="required"
          :validation-messages="{ required: 'Este campo es obligatorio' }"
          v-model="formDataProveedorSalud.nombre"
          aria-label="Razón social de la empresa"
          autocomplete="organization"
        >
          <template #label="ctx"><EtiquetaOnboarding :para="ctx.id" texto="Razón social" :completo="completo.nombre" /></template>
        </FormKit>
        <CountrySelect
          label="País"
          placeholder="Selecciona tu país"
          v-model="formDataProveedorSalud.pais"
          validation="required"
          :completo="completo.pais"
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
        >
          <template #label="ctx"><EtiquetaOnboarding :para="ctx.id" texto="Tipo de proveedor" :completo="completo.perfilProveedorSalud" /></template>
        </FormKit>

        <!-- Punto (60): en México la cuenta opera con cumplimiento normativo; solo se pide la CLUES.
             Aparece y desaparece desplegándose (al cambiar de país o de respuesta). -->
        <Transition name="desplegar">
          <div v-if="isMX" class="desplegar" data-campo="clues">
            <div class="desplegar-interior">
              <p class="flex items-center justify-between gap-2 font-medium text-lg text-gray-700 mb-1">
                <span>¿Tu establecimiento tiene CLUES?<span class="text-red-500">*</span></span>
                <PalomitaCompleto :visible="completo.clues" />
              </p>
              <OpcionesSegmentadas
                v-model="tieneClues"
                @update:model-value="alElegirTieneClues"
                name="tieneClues"
                etiqueta="¿Tu establecimiento tiene CLUES?"
                :opciones="OPCIONES_TIENE_CLUES"
              />
              <Transition name="desplegar" mode="out-in" @after-enter="alAparecerClues">
                <div v-if="tieneClues === 'No'" key="privado" class="desplegar">
                  <div class="desplegar-interior">
                    <p class="pt-1.5 text-xs text-gray-500">
                      Se registrará la CLUES 9998 – Servicios médicos privados.
                    </p>
                  </div>
                </div>
                <div v-else key="buscador" class="desplegar">
                  <div ref="contenedorClues" class="desplegar-interior pt-3">
                    <CLUESAutocomplete
                      v-model="formDataProveedorSalud.clues"
                      label="CLUES del establecimiento"
                      :required="true"
                      :show-private-clues-note="false"
                    />
                  </div>
                </div>
              </Transition>
            </div>
          </div>
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
          <button
            type="button"
            data-campo="termsAccepted"
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
          <p v-if="faltantes.length && !isLoading" class="mt-2 text-center text-xs text-gray-500" data-faltan>
            Falta:
            <template v-for="(dato, i) in faltantes" :key="dato.clave">
              <span v-if="i > 0" aria-hidden="true"> · </span>
              <button
                type="button"
                class="underline decoration-dotted underline-offset-2 hover:text-gray-700"
                @click="irACampo(dato.clave)"
              >{{ dato.nombre }}</button>
            </template>
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

/* Punto (60): la CLUES se despliega y se recoge (alto, opacidad y un leve desplazamiento) */
.desplegar {
  display: grid;
  grid-template-rows: 1fr;
}
.desplegar-interior {
  min-height: 0;
}
.desplegar-enter-active,
.desplegar-leave-active {
  transition: grid-template-rows 240ms ease, opacity 200ms ease, transform 240ms ease;
}
/* Solo mientras se anima: el buscador abre su lista de resultados hacia abajo */
.desplegar-enter-active > .desplegar-interior,
.desplegar-leave-active > .desplegar-interior {
  overflow: hidden;
}
.desplegar-enter-from,
.desplegar-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-4px);
}
@media (prefers-reduced-motion: reduce) {
  .desplegar-enter-active,
  .desplegar-leave-active {
    transition: none;
  }
}
</style>
