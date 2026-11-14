/**
 * Captura de fecha por partes (día, mes, año) con plantilla fija «dd/mm/aaaa», como el campo
 * de fecha del navegador: cada número reemplaza la letra de su lugar, las diagonales no se
 * mueven, al completar el día se pasa al mes, borrar regresa la parte a sus letras y ↑/↓
 * suben o bajan la parte. Lógica pura (sin DOM) para poder probarla.
 */
import { ddmmaaaaAIso, esFechaIsoValida, hoyIso } from './fechaDDMMAAAA';

export type Segmento = 0 | 1 | 2; // día, mes, año

export interface EstadoFecha {
  /** 8 dígitos: dd mm aaaa (null = sin capturar). */
  digitos: (number | null)[];
  segmento: Segmento;
  /** Dígitos tecleados en la parte actual desde que se entró a ella. */
  escritos: number;
}

const LETRAS = ['d', 'd', 'm', 'm', 'a', 'a', 'a', 'a'];
const INDICES: number[][] = [
  [0, 1],
  [2, 3],
  [4, 5, 6, 7],
];
/** Dónde está cada parte en el texto «dd/mm/aaaa». */
export const RANGO_TEXTO: [number, number][] = [
  [0, 2],
  [3, 5],
  [6, 10],
];

export const PLANTILLA = 'dd/mm/aaaa';

export function estadoVacio(): EstadoFecha {
  return { digitos: Array(8).fill(null), segmento: 0, escritos: 0 };
}

export function estadoDesdeIso(iso: string): EstadoFecha {
  const e = estadoVacio();
  if (!esFechaIsoValida(iso)) return e;
  const [a, m, d] = iso.split('-');
  e.digitos = `${d}${m}${a}`.split('').map(Number);
  return e;
}

export function textoDe(e: EstadoFecha): string {
  const c = e.digitos.map((d, i) => (d === null ? LETRAS[i] : String(d)));
  return `${c[0]}${c[1]}/${c[2]}${c[3]}/${c[4]}${c[5]}${c[6]}${c[7]}`;
}

export function estaVacia(e: EstadoFecha): boolean {
  return e.digitos.every((d) => d === null);
}

/** AAAA-MM-DD si está completa y existe; si no, ''. */
export function isoDe(e: EstadoFecha): string {
  if (e.digitos.some((d) => d === null)) return '';
  return ddmmaaaaAIso(textoDe(e));
}

/** La parte del texto en una posición del cursor (clic). */
export function segmentoEnPosicion(pos: number): Segmento {
  if (pos <= 2) return 0;
  if (pos <= 5) return 1;
  return 2;
}

const valorDe = (e: EstadoFecha, s: Segmento): number | null => {
  const ds = INDICES[s].map((i) => e.digitos[i]);
  if (ds.some((d) => d === null)) return null;
  return Number(ds.join(''));
};

const fijarValor = (e: EstadoFecha, s: Segmento, valor: number) => {
  const largo = INDICES[s].length;
  const texto = String(valor).padStart(largo, '0').slice(-largo);
  INDICES[s].forEach((i, k) => {
    e.digitos[i] = Number(texto[k]);
  });
};

const limpiar = (e: EstadoFecha, s: Segmento) => {
  INDICES[s].forEach((i) => {
    e.digitos[i] = null;
  });
};

export function irA(e: EstadoFecha, s: number): EstadoFecha {
  const n = { ...e, digitos: [...e.digitos] };
  n.segmento = Math.max(0, Math.min(2, s)) as Segmento;
  n.escritos = 0;
  return n;
}

