import CatalogsAPI from '@/api/CatalogsAPI';

export interface CexCatalogCodes {
  tipoPersonal: {
    medicoGeneral: number;
    medicoEspecialista: number;
    enfermera: number;
  };
  servicioAtencion: number;
}

let cachedCodes: CexCatalogCodes | null = null;
let loadPromise: Promise<CexCatalogCodes> | null = null;

export async function getCexCatalogCodes(): Promise<CexCatalogCodes> {
  if (cachedCodes) return cachedCodes;
  if (!loadPromise) {
    loadPromise = CatalogsAPI.getCexCatalogCodes()
      .then(({ data }) => {
        cachedCodes = data as CexCatalogCodes;
        return cachedCodes;
      })
      .catch((err) => {
        loadPromise = null;
        throw err;
      });
  }
  return loadPromise;
}

/** Limpia cache (útil en tests). */
export function clearCexCatalogCodesCache(): void {
  cachedCodes = null;
  loadPromise = null;
}
