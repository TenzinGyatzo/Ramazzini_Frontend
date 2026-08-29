import { ref } from 'vue';
import type { InicioResumen } from '@/interfaces/inicio-resumen.interface';

export const CACHE_TTL_MS = 90 * 1000;

export const inicioResumenState = {
  resumen: ref<InicioResumen | null>(null),
  loading: ref(false),
  error: ref<string | null>(null),
  lastFetchedAt: ref<number | null>(null),
  lastUserId: ref<string | null>(null),
};

const hoyListCache = new Map<string, { at: number; payload: unknown }>();

export function buildInicioHoyListCacheKey(parts: {
  userId: string;
  providerId: string;
  regimen: string;
  activityScope: string;
  dateKey: string;
  recurso: string;
}): string {
  return [
    parts.userId,
    parts.providerId,
    parts.regimen,
    parts.activityScope,
    parts.dateKey,
    parts.recurso,
  ].join('|');
}

export function readInicioHoyListCache<T>(key: string): T | null {
  const entry = hoyListCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at >= CACHE_TTL_MS) {
    hoyListCache.delete(key);
    return null;
  }
  return entry.payload as T;
}

export function writeInicioHoyListCache(key: string, payload: unknown) {
  hoyListCache.set(key, { at: Date.now(), payload });
}

export function invalidateInicioHoyListCache() {
  hoyListCache.clear();
}

export function invalidateInicioResumenCache() {
  inicioResumenState.resumen.value = null;
  inicioResumenState.loading.value = false;
  inicioResumenState.error.value = null;
  inicioResumenState.lastFetchedAt.value = null;
  inicioResumenState.lastUserId.value = null;
  invalidateInicioHoyListCache();
}
