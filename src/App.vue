<script setup lang="ts">
import { useRoute } from 'vue-router';
import MainLayout from './layouts/MainLayout.vue';
import SimpleLayout from './layouts/SimpleLayout.vue';
import SessionLockScreen from './components/SessionLockScreen.vue';
import ConfidentialityAgreementModal from './components/ConfidentialityAgreementModal.vue';
import { useSessionTimeout } from './composables/useSessionTimeout';
import { useConfidentialityAgreement } from './composables/useConfidentialityAgreement';

const route = useRoute();
const { isLocked, unlockSession, lockedAt, timeoutMinutes } = useSessionTimeout();
const {
  showModal,
  agreementText,
  footerConsent,
  isLoading,
  error,
  acceptAgreement,
} = useConfidentialityAgreement();

const handleAgreementAccepted = async () => {
  await acceptAgreement();
};
</script>

<template>
  <component :is="route.meta.hideSidebar ? SimpleLayout : MainLayout" />

  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <ConfidentialityAgreementModal
      v-if="showModal"
      :open="showModal"
      :agreement-text="agreementText"
      :footer-consent="footerConsent"
      :is-loading="isLoading"
      :error="error"
      @accepted="handleAgreementAccepted"
    />
  </Transition>

  <!-- Pantalla de bloqueo de sesión -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <SessionLockScreen
      v-if="isLocked"
      :locked-at="lockedAt ?? undefined"
      :timeout-minutes="timeoutMinutes"
      @unlock="unlockSession"
    />
  </Transition>
</template>

<style>
body {
  font-family: 'kanit', sans-serif;
}
</style>
