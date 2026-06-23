const PANEL_ADMIN_CACHE_TTL_MS = 60_000;
const detailByProveedorId = new Map<
  string,
  { data: Record<string, unknown>; fetchedAt: number }
>();

export function getCachedPanelDetails(
  ids: string[],
): Record<string, Record<string, unknown>> | null {
  if (ids.length === 0) return null;

  const now = Date.now();
  const result: Record<string, Record<string, unknown>> = {};

  for (const id of ids) {
    const entry = detailByProveedorId.get(id);
    if (!entry || now - entry.fetchedAt >= PANEL_ADMIN_CACHE_TTL_MS) {
      return null;
    }
    result[id] = entry.data;
  }

  return result;
}

export function setCachedPanelDetails(
  rows: Array<{ _id: string } & Record<string, unknown>>,
): void {
  const fetchedAt = Date.now();
  for (const row of rows) {
    const id = String(row._id);
    detailByProveedorId.set(id, { data: row, fetchedAt });
  }
}

export function invalidatePanelAdminCache(): void {
  detailByProveedorId.clear();
}
