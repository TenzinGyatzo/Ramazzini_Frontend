export type ExportColumnGroup =
  | 'Identificación'
  | 'Demográficos'
  | 'Nacimiento / Residencia'
  | 'Laboral'
  | 'Exploración / Vista'
  | 'Antecedentes'
  | 'Aptitud / Estudios';

export interface ExportColumnDef {
  key: string;
  header: string;
  group: ExportColumnGroup;
  defaultSelected?: boolean;
  /** Solo disponible en régimen SIRES_NOM024 */
  siresOnly?: boolean;
}

export const STORAGE_KEY_COLUMNAS_EXPORT = 'export-trabajadores-columnas-v1';
/** Preferencia UI: mostrar también opciones de columnas 100% vacías en el modal */
export const STORAGE_KEY_MOSTRAR_VACIAS = 'export-trabajadores-mostrar-vacias-v1';

export type ExportPresetId = 'basico' | 'clinico' | 'identificacion';

/** Keys crudas por preset; se filtran por régimen en getPresetColumnKeys */
const PRESET_KEYS: Record<ExportPresetId, string[]> = {
  basico: [
    'primerApellido',
    'segundoApellido',
    'nombre',
    'edad',
    'sexo',
    'puesto',
    'antiguedad',
    'estadoLaboral',
    'consultas',
    'aptitud',
  ],
  clinico: [
    'primerApellido',
    'segundoApellido',
    'nombre',
    'edad',
    'sexo',
    'puesto',
    'antiguedad',
    'estadoLaboral',
    'consultas',
    'aptitud',
    'imc',
    'cintura',
    'categoriaTensionArterial',
    'requiereLentes',
    'correccionVisual',
    'daltonismo',
    'agudeza',
    'lumbalgia',
    'diabetico',
    'cardiopatico',
    'alergia',
    'hipertensivo',
    'respiratorios',
    'epilepsia',
    'quirurgico',
    'otro',
    'alcoholismo',
    'tabaquismo',
    'accidente',
    'agentesRiesgo',
    'audiometria',
    'categoriaAudiometria',
    'espirometriaRc',
    'ekgRc',
    'rayosXRc',
    'laboratorioRc',
  ],
  identificacion: [
    'curp',
    'numeroEmpleado',
    'primerApellido',
    'segundoApellido',
    'nombre',
    'nss',
    'folio',
    'puesto',
    'estadoLaboral',
  ],
};

export const EXPORT_PRESET_LABELS: Record<ExportPresetId, string> = {
  basico: 'Básico',
  clinico: 'Clínico',
  identificacion: 'Identificación',
};

export const EXPORT_PRESET_IDS: ExportPresetId[] = ['basico', 'clinico', 'identificacion'];

