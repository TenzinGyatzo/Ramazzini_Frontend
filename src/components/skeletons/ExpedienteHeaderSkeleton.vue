<template>
  <div class="flex items-center gap-3 sm:gap-4" aria-hidden="true">
    <div class="skeleton-block h-12 w-12 flex-shrink-0 rounded-lg" />

    <div class="min-w-0 flex-1 space-y-2">
      <div class="skeleton-block h-6 w-48 rounded-lg sm:w-64 lg:w-80" />
      <div class="skeleton-block h-4 w-56 rounded sm:w-80 lg:w-96" />
    </div>

    <div class="skeleton-block hidden h-4 w-40 flex-shrink-0 rounded md:block" />
  </div>
</template>

<style scoped>
.skeleton-block {
  background-color: rgb(229 231 235);
  animation: skeleton-blink 2.4s ease-in-out infinite;
}

html.dark-mode .skeleton-block {
  background-color: rgb(71 85 105);
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
