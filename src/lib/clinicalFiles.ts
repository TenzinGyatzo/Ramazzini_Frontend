import axios from 'axios';
import { authRequestConfig } from './attachAuthToken';

export function buildClinicalFileUrl(relativePath: string): string {
  const clean = relativePath.replace(/\/+/g, '/').replace(/^\//, '');
  return new URL(clean, import.meta.env.VITE_API_URL).href;
}

export async function fetchClinicalFileBlob(relativePath: string): Promise<Blob> {
  const url = buildClinicalFileUrl(relativePath);
  const { data } = await axios.get(url, {
    responseType: 'blob',
    ...authRequestConfig(),
  });
  return data;
}

export type ClinicalDownloadAuditPayload = {
  documentId: string;
  documentType: string;
  trabajadorId: string;
  filename?: string;
  mediaKind?: 'pdf' | 'image';
  origen?: 'lista' | 'visor' | 'resultados-clinicos';
};

/** Soft-fail: no bloquea la descarga si falla el registro de auditoría. */
export async function registrarDescargaArchivoClinico(
  payload: ClinicalDownloadAuditPayload,
): Promise<void> {
  try {
    await axios.post(
      new URL(
        'expedientes-medicos/registrar-descarga',
        import.meta.env.VITE_API_URL,
      ).href,
      payload,
      authRequestConfig(),
    );
  } catch {
    // soft-fail: egreso ya consumado; no bloquear UX
  }
}

export async function headClinicalFile(
  relativePath: string,
  options?: { contentType?: string; probe?: 'regenerable' | 'external' },
): Promise<boolean> {
  try {
    const url = buildClinicalFileUrl(relativePath);
    const headers = options?.probe
      ? { 'X-Clinical-File-Probe': options.probe }
      : undefined;
    const res = await axios.head(url, { ...authRequestConfig(), headers });
    if (res.status !== 200) {
      return false;
    }
    if (options?.contentType) {
      const contentType = res.headers['content-type'] as string | undefined;
      return contentType?.includes(options.contentType) ?? false;
    }
    return true;
  } catch {
    return false;
  }
}