/** Un número tecleado: reemplaza la letra de su lugar; al completar la parte pasa a la siguiente. */
export function escribirDigito(e: EstadoFecha, digito: number): EstadoFecha {
  const n = { ...e, digitos: [...e.digitos] };
  const s = n.segmento;
  const [i0, i1] = INDICES[s];
  if (s < 2) {
    const tope = s === 0 ? 31 : 12;
    const maxPrimero = s === 0 ? 3 : 1;
    if (n.escritos === 0) {
      limpiar(n, s);
      if (digito > maxPrimero) {
        // «5» en el día ya no admite otro número: queda 05 y pasa al mes
        n.digitos[i0] = 0;
        n.digitos[i1] = digito;
        return irA(n, s + 1);
      }
      n.digitos[i0] = digito;
      n.escritos = 1;
      return n;
    }
    let valor = (n.digitos[i0] ?? 0) * 10 + digito;
    if (valor > tope) valor = tope;
    if (valor === 0) valor = 1;
    fijarValor(n, s, valor);
    return s === 0 ? irA(n, 1) : irA(n, 2);
  }
  // Año: hasta 4 números, de izquierda a derecha; uno más empieza de nuevo
  if (n.escritos === 0 || n.escritos >= 4) {
    limpiar(n, 2);
    n.escritos = 0;
  }
  n.digitos[INDICES[2][n.escritos]] = digito;
  n.escritos += 1;
  return n;
}

/** «/» o «-»: pasa a la siguiente parte (un día o mes de un número se completa con 0). */
export function separador(e: EstadoFecha): EstadoFecha {
  const n = { ...e, digitos: [...e.digitos] };
  const s = n.segmento;
  // Sin nada tecleado en esta parte (p. ej. «5» ya pasó solo al mes): la «/» no hace nada
  if (n.escritos === 0) return n;
  if (s < 2 && n.escritos === 1) {
    const [i0, i1] = INDICES[s];
    const d = n.digitos[i0] ?? 0;
    if (d === 0) return n;
    n.digitos[i0] = 0;
    n.digitos[i1] = d;
  }
  return s < 2 ? irA(n, s + 1) : n;
}

/** Borrar (← retroceso o Supr): la parte vuelve a sus letras; vacía, retroceso va a la anterior. */
export function borrar(e: EstadoFecha, haciaAtras = true): EstadoFecha {
  const n = { ...e, digitos: [...e.digitos] };
  const s = n.segmento;
  const tieneAlgo = INDICES[s].some((i) => n.digitos[i] !== null);
  if (tieneAlgo) {
    limpiar(n, s);
    n.escritos = 0;
    return n;
  }
  return haciaAtras && s > 0 ? irA(n, s - 1) : n;
}

export function borrarTodo(): EstadoFecha {
  return estadoVacio();
}

/** ↑ / ↓: sube o baja la parte (vacía empieza en la de hoy). */
export function cambiarConFlecha(e: EstadoFecha, delta: 1 | -1): EstadoFecha {
  const n = { ...e, digitos: [...e.digitos] };
  const s = n.segmento;
  const actual = valorDe(n, s);
  const hoy = hoyIso();
  const deHoy = s === 0 ? Number(hoy.slice(8, 10)) : s === 1 ? Number(hoy.slice(5, 7)) : Number(hoy.slice(0, 4));
  let valor: number;
  if (actual === null) valor = deHoy;
  else if (s === 0) valor = ((actual - 1 + delta + 31) % 31) + 1;
  else if (s === 1) valor = ((actual - 1 + delta + 12) % 12) + 1;
  else valor = Math.max(1, actual + delta);
  fijarValor(n, s, valor);
  n.escritos = 0;
  return n;
}

/** Pegar: AAAA-MM-DD o DD/MM/AAAA (con «/», «-» o «.»). */
export function estadoDesdeTextoPegado(texto: string): EstadoFecha | null {
  const t = String(texto ?? '').trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso && esFechaIsoValida(`${iso[1]}-${iso[2]}-${iso[3]}`)) {
    return estadoDesdeIso(`${iso[1]}-${iso[2]}-${iso[3]}`);
  }
  const dma = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (dma) {
    const candidato = `${dma[3]}-${dma[2].padStart(2, '0')}-${dma[1].padStart(2, '0')}`;
    if (esFechaIsoValida(candidato)) return estadoDesdeIso(candidato);
  }
  return null;
}
