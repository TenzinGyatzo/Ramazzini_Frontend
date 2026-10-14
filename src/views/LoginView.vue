<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import AuthAPI from "@/api/AuthAPI";
import axios from "axios";
import { useUserStore } from "@/stores/user";
import { resetSessionScopedState } from "@/stores/resetSessionState";
import { MOTIVO_SESION_VENCIDA, rutaDeRegresoSegura } from "@/helpers/rutaDeRegreso";

const router = useRouter();
const route = useRoute();
// Pantalla que se intentaba abrir (solo rutas internas); al entrar se regresa a ella
const rutaDeRegreso = computed(() => rutaDeRegresoSegura(route.query.redirect));
const sesionVencida = computed(() => route.query.motivo === MOTIVO_SESION_VENCIDA);
const userStore = useUserStore();
const email = ref("");
const password = ref("");
const errorMessage = ref("");
const showPassword = ref(false);
const isLoggingIn = ref(false);
const emailRef = ref<HTMLInputElement | null>(null);
// Campos vacíos: se marcan sin consultar al servidor
const faltaEmail = ref(false);
const faltaPassword = ref(false);
const mayusculasActivas = ref(false);

const MENSAJE_SIN_CONEXION =
  "No se pudo conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.";

function actualizarMayusculas(evento: KeyboardEvent) {
  if (typeof evento.getModifierState === "function") {
    mayusculasActivas.value = evento.getModifierState("CapsLock");
  }
}

onMounted(() => emailRef.value?.focus());

const lockoutRetrySeconds = ref(0);
const lockoutMessage = ref("");
let lockoutIntervalId: ReturnType<typeof setInterval> | null = null;

const lockoutCountdownText = computed(() => {
  const s = lockoutRetrySeconds.value;
  if (s <= 0) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `Podrás intentar de nuevo en ${m}:${sec.toString().padStart(2, "0")}`;
});

function clearLockoutState() {
  if (lockoutIntervalId) {
    clearInterval(lockoutIntervalId);
    lockoutIntervalId = null;
  }
  lockoutRetrySeconds.value = 0;
  lockoutMessage.value = "";
}

function startLockoutCountdown(retryAfterSeconds: number) {
  lockoutRetrySeconds.value = retryAfterSeconds;
  lockoutMessage.value = "Demasiados intentos fallidos. Debes esperar antes de volver a intentar.";
  if (lockoutIntervalId) clearInterval(lockoutIntervalId);
  lockoutIntervalId = setInterval(() => {
    lockoutRetrySeconds.value -= 1;
    if (lockoutRetrySeconds.value <= 0 && lockoutIntervalId) {
      clearInterval(lockoutIntervalId);
      lockoutIntervalId = null;
      lockoutMessage.value = "";
    }
  }, 1000);
}

// El bloqueo es por email: al cambiar el correo se quita el feedback y se habilita el botón
watch(email, () => {
  if (lockoutRetrySeconds.value > 0 || lockoutMessage.value) {
    clearLockoutState();
  }
});

// Al corregir el correo o la contraseña, el error anterior deja de aplicar
watch([email, password], ([nuevoEmail, nuevoPassword]) => {
  errorMessage.value = "";
  if (nuevoEmail.trim()) faltaEmail.value = false;
  if (nuevoPassword) faltaPassword.value = false;
});

onUnmounted(() => {
  if (lockoutIntervalId) {
    clearInterval(lockoutIntervalId);
    lockoutIntervalId = null;
  }
});

