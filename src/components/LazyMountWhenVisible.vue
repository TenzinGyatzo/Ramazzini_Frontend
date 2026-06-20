<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = withDefaults(
  defineProps<{
    eager?: boolean;
    rootMargin?: string;
  }>(),
  {
    eager: false,
    rootMargin: '200px',
  },
);

const rootRef = ref<HTMLElement | null>(null);
const visible = ref(props.eager);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (props.eager || visible.value) return;

  if (typeof IntersectionObserver === 'undefined') {
    visible.value = true;
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        visible.value = true;
        observer?.disconnect();
        observer = null;
      }
    },
    { rootMargin: props.rootMargin },
  );

  if (rootRef.value) {
    observer.observe(rootRef.value);
  }
});

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
});
</script>

<template>
  <div ref="rootRef">
    <slot v-if="visible" />
    <div v-else class="h-16" aria-hidden="true" />
  </div>
</template>
