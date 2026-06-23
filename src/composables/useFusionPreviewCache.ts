import type { FusionPreview } from '@/interfaces/trabajador.interface';

const FUSION_PREVIEW_CACHE_TTL_MS = 60_000;
const cache = new Map<string, { data: FusionPreview; fetchedAt: number }>();

function cacheKey(destinoId: string, fuenteId: string): string {
  return `${destinoId}:${fuenteId}`;
}

export function getCachedFusionPreview(
  destinoId: string,
  fuenteId: string,
): FusionPreview | null {
  const entry = cache.get(cacheKey(destinoId, fuenteId));
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt >= FUSION_PREVIEW_CACHE_TTL_MS) {
    cache.delete(cacheKey(destinoId, fuenteId));
    return null;
  }
  return entry.data;
}

export function setCachedFusionPreview(
  destinoId: string,
  fuenteId: string,
  data: FusionPreview,
): void {
  cache.set(cacheKey(destinoId, fuenteId), { data, fetchedAt: Date.now() });
}

export function invalidateFusionPreviewCache(
  destinoId?: string,
  fuenteId?: string,
): void {
  if (destinoId && fuenteId) {
    cache.delete(cacheKey(destinoId, fuenteId));
    return;
  }
  cache.clear();
}
