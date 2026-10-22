import { describe, expect, it, vi } from 'vitest';
import {
  bytesDeDataUrl,
  CapturaFirma,
  dibujarLinea,
  exportarImagenFirma,
  MAX_IMAGEN_FIRMA_BYTES,
  MIN_DURACION_FIRMA_MS,
  MIN_PUNTOS_FIRMA,
  type EventoPuntero,
} from './capturaFirma';

const ev = (x: number, tiempo: number, extra: Partial<EventoPuntero> = {}): EventoPuntero => ({
  x,
  y: x % 7,
  tiempo,
  presion: 0.5,
  pointerType: 'pen',
  ...extra,
});

/** Una línea de `puntos` puntos repartidos en `duracion` ms. */
function firmar(captura: CapturaFirma, puntos: number, duracion: number, extra: Partial<EventoPuntero> = {}) {
  captura.iniciarLinea(ev(0, 1000, extra));
  for (let i = 1; i < puntos; i++) captura.agregarPunto(ev(i, 1000 + (duracion * i) / (puntos - 1), extra));
}

describe('CapturaFirma', () => {
  it('guarda posición, tiempo desde el primer punto y presión de la pluma', () => {
    const captura = new CapturaFirma();
    captura.iniciarLinea(ev(10.123, 5000, { presion: 0.42 }));
    captura.agregarPunto(ev(20, 5016.4, { presion: 0.61 }));
    expect(captura.trazo).toEqual([
      [
        { x: 10.1, y: 3.1, t: 0, p: 0.42 },
        { x: 20, y: 6, t: 16.4, p: 0.61 },
      ],
    ]);
    expect(captura.pointerType).toBe('pen');
  });

  it('con el mouse no guarda presión (el navegador da 0.5 fijo)', () => {
    const captura = new CapturaFirma();
    captura.iniciarLinea(ev(1, 0, { pointerType: 'mouse' }));
    expect(captura.trazo[0][0].p).toBeUndefined();
  });

  it('no es firma hasta tener suficientes puntos y duración (los mismos umbrales del backend)', () => {
    const corta = new CapturaFirma();
    firmar(corta, MIN_PUNTOS_FIRMA - 1, 900);
    expect(corta.esValida).toBe(false);

    const rapida = new CapturaFirma();
    firmar(rapida, 40, MIN_DURACION_FIRMA_MS - 50);
    expect(rapida.esValida).toBe(false);

    const buena = new CapturaFirma();
    firmar(buena, 40, 900);
    expect(buena.esValida).toBe(true);
    expect(buena.duracionMs).toBe(900);
  });

  it('ignora puntos repetidos en el mismo lugar', () => {
    const captura = new CapturaFirma();
    captura.iniciarLinea(ev(5, 0));
    expect(captura.agregarPunto(ev(5, 10))).toBe(false);
    expect(captura.puntos).toBe(1);
  });

  it('si se usó el mouse en algún trazo, cuenta como mouse', () => {
    const captura = new CapturaFirma();
    firmar(captura, 10, 300, { pointerType: 'pen' });
    captura.iniciarLinea(ev(50, 2000, { pointerType: 'mouse' }));
    expect(captura.pointerType).toBe('mouse');
  });

  it('limpiar empieza de cero, también el tiempo', () => {
    const captura = new CapturaFirma();
    firmar(captura, 30, 800);
    captura.limpiar();
    expect(captura.vacia).toBe(true);
    expect(captura.pointerType).toBeNull();
    captura.iniciarLinea(ev(1, 99999));
    expect(captura.trazo[0][0].t).toBe(0);
  });
});

function lienzoFalso() {
  return {
    lineCap: 'butt',
    lineJoin: 'miter',
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
  } as any;
}

describe('dibujo de la firma', () => {
  it('un punto suelto se dibuja como punto', () => {
    const ctx = lienzoFalso();
    dibujarLinea(ctx, [{ x: 5, y: 5, t: 0 }]);
    expect(ctx.arc).toHaveBeenCalledTimes(1);
    expect(ctx.fill).toHaveBeenCalledTimes(1);
  });

  it('una línea de n puntos: n - 1 tramos más el cierre, escalados', () => {
    const ctx = lienzoFalso();
    const linea = [0, 1, 2, 3].map((i) => ({ x: i * 10, y: 0, t: i }));
    dibujarLinea(ctx, linea, 2);
    expect(ctx.stroke).toHaveBeenCalledTimes(4);
    // El cierre termina en el último punto, al doble de escala
    expect(ctx.quadraticCurveTo.mock.calls.at(-1).slice(2)).toEqual([60, 0]);
  });

  it('se niega a exportar si el recuadro no tiene tamaño', () => {
    expect(() => exportarImagenFirma([[{ x: 1, y: 1, t: 0 }]], 0, 176)).toThrow(/no tiene tamaño/);
  });

  it('exporta al doble de resolución y, si pesa demasiado, a resolución normal', () => {
    const tamanos: number[] = [];
    const crearCanvas = () => {
      const c: any = {
        width: 0,
        height: 0,
        getContext: () => lienzoFalso(),
        toDataURL: () => {
          tamanos.push(c.width);
          const bytes = c.width > 600 ? MAX_IMAGEN_FIRMA_BYTES + 10 : 1000;
          return 'data:image/png;base64,' + 'A'.repeat(Math.ceil((bytes * 4) / 3));
        },
      };
      return c;
    };
    const imagen = exportarImagenFirma([[{ x: 1, y: 1, t: 0 }]], 600, 200, crearCanvas);
    expect(tamanos).toEqual([1200, 600]);
    expect(bytesDeDataUrl(imagen)).toBeLessThanOrEqual(MAX_IMAGEN_FIRMA_BYTES);
  });
});
