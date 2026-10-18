import { describe, expect, it, vi } from 'vitest';
import {
  LIMITE_BYTES_DOCUMENTO_EXTERNO,
  extensionDe,
  motivoDeError,
  motivoDeRechazo,
  nombreSugerido,
  procesarConLimite,
  reducirHastaLimite,
  tamanoLegible,
} from './subidaDocumentosExternos';

const MB = 1024 * 1024;

describe('nombreSugerido', () => {
  it('quita la extensión y cambia guiones bajos por espacios', () => {
    expect(nombreSugerido('Laboratorio_Biometria.pdf')).toBe('Laboratorio Biometria');
    expect(nombreSugerido('Rayos X torax.JPG')).toBe('Rayos X torax');
    expect(nombreSugerido('Declaracion_Veracidad_PEREZ_2026-10-17.pdf')).toBe('Declaracion Veracidad PEREZ 2026-10-17');
  });

  it('deja vacío un nombre automático de cámara, escáner o app', () => {
    [
      'IMG_20261017_123456.jpg',
      'PXL_20261017_183012345.jpg',
      'DSC00123.JPG',
      'scan0001.pdf',
      'Screenshot 2026-10-17 123456.png',
      'WhatsApp Image 2026-10-17 at 12.30.45.jpeg',
      '20261017_123456.jpg',
      'documento.pdf',
    ].forEach((archivo) => expect(nombreSugerido(archivo), archivo).toBe(''));
  });
});

describe('motivoDeRechazo', () => {
  it('acepta PDF e imágenes y rechaza otros tipos', () => {
    expect(motivoDeRechazo({ name: 'a.pdf', size: 1000 })).toBeNull();
    expect(motivoDeRechazo({ name: 'a.PNG', size: 1000 })).toBeNull();
    expect(motivoDeRechazo({ name: 'a.docx', size: 1000 })).toBe('tipo');
    expect(motivoDeRechazo({ name: 'sinextension', size: 1000 })).toBe('tipo');
  });

  it('un PDF de más de 1 MB se rechaza; una foto grande no (se reduce)', () => {
    expect(motivoDeRechazo({ name: 'a.pdf', size: 2 * MB })).toBe('tamano');
    expect(motivoDeRechazo({ name: 'a.jpg', size: 4 * MB })).toBeNull();
    expect(motivoDeRechazo({ name: 'a.pdf', size: LIMITE_BYTES_DOCUMENTO_EXTERNO })).toBeNull();
  });
});

describe('reducirHastaLimite', () => {
  it('baja calidad y escala hasta que cabe', async () => {
    // El tamaño depende de escala y calidad; solo cabe con escala ≤ 0.5
    const codificar = vi.fn(async (escala: number, calidad: number) => new Blob([new Uint8Array(Math.round(3 * MB * escala * calidad))]));
    const blob = await reducirHastaLimite(codificar, 1);
    expect(blob!.size).toBeLessThanOrEqual(LIMITE_BYTES_DOCUMENTO_EXTERNO);
    expect(codificar.mock.calls[0]).toEqual([1, 0.85]);
  });

  it('respeta la escala inicial (lado máximo) y devuelve null si nada cabe', async () => {
    const codificar = vi.fn(async () => new Blob([new Uint8Array(2 * MB)]));
    expect(await reducirHastaLimite(codificar, 0.5)).toBeNull();
    expect(codificar.mock.calls[0]).toEqual([0.5, 0.85]);
  });
});

describe('motivoDeError', () => {
  it('explica un conflicto de nombre y fecha', () => {
    const error = { response: { status: 409, data: { message: 'Ya existe un archivo con el mismo nombre en esta fecha' } } };
    expect(motivoDeError(error)).toBe('Ya existe un archivo con el mismo nombre en esta fecha. Cambia el nombre o la fecha.');
  });

  it('usa el mensaje del servidor (también en lista) o uno genérico', () => {
    expect(motivoDeError({ response: { status: 400, data: { message: ['La fecha no puede ser futura'] } } })).toBe(
      'La fecha no puede ser futura',
    );
    expect(motivoDeError({ response: { status: 500, data: {} } })).toBe('No se pudo subir. Inténtalo de nuevo.');
    expect(motivoDeError(new Error('Network Error'))).toMatch(/Sin conexión/);
  });
});

describe('utilidades', () => {
  it('extensión y tamaño legibles', () => {
    expect(extensionDe('a.b.JPEG')).toBe('.jpeg');
    expect(extensionDe('.oculto')).toBe('');
    expect(tamanoLegible(300 * 1024)).toBe('300 KB');
    expect(tamanoLegible(3.24 * MB)).toBe('3.2 MB');
  });
});

describe('procesarConLimite', () => {
  it('nunca corre más de las permitidas a la vez y procesa todos', async () => {
    let activas = 0;
    let maximo = 0;
    const hechos: number[] = [];
    await procesarConLimite([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      activas += 1;
      maximo = Math.max(maximo, activas);
      await new Promise((r) => setTimeout(r, n % 3));
      hechos.push(n);
      activas -= 1;
    });
    expect(maximo).toBe(3);
    expect([...hechos].sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('con menos elementos que el límite, o ninguno', async () => {
    const tarea = vi.fn(async () => {});
    await procesarConLimite([1], 3, tarea);
    await procesarConLimite([], 3, tarea);
    expect(tarea).toHaveBeenCalledTimes(1);
  });
});
