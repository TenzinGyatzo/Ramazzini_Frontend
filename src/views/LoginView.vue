<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import AuthAPI from "@/api/AuthAPI";
import axios from "axios";

const router = useRouter();
const email = ref("");
const password = ref("");
const errorMessage = ref("");
const showPassword = ref(false);

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

onUnmounted(() => {
  if (lockoutIntervalId) {
    clearInterval(lockoutIntervalId);
    lockoutIntervalId = null;
  }
});

const handleLogin = async () => {
  if (lockoutRetrySeconds.value > 0) return;
  try {
    const response = await AuthAPI.login(email.value, password.value, {
      loginContext: "PRIMARY_LOGIN",
    });
    const token = response.data.token;
    if (response.status === 200 || response.status === 201) {
      localStorage.setItem("AUTH_TOKEN", token);
      if (response.data.sid) {
        localStorage.setItem("AUTH_SID", response.data.sid);
      }
      router.push("/");
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
    } else {
      console.error("Error inesperado:", error);
      errorMessage.value = "Ocurrió un error inesperado";
    }
  }
};

</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
    <form
      @submit.prevent="handleLogin"
      class="bg-white p-8 rounded-2xl shadow-md w-10/12 md:w-1/2 lg:w-1/3 lg:max-w-lg dark:bg-slate-800 dark:border dark:border-slate-700"
    >
      <h1 class="text-2xl font-semibold mb-4 text-gray-800 dark:text-slate-100">Iniciar Sesión</h1>
      <div class="mb-4">
        <label for="email" class="block text-sm lg:text-base font-medium text-gray-700 dark:text-slate-200"
          >Email</label
        >
        <input
          v-model="email"
          id="email"
          type="text"
          class="w-full mt-1 p-2 border border-gray-300 bg-white text-gray-800 placeholder-gray-500 rounded focus:outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-300"
        />
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
            class="w-full mt-1 p-2 pr-10 border border-gray-300 bg-white text-gray-800 placeholder-gray-500 rounded focus:outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-300"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-2 top-1 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none dark:text-slate-300 dark:hover:text-slate-100"
          >
            <span v-if="showPassword"><i class="fa-regular fa-eye-slash"></i></span>
            <span v-else><i class="fa-regular fa-eye"></i></span>
          </button>
        </div>
      </div>
      <button
        type="submit"
        :disabled="lockoutRetrySeconds > 0"
        class="w-full sm:text-xl md:text-2xl bg-emerald-600 hover:bg-emerald-700 text-white uppercase rounded-lg px-8 py-1 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg hover:text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {{ lockoutRetrySeconds > 0 ? 'Espera...' : 'Entrar' }}
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

    <div class="grid grid-cols-2 gap-6">
      <button @click="router.push({ name: 'onboarding' })"
          class="mt-4 font-light text-sky-500 hover:underline text-sm dark:text-sky-400">
          Crear una cuenta
      </button>
  
      <button @click="router.push({ name: 'forgot-password' })"
          class="mt-4 font-light text-sky-500 hover:underline text-sm dark:text-sky-400">
          Olvidé mi contraseña
      </button>
    </div>


  </div>

</template>
