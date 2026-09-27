<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const isOnboarding = computed(() => route.name === "onboarding");
</script>

<template>
  <div
    class="mx-auto w-full"
    :class="isOnboarding ? '' : 'max-w-sm mt-20'"
  >
    <RouterView />
  </div>
</template>
