<template>
  <div aria-hidden="true" data-test="resumen-skeleton">
    <!-- Cifras clave -->
    <div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="n in 4" :key="n" class="dashboard-cifra rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div class="skeleton-block h-3 w-24 rounded" />
        <div class="skeleton-block mt-2 h-7 w-14 rounded" />
        <div class="skeleton-block mt-1.5 h-3 w-20 rounded" />
      </div>
    </div>

    <!-- Índice de secciones -->
    <div class="mb-6 flex flex-wrap items-center gap-2">
      <div v-for="ancho in ['w-48', 'w-40', 'w-44', 'w-36']" :key="ancho" class="skeleton-block h-7 rounded-full" :class="ancho" />
    </div>

    <!-- Comparar periodos -->
    <div class="mb-8">
      <div class="skeleton-block mb-3 h-6 w-56 rounded-lg" />
      <div class="dashboard-cifra rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div class="skeleton-block h-4 w-full max-w-xl rounded" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-block {
  background-color: rgb(229 231 235);
  animation: skeleton-blink 2.4s ease-in-out infinite;
}

@keyframes skeleton-blink {
  0%,
  100% {
    opacity: 0.38;
  }

  50% {
    opacity: 0.72;
  }
}
</style>
