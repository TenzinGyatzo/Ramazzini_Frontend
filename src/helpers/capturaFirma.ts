/**
 * Captura de la firma en pantalla (docs/firma-en-pantalla-especificacion.md, 3 y 5.2): guarda el
 * trazo con posición, tiempo y presión, decide si ya es una firma y la dibuja. Los umbrales son
 * los mismos que valida el backend (formato-firmado-evidencia.ts).
 */

export const MIN_PUNTOS_FIRMA = 20;
export const MIN_DURACION_FIRMA_MS = 300;
export const MAX_PUNTOS_FIRMA = 20_000;
export const MAX_IMAGEN_FIRMA_BYTES = 200 * 1024;

export type TipoPuntero = 'pen' | 'touch' | 'mouse';

export interface PuntoFirma {
  x: number;
  y: number;
  /** Milisegundos desde el primer punto de la firma. */
  t: number;
  /** Presión (0 a 1); solo la dan las plumas y algunas pantallas. */
  p?: number;
}

export interface FirmaCapturada {
  imagen: string;
  trazo: PuntoFirma[][];
  dispositivo: { pointerType: TipoPuntero; ancho: number; alto: number; userAgent?: string };
  duracionMs: number;
}

export interface EventoPuntero {
  x: number;
  y: number;
  /** `event.timeStamp` */
  tiempo: number;
  presion?: number;
  pointerType: string;
}

const redondear = (n: number, decimales = 1) => Math.round(n * 10 ** decimales) / 10 ** decimales;

function tipoPuntero(tipo: string): TipoPuntero {
  return tipo === 'pen' || tipo === 'touch' ? tipo : 'mouse';
}

/** Trazo de una firma en curso. No sabe nada del canvas: recibe coordenadas ya en el recuadro. */
export class CapturaFirma {
  trazo: PuntoFirma[][] = [];
  private inicio: number | null = null;
  private punteros = new Set<TipoPuntero>();

  get puntos(): number {
    return this.trazo.reduce((total, linea) => total + linea.length, 0);
  }

  get duracionMs(): number {
    const ultima = this.trazo.at(-1)?.at(-1);
    return ultima ? Math.round(ultima.t) : 0;
  }

  /** Si se usó el mouse en algún trazo cuenta como mouse: es lo que el operador debe saber. */
  get pointerType(): TipoPuntero | null {
    if (this.punteros.has('mouse')) return 'mouse';
    if (this.punteros.has('pen')) return 'pen';
    if (this.punteros.has('touch')) return 'touch';
    return null;
  }

  get vacia(): boolean {
    return this.puntos === 0;
  }

  /** Suficiente para no ser un clic accidental (el backend rechaza lo demás). */
  get esValida(): boolean {
    return this.puntos >= MIN_PUNTOS_FIRMA && this.duracionMs >= MIN_DURACION_FIRMA_MS;
  }

  private punto(e: EventoPuntero): PuntoFirma {
    if (this.inicio === null) this.inicio = e.tiempo;
    const punto: PuntoFirma = { x: redondear(e.x), y: redondear(e.y), t: redondear(e.tiempo - this.inicio) };
    // El mouse reporta 0.5 fijo al presionar: no es presión real
    if (e.pointerType !== 'mouse' && typeof e.presion === 'number' && e.presion > 0) {
      punto.p = redondear(e.presion, 3);
    }
    return punto;
  }

  iniciarLinea(e: EventoPuntero): void {
    if (this.puntos >= MAX_PUNTOS_FIRMA) return;
    this.punteros.add(tipoPuntero(e.pointerType));
    this.trazo.push([this.punto(e)]);
  }

  /** Devuelve false si no hay línea abierta o se llegó al tope de puntos. */
  agregarPunto(e: EventoPuntero): boolean {
    const linea = this.trazo.at(-1);
    if (!linea || this.puntos >= MAX_PUNTOS_FIRMA) return false;
    const punto = this.punto(e);
    const anterior = linea.at(-1)!;
    // Un punto en el mismo lugar no aporta al trazo
    if (anterior.x === punto.x && anterior.y === punto.y) return false;
    linea.push(punto);
    return true;
  }

