<script setup lang="ts">
/**
 * Aviso junto al botón de guardar de los formularios: si guardar falló por falta de conexión
 * (con «Reintentar»), si el navegador perdió la conexión mientras se captura, o si ya regresó.
 */
defineProps<{
  /** El último intento de guardar no tuvo respuesta del servidor. */
  errorConexion: boolean;
  enLinea: boolean;
  restablecida: boolean;
  ocupado: boolean;
}>();

defineEmits<{ reintentar: [] }>();
</script>

<template>
  <Transition name="aviso-conexion">
    <div
      v-if="errorConexion"
      class="aviso-conexion aviso-conexion--error mt-4 flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center"
      role="alert"
    >
      <i class="fa-solid fa-wifi aviso-conexion__icono" aria-hidden="true"></i>
      <p class="min-w-0 flex-1">
        <span class="font-semibold">No se pudo guardar: no hay conexión con el servidor.</span>
        Tu captura sigue aquí; no cierres esta pestaña.
        <span v-if="enLinea && restablecida" class="font-medium"> La conexión ya regresó.</span>
      </p>
      <button
        type="button"
        class="aviso-conexion__reintentar shrink-0 rounded-md px-3 py-1.5 font-medium text-white disabled:opacity-60"
        :disabled="ocupado"
        @click="$emit('reintentar')"
      >
        <i class="fa-solid fa-rotate-right mr-1" aria-hidden="true"></i>
        Reintentar
      </button>
    </div>
    <p
      v-else-if="!enLinea"
      class="aviso-conexion aviso-conexion--sin mt-4 self-center rounded-full border px-3 py-1 text-xs font-medium"
      role="status"
    >
      <i class="fa-solid fa-wifi mr-1" aria-hidden="true"></i>
      Sin conexión: podrás guardar cuando regrese
    </p>
    <p
      v-else-if="restablecida"
      class="aviso-conexion aviso-conexion--ok mt-4 self-center rounded-full border px-3 py-1 text-xs font-medium"
      role="status"
    >
      <i class="fa-solid fa-circle-check mr-1" aria-hidden="true"></i>
      Conexión restablecida, ya puedes guardar
    </p>
  </Transition>
</template>

<style scoped>
.aviso-conexion--error {
  border-color: #fecaca;
  background-color: #fef2f2;
  color: #991b1b;
}
.aviso-conexion__icono {
  color: #dc2626;
}
.aviso-conexion__reintentar {
  background-color: #dc2626;
  transition: background-color 120ms ease-out;
}
.aviso-conexion__reintentar:hover:not(:disabled) {
  background-color: #b91c1c;
}
.aviso-conexion--sin {
  border-color: #fde68a;
  background-color: #fffbeb;
  color: #92400e;
}
.aviso-conexion--ok {
  border-color: #a7f3d0;
  background-color: #ecfdf5;
  color: #065f46;
}

.aviso-conexion-enter-active,
.aviso-conexion-leave-active {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}
.aviso-conexion-enter-from,
.aviso-conexion-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@media (prefers-reduced-motion: reduce) {
  .aviso-conexion-enter-active,
  .aviso-conexion-leave-active {
    transition: none;
  }
}

html.dark-mode .aviso-conexion--error {
  border-color: #7f1d1d;
  background-color: rgba(127, 29, 29, 0.3);
  color: #fecaca;
}
html.dark-mode .aviso-conexion--sin {
  border-color: #78350f;
  background-color: rgba(120, 53, 15, 0.3);
  color: #fde68a;
}
html.dark-mode .aviso-conexion--ok {
  border-color: #065f46;
  background-color: rgba(6, 78, 59, 0.3);
  color: #a7f3d0;
}
</style>
