import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useSessionLockStore = defineStore('sessionLock', () => {
  const lockRequested = ref(0);

  function requestLock() {
    lockRequested.value += 1;
  }

  return { lockRequested, requestLock };
});
