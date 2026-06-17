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

export async function headClinicalFile(
  relativePath: string,
  options?: { contentType?: string },
): Promise<boolean> {
  try {
    const url = buildClinicalFileUrl(relativePath);
    const res = await axios.head(url, authRequestConfig());
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
