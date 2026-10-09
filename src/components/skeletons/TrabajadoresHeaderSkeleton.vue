<template>
  <div class="flex w-full flex-1 items-center gap-3 sm:gap-4" aria-hidden="true">
    <div class="skeleton-block h-12 w-12 flex-shrink-0 rounded-lg" />

    <div class="min-w-0 flex-1 space-y-2">
      <div class="skeleton-block h-6 w-44 rounded-lg sm:w-56" />
      <div class="skeleton-block h-4 w-36 rounded sm:w-48" />
    </div>
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
