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

/**
 * - `disponible`: el archivo existe (y es del tipo pedido, si se indicó).
 * - `ausente`: el servidor confirmó que no está (404) o no es del tipo pedido.
 * - `sin-verificar`: no se pudo saber (sin conexión, sesión vencida, sin permiso, error del servidor).
 */
export type EstadoArchivoClinico = 'disponible' | 'ausente' | 'sin-verificar';

export async function consultarArchivoClinico(
  relativePath: string,
  options?: { contentType?: string; probe?: 'regenerable' | 'external' },
): Promise<EstadoArchivoClinico> {
  try {
    const url = buildClinicalFileUrl(relativePath);
    const headers = options?.probe
      ? { 'X-Clinical-File-Probe': options.probe }
      : undefined;
    const res = await axios.head(url, { ...authRequestConfig(), headers });
    if (res.status !== 200) {
      return 'sin-verificar';
    }
    if (options?.contentType) {
      const contentType = res.headers['content-type'] as string | undefined;
      return contentType?.includes(options.contentType) ? 'disponible' : 'ausente';
    }
    return 'disponible';
  } catch (error) {
    return axios.isAxiosError(error) && error.response?.status === 404
      ? 'ausente'
      : 'sin-verificar';
  }
}

export async function headClinicalFile(
  relativePath: string,
  options?: { contentType?: string; probe?: 'regenerable' | 'external' },
): Promise<boolean> {
  return (await consultarArchivoClinico(relativePath, options)) === 'disponible';
}
