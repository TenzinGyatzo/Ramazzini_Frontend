import { describe, expect, it, vi } from 'vitest';
import { crearAvisos, duracionDeAviso, htmlDeAviso } from './toast';

function libreriaFalsa() {
  const abiertos: any[] = [];
  return {
    abiertos,
    open: vi.fn((opciones: any) => {
      abiertos.push(opciones);
      return { dismiss: () => opciones.onDismiss?.() };
    }),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    default: vi.fn(),
    clear: vi.fn(),
  };
}

describe('duracionDeAviso', () => {
  it('depende del tipo', () => {
    expect(duracionDeAviso('success', 'Guardado')).toBe(3500);
    expect(duracionDeAviso('warning', 'Revisa')).toBe(6000);
    expect(duracionDeAviso('error', 'Falló')).toBe(8000);
    expect(duracionDeAviso(undefined, 'Sin tipo')).toBe(3500);
  });

  it('agrega tiempo a los mensajes largos, con un máximo', () => {
    expect(duracionDeAviso('error', 'x'.repeat(130))).toBe(8000 + 50 * 40);
    expect(duracionDeAviso('error', 'x'.repeat(1000))).toBe(12000);
  });

  it('respeta una duración explícita', () => {
    expect(duracionDeAviso('error', 'x', 9000)).toBe(9000);
    expect(duracionDeAviso('success', 'x', 0)).toBe(3500);
  });
});

describe('htmlDeAviso', () => {
  it('escapa el texto y pone la barra con la duración', () => {
    const html = htmlDeAviso('error', '<img src=x onerror=alert(1)>', 8000);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('animation-duration:8000ms');
    expect(html).toContain('fa-circle-xmark');
  });
});

describe('crearAvisos', () => {
  it('abre con duración calculada y contenido armado', () => {
    const libreria = libreriaFalsa();
    const avisos = crearAvisos(libreria as any);
    avisos.open({ message: 'Trabajador actualizado', type: 'success' } as any);

    const opciones = libreria.abiertos[0];
    expect(opciones.duration).toBe(3500);
    expect(opciones.type).toBe('success');
    expect(opciones.message).toContain('Trabajador actualizado');
    expect(opciones.message).toContain('aviso__barra');
  });

  it('no repite un mensaje que ya está en pantalla, y lo permite al cerrarse', () => {
    const libreria = libreriaFalsa();
    const avisos = crearAvisos(libreria as any);
    const primero = avisos.open({ message: 'Sin conexión', type: 'error' } as any);
    avisos.open({ message: 'Sin conexión', type: 'error' } as any);
    expect(libreria.open).toHaveBeenCalledTimes(1);

    primero.dismiss();
    avisos.open({ message: 'Sin conexión', type: 'error' } as any);
    expect(libreria.open).toHaveBeenCalledTimes(2);
  });

  it('el mismo texto con otro tipo sí se muestra', () => {
    const libreria = libreriaFalsa();
    const avisos = crearAvisos(libreria as any);
    avisos.open({ message: 'Listo', type: 'success' } as any);
    avisos.open({ message: 'Listo', type: 'info' } as any);
    expect(libreria.open).toHaveBeenCalledTimes(2);
  });

  it('conserva el onDismiss de quien llama', () => {
    const libreria = libreriaFalsa();
    const avisos = crearAvisos(libreria as any);
    const alCerrar = vi.fn();
    avisos.open({ message: 'Hola', onDismiss: alCerrar } as any).dismiss();
    expect(alCerrar).toHaveBeenCalled();
  });

  it('los atajos por tipo usan las mismas reglas', () => {
    const libreria = libreriaFalsa();
    const avisos = crearAvisos(libreria as any);
    avisos.error('Algo falló');
    expect(libreria.abiertos[0].type).toBe('error');
    expect(libreria.abiertos[0].duration).toBe(8000);
  });
});
