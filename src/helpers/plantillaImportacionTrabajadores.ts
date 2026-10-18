export type RegimenImportacion = 'SIRES_NOM024' | 'SIN_REGIMEN';

// Los nombres no mencionan el régimen (cada proveedor solo ve la suya)
export const PLANTILLA_SIN_REGIMEN =
  '/template/Plantilla Importar Trabajadores.xlsx';

export const PLANTILLA_SIRES_NOM024 =
  '/template/Plantilla para Importar Trabajadores.xlsx';

export const NOMBRE_DESCARGA_SIN_REGIMEN =
  'Plantilla Importar Trabajadores.xlsx';

export const NOMBRE_DESCARGA_SIRES_NOM024 =
  'Plantilla para Importar Trabajadores.xlsx';

export function getPlantillaImportacionTrabajadores(regime: RegimenImportacion): {
  href: string;
  downloadName: string;
} {
  if (regime === 'SIRES_NOM024') {
    return {
      href: PLANTILLA_SIRES_NOM024,
      downloadName: NOMBRE_DESCARGA_SIRES_NOM024,
    };
  }

  return {
    href: PLANTILLA_SIN_REGIMEN,
    downloadName: NOMBRE_DESCARGA_SIN_REGIMEN,
  };
}
