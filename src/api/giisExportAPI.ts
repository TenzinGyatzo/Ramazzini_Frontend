import api from "@/lib/axios";

const BASE = "giis-export";

export interface BatchListItem {
  batchId: string;
  yearMonth: string;
  status: string;
  completedAt?: string;
  validationStatus?: string;
  establecimientoClues: string;
  errorMessage?: string;
  excludedReport?: { totalExcluded: number };
  artifacts: { guide: string; path?: string; zipPath?: string }[];
}

export interface BatchDetail {
  batchId: string;
  status: string;
  yearMonth: string;
  establecimientoClues: string;
  artifacts: { guide: string; path?: string; zipPath?: string }[];
  errorMessage?: string;
  completedAt?: string;
  validationStatus?: string;
}

export default {
  listBatches(): Promise<BatchListItem[]> {
    return api.get(`${BASE}/batches`).then((r) => r.data);
  },

  createBatch(yearMonth: string, onlyFinalized?: boolean): Promise<{ batchId: string; status: string; yearMonth: string; establecimientoClues: string }> {
    return api.post(`${BASE}/batches`, { yearMonth, onlyFinalized }).then((r) => r.data);
  },

  getBatch(batchId: string): Promise<BatchDetail> {
    return api.get(`${BASE}/batches/${batchId}`).then((r) => r.data);
  },

  /** Triggers browser download for TXT artifact (CEX). Uses blob + link to avoid new tab. */
  async downloadFile(batchId: string, guide: string, _filename?: string): Promise<void> {
    const res = await api.get(`${BASE}/batches/${batchId}/download/${guide}`, {
      responseType: "blob",
    });
    const blob = res.data as Blob;
    // Axios normaliza nombres a minúsculas; CORS requiere Access-Control-Expose-Headers en el backend
    const contentDisposition =
      res.headers["content-disposition"] ?? (res.headers as Record<string, string>)["Content-Disposition"];
    const match =
      contentDisposition &&
      (/filename\s*=\s*"([^"]+)"/i.exec(contentDisposition) ??
        /filename\*?=(?:UTF-8'')?([^;\s]+)/i.exec(contentDisposition));
    const filename = (match && match[1]?.trim()) || `${guide}_export.txt`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  /** Triggers browser download for ZIP deliverable (CEX). Uses blob + link to avoid new tab. */
  async downloadDeliverable(batchId: string, guide: string): Promise<void> {
    const res = await api.get(`${BASE}/batches/${batchId}/download-deliverable/${guide}`, {
      responseType: "blob",
    });
    const blob = res.data as Blob;
    const contentDisposition =
      res.headers["content-disposition"] ?? (res.headers as Record<string, string>)["Content-Disposition"];
    const match =
      contentDisposition &&
      (/filename\s*=\s*"([^"]+)"/i.exec(contentDisposition) ??
        /filename\*?=(?:UTF-8'')?([^;\s]+)/i.exec(contentDisposition));
    const filename = (match && match[1]?.trim()) || `${guide}_export.zip`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  /** Triggers browser download for excluded report CSV. */
  async downloadExcludedReportCsv(batchId: string): Promise<void> {
    const res = await api.get(`${BASE}/batches/${batchId}/excluded-report`, {
      params: { format: "csv" },
      responseType: "blob",
    });
    const blob = res.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `excluded-report-${batchId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

};
