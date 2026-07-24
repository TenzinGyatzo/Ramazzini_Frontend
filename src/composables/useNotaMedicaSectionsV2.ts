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

/** Kill-switch temporal al flujo legacy: ?nmSectionsV2=0 o ?nmLegacy=1 */
export function isNotaMedicaSectionsV2LegacyForced(
  query: Record<string, unknown>,
): boolean {
  const flag = queryValue(query, 'nmSectionsV2');
  const legacy = queryValue(query, 'nmLegacy');
  if (legacy === '1' || legacy === 'true') return true;
  if (flag === '0' || flag === 'false') return true;
  return false;
}

/** V2 es el flujo principal. Sin env; opt-out solo por query. */
export function isNotaMedicaSectionsV2Enabled(
  query?: Record<string, unknown>,
): boolean {
  if (query && isNotaMedicaSectionsV2LegacyForced(query)) return false;
  return true;
}

export function useNotaMedicaSectionsV2() {
  const route = useRoute();
  const nmSectionsV2Enabled = computed(() =>
    isNotaMedicaSectionsV2Enabled(route.query as Record<string, unknown>),
  );
  return { nmSectionsV2Enabled };
}
