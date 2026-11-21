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

/** Kill-switch temporal al flujo legacy: ?auSectionsV2=0 o ?auLegacy=1 */
export function isAuSectionsV2LegacyForced(
  query: Record<string, unknown>,
): boolean {
  const flag = queryValue(query, 'auSectionsV2');
  const legacy = queryValue(query, 'auLegacy');
  if (legacy === '1' || legacy === 'true') return true;
  if (flag === '0' || flag === 'false') return true;
  return false;
}

/** V2 es el flujo principal. Sin env; opt-out solo por query. */
export function isAuSectionsV2Enabled(query?: Record<string, unknown>): boolean {
  if (query && isAuSectionsV2LegacyForced(query)) return false;
  return true;
}

export function useAuSectionsV2() {
  const route = useRoute();
  const auSectionsV2Enabled = computed(() =>
    isAuSectionsV2Enabled(route.query as Record<string, unknown>),
  );
  return { auSectionsV2Enabled };
}
