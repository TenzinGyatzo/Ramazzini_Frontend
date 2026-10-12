/**
 * Tabla de trabajadores: filtro por edad con los mismos grupos de cinco años
 * que la gráfica de grupos etarios del tablero de salud, para que un clic en
 * la gráfica lleve a la lista de ese grupo.
 */
import { GRUPOS_ETARIOS } from './dashboardDataProcessor';

export const OPCIONES_DE_EDAD: string[] = GRUPOS_ETARIOS.map((grupo) => grupo.rango);

/**
 * Expresión regular para la columna «Edad» de la tabla, que muestra «34 años».
 * Vacía si el grupo no existe: sin filtro.
 */
export function expresionDeEdad(rango: string): string {
  const grupo = GRUPOS_ETARIOS.find((g) => g.rango === rango);
  if (!grupo) return '';
  const edades = Array.from({ length: grupo.max - grupo.min + 1 }, (_, i) => grupo.min + i);
  return `^(${edades.join('|')}) años$`;
}
