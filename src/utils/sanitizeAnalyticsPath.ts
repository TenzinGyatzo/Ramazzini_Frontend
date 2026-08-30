import type { RouteLocationNormalized } from 'vue-router';

export type AnalyticsRouteLike = Pick<
  RouteLocationNormalized,
  'path' | 'matched' | 'params'
> & {
  name?: RouteLocationNormalized['name'] | null;
  hash?: string;
  query?: RouteLocationNormalized['query'];
  fullPath?: string;
};

function stripQueryAndHash(path: string): string {
  const withoutHash = path.split('#')[0] ?? path;
  return withoutHash.split('?')[0] ?? withoutHash;
}

function joinMatchedRecordPaths(
  matched: Array<{ path: string }>,
): string | null {
  if (!matched.length) return null;

  let template = '';
  for (const record of matched) {
    const recordPath = record.path;
    if (!recordPath) continue;
    if (recordPath.startsWith('/')) {
      template = recordPath;
      continue;
    }
    const base = template.endsWith('/') ? template.slice(0, -1) : template;
    template = `${base}/${recordPath}`;
  }

  return template || null;
}

function hasRouteParams(params: AnalyticsRouteLike['params']): boolean {
  return Object.values(params ?? {}).some((value) => {
    if (Array.isArray(value)) return value.some((item) => Boolean(item));
    return Boolean(value);
  });
}

/**
 * Ruta analítica a partir de los path templates de Vue Router.
 * No usa fullPath, query ni hash. No intenta detectar ObjectIds.
 */
export function sanitizeAnalyticsPath(route: AnalyticsRouteLike): string {
  const template = joinMatchedRecordPaths(route.matched ?? []);
  if (template) return template;

  const rawPath = stripQueryAndHash(route.path || '/');
  if (rawPath === '/' && !hasRouteParams(route.params)) {
    return '/';
  }

  return '/(unmatched)';
}

export function buildAnalyticsPageProperties(route: AnalyticsRouteLike): {
  path: string;
  name: AnalyticsRouteLike['name'];
} {
  return {
    path: sanitizeAnalyticsPath(route),
    name: route.name,
  };
}
