import { computed } from 'vue';
import { useUserStore } from '@/stores/user';

export function useCurrentUser() {
  const userStore = useUserStore();

  // Computed para obtener el usuario actual
  const currentUser = computed(() => userStore.user);

  // Computed para obtener el ID del usuario actual
  const currentUserId = computed(() => userStore.user?._id || null);

  // Computed para verificar si hay un usuario autenticado
  const isAuthenticated = computed(() => !!userStore.user?._id);

  // Función para obtener el ID del usuario, con fallback a localStorage si es necesario
  const getCurrentUserId = () => userStore.user?._id || null;

  // Función para cargar el usuario si no está disponible
  const ensureUserLoaded = async () => {
    if (!userStore.user) {
      await userStore.fetchUser();
    }
    return getCurrentUserId();
  };

  return {
    currentUser,
    currentUserId,
    isAuthenticated,
    getCurrentUserId,
    ensureUserLoaded,
    userStore
  };
} 