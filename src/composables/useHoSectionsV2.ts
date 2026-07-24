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

/** Kill-switch temporal al flujo legacy: ?hoSectionsV2=0 o ?hoLegacy=1 */
export function isHoSectionsV2LegacyForced(
  query: Record<string, unknown>,
): boolean {
  const flag = queryValue(query, 'hoSectionsV2');
  const legacy = queryValue(query, 'hoLegacy');
  if (legacy === '1' || legacy === 'true') return true;
  if (flag === '0' || flag === 'false') return true;
  return false;
}

/** V2 es el flujo principal. Sin env; opt-out solo por query. */
export function isHoSectionsV2Enabled(query?: Record<string, unknown>): boolean {
  if (query && isHoSectionsV2LegacyForced(query)) return false;
  return true;
}

export function useHoSectionsV2() {
  const route = useRoute();
  const hoSectionsV2Enabled = computed(() =>
    isHoSectionsV2Enabled(route.query as Record<string, unknown>),
  );
  return { hoSectionsV2Enabled };
}
