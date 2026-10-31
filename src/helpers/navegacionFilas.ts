/** Movimiento con el teclado entre las filas de una tabla. */
export const TECLAS_DE_FILA: ReadonlySet<string> = new Set(['ArrowUp', 'ArrowDown', 'Home', 'End']);

/** Índice de la fila destino; -1 es salir por arriba, hacia el buscador. */
export function filaDestino(tecla: string, indice: number, total: number): number {
  switch (tecla) {
    case 'ArrowUp':
      return indice - 1;
    case 'ArrowDown':
      return Math.min(indice + 1, total - 1);
    case 'Home':
      return 0;
    case 'End':
      return total - 1;
    default:
      return indice;
  }
}

/** Letra o número que, escrito sobre una fila, empieza una búsqueda. */
export function esTeclaDeBusqueda(evento: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey'>): boolean {
  if (evento.ctrlKey || evento.altKey || evento.metaKey) return false;
  return evento.key.length === 1 && /[\p{L}\p{N}]/u.test(evento.key);
}
