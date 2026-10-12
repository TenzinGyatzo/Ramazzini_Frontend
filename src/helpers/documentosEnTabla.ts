/**
 * Tabla de trabajadores: columnas que resumen el documento más reciente de
 * cada trabajador (antidoping, Cuestionario Nórdico, sueño y vigilia) y lo que
 * refirió de tabaquismo y alcohol. Las palabras de cada columna son también las
 * opciones de su filtro y lo que el tablero de salud manda al navegar hasta
 * aquí, así que viven en un solo lugar.
 */
export const SIN_DATO = '-';

export const OPCIONES_SI_NO = ['Si', 'No', SIN_DATO];
export const OPCIONES_ANTIDOPING = ['Positivo', 'Negativo', SIN_DATO];

/** Resultado del Cuestionario Nórdico, por su semáforo. */
export const NORDICO_EN_TABLA: Record<string, string> = {
  verde: 'Sin molestias',
  amarillo: 'Con molestias',
  rojo: 'Requiere seguimiento',
};
export const OPCIONES_NORDICO = [...Object.values(NORDICO_EN_TABLA), SIN_DATO];

/** Nivel general de la evaluación de sueño y vigilia. */
export const SUENO_EN_TABLA: Record<string, string> = {
  verde: 'Sin síntomas',
  amarillo: 'Ocasional',
  naranja: 'Semanal',
  rojo: 'Frecuente',
};
export const OPCIONES_SUENO = [...Object.values(SUENO_EN_TABLA), SIN_DATO];

/** «Si», «No» o «-», sin importar cómo lo guardó el documento. */
export function siNoEnTabla(valor: unknown): string {
  if (typeof valor !== 'string') return SIN_DATO;
  if (/^s[ií]$/i.test(valor.trim())) return 'Si';
  return /^no$/i.test(valor.trim()) ? 'No' : SIN_DATO;
}

interface FilaConDocumentos {
  historiaClinicaResumen?: { tabaquismoReferido?: string | null; alcoholismoReferido?: string | null } | null;
  documentosResumen?: { antidoping?: string | null; nordico?: string | null; sueno?: string | null } | null;
}

/** Lo que muestra cada una de las cinco columnas para un trabajador. */
export function documentosEnTabla(fila: FilaConDocumentos | null | undefined) {
  const documentos = fila?.documentosResumen;
  return {
    tabaquismo: siNoEnTabla(fila?.historiaClinicaResumen?.tabaquismoReferido),
    alcoholismo: siNoEnTabla(fila?.historiaClinicaResumen?.alcoholismoReferido),
    antidoping: OPCIONES_ANTIDOPING.includes(documentos?.antidoping ?? '') ? (documentos?.antidoping as string) : SIN_DATO,
    nordico: NORDICO_EN_TABLA[documentos?.nordico ?? ''] ?? SIN_DATO,
    sueno: SUENO_EN_TABLA[documentos?.sueno ?? ''] ?? SIN_DATO,
  };
}
