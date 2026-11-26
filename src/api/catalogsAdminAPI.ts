import api from "@/lib/axios";

const BASE = "catalogs/admin";

export interface CatalogTypeInfo {
  catalogType: string;
  filename: string;
  loaded: boolean;
  rowCountInCache: number;
  rowCountOnDisk: number;
  fileSize: number;
  lastModified: string;
}

export interface CatalogEntryRow {
  code: string;
  description: string;
  [key: string]: unknown;
}

export interface CatalogListResponse {
  items: CatalogEntryRow[];
  total: number;
  page: number;
  limit: number;
}

/** Columna del catálogo que el módulo muestra y edita (parche 1.0.10). */
export interface CatalogAdminColumn {
  columna: string;
  etiqueta: string;
  clave: boolean;
  adicional: boolean;
  descripcion: boolean;
}

/** Registro del catálogo con el valor de cada columna tal como está en el CSV. */
export interface CatalogRow {
  code: string;
  valores: Record<string, string>;
}

export interface CatalogRowsResponse {
  items: CatalogRow[];
  columnas: CatalogAdminColumn[];
  total: number;
  page: number;
  limit: number;
}

export interface CatalogRowMutationResult {
  code: string;
  codigoAnterior?: string;
  antes: Record<string, string> | null;
  despues: Record<string, string>;
}

export default {
  listRows(
    catalogType: string,
    params?: { page?: number; limit?: number; q?: string },
  ) {
    return api.get<CatalogRowsResponse>(`${BASE}/${catalogType}/filas`, {
      params,
    });
  },

  createRow(catalogType: string, values: Record<string, string>) {
    return api.post<CatalogRowMutationResult>(`${BASE}/${catalogType}/filas`, {
      values,
    });
  },

  updateRow(
    catalogType: string,
    code: string,
    values: Record<string, string>,
  ) {
    return api.patch<CatalogRowMutationResult>(
      `${BASE}/${catalogType}/filas/${encodeURIComponent(code)}`,
      { values },
    );
  },

  listTypes() {
    return api.get<CatalogTypeInfo[]>(`${BASE}/types`);
  },

  listEntries(
    catalogType: string,
    params?: {
      page?: number;
      limit?: number;
      q?: string;
      estadoCode?: string;
      municipioCode?: string;
    },
  ) {
    return api.get<CatalogListResponse>(`${BASE}/${catalogType}`, { params });
  },

  getEntry(catalogType: string, code: string) {
    return api.get<CatalogEntryRow>(
      `${BASE}/${catalogType}/${encodeURIComponent(code)}`,
    );
  },

  createEntry(catalogType: string, body: Record<string, unknown>) {
    return api.post<CatalogEntryRow>(`${BASE}/${catalogType}`, body);
  },

  updateEntry(
    catalogType: string,
    code: string,
    body: Record<string, unknown>,
  ) {
    return api.patch<CatalogEntryRow>(
      `${BASE}/${catalogType}/${encodeURIComponent(code)}`,
      body,
    );
  },

  deleteEntry(catalogType: string, code: string) {
    return api.delete(`${BASE}/${catalogType}/${encodeURIComponent(code)}`);
  },

  importCsv(catalogType: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ rowCount: number; headers: string[] }>(
      `${BASE}/${catalogType}/import`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },

  reloadCache(catalogType: string) {
    return api.post<{ catalogType: string; rowCountInCache: number }>(
      `${BASE}/${catalogType}/reload-cache`,
    );
  },

  exportCsv(catalogType: string) {
    return api.get<Blob>(`${BASE}/${catalogType}/export`, {
      responseType: "blob",
    });
  },
};
