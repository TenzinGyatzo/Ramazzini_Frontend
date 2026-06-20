import { ref } from 'vue';

export const isNavigating = ref(false);
export const navigationProgress = ref(0);

let progressTimer: ReturnType<typeof setInterval> | null = null;
let finishTimer: ReturnType<typeof setTimeout> | null = null;

export function startNavigationProgress() {
  if (finishTimer) {
    clearTimeout(finishTimer);
    finishTimer = null;
  }

  isNavigating.value = true;
  navigationProgress.value = 10;

  if (progressTimer) {
    clearInterval(progressTimer);
  }

  progressTimer = setInterval(() => {
    if (navigationProgress.value < 90) {
      navigationProgress.value = Math.min(
        90,
        navigationProgress.value + Math.random() * 12,
      );
    }
  }, 180);
}

export function finishNavigationProgress() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }

  navigationProgress.value = 100;

  finishTimer = setTimeout(() => {
    isNavigating.value = false;
    navigationProgress.value = 0;
    finishTimer = null;
  }, 250);
}
