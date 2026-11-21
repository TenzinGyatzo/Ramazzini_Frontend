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

/** Kill-switch temporal al flujo legacy: ?evSectionsV2=0 o ?evLegacy=1 */
export function isEvSectionsV2LegacyForced(
  query: Record<string, unknown>,
): boolean {
  const flag = queryValue(query, 'evSectionsV2');
  const legacy = queryValue(query, 'evLegacy');
  if (legacy === '1' || legacy === 'true') return true;
  if (flag === '0' || flag === 'false') return true;
  return false;
}

/** V2 es el flujo principal. Sin env; opt-out solo por query. */
export function isEvSectionsV2Enabled(query?: Record<string, unknown>): boolean {
  if (query && isEvSectionsV2LegacyForced(query)) return false;
  return true;
}

export function useEvSectionsV2() {
  const route = useRoute();
  const evSectionsV2Enabled = computed(() =>
    isEvSectionsV2Enabled(route.query as Record<string, unknown>),
  );
  return { evSectionsV2Enabled };
}