export const EXPORT_COLUMNAS_CATALOGO: ExportColumnDef[] = [
  // Identificación (CURP primero, como en ModalTrabajadores)
  { key: 'curp', header: 'CURP', group: 'Identificación' },
  { key: 'numeroEmpleado', header: 'Num. Trab.', group: 'Identificación' },
  { key: 'primerApellido', header: 'Primer Apellido', group: 'Identificación', defaultSelected: true },
  { key: 'segundoApellido', header: 'Segundo Apellido', group: 'Identificación', defaultSelected: true },
  { key: 'nombre', header: 'Nombre', group: 'Identificación', defaultSelected: true },
  { key: 'nss', header: 'NSS', group: 'Identificación' },
  { key: 'folio', header: 'Folio', group: 'Identificación', siresOnly: true },
  // Demográficos
  { key: 'edad', header: 'Edad', group: 'Demográficos', defaultSelected: true },
  { key: 'sexo', header: 'Sexo', group: 'Demográficos', defaultSelected: true },
  { key: 'escolaridad', header: 'Escolaridad', group: 'Demográficos' },
  { key: 'telefono', header: 'Teléfono', group: 'Demográficos' },
  { key: 'estadoCivil', header: 'Estado Civil', group: 'Demográficos' },
  // Nacimiento / Residencia (país de residencia al final, como en el formulario)
  { key: 'entidadNacimiento', header: 'Entidad Nacimiento', group: 'Nacimiento / Residencia', siresOnly: true },
  { key: 'paisNacimiento', header: 'País de Nacimiento', group: 'Nacimiento / Residencia', siresOnly: true },
  { key: 'entidadResidencia', header: 'Entidad Residencia', group: 'Nacimiento / Residencia', siresOnly: true },
  { key: 'municipioResidencia', header: 'Municipio Residencia', group: 'Nacimiento / Residencia', siresOnly: true },
  { key: 'localidadResidencia', header: 'Localidad Residencia', group: 'Nacimiento / Residencia', siresOnly: true },
  { key: 'paisResidencia', header: 'País de Residencia', group: 'Nacimiento / Residencia', siresOnly: true },
  // Laboral
  { key: 'puesto', header: 'Puesto', group: 'Laboral', defaultSelected: true },
  { key: 'antiguedad', header: 'Antigüedad', group: 'Laboral', defaultSelected: true },
  { key: 'agentesRiesgo', header: 'Agentes de Riesgo', group: 'Laboral' },
  { key: 'estadoLaboral', header: 'Estado Laboral', group: 'Laboral', defaultSelected: true },
  { key: 'consultas', header: 'Consultas', group: 'Laboral', defaultSelected: true },
  // Exploración / Vista
  { key: 'imc', header: 'IMC', group: 'Exploración / Vista' },
  { key: 'cintura', header: 'Circunferencia Cintura', group: 'Exploración / Vista' },
  { key: 'categoriaTensionArterial', header: 'Tensión Arterial', group: 'Exploración / Vista' },
  { key: 'requiereLentes', header: 'Requiere Lentes', group: 'Exploración / Vista' },
  { key: 'correccionVisual', header: 'Vista Corregida', group: 'Exploración / Vista' },
  { key: 'daltonismo', header: 'Daltonismo', group: 'Exploración / Vista' },
  { key: 'agudeza', header: 'Agudeza Visual', group: 'Exploración / Vista' },
  // Antecedentes
  { key: 'lumbalgia', header: 'Lumbalgia', group: 'Antecedentes' },
  { key: 'diabetico', header: 'Diabético', group: 'Antecedentes' },
  { key: 'cardiopatico', header: 'Cardiopático', group: 'Antecedentes' },
  { key: 'alergia', header: 'Alergias', group: 'Antecedentes' },
  { key: 'hipertensivo', header: 'Hipertensivo', group: 'Antecedentes' },
  { key: 'respiratorios', header: 'Respiratorio', group: 'Antecedentes' },
  { key: 'epilepsia', header: 'Epilepsia', group: 'Antecedentes' },
  { key: 'quirurgico', header: 'Quirúrgico', group: 'Antecedentes' },
  { key: 'otro', header: 'Otros', group: 'Antecedentes' },
  { key: 'alcoholismo', header: 'Alcoholismo', group: 'Antecedentes' },
  { key: 'tabaquismo', header: 'Tabaquismo', group: 'Antecedentes' },
  { key: 'accidente', header: 'Accidente Laboral', group: 'Antecedentes' },
  // Aptitud / Estudios
  { key: 'aptitud', header: 'Aptitud', group: 'Aptitud / Estudios', defaultSelected: true },
  { key: 'audiometria', header: 'Audiometría', group: 'Aptitud / Estudios' },
  { key: 'categoriaAudiometria', header: 'Categoría Audiometría', group: 'Aptitud / Estudios' },
  { key: 'espirometriaRc', header: 'Espirometría', group: 'Aptitud / Estudios' },
  { key: 'ekgRc', header: 'EKG', group: 'Aptitud / Estudios' },
  { key: 'rayosXRc', header: 'Rayos X', group: 'Aptitud / Estudios' },
  { key: 'laboratorioRc', header: 'Laboratorio', group: 'Aptitud / Estudios' },
];

