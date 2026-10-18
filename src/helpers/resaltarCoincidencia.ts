/**
 * Parte un texto en tramos para resaltar dónde coincide una búsqueda, sin distinguir acentos ni
 * mayúsculas («hipertension» resalta «HIPERTENSIÓN»). Los tramos conservan el texto original.
 */
export interface TramoResaltado {
  texto: string;
  coincide: boolean;
}

const base = (caracter: string) =>
  caracter.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function tramosResaltados(texto: string, consulta: string): TramoResaltado[] {
  const original = String(texto ?? '');
  const q = base(String(consulta ?? '').trim());
  if (!q || !original) return [{ texto: original, coincide: false }];

  // Texto normalizado y, por cada carácter normalizado, su posición en el original
  let normalizado = '';
  const origen: number[] = [];
  Array.from(original).forEach((caracter, indice, todos) => {
    const posicion = todos.slice(0, indice).join('').length;
    for (const letra of base(caracter)) {
      normalizado += letra;
      origen.push(posicion);
    }
  });

  const tramos: TramoResaltado[] = [];
  let cursor = 0;
  let desde = normalizado.indexOf(q);
  while (desde !== -1) {
    const inicio = origen[desde];
    const ultimo = origen[desde + q.length - 1];
    const fin = ultimo + Array.from(original.slice(ultimo))[0].length;
    if (inicio > cursor) tramos.push({ texto: original.slice(cursor, inicio), coincide: false });
    tramos.push({ texto: original.slice(inicio, fin), coincide: true });
    cursor = fin;
    desde = normalizado.indexOf(q, desde + q.length);
  }
  if (cursor < original.length) tramos.push({ texto: original.slice(cursor), coincide: false });
  return tramos.length ? tramos : [{ texto: original, coincide: false }];
}
