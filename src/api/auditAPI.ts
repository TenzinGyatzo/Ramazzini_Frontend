import api from "@/lib/axios";

const BASE = "audit";

export interface AuditEventItem {
  _id?: string;
  proveedorSaludId?: string;
  actorId: string;
  actorSnapshot?: { username?: string; email?: string; role?: string } | null;
  regime?: 'SIRES_NOM024' | 'SIN_REGIMEN' | null;
  timestamp: string;
  actionType: string;
  resourceType?: string | null;
  resourceId?: string | null;
  payload?: Record<string, unknown> | null;
  hashEvento?: string;
  hashEventoAnterior?: string | null;
}

export interface AuditEventsResponse {
  items: AuditEventItem[];
  total: number;
  page: number;
  limit: number;
}

export interface QueryAuditParams {
  from?: string;
  to?: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  actionType?: string;
  page?: number;
  limit?: number;
}

export interface VerifyExportResponse {
  valid: boolean;
  errors?: { index: number; expectedHash: string; actualHash: string }[];
}

export default {
  getEvents(params?: QueryAuditParams): Promise<AuditEventsResponse> {
    return api.get(`${BASE}/events`, { params: params ?? {} }).then((r) => r.data);
  },

  async exportBlob(params: { from: string; to: string; format: 'json' | 'csv' }): Promise<Blob> {
    const { data } = await api.get<Blob>(`${BASE}/export`, {
      params: { from: params.from, to: params.to, format: params.format },
      responseType: 'blob',
    });
    return data;
  },

  verifyExport(params: { from: string; to: string }): Promise<VerifyExportResponse> {
    return api.get(`${BASE}/verify`, { params }).then((r) => r.data);
  },
};
