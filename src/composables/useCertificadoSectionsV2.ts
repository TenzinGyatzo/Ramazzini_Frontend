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

/** Kill-switch temporal al flujo legacy: ?certificadoSectionsV2=0 o ?certificadoLegacy=1 */
export function isCertificadoSectionsV2LegacyForced(
  query: Record<string, unknown>,
): boolean {
  const flag = queryValue(query, 'certificadoSectionsV2');
  const legacy = queryValue(query, 'certificadoLegacy');
  if (legacy === '1' || legacy === 'true') return true;
  if (flag === '0' || flag === 'false') return true;
  return false;
}

/** V2 es el flujo principal. Sin env; opt-out solo por query. */
export function isCertificadoSectionsV2Enabled(
  query?: Record<string, unknown>,
): boolean {
  if (query && isCertificadoSectionsV2LegacyForced(query)) return false;
  return true;
}

export function useCertificadoSectionsV2() {
  const route = useRoute();
  const certificadoSectionsV2Enabled = computed(() =>
    isCertificadoSectionsV2Enabled(route.query as Record<string, unknown>),
  );
  return { certificadoSectionsV2Enabled };
}
