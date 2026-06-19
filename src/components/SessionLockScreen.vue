<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useUserStore } from "@/stores/user";
import AuthAPI from "@/api/AuthAPI";
import axios from "axios";

const emit = defineEmits<{
  (e: 'unlock'): void;
}>();

const props = defineProps<{
  lockedAt?: string;
  timeoutMinutes?: number;
}>();

const userStore = useUserStore();
const password = ref("");
const errorMessage = ref("");
const showPassword = ref(false);
const isSubmitting = ref(false);

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

// Controlar el overflow del body cuando el componente está visible
onMounted(() => {
  document.body.style.overflow = 'hidden';
});

onUnmounted(() => {
  document.body.style.overflow = '';
  if (lockoutIntervalId) {
    clearInterval(lockoutIntervalId);
    lockoutIntervalId = null;
  }
});

const handleUnlock = async () => {
  if (!userStore.user?.email) {
    errorMessage.value = "Error: No se pudo identificar al usuario.";
    return;
  }
  if (lockoutRetrySeconds.value > 0) return;

  isSubmitting.value = true;
  errorMessage.value = "";
  lockoutMessage.value = "";

  try {
    const response = await AuthAPI.login(userStore.user.email, password.value, {
      loginContext: "SESSION_UNLOCK",
      sid: localStorage.getItem("AUTH_SID") ?? undefined,
      inactivityTimeoutMinutes: props.timeoutMinutes,
      lockedAt: props.lockedAt,
      unlockedAt: new Date().toISOString(),
    });
    if (response.status === 200 || response.status === 201) {
      const sid = response.data?.sid;
      if (typeof sid === "string" && sid) {
        try {
          localStorage.setItem("AUTH_SID", sid);
        } catch {
          // ignore
        }
      }
      password.value = "";
      emit('unlock');
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
      if (error.response.data.message === 'Contraseña incorrecta') {
        errorMessage.value = "Contraseña incorrecta. Inténtalo de nuevo.";
      } else {
        errorMessage.value = "Error al validar la contraseña.";
      }
    } else {
      errorMessage.value = "Ocurrió un error inesperado.";
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900 bg-opacity-75 backdrop-blur-sm">
    <div class="bg-white p-8 rounded-2xl shadow-2xl w-11/12 md:w-1/2 lg:w-1/3 max-w-md border border-gray-200">
      <div class="flex flex-col items-center mb-6">
        <div class="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <i class="fas fa-lock text-emerald-600 text-3xl"></i>
        </div>
        <h2 class="text-2xl font-bold text-gray-800">Sesión Bloqueada</h2>
        <p class="text-gray-500 text-center mt-2">
          Hola, <span class="font-semibold text-gray-700">{{ userStore.getUsername }}</span>. Por seguridad, ingresa tu contraseña para continuar.
        </p>
      </div>

      <form @submit.prevent="handleUnlock" class="space-y-4">
        <div>
          <label for="password-lock" class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
          <div class="relative">
            <input
              v-model="password"
              id="password-lock"
              :type="showPassword ? 'text' : 'password'"
              required
              class="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="Tu contraseña"
              :disabled="isSubmitting"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <i :class="showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
            </button>
          </div>
        </div>

        <div v-if="lockoutRetrySeconds > 0 || lockoutMessage" class="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div class="flex items-center space-x-2">
            <i class="fas fa-clock text-amber-500 text-lg"></i>
            <div>
              <p class="text-amber-800 font-medium text-sm">Demasiados intentos</p>
              <p class="text-amber-700 text-sm">{{ lockoutMessage }}</p>
              <p v-if="lockoutCountdownText" class="text-amber-600 text-sm mt-1 font-medium">{{ lockoutCountdownText }}</p>
            </div>
          </div>
        </div>

        <div v-if="errorMessage && lockoutRetrySeconds <= 0" class="p-3 bg-red-50 border border-red-100 rounded-lg">
          <p class="text-red-600 text-sm text-center font-medium">{{ errorMessage }}</p>
        </div>

        <button
          type="submit"
          class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="isSubmitting || lockoutRetrySeconds > 0"
        >
          <i v-if="isSubmitting" class="fas fa-spinner fa-spin mr-2"></i>
          <span>{{ lockoutRetrySeconds > 0 ? 'Espera...' : isSubmitting ? 'Verificando...' : 'Desbloquear' }}</span>
        </button>
      </form>

      <div class="mt-6 text-center">
        <button 
          @click="userStore.logout()" 
          class="text-sm text-gray-500 hover:text-red-600 transition-colors flex items-center justify-center mx-auto space-x-1"
        >
          <i class="fas fa-sign-out-alt"></i>
          <span>Cerrar sesión e ir al login</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* El overflow del body se controla desde el script */
</style>

