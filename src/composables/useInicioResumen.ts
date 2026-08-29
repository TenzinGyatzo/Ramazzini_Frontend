import { computed, onUnmounted, watch } from 'vue';
import InicioAPI from '@/api/InicioAPI';
import { useUserStore } from '@/stores/user';
import {
  confidentialityAgreementAccepted,
  confidentialityAgreementChecking,
  confidentialityAgreementRequired,
  shouldHoldInicioDataUntilAgreement,
} from '@/composables/useConfidentialityAgreement';
import {
  CACHE_TTL_MS,
  inicioResumenState,
  invalidateInicioHoyListCache,
  invalidateInicioResumenCache,
} from '@/composables/inicioResumenCache';

function isAgreementGateError(err: any): boolean {
  return err?.response?.data?.errorCode === 'CONFIDENTIALITY_AGREEMENT_REQUIRED';
}

const FETCH_TIMEOUT_MS = 8 * 1000;

let fetchPromise: Promise<void> | null = null;
let abortController: AbortController | null = null;

export { invalidateInicioResumenCache };

export function useInicioResumen() {
  const userStore = useUserStore();
  const { resumen, loading, error, lastFetchedAt, lastUserId } =
    inicioResumenState;

  const hasActivity = computed(() => Boolean(resumen.value?.hasActivity));
  const hasTrabajadores = computed(() =>
    Boolean(resumen.value?.hasTrabajadores),
  );
  const showHub = computed(() => hasActivity.value || hasTrabajadores.value);
  const showError = computed(() => Boolean(error.value) && !showHub.value);
  const isLoading = computed(
    () =>
      Boolean(userStore.user?._id) &&
      !showHub.value &&
      !error.value &&
      (loading.value || lastFetchedAt.value === null),
  );
  const showWelcome = computed(
    () => !isLoading.value && !showHub.value && !showError.value,
  );

  async function fetchResumen(options?: { force?: boolean }) {
    const userId = userStore.user?._id ?? null;
    if (!userId) {
      invalidateInicioResumenCache();
      return;
    }

    if (shouldHoldInicioDataUntilAgreement()) {
      error.value = null;
      return;
    }

    if (userId !== lastUserId.value) {
      invalidateInicioHoyListCache();
      resumen.value = null;
      lastFetchedAt.value = null;
      lastUserId.value = userId;
    }

    const isFresh =
      !options?.force &&
      lastFetchedAt.value !== null &&
      Date.now() - lastFetchedAt.value < CACHE_TTL_MS;

    if (isFresh) {
      return;
    }

    if (fetchPromise) {
      await fetchPromise;
      return;
    }

    abortController?.abort();
    abortController = new AbortController();
    const { signal } = abortController;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      abortController?.abort();
    }, FETCH_TIMEOUT_MS);

    loading.value = true;
    error.value = null;

    fetchPromise = (async () => {
      try {
        const { data } = await InicioAPI.getResumen(signal);
        if (signal.aborted) return;
        resumen.value = data;
        lastFetchedAt.value = Date.now();
      } catch (err: any) {
        const canceled =
          err?.code === 'ERR_CANCELED' ||
          err?.name === 'CanceledError' ||
          signal.aborted;
        if (canceled && !timedOut) {
          return;
        }
        if (isAgreementGateError(err)) {
          error.value = null;
          return;
        }
        error.value =
          err?.response?.data?.message ??
          err?.message ??
          'No se pudo cargar el resumen';
        if (!resumen.value?.hasActivity && !resumen.value?.hasTrabajadores) {
          resumen.value = null;
        }
      } finally {
        window.clearTimeout(timeoutId);
        loading.value = false;
        fetchPromise = null;
      }
    })();

    await fetchPromise;
  }

  function abort() {
    abortController?.abort();
    abortController = null;
    fetchPromise = null;
  }

  watch(
    () => userStore.user?._id,
    (id) => {
      if (!id) {
        invalidateInicioResumenCache();
      }
    },
  );

  watch(
    [
      confidentialityAgreementRequired,
      confidentialityAgreementAccepted,
      confidentialityAgreementChecking,
    ],
    () => {
      if (!userStore.user?._id) {
        return;
      }
      if (shouldHoldInicioDataUntilAgreement()) {
        error.value = null;
        return;
      }
      void fetchResumen();
    },
  );

  onUnmounted(() => {
    abort();
  });

  return {
    resumen,
    loading,
    error,
    hasActivity,
    isLoading,
    showHub,
    showWelcome,
    showError,
    fetchResumen,
    abort,
    invalidateInicioResumenCache,
  };
}
