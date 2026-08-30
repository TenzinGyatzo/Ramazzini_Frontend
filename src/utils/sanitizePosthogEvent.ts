import type { Router } from 'vue-router';
import { sanitizeAnalyticsPath } from '@/utils/sanitizeAnalyticsPath';

export const UNMATCHED_ANALYTICS_PATH = '/(unmatched)';

const PATH_KEYS = new Set([
  'path',
  '$pathname',
  '$prev_pageview_pathname',
  '$initial_pathname',
  '$session_entry_pathname',
]);

const URL_KEYS = new Set([
  '$current_url',
  '$initial_current_url',
  '$session_entry_url',
  '$session_entry_current_url',
]);

const REFERRER_KEYS = new Set([
  '$referrer',
  '$initial_referrer',
  '$session_entry_referrer',
]);

type MutableBag = Record<string, unknown>;

export type PosthogCaptureLike = {
  event?: string;
  properties?: MutableBag;
  $set?: MutableBag;
  $set_once?: MutableBag;
} | null;

let analyticsRouter: Router | null = null;

export function registerAnalyticsRouter(router: Router): void {
  analyticsRouter = router;
}

function stripQueryAndHash(value: string): string {
  return (value.split('#')[0] ?? value).split('?')[0] ?? value;
}

function extractPathname(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z][a-zA-Z+\-.]*:\/\//.test(trimmed)) {
    try {
      return new URL(trimmed).pathname || '/';
    } catch {
      return null;
    }
  }

  return stripQueryAndHash(trimmed) || '/';
}

/**
 * Resuelve el valor recibido contra Vue Router y devuelve el template.
 * Fail-closed: nunca regresa el pathname crudo.
 */
export function sanitizeRawPathname(raw: unknown): string {
  if (typeof raw !== 'string') return UNMATCHED_ANALYTICS_PATH;

  const pathname = extractPathname(raw);
  if (!pathname || !analyticsRouter) return UNMATCHED_ANALYTICS_PATH;

  try {
    const resolved = analyticsRouter.resolve(pathname);
    if (!resolved.matched?.length) return UNMATCHED_ANALYTICS_PATH;
    return sanitizeAnalyticsPath(resolved);
  } catch {
    return UNMATCHED_ANALYTICS_PATH;
  }
}

export function sanitizeAnalyticsUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;

  try {
    const url = new URL(raw);
    const path = sanitizeRawPathname(url.pathname);
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    const path = sanitizeRawPathname(raw);
    return path === UNMATCHED_ANALYTICS_PATH ? undefined : path;
  }
}

function isSameOrigin(url: URL): boolean {
  if (typeof window === 'undefined' || !window.location?.host) {
    return true;
  }
  return url.host === window.location.host;
}

export function sanitizeReferrer(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  if (raw === '$direct') return '$direct';

  try {
    const url = new URL(raw);
    if (!isSameOrigin(url)) {
      return `${url.protocol}//${url.host}`;
    }
    return sanitizeAnalyticsUrl(raw);
  } catch {
    return sanitizeRawPathname(raw);
  }
}

function sanitizePropertyBag(bag: MutableBag | undefined): void {
  if (!bag) return;

  for (const key of Object.keys(bag)) {
    if (PATH_KEYS.has(key)) {
      bag[key] = sanitizeRawPathname(bag[key]);
      continue;
    }
    if (URL_KEYS.has(key)) {
      const sanitized = sanitizeAnalyticsUrl(bag[key]);
      if (sanitized === undefined) {
        delete bag[key];
      } else {
        bag[key] = sanitized;
      }
      continue;
    }
    if (REFERRER_KEYS.has(key)) {
      const sanitized = sanitizeReferrer(bag[key]);
      if (sanitized === undefined) {
        delete bag[key];
      } else {
        bag[key] = sanitized;
      }
    }
  }

  if (bag.$set && typeof bag.$set === 'object' && !Array.isArray(bag.$set)) {
    sanitizePropertyBag(bag.$set as MutableBag);
  }
  if (bag.$set_once && typeof bag.$set_once === 'object' && !Array.isArray(bag.$set_once)) {
    sanitizePropertyBag(bag.$set_once as MutableBag);
  }
}

export function sanitizePosthogCapture<T extends PosthogCaptureLike>(
  event: T,
): T {
  if (!event) return event;

  sanitizePropertyBag(event.properties);
  sanitizePropertyBag(event.$set);
  sanitizePropertyBag(event.$set_once);
  return event;
}
