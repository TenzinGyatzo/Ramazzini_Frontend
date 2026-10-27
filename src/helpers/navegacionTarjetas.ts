/**
 * Navegación con flechas entre tarjetas acomodadas en rejilla (empresas, centros de trabajo).
 * La rejilla cambia de columnas según la pantalla, así que las filas se deducen de la posición
 * real de cada tarjeta: las que comparten altura forman una fila.
 */
export interface PosicionTarjeta {
  top: number;
  left: number;
  /** Ancho; sin él, la tarjeta cuenta como un punto en `left`. */
  width?: number;
  /** Alto; con él, «misma fila» es que se encimen en vertical. */
  height?: number;
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
/** Cuánto pesa la distancia horizontal frente a la vertical al subir o bajar. */
const PESO_HORIZONTAL = 3;

/** Separación horizontal entre dos tarjetas: 0 si se enciman (están en la misma columna). */
function separacionHorizontal(a: PosicionTarjeta, b: PosicionTarjeta): number {
  const finA = a.left + (a.width ?? 0);
  const finB = b.left + (b.width ?? 0);
  if (finA < b.left) return b.left - finA;
  if (finB < a.left) return a.left - finB;
  return 0;
}

/** Misma franja de altura: se enciman en vertical (o casi la misma altura si no hay alto). */
function mismaFila(a: PosicionTarjeta, b: PosicionTarjeta): boolean {
  if (a.height === undefined || b.height === undefined) return Math.abs(a.top - b.top) <= TOLERANCIA_FILA;
  return a.top < b.top + b.height && b.top < a.top + a.height;
}

/**
 * Izquierda o derecha: la más cercana en esa dirección dentro de la misma franja de altura
 * (en Inicio, de los expedientes a las empresas recientes). Si no hay, sigue el orden de la
 * lista: en una rejilla, al final de una fila pasa a la siguiente.
 */
function aLosLados(posiciones: PosicionTarjeta[], actual: number, haciaDerecha: boolean): number | null {
  const origen = posiciones[actual];
  let mejor: { indice: number; distancia: number } | null = null;
  posiciones.forEach((p, indice) => {
    if (indice === actual || !mismaFila(origen, p)) return;
    const distancia = haciaDerecha ? p.left - origen.left : origen.left - p.left;
    if (distancia <= TOLERANCIA_FILA) return;
    if (!mejor || distancia < mejor.distancia) mejor = { indice, distancia };
  });
  if (mejor) return (mejor as { indice: number }).indice;
  const siguiente = haciaDerecha ? actual + 1 : actual - 1;
  return siguiente >= 0 && siguiente < posiciones.length ? siguiente : null;
}

/**
 * Arriba o abajo: la más cercana entre las que están en esa dirección, con la distancia
 * horizontal pesando más que la vertical. En una rejilla da la de la misma columna en la fila
 * siguiente; en una pantalla irregular (Inicio) prefiere lo que está justo debajo sobre un
 * elemento más arriba pero del otro lado.
 */
function enOtraFila(posiciones: PosicionTarjeta[], actual: number, haciaAbajo: boolean): number | null {
  const origen = posiciones[actual];
  let mejor: { indice: number; puntaje: number; vertical: number } | null = null;
  posiciones.forEach((p, indice) => {
    const vertical = haciaAbajo ? p.top - origen.top : origen.top - p.top;
    if (vertical <= TOLERANCIA_FILA) return;
    const puntaje = vertical + PESO_HORIZONTAL * separacionHorizontal(origen, p);
    if (!mejor || puntaje < mejor.puntaje || (puntaje === mejor.puntaje && vertical < mejor.vertical)) {
      mejor = { indice, puntaje, vertical };
    }
  });
  return mejor ? (mejor as { indice: number }).indice : null;
}

/**
 * Índice de la tarjeta a la que lleva la tecla, o null si no hay a dónde ir.
 * Las cuatro direcciones son espaciales (por posición en pantalla); izquierda y derecha, sin
 * nada al lado, siguen el orden de la lista.
 */
export function vecinoEnRejilla(
  posiciones: PosicionTarjeta[],
  actual: number,
  tecla: string,
): number | null {
  if (actual < 0 || actual >= posiciones.length) return null;
  switch (tecla) {
    case 'ArrowRight':
      return aLosLados(posiciones, actual, true);
    case 'ArrowLeft':
      return aLosLados(posiciones, actual, false);
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
