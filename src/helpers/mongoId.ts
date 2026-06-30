/** Convierte ObjectId, string u objeto poblado `{ _id }` a string MongoDB. */
export function mongoIdStr(x: unknown): string {
  if (x == null || x === '') return '';
  if (typeof x === 'object' && x !== null && '_id' in x) {
    return String((x as { _id: unknown })._id ?? '');
  }
  return String(x);
}

type PayloadConAuditoria = Record<string, unknown> & {
  createdBy?: unknown;
  updatedBy?: unknown;
};

/** Normaliza createdBy/updatedBy tras GET con populate (evita 400 en PATCH). */
export function normalizarCamposAuditoriaPayload<T extends PayloadConAuditoria>(
  payload: T,
  updatedByUserId?: string | null,
): T {
  const out = { ...payload };
  if (out.createdBy != null) {
    const id = mongoIdStr(out.createdBy);
    if (id) out.createdBy = id;
    else delete out.createdBy;
  } else {
    delete out.createdBy;
  }
  if (updatedByUserId) {
    out.updatedBy = updatedByUserId;
  } else if (out.updatedBy != null) {
    const id = mongoIdStr(out.updatedBy);
    if (id) out.updatedBy = id;
  }
  return out;
}
