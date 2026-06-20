<template>
  <div class="flex flex-1 items-center gap-4" aria-hidden="true">
    <div class="skeleton-block h-12 w-12 flex-shrink-0 rounded-lg sm:h-16 sm:w-16 xl:h-20 xl:w-20" />

    <div class="min-w-0 flex-1 space-y-3 text-center lg:text-left">
      <div class="skeleton-block mx-auto h-7 w-44 rounded-lg lg:mx-0 xl:h-8 xl:w-56" />
      <div class="skeleton-block mx-auto h-4 w-36 rounded lg:mx-0 xl:w-48" />
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