const handleLogin = async () => {
  if (lockoutRetrySeconds.value > 0 || isLoggingIn.value) return;
  // El autocompletado del celular suele dejar un espacio al final del correo
  const correo = email.value.trim();
  faltaEmail.value = !correo;
  faltaPassword.value = !password.value;
  if (faltaEmail.value || faltaPassword.value) return;
  if (correo !== email.value) email.value = correo;

  isLoggingIn.value = true;
  try {
    const response = await AuthAPI.login(correo, password.value, {
      loginContext: "PRIMARY_LOGIN",
    });
    if (response.status === 200 || response.status === 201) {
      resetSessionScopedState();
      userStore.clearUser();
      const sid = response.data?.sid;
      if (typeof sid === "string" && sid) {
        try {
          localStorage.setItem("AUTH_SID", sid);
        } catch {
          // ignore
        }
      }
      await userStore.fetchUser(true);
      router.push(rutaDeRegreso.value ?? "/");
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 429) {
        errorMessage.value = "";
        const msg = error.response.data?.message;
        const retry = error.response.data?.retryAfterSeconds;
        lockoutMessage.value = msg ?? "Demasiados intentos fallidos. Debes esperar antes de volver a intentar.";
        if (typeof retry === "number" && retry > 0) {
          startLockoutCountdown(retry);
        } else {
          lockoutRetrySeconds.value = 0;
        }
        return;
      }
      console.log(error.response.data.message);
      if (error.response.data.message === 'El email ingresado no es válido') {
        errorMessage.value = "El email ingresado no es válido";
      } else if(error.response.data.message === 'El usuario no existe') {
        errorMessage.value = "El usuario no existe";
      } else if (error.response.data.message === 'Tu cuenta no ha sido confirmada aún, revisa tu email') {
        errorMessage.value = "Tu cuenta no ha sido confirmada aún, revisa tu email"
      } else if (error.response.data.message === 'Tu cuenta ha sido suspendida. Contacta al administrador.') {
        errorMessage.value = "Tu cuenta ha sido suspendida temporalmente. Contacta al administrador para reactivarla.";
      } else if (error.response.data.message === 'Contraseña incorrecta') {
        errorMessage.value = "Contraseña incorrecta";
      } else {
        errorMessage.value = "Credenciales incorrectas";
      }
    } else if (axios.isAxiosError(error)) {
      // Sin respuesta: servidor caído o sin internet
      errorMessage.value = MENSAJE_SIN_CONEXION;
    } else {
      console.error("Error inesperado:", error);
      errorMessage.value = "Ocurrió un error inesperado";
    }
  } finally {
    isLoggingIn.value = false;
  }
};

</script>

