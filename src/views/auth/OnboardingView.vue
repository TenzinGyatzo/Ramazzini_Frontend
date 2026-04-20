<script setup>
import { ref, reactive, inject, nextTick, watch, onMounted, onUnmounted } from "vue";
import { useProveedorSaludStore } from "@/stores/proveedorSalud";
import { useUserStore } from "@/stores/user";
import { useRouter } from "vue-router";
import CountryPhoneInput from "@/components/CountryPhoneInput.vue";
import CountrySelect from "@/components/CountrySelect.vue";
import { useHtmlDarkMode } from "@/composables/useHtmlDarkMode";

const toast = inject("toast");

const currentStep = ref(1);
const showStep2 = ref(false);
const transitioning = ref(false);
const showPassword = ref(false);
const passwordContainer = ref(null);
const toggleButton = ref(null);
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
      message: `Error: ${error.response.data.message}`,
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

  <div v-else class="auth-green-submit-match-login">
    <!-- Indicador de pasos -->
    <div class="flex justify-center items-center gap-3 my-3">
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

    <div class="flex justify-center items-center gap-0 mb-6">
      <div class="flex flex-col items-center">
        <span
          :class="[currentStep === 1 ? 'text-emerald-500' : 'text-gray-400']"
          class="text-sm mt-1"
          >&nbsp;&nbsp;Crear una cuenta</span
        >
      </div>

      <div class="w-16 h-0.1 bg-gray-300"></div>

      <div class="flex flex-col items-center">
        <span
          :class="[currentStep === 2 ? 'text-emerald-500' : 'text-gray-400']"
          class="text-sm mt-1"
          >&nbsp;Registra tu empresa</span
        >
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
        />

        <CountryPhoneInput
          label="¿Cuál es tu teléfono?"
          placeholder="Número local"
          v-model="formDataUser.phone"
          @update:country="formDataUser.country = $event"
          validation="required"
        />

        <div class="relative mt-4" ref="passwordContainer">
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
            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1 z-10"
            :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            ref="toggleButton"
          >
            <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
          </button>
        </div>

        <div class="w-full pr-2 mt-4">
          <FormKit type="submit">
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
        <FormKit
          type="text"
          label="¿Cuál es tu nombre o razón social?"
          name="nombre"
          placeholder="Ej. Ramazzini S.A."
          validation="required"
          :validation-messages="{ required: 'Este campo es obligatorio' }"
          v-model="formDataProveedorSalud.nombre"
        />
        <CountrySelect
          label="¿En qué país te encuentras?"
          placeholder="Selecciona tu país"
          v-model="formDataProveedorSalud.pais"
          validation="required"
        />
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
            class="relative w-12 h-6 rounded-full transition-colors">
            <span 
              class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"
              :class="formDataProveedorSalud.termsAccepted ? 'translate-x-6' : ''">
            </span>
          </button>
        </div>

        <div class="w-full mt-3">
          <FormKit type="submit" :disabled="!formDataProveedorSalud.termsAccepted">
            <span class="mr-2">Finalizar</span>
            <i class="fa-solid fa-check"></i>
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
    <p
      v-else
      @click="goBackToStep1"
      class="text-sm block mx-auto text-center font-light mt-5 text-sky-500 cursor-pointer hover:underline"
    >
      Regresar
    </p>
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
</style>
