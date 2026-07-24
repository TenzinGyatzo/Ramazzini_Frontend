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

/** Kill-switch temporal al flujo legacy: ?peSectionsV2=0 o ?peLegacy=1 */
export function isPeSectionsV2LegacyForced(
  query: Record<string, unknown>,
): boolean {
  const flag = queryValue(query, 'peSectionsV2');
  const legacy = queryValue(query, 'peLegacy');
  if (legacy === '1' || legacy === 'true') return true;
  if (flag === '0' || flag === 'false') return true;
  return false;
}

/** V2 es el flujo principal. Sin env; opt-out solo por query. */
export function isPeSectionsV2Enabled(query?: Record<string, unknown>): boolean {
  if (query && isPeSectionsV2LegacyForced(query)) return false;
  return true;
}

export function usePeSectionsV2() {
  const route = useRoute();
  const peSectionsV2Enabled = computed(() =>
    isPeSectionsV2Enabled(route.query as Record<string, unknown>),
  );
  return { peSectionsV2Enabled };
}
