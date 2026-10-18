export type RegimenImportacion = 'SIRES_NOM024' | 'SIN_REGIMEN';

export const PLANTILLA_SIN_REGIMEN =
  '/template/Plantilla para Importar Trabajadores.xlsx';

// El nombre no menciona el régimen: describe lo que trae además de la plantilla básica
export const PLANTILLA_SIRES_NOM024 =
  '/template/Plantilla para Importar Trabajadores (con CURP y residencia).xlsx';

export const NOMBRE_DESCARGA_SIN_REGIMEN =
  'Plantilla para Importar Trabajadores.xlsx';

export const NOMBRE_DESCARGA_SIRES_NOM024 =
  'Plantilla para Importar Trabajadores (con CURP y residencia).xlsx';

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
