<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { usePlatformContext } from "@/composables/usePlatformContext";

/**
 * Indicador del contexto de plataforma (solo Administrador).
 * Dentro de un tenant: barra fija ámbar con el tenant activo, Cambiar y Salir a consola.
 * En la consola: barra discreta "Consola de plataforma".
 */
const router = useRouter();
const { isPlatformAdmin, activeTenant, exitTenant } = usePlatformContext();
const saliendo = ref(false);

async function salirAConsola() {
  if (saliendo.value) return;
  saliendo.value = true;
  try {
    await exitTenant();
  } catch (error) {
    console.error("No se pudo salir del tenant:", error);
    saliendo.value = false;
  }
}

function cambiarTenant() {
  router.push({ name: "panel-administrador" });
}
</script>

<template>
  <div
    v-if="isPlatformAdmin && activeTenant"
    data-testid="platform-tenant-banner"
    role="status"
    class="platform-banner fixed left-1/2 top-0 z-[70] flex -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-b-xl bg-amber-500 px-4 py-1.5 text-sm font-medium text-amber-950 shadow-md"
  >
    <span class="flex items-center gap-2">
      <i class="fa-solid fa-user-shield" aria-hidden="true"></i>
      Operando como Administrador en:
      <strong data-testid="platform-tenant-banner-name">{{ activeTenant.nombre || "Proveedor sin nombre" }}</strong>
    </span>
    <span class="flex items-center gap-2">
      <button
        type="button"
        data-testid="platform-tenant-banner-change"
        class="rounded-md bg-amber-100/80 px-2 py-0.5 text-amber-950 hover:bg-white"
        @click="cambiarTenant"
      >
        Cambiar
      </button>
      <button
        type="button"
        data-testid="platform-tenant-banner-exit"
        class="rounded-md bg-amber-950 px-2 py-0.5 text-amber-50 hover:bg-amber-900 disabled:opacity-60"
        :disabled="saliendo"
        @click="salirAConsola"
      >
        Salir a consola
      </button>
    </span>
  </div>

  <div
    v-else-if="isPlatformAdmin"
    data-testid="platform-console-banner"
    role="status"
    class="platform-banner fixed left-1/2 top-0 z-[70] flex -translate-x-1/2 items-center justify-center gap-2 rounded-b-lg bg-slate-800 px-4 py-1 text-xs font-medium text-slate-100"
  >
    <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
    Consola de plataforma — sin proveedor activo
  </div>
</template>

<style scoped>
/* Nunca invade las esquinas superiores (botón de configuración fijo a la derecha). */
.platform-banner {
  max-width: calc(100% - 9rem);
}
</style>
