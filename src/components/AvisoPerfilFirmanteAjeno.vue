<script setup lang="ts">
import { RouterLink } from 'vue-router';

/** Aviso de que el Administrador está viendo el perfil de firmante de otro usuario. */
defineProps<{
  usuario: { username?: string; email?: string; role?: string } | null;
}>();
</script>

<template>
  <div
    class="aviso-firmante-ajeno mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
    role="note"
    data-test="aviso-firmante-ajeno"
  >
    <i class="fas fa-user-pen" aria-hidden="true"></i>
    <p class="min-w-0 flex-1">
      Estás editando el perfil de firmante de
      <strong>{{ usuario?.username || 'otro usuario' }}</strong>
      <template v-if="usuario?.email"> ({{ usuario.email }})</template>
      <template v-if="usuario?.role"> · {{ usuario.role }}</template>.
      Los cambios quedan registrados a tu nombre.
    </p>
    <RouterLink :to="{ name: 'remove-users' }" class="shrink-0 font-medium underline hover:no-underline">
      Volver a usuarios
    </RouterLink>
  </div>
</template>
