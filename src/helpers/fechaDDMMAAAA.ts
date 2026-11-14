/**
 * Fechas en pantalla siempre como DD/MM/AAAA, sin depender del idioma del navegador. El dato
 * sigue siendo AAAA-MM-DD (lo que guardan los formularios y el servidor). Todo es texto: no se
 * pasa por objetos Date con hora, para que la zona horaria nunca corra un día.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

export function diasDelMes(anio: number, mes: number): number {
  return [31, esBisiesto(anio) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1] ?? 0;
}

/** AAAA-MM-DD existe en el calendario (31/02 no). */
export function esFechaIsoValida(iso: unknown): iso is string {
  const m = ISO.exec(String(iso ?? ''));
  if (!m) return false;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  return anio >= 1 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasDelMes(anio, mes);
}

/** AAAA-MM-DD (o el inicio de un ISO con hora) → DD/MM/AAAA; lo demás → ''. */
export function isoADDMMAAAA(valor: unknown): string {
  const iso = String(valor ?? '').slice(0, 10);
  if (!esFechaIsoValida(iso)) return '';
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** DD/MM/AAAA completo y existente → AAAA-MM-DD; si no, ''. */
export function ddmmaaaaAIso(texto: unknown): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(texto ?? '').trim());
  if (!m) return '';
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return esFechaIsoValida(iso) ? iso : '';
}

/**
 * Lo que se teclea o se pega → DD/MM/AAAA parcial. Solo dígitos: «05112026» → «05/11/2026».
 * Con separadores, un día o mes de un dígito se completa: «5/11/2026» → «05/11/2026».
 * Pegar «2026-11-05» también funciona.
 */
export function enmascararFecha(entrada: string): string {
  const crudo = String(entrada ?? '').trim();
  if (ISO.test(crudo)) return isoADDMMAAAA(crudo);
  const largo = [2, 2, 4];
  const partes = ['', '', ''];
  let seg = 0;
  for (const c of crudo) {
    if (seg > 2) break;
    if (/\d/.test(c)) {
      if (partes[seg].length < largo[seg]) partes[seg] += c;
      // Día y mes de dos dígitos: se pasa solo al siguiente
      if (seg < 2 && partes[seg].length === largo[seg]) seg += 1;
    } else if (seg < 2 && partes[seg].length === 1) {
      // «5/» → «05/»
      partes[seg] = `0${partes[seg]}`;
      seg += 1;
    }
  }
  const [d, m, a] = partes;
  if (!m && !a) return seg >= 1 && d.length === 2 && /[^0-9]$/.test(crudo) ? `${d}/` : d;
  if (!a) return seg >= 2 && /[^0-9]$/.test(crudo) ? `${d}/${m}/` : `${d}/${m}`;
  return `${d}/${m}/${a}`;
}

/** Hoy en AAAA-MM-DD (fecha local de la computadora). */
export function hoyIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** La fecha queda dentro de min/max (AAAA-MM-DD; vacíos no limitan). */
export function dentroDeRango(iso: string, min?: string | null, max?: string | null): boolean {
  if (!esFechaIsoValida(iso)) return false;
  if (min && esFechaIsoValida(min) && iso < min) return false;
  if (max && esFechaIsoValida(max) && iso > max) return false;
  return true;
}

/** Una fecha (Date) para mostrar en texto: siempre DD/MM/AAAA, nunca según el navegador. */
export function fechaDateADDMMAAAA(fecha: Date | null | undefined): string {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(fecha.getDate())}/${p(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}
