import { ref, computed, watch, onMounted, type MaybeRefOrGetter } from 'vue';
import { toValue } from 'vue';

export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

interface UseDirtySnapshotOptions {
  resetTrigger?: MaybeRefOrGetter<boolean>;
  markCleanOnMount?: boolean;
}

export function useDirtySnapshot(
  getState: () => unknown,
  options: UseDirtySnapshotOptions = {},
) {
  const baseline = ref('');

  const captureBaseline = () => {
    baseline.value = stableStringify(getState());
  };

  const isDirty = computed(() => {
    if (!baseline.value) return false;
    return stableStringify(getState()) !== baseline.value;
  });

  const markClean = () => {
    captureBaseline();
  };

  const resetSnapshot = () => {
    captureBaseline();
  };

  if (options.markCleanOnMount) {
    onMounted(() => {
      captureBaseline();
    });
  }

  if (options.resetTrigger !== undefined) {
    watch(
      () => toValue(options.resetTrigger),
      (ready) => {
        if (ready) {
          captureBaseline();
        }
      },
      { immediate: true },
    );
  }

  return {
    isDirty,
    markClean,
    resetSnapshot,
  };
}
