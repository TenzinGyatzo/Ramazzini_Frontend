import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
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

  const timeoutMs = computed(() => proveedorSaludStore.sessionTimeoutMs);
  const timeoutMinutes = computed(() => {
    const ms = timeoutMs.value;
    return ms ? ms / 60000 : 0;
  });
  
  let timeoutId: number | null = null;
  let listenersBound = false;

  // Rutas que no deben disparar el bloqueo ni el timer
  const publicRoutes = ['login', 'auth', 'onboarding', 'confirm-account', 'forgot-password', 'new-password'];

  const resetTimer = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    // No iniciar el timer si:
    // - Está bloqueado
    // - Estamos en una ruta pública
    // - No hay usuario
    // - El timeout NO está habilitado por la policy
    // - No hay timeout resuelto en la policy
    if (
      isLocked.value || 
      publicRoutes.includes(route.name as string) || 
      !userStore.user ||
      !proveedorSaludStore.sessionTimeoutEnabled ||
      !timeoutMs.value
    ) {
      return;
    }

    timeoutId = window.setTimeout(() => {
      lockSession();
    }, timeoutMs.value);
  };

  const lockSession = () => {
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
    if (proveedorSaludStore.sessionTimeoutEnabled) {
      resetTimer();
    }
  };

  const bindListeners = () => {
    if (listenersBound) {
      return;
    }
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });
    listenersBound = true;
  };

  const unbindListeners = () => {
    if (!listenersBound) {
      return;
    }
    events.forEach(event => {
      window.removeEventListener(event, handleUserActivity);
    });
    listenersBound = false;
  };

  onMounted(() => {
    if (proveedorSaludStore.sessionTimeoutEnabled) {
      bindListeners();
      resetTimer();
    }
  });

  onUnmounted(() => {
    unbindListeners();
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
      bindListeners();
      resetTimer();
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      unbindListeners();
      isLocked.value = false;
      lockedAt.value = null;
    }
  });

  watch(() => proveedorSaludStore.sessionTimeoutMs, () => {
    if (proveedorSaludStore.sessionTimeoutEnabled) {
      resetTimer();
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
    timeoutMinutes,
    unlockSession,
    lockSession
  };
}