export const EXPORT_GROUP_ORDER: ExportColumnGroup[] = [
  'Identificación',
  'Demográficos',
  'Nacimiento / Residencia',
  'Laboral',
  'Exploración / Vista',
  'Antecedentes',
  'Aptitud / Estudios',
];

export function getColumnasDisponibles(isSIRES: boolean): ExportColumnDef[] {
  return EXPORT_COLUMNAS_CATALOGO.filter((c) => isSIRES || !c.siresOnly);
}

export function getDefaultColumnKeys(isSIRES: boolean): string[] {
  return getPresetColumnKeys('basico', isSIRES);
}

export function getPresetColumnKeys(presetId: ExportPresetId, isSIRES: boolean): string[] {
  return filterColumnKeysForRegime(PRESET_KEYS[presetId] ?? [], isSIRES);
}

export function filterColumnKeysForRegime(keys: string[], isSIRES: boolean): string[] {
  const available = new Set(getColumnasDisponibles(isSIRES).map((c) => c.key));
  const order = getColumnasDisponibles(isSIRES).map((c) => c.key);
  const selected = new Set(keys.filter((k) => available.has(k)));
  return order.filter((k) => selected.has(k));
}

export function isEmptyExportCell(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    const t = value.trim();
    return t === '' || t === '-';
  }
  return false;
}

function esNumeroEmpleadoValido(numeroEmpleado: unknown): boolean {
  return (
    typeof numeroEmpleado === 'string' &&
    numeroEmpleado !== '-' &&
    numeroEmpleado !== '' &&
    /^\d{1,7}$/.test(numeroEmpleado)
  );
}

/** Keys del catálogo (régimen) con al menos un valor no vacío en el lote mapeado. */
export function collectKeysWithData(
  mappedRows: Record<string, any>[],
  isSIRES: boolean,
): string[] {
  return getColumnasDisponibles(isSIRES)
    .map((c) => c.key)
    .filter((key) => {
      if (key === 'numeroEmpleado') {
        return mappedRows.some((r) => esNumeroEmpleadoValido(r.numeroEmpleado));
      }
      return mappedRows.some((r) => !isEmptyExportCell(cellValueForColumn(r, key)));
    });
}

/** Default false = ocultar columnas vacías en el modal */
export function loadShowEmptyColumnsPreference(defaultValue = false): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MOSTRAR_VACIAS);
    if (raw === null) return defaultValue;
    return raw === 'true';
  } catch {
    return defaultValue;
  }
}

export function persistShowEmptyColumnsPreference(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_MOSTRAR_VACIAS, String(value));
  } catch {
    // ignore
  }
}

export function loadPersistedColumnKeys(isSIRES: boolean): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLUMNAS_EXPORT);
    if (!raw) return getDefaultColumnKeys(isSIRES);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return getDefaultColumnKeys(isSIRES);
    const filtered = filterColumnKeysForRegime(
      parsed.filter((k): k is string => typeof k === 'string'),
      isSIRES,
    );
    return filtered.length > 0 ? filtered : getDefaultColumnKeys(isSIRES);
  } catch {
    return getDefaultColumnKeys(isSIRES);
  }
}

export function persistColumnKeys(keys: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_COLUMNAS_EXPORT, JSON.stringify(keys));
  } catch {
    // ignore quota / private mode
  }
}

export function groupColumns(columns: ExportColumnDef[]): { group: ExportColumnGroup; columns: ExportColumnDef[] }[] {
  return EXPORT_GROUP_ORDER.map((group) => ({
    group,
    columns: columns.filter((c) => c.group === group),
  })).filter((g) => g.columns.length > 0);
}

export function cellValueForColumn(trabajador: Record<string, any>, key: string): string | number {
  const raw = trabajador[key];
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'boolean') return raw ? 'Sí' : 'No';
  return raw;
}

export function headerForKey(key: string): string {
  return EXPORT_COLUMNAS_CATALOGO.find((c) => c.key === key)?.header ?? key;
}