<template>
  <div class="login-page flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
    <form
      novalidate
      @submit.prevent="handleLogin"
      class="login-card bg-white p-8 rounded-2xl shadow-md w-10/12 md:w-1/2 lg:w-1/3 lg:max-w-lg dark:bg-slate-800 dark:border dark:border-slate-700"
    >
      <h1 class="text-2xl font-semibold mb-4 text-gray-800 dark:text-slate-100">Iniciar Sesión</h1>
      <p
        v-if="sesionVencida"
        class="mb-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200"
      >
        <i class="fa-solid fa-circle-info mt-0.5" aria-hidden="true"></i>
        <span>Tu sesión terminó. Inicia sesión para continuar donde estabas.</span>
      </p>
      <div class="mb-4">
        <label for="email" class="block text-sm lg:text-base font-medium text-gray-700 dark:text-slate-200"
          >Email</label
        >
        <input
          ref="emailRef"
          v-model="email"
          id="email"
          type="email"
          inputmode="email"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          :aria-invalid="faltaEmail"
          :aria-describedby="faltaEmail ? 'email-falta' : undefined"
          class="w-full mt-1 p-2 border bg-white text-gray-800 placeholder-gray-500 rounded focus:outline-none focus:border-emerald-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-300"
          :class="faltaEmail ? 'border-red-400 dark:border-red-400' : 'border-gray-300 dark:border-slate-600'"
        />
        <p v-if="faltaEmail" id="email-falta" class="mt-1 text-sm text-red-600 dark:text-red-400">Escribe tu correo</p>
      </div>
      <div class="mb-4 relative">
        <label for="password" class="block text-sm lg:text-base font-medium text-gray-700 dark:text-slate-200"
          >Contraseña</label
        >
        <div class="relative">
          <input
            v-model="password"
            id="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            :aria-invalid="faltaPassword"
            :aria-describedby="faltaPassword ? 'password-falta' : (mayusculasActivas ? 'password-mayusculas' : undefined)"
            class="w-full mt-1 p-2 pr-10 border bg-white text-gray-800 placeholder-gray-500 rounded focus:outline-none focus:border-emerald-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-300"
            :class="faltaPassword ? 'border-red-400 dark:border-red-400' : 'border-gray-300 dark:border-slate-600'"
            @keydown="actualizarMayusculas"
            @keyup="actualizarMayusculas"
            @blur="mayusculasActivas = false"
          />
          <button
            type="button"
            :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            :title="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-2 top-1 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none dark:text-slate-300 dark:hover:text-slate-100"
          >
            <span v-if="showPassword"><i class="fa-regular fa-eye-slash"></i></span>
            <span v-else><i class="fa-regular fa-eye"></i></span>
          </button>
        </div>
        <p v-if="faltaPassword" id="password-falta" class="mt-1 text-sm text-red-600 dark:text-red-400">Escribe tu contraseña</p>
        <p
          v-else-if="mayusculasActivas"
          id="password-mayusculas"
          class="mt-1 flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400"
        >
          <i class="fa-solid fa-arrow-up-from-bracket text-xs" aria-hidden="true"></i>
          Las mayúsculas están activadas
        </p>
      </div>
      <button
        type="submit"
        :disabled="lockoutRetrySeconds > 0 || isLoggingIn"
        class="w-full sm:text-xl md:text-2xl bg-emerald-600 hover:bg-emerald-700 text-white uppercase rounded-lg px-8 py-1 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg hover:text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {{ lockoutRetrySeconds > 0 ? 'Espera...' : (isLoggingIn ? 'Entrando...' : 'Entrar') }}
      </button>
      <!-- Mensaje de bloqueo por demasiados intentos (429) -->
      <div v-if="lockoutRetrySeconds > 0 || lockoutMessage" 
           class="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div class="flex items-center space-x-2">
          <i class="fas fa-clock text-amber-500 text-lg"></i>
          <div>
            <p class="text-amber-800 font-medium text-sm">Demasiados intentos</p>
            <p class="text-amber-700 text-sm">{{ lockoutMessage }}</p>
            <p v-if="lockoutCountdownText" class="text-amber-600 text-sm mt-1 font-medium">{{ lockoutCountdownText }}</p>
          </div>
        </div>
      </div>
      <!-- Mensaje de error general -->
      <div v-if="errorMessage && errorMessage !== 'Tu cuenta ha sido suspendida temporalmente. Contacta al administrador para reactivarla.' && lockoutRetrySeconds <= 0" 
           class="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-red-600 text-sm">{{ errorMessage }}</p>
      </div>
      
      <!-- Mensaje específico para cuenta suspendida -->
      <div v-if="errorMessage === 'Tu cuenta ha sido suspendida temporalmente. Contacta al administrador para reactivarla.'" 
           class="mt-2 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div class="flex items-center space-x-2">
          <i class="fas fa-exclamation-triangle text-orange-500 text-lg"></i>
          <div>
            <p class="text-orange-700 font-medium text-sm">Cuenta Suspendida</p>
            <p class="text-orange-600 text-sm">{{ errorMessage }}</p>
          </div>
        </div>
      </div>
    </form> 

    <div class="login-links grid grid-cols-2 gap-6">
      <RouterLink :to="{ name: 'onboarding' }"
          class="mt-4 font-light text-sky-500 hover:underline text-sm dark:text-sky-400">
          Crear una cuenta
      </RouterLink>
  
      <RouterLink :to="{ name: 'forgot-password' }"
          class="mt-4 font-light text-sky-500 hover:underline text-sm dark:text-sky-400">
          Olvidé mi contraseña
      </RouterLink>
    </div>


  </div>

</template>

<style scoped>
@media (max-width: 479px) {
  .login-card {
    padding: 1.5rem 1rem;
  }

  .login-links {
    width: 83.333%;
    margin-top: 1.25rem;
    grid-template-columns: 1fr;
    gap: 0.85rem;
    text-align: center;
  }

  .login-links a {
    margin-top: 0;
  }

  .login-links a:first-child {
    order: 2;
  }

  .login-links a:last-child {
    order: 1;
  }
}
</style>
