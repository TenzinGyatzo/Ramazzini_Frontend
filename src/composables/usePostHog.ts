// src/composables/usePostHog.ts
import posthog from 'posthog-js';
import { useUserStore } from '@/stores/user';
import {
  identifyPostHogUser,
  resetPostHogIdentity,
} from '@/utils/posthogIdentity';
import { sanitizePosthogCapture } from '@/utils/sanitizePosthogEvent';

export function usePostHog() {
  posthog.init(import.meta.env.VITE_POSTHOG_API_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_API_HOST,
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
    before_send: (event) => sanitizePosthogCapture(event),
  });

  function identifyUser() {
    const userStore = useUserStore();
    identifyPostHogUser(userStore.user);
  }

  return {
    posthog,
    identifyUser,
    resetIdentity: resetPostHogIdentity,
  };
}
