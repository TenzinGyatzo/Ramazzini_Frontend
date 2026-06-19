import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useSessionLockStore } from '@/stores/sessionLock';

export function useSessionTimeout() {
  const route = useRoute();
  const userStore = useUserStore();
  const proveedorSaludStore = useProveedorSaludStore();
  const sessionLockStore = useSessionLockStore();
  
  // Estado de bloqueo
  const isLocked = ref(false);
  const lockedAt = ref<string | null>(null);
  
  const TIMEOUT_MS =
    Number(import.meta.env.VITE_SIRES_SESSION_INACTIVITY_MS) || 900_000;
  
  let timeoutId: number | null = null;

  // Rutas que no deben disparar el bloqueo ni el timer
  const publicRoutes = ['login', 'auth', 'onboarding', 'confirm-account', 'forgot-password', 'new-password'];

  const resetTimer = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // No iniciar el timer si:
    // - Está bloqueado
    // - Estamos en una ruta pública
    // - No hay usuario
    // - El timeout NO está habilitado por la policy (solo SIRES_NOM024)
    if (
      isLocked.value || 
      publicRoutes.includes(route.name as string) || 
      !userStore.user ||
      !proveedorSaludStore.sessionTimeoutEnabled
    ) {
      return;
    }

    timeoutId = window.setTimeout(() => {
      lockSession();
    }, TIMEOUT_MS);
  };

  const lockSession = () => {
    // Solo bloquear si el timeout está habilitado por la policy
    if (
      !publicRoutes.includes(route.name as string) && 
      userStore.user &&
      proveedorSaludStore.sessionTimeoutEnabled
    ) {
      isLocked.value = true;
      lockedAt.value = new Date().toISOString();
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
  };

  const unlockSession = () => {
    isLocked.value = false;
    lockedAt.value = null;
    resetTimer();
  };

  // Eventos que resetean el timer
  const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

  const handleUserActivity = () => {
    // Solo procesar actividad si el timeout está habilitado
    if (proveedorSaludStore.sessionTimeoutEnabled) {
      resetTimer();
    }
  };

  onMounted(() => {
    // Solo registrar listeners si el timeout está habilitado por la policy
    if (proveedorSaludStore.sessionTimeoutEnabled) {
      events.forEach(event => {
        window.addEventListener(event, handleUserActivity);
      });
      
      // Iniciar timer si ya hay un usuario y no estamos en ruta pública
      resetTimer();
    }
  });

  onUnmounted(() => {
    // Solo remover listeners si fueron registrados
    if (proveedorSaludStore.sessionTimeoutEnabled) {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });

  // Vigilar cambios de ruta para resetear el timer o detenerlo
  watch(() => route.path, () => {
    if (proveedorSaludStore.sessionTimeoutEnabled) {
      resetTimer();
    }
  });

  // Vigilar cuando el usuario inicia sesión para empezar el timer
  watch(() => userStore.user, (newUser) => {
    if (newUser && proveedorSaludStore.sessionTimeoutEnabled) {
      resetTimer();
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      isLocked.value = false;
      lockedAt.value = null;
    }
  });

  // Vigilar cambios en sessionTimeoutEnabled para activar/desactivar el timeout
  watch(() => proveedorSaludStore.sessionTimeoutEnabled, (enabled) => {
    if (enabled) {
      // Si se habilita, registrar listeners y iniciar timer
      events.forEach(event => {
        window.addEventListener(event, handleUserActivity);
      });
      resetTimer();
    } else {
      // Si se deshabilita, limpiar timer y remover listeners
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      isLocked.value = false;
      lockedAt.value = null;
    }
  });

  watch(
    () => sessionLockStore.lockRequested,
    () => {
      if (sessionLockStore.lockRequested > 0) {
        lockSession();
      }
    },
  );

  return {
    isLocked,
    lockedAt,
    timeoutMinutes: TIMEOUT_MS / 60000,
    unlockSession,
    lockSession
  };
}

