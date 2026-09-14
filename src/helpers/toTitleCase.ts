/**
 * Convierte texto de catálogo (p. ej. AHOME, SINALOA) a nombre propio.
 * Respeta espacios y guiones: "BAJA CALIFORNIA SUR" → "Baja California Sur".
 */
export function toTitleCase(value: string | null | undefined): string {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .replace(/(?:^|\s|-)\S/g, (letter) => letter.toUpperCase());
}
