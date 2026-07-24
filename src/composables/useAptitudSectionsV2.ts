import { computed } from 'vue';
import { useRoute } from 'vue-router';

function queryValue(
  query: Record<string, unknown>,
  key: string,
): string | undefined {
  const raw = query[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value == null ? undefined : String(value);
}

/** Kill-switch temporal al flujo legacy: ?aptitudSectionsV2=0 o ?aptitudLegacy=1 */
export function isAptitudSectionsV2LegacyForced(
  query: Record<string, unknown>,
): boolean {
  const flag = queryValue(query, 'aptitudSectionsV2');
  const legacy = queryValue(query, 'aptitudLegacy');
  if (legacy === '1' || legacy === 'true') return true;
  if (flag === '0' || flag === 'false') return true;
  return false;
}

/** V2 es el flujo principal. Sin env; opt-out solo por query. */
export function isAptitudSectionsV2Enabled(
  query?: Record<string, unknown>,
): boolean {
  if (query && isAptitudSectionsV2LegacyForced(query)) return false;
  return true;
}

export function useAptitudSectionsV2() {
  const route = useRoute();
  const aptitudSectionsV2Enabled = computed(() =>
    isAptitudSectionsV2Enabled(route.query as Record<string, unknown>),
  );
  return { aptitudSectionsV2Enabled };
}
