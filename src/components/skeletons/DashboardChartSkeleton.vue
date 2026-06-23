<template>
  <div
    class="bg-gray-50 p-4 sm:p-6 rounded-lg shadow flex flex-col h-full min-h-[360px] sm:min-h-[400px]"
    aria-hidden="true"
  >
    <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4 gap-2">
      <div class="skeleton-block h-6 w-36 rounded-lg sm:w-44" />
      <div class="flex gap-2">
        <div class="skeleton-block h-8 w-16 rounded" />
        <div class="skeleton-block h-8 w-14 rounded" />
      </div>
    </div>
    <div class="flex-1 flex items-center justify-center">
      <div class="skeleton-block w-full max-w-[200px] aspect-square rounded-full opacity-60" />
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
