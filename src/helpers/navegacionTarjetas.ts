/**
 * Navegación con flechas entre tarjetas acomodadas en rejilla (empresas, centros de trabajo).
 * La rejilla cambia de columnas según la pantalla, así que las filas se deducen de la posición
 * real de cada tarjeta: las que comparten altura forman una fila.
 */
export interface PosicionTarjeta {
  top: number;
  left: number;
}

export type TeclaNavegacion = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End';

export const TECLAS_NAVEGACION: ReadonlySet<string> = new Set<TeclaNavegacion>([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

/** Diferencia de altura (px) que todavía cuenta como la misma fila. */
const TOLERANCIA_FILA = 4;

/** Tarjeta de la fila de arriba o de abajo más cercana en horizontal. */
function enOtraFila(posiciones: PosicionTarjeta[], actual: number, haciaAbajo: boolean): number | null {
  const origen = posiciones[actual];
  const candidatas = posiciones
    .map((posicion, indice) => ({ ...posicion, indice }))
    .filter((p) => (haciaAbajo ? p.top > origen.top + TOLERANCIA_FILA : p.top < origen.top - TOLERANCIA_FILA));
  if (!candidatas.length) return null;
  const filaDestino = haciaAbajo
    ? Math.min(...candidatas.map((p) => p.top))
    : Math.max(...candidatas.map((p) => p.top));
  const fila = candidatas.filter((p) => Math.abs(p.top - filaDestino) <= TOLERANCIA_FILA);
  return fila.reduce((mejor, p) =>
    Math.abs(p.left - origen.left) < Math.abs(mejor.left - origen.left) ? p : mejor,
  ).indice;
}

/**
 * Índice de la tarjeta a la que lleva la tecla, o null si no hay a dónde ir.
 * Izquierda y derecha siguen el orden de la lista (al final de una fila pasan a la siguiente).
 */
export function vecinoEnRejilla(
  posiciones: PosicionTarjeta[],
  actual: number,
  tecla: string,
): number | null {
  if (actual < 0 || actual >= posiciones.length) return null;
  switch (tecla) {
    case 'ArrowRight':
      return actual + 1 < posiciones.length ? actual + 1 : null;
    case 'ArrowLeft':
      return actual > 0 ? actual - 1 : null;
    case 'ArrowDown':
      return enOtraFila(posiciones, actual, true);
    case 'ArrowUp':
      return enOtraFila(posiciones, actual, false);
    case 'Home':
      return 0;
    case 'End':
      return posiciones.length - 1;
    default:
      return null;
  }
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Tecla que cuenta para el salto por letra: una letra o un número. */
export function esTeclaDeSalto(tecla: string): boolean {
  return tecla.length === 1 && /[\p{L}\p{N}]/u.test(tecla);
}

/**
 * Salto por letra: índice de la tarjeta cuyo nombre empieza con lo escrito, o null.
 * - Una misma letra repetida («d», «dd», «ddd») avanza a la siguiente que empieza con ella,
 *   y al final vuelve a la primera.
 * - Varias letras distintas escritas seguido («con») buscan ese inicio desde la actual.
 * Sin acentos ni mayúsculas. `actual` es -1 si ninguna tarjeta tiene el foco.
 */
export function indicePorTexto(nombres: string[], actual: number, texto: string): number | null {
  const buscado = normalizar(texto);
  if (!buscado || !nombres.length) return null;
  const repetida = [...buscado].every((letra) => letra === buscado[0]);
  const prefijo = repetida ? buscado[0] : buscado;
  const inicio = repetida ? actual + 1 : Math.max(actual, 0);
  for (let paso = 0; paso < nombres.length; paso++) {
    const indice = (inicio + paso) % nombres.length;
    if (normalizar(nombres[indice]).startsWith(prefijo)) return indice;
  }
  return null;
}
