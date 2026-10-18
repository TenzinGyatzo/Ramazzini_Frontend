import { beforeEach, describe, expect, it, vi } from 'vitest';

const descargas: Array<{ def: any; nombre: string }> = [];
vi.mock('@/lib/cargarPdfMake', () => ({
  cargarPdfMake: async () => ({
    createPdf: (def: unknown) => ({ download: (nombre: string) => descargas.push({ def, nombre }) }),
  }),
}));
vi.mock('@/helpers/setupPdfMakeKanitFonts', () => ({ setupPdfMakeKanitFonts: async () => {} }));

const trabajador = { nombre: 'JUAN', primerApellido: 'PÉREZ', segundoApellido: 'LÓPEZ' };
const proveedorSalud = { direccion: 'Av. 1', municipio: 'TIJUANA', estado: 'BAJA CALIFORNIA', telefono: '6641234567' };

/** Texto plano de un contenido de pdfmake. */
function texto(nodo: any): string {
  if (nodo == null) return '';
  if (typeof nodo === 'string') return nodo;
  if (Array.isArray(nodo)) return nodo.map(texto).join('');
  if (nodo.text !== undefined) return texto(nodo.text);
  if (nodo.columns) return nodo.columns.map(texto).join(' ');
  if (nodo.stack) return nodo.stack.map(texto).join('\n');
  return '';
}

beforeEach(() => {
  descargas.length = 0;
  vi.stubGlobal('fetch', async () => ({ ok: false }));
});

describe('consentimiento informado antidoping', () => {
  it('lleva el texto acordado con el nombre del trabajador y la fecha', async () => {
    const { descargarConsentimientoAntidopingPdf } = await import('./generarConsentimientoAntidopingPdf');
    await descargarConsentimientoAntidopingPdf({ trabajador, fecha: '2026-10-17', proveedorSalud });

    const { def, nombre } = descargas[0];
    expect(nombre).toBe('Consentimiento_Antidoping_P_REZ_2026-10-17.pdf');
    expect(texto(def.header.columns[1])).toBe('CONSENTIMIENTO INFORMADO PARA\nPRUEBA DE DETECCIÓN DE SUSTANCIAS');

    const parrafos = def.content.map(texto);
    expect(parrafos[0]).toBe(
      'Yo, JUAN PÉREZ LÓPEZ, manifiesto que he sido informado(a) sobre la realización de una prueba para la detección de sustancias y/o sus metabolitos (antidoping), mediante la obtención y análisis de una muestra biológica.',
    );
    expect(parrafos[1]).toMatch(/^Comprendo que la finalidad de esta prueba/);
    expect(parrafos[2]).toMatch(/^Asimismo, comprendo que este tipo de pruebas tiene alcances y limitaciones/);
    expect(parrafos[3]).toMatch(/no necesariamente constituye, por sí solo, una confirmación definitiva del consumo de una sustancia\.$/);
    expect(parrafos[4]).toMatch(/^Declaro que he tenido la oportunidad de informar/);
    expect(parrafos[5]).toMatch(/otorgo mi consentimiento libre y voluntario para la obtención de la muestra/);
    expect(parrafos[6]).toBe('Fecha: 17-10-2026');
    expect(parrafos[7]).toBe('Firma: ');
    expect(def.content).toHaveLength(8);
  });
});

describe('declaración de veracidad (sobre las piezas comunes)', () => {
  it('conserva título, nombre de archivo, contenido y pie', async () => {
    const { descargarDeclaracionVeracidadPdf } = await import('./generarDeclaracionVeracidadPdf');
    await descargarDeclaracionVeracidadPdf({ trabajador, fecha: '2026-10-17', proveedorSalud });

    const { def, nombre } = descargas[0];
    expect(nombre).toBe('Declaracion_Veracidad_P_REZ_2026-10-17.pdf');
    expect(texto(def.header.columns[1]).trim()).toBe('DECLARACIÓN DE VERACIDAD DE INFORMACIÓN MÉDICA');
    expect(texto(def.content[0])).toMatch(/^Yo, JUAN PÉREZ LÓPEZ, declaro bajo protesta de decir verdad/);
    expect(texto(def.content.at(-2))).toBe('Fecha: 17-10-2026');
    expect(texto(def.footer)).toContain('Av. 1, Tijuana, Baja California. Tel. (+52) 6641234567');
    expect(def.styles.header.fontSize).toBe(15);
  });
});
