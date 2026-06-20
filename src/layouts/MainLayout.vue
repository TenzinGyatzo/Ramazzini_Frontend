<script setup lang="ts">
import Sidebar from '../components/sidebar/Sidebar.vue';
import { useSidebarStore } from '@/stores/sidebar';
import { RouterView } from 'vue-router';
import {
  isNavigating,
  navigationProgress,
} from '@/composables/useNavigationProgress';

const sidebar = useSidebarStore();
</script>

<template>
  <div
    v-if="isNavigating"
    class="navigation-progress"
    :style="{ width: `${navigationProgress}%` }"
    aria-hidden="true"
  />
  <Sidebar />
  <div :style="{ 'margin-left': sidebar.isSmallScreen ? sidebar.sidebarWidthCollapsed : sidebar.sidebarWidth }">
    <RouterView />
  </div>
</template>

<style scoped>
.navigation-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  z-index: 9999;
  background: linear-gradient(to right, #059669, #10b981);
  transition: width 0.18s ease-out;
  pointer-events: none;
}
</style>
