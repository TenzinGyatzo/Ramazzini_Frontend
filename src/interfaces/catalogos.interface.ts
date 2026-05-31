/**
 * Interface representing a catalog entry with common fields (NOM-024)
 */
export interface CatalogEntry {
  code: string;
  description: string;
  source?: string;
  version?: string;
  [key: string]: any; // Allow additional fields for catalog-specific data
}

/**
 * Interface for INEGI geographic hierarchy entries
 */
export interface INEGIEntry extends CatalogEntry {
  estado?: string;
  estadoCode?: string;
  municipio?: string;
  municipioCode?: string;
  localidad?: string;
  localidadCode?: string;
}

/**
 * Interface for CIE-10 diagnostic entries
 */
export interface CIE10Entry extends CatalogEntry {
  catalogKey?: string;
  nombre?: string;
  lsex?: string; // Sex restriction
  linf?: number; // Lower age limit
  lsup?: number; // Upper age limit
  diaCronicos?: boolean;
  diaCaInfantil?: boolean;
}

/**
 * Interface for CLUES establishment entries
 */
export interface CLUESEntry extends CatalogEntry {
  clues?: string;
  nombreInstitucion?: string;
  entidad?: string;
  municipio?: string;
  localidad?: string;
  estatus?: string;
}

/**
 * Catalog type identifiers
 */
export enum CatalogType {
  // Base catalogs (9) - Required
  CIE10 = 'diagnosticos',
  CLUES = 'establecimientos_salud',
  ENTIDADES_FEDERATIVAS = 'enitades_federativas',
  MUNICIPIOS = 'municipios',
  LOCALIDADES = 'localidades',
  CODIGOS_POSTALES = 'codigos_postales',
  FORMACION_ACADEMICA = 'formacion_academica',

  // GIIS-B019 Catalogs (3) - Optional
  TIPO_PERSONAL = 'cat_tipo_personal',
  AFILIACION = 'cat_afiliacion',
  PAIS = 'cat_pais',
}