  limpiar(): void {
    this.trazo = [];
    this.inicio = null;
    this.punteros.clear();
  }
}

export interface Lienzo2D {
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  fillStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  stroke(): void;
  fill(): void;
}

export const COLOR_TINTA = '#1e3a8a';
const GROSOR_BASE = 2.4;

function grosor(p?: number): number {
  return p === undefined ? GROSOR_BASE : GROSOR_BASE * (0.6 + p * 0.8);
}

function preparar(ctx: Lienzo2D): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COLOR_TINTA;
  ctx.fillStyle = COLOR_TINTA;
}

const medio = (a: PuntoFirma, b: PuntoFirma) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function curva(
  ctx: Lienzo2D,
  desde: { x: number; y: number },
  control: { x: number; y: number },
  hasta: { x: number; y: number },
  ancho: number,
  escala: number,
): void {
  ctx.lineWidth = ancho * escala;
  ctx.beginPath();
  ctx.moveTo(desde.x * escala, desde.y * escala);
  ctx.quadraticCurveTo(control.x * escala, control.y * escala, hasta.x * escala, hasta.y * escala);
  ctx.stroke();
}

/**
 * Tramo del punto `i` (curva por los puntos medios, para que no se vea quebrada): llega al punto
 * medio entre `i - 1` e `i`; el resto lo dibuja el siguiente tramo o el cierre de la línea.
 */
export function dibujarTramo(ctx: Lienzo2D, linea: PuntoFirma[], i: number, escala = 1): void {
  preparar(ctx);
  if (i === 0) {
    const { x, y, p } = linea[0];
    ctx.beginPath();
    ctx.arc(x * escala, y * escala, (grosor(p) / 2) * escala, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const a = linea[i - 1];
  const b = linea[i];
  const desde = i === 1 ? a : medio(linea[i - 2], a);
  curva(ctx, desde, a, medio(a, b), grosor(b.p ?? a.p), escala);
}

/** Último tramo de una línea terminada: del último punto medio al último punto. */
export function cerrarLinea(ctx: Lienzo2D, linea: PuntoFirma[], escala = 1): void {
  if (linea.length < 2) return;
  preparar(ctx);
  const a = linea.at(-2)!;
  const b = linea.at(-1)!;
  const desde = medio(a, b);
  curva(ctx, desde, desde, b, grosor(b.p ?? a.p), escala);
}

export function dibujarLinea(ctx: Lienzo2D, linea: PuntoFirma[], escala = 1): void {
  if (linea.length === 0) return;
  if (linea.length === 1) {
    dibujarTramo(ctx, linea, 0, escala);
    return;
  }
  for (let i = 1; i < linea.length; i++) dibujarTramo(ctx, linea, i, escala);
  cerrarLinea(ctx, linea, escala);
}

export function dibujarTrazo(ctx: Lienzo2D, trazo: PuntoFirma[][], escala = 1): void {
  trazo.forEach((linea) => dibujarLinea(ctx, linea, escala));
}

/** Tamaño aproximado en bytes de un data URL en base64. */
export function bytesDeDataUrl(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((base64.length * 3) / 4);
}

/**
 * PNG con fondo transparente dibujado desde el trazo (no desde la pantalla), al doble de
 * resolución; si pasa del tope del backend, a resolución normal.
 */
export function exportarImagenFirma(
  trazo: PuntoFirma[][],
  ancho: number,
  alto: number,
  crearCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
): string {
  // Un canvas de 0 px da «data:,»: nunca se envía una firma vacía
  if (!(ancho >= 1 && alto >= 1)) throw new Error('El recuadro de firma no tiene tamaño');
  for (const escala of [2, 1]) {
    const canvas = crearCanvas();
    canvas.width = Math.round(ancho * escala);
    canvas.height = Math.round(alto * escala);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no permite dibujar la firma');
    dibujarTrazo(ctx, trazo, escala);
    const imagen = canvas.toDataURL('image/png');
    if (bytesDeDataUrl(imagen) <= MAX_IMAGEN_FIRMA_BYTES) return imagen;
  }
  throw new Error('La imagen de la firma es demasiado grande');
}
