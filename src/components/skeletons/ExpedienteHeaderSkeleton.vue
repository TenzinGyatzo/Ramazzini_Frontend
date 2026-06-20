<template>
  <div
    class="flex flex-col lg:flex-row lg:items-center lg:justify-between"
    aria-hidden="true"
  >
    <div class="flex items-center gap-4 sm:mb-4 lg:mb-0">
      <div class="skeleton-block flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg" />

      <div class="flex-1 min-w-0 space-y-3">
        <div class="skeleton-block h-7 sm:h-8 lg:h-9 w-48 sm:w-64 lg:w-80 rounded-lg" />
        <div class="flex flex-wrap gap-2 sm:gap-3">
          <div class="skeleton-block h-5 w-16 rounded-full" />
          <div class="skeleton-block h-5 w-20 rounded-full" />
          <div class="skeleton-block h-5 w-28 rounded-full" />
          <div class="skeleton-block h-5 w-24 rounded-full hidden sm:block" />
        </div>
      </div>
    </div>

    <div class="hidden sm:flex sm:flex-row gap-3 mt-4 lg:mt-0">
      <div class="skeleton-panel rounded-xl px-4 py-3 sm:w-1/3 md:w-1/3 lg:w-1/2 xl:w-1/3">
        <div class="skeleton-block h-8 w-10 mx-auto rounded mb-2" />
        <div class="skeleton-block h-3 w-24 mx-auto rounded" />
      </div>
      <div class="skeleton-panel rounded-xl px-4 py-3 sm:w-1/3 md:w-1/3 lg:w-1/2 xl:w-1/3">
        <div class="skeleton-block h-8 w-10 mx-auto rounded mb-2" />
        <div class="skeleton-block h-3 w-24 mx-auto rounded" />
      </div>
      <div class="skeleton-panel hidden sm:block lg:hidden xl:block rounded-xl px-4 py-3 sm:w-1/3 md:w-1/3 lg:w-1/2 xl:w-1/3">
        <div class="skeleton-block h-8 w-10 mx-auto rounded mb-2" />
        <div class="skeleton-block h-3 w-24 mx-auto rounded" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-block {
  background-color: rgb(229 231 235);
  animation: skeleton-blink 2.4s ease-in-out infinite;
}

.skeleton-panel {
  background-color: rgb(243 244 246);
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
