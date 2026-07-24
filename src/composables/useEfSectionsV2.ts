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

/** Kill-switch temporal al flujo legacy: ?efSectionsV2=0 o ?efLegacy=1 */
export function isEfSectionsV2LegacyForced(
  query: Record<string, unknown>,
): boolean {
  const flag = queryValue(query, 'efSectionsV2');
  const legacy = queryValue(query, 'efLegacy');
  if (legacy === '1' || legacy === 'true') return true;
  if (flag === '0' || flag === 'false') return true;
  return false;
}

/** V2 es el flujo principal. Sin env; opt-out solo por query. */
export function isEfSectionsV2Enabled(query?: Record<string, unknown>): boolean {
  if (query && isEfSectionsV2LegacyForced(query)) return false;
  return true;
}

export function useEfSectionsV2() {
  const route = useRoute();
  const efSectionsV2Enabled = computed(() =>
    isEfSectionsV2Enabled(route.query as Record<string, unknown>),
  );
  return { efSectionsV2Enabled };
}
