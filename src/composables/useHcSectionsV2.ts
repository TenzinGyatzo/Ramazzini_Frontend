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

/** Kill-switch temporal al flujo legacy: ?hcSectionsV2=0 o ?hcLegacy=1 */
export function isHcSectionsV2LegacyForced(
  query: Record<string, unknown>,
): boolean {
  const flag = queryValue(query, 'hcSectionsV2');
  const legacy = queryValue(query, 'hcLegacy');
  if (legacy === '1' || legacy === 'true') return true;
  if (flag === '0' || flag === 'false') return true;
  return false;
}

/** V2 es el flujo principal. Sin env; opt-out solo por query. */
export function isHcSectionsV2Enabled(query?: Record<string, unknown>): boolean {
  if (query && isHcSectionsV2LegacyForced(query)) return false;
  return true;
}

export function useHcSectionsV2() {
  const route = useRoute();
  const hcSectionsV2Enabled = computed(() =>
    isHcSectionsV2Enabled(route.query as Record<string, unknown>),
  );
  return { hcSectionsV2Enabled };
}
