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

/** Kill-switch temporal al flujo legacy: ?antidopingSectionsV2=0 o ?antidopingLegacy=1 */
export function isAntidopingSectionsV2LegacyForced(
  query: Record<string, unknown>,
): boolean {
  const flag = queryValue(query, 'antidopingSectionsV2');
  const legacy = queryValue(query, 'antidopingLegacy');
  if (legacy === '1' || legacy === 'true') return true;
  if (flag === '0' || flag === 'false') return true;
  return false;
}

/** V2 es el flujo principal. Sin env; opt-out solo por query. */
export function isAntidopingSectionsV2Enabled(
  query?: Record<string, unknown>,
): boolean {
  if (query && isAntidopingSectionsV2LegacyForced(query)) return false;
  return true;
}

export function useAntidopingSectionsV2() {
  const route = useRoute();
  const antidopingSectionsV2Enabled = computed(() =>
    isAntidopingSectionsV2Enabled(route.query as Record<string, unknown>),
  );
  return { antidopingSectionsV2Enabled };
}
