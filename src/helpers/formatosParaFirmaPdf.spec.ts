import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TipoFormatoFirma } from '@/types/formatoFirma';

const descargas: Array<{ def: any; nombre: string }> = [];
vi.mock('@/lib/cargarPdfMake', () => ({
  cargarPdfMake: async () => ({
    createPdf: (def: unknown) => ({ download: (nombre: string) => descargas.push({ def, nombre }) }),
  }),
}));
vi.mock('@/helpers/setupPdfMakeKanitFonts', () => ({ setupPdfMakeKanitFonts: async () => {} }));

// Texto v1 tal como lo entrega el backend (copia de formatos-firma-texto.constants.ts)
const getTexto = vi.fn();
vi.mock('@/api/FormatosFirmadosAPI', () => ({ default: { getTexto: (tipo: string) => getTexto(tipo) } }));
import textosV1 from './__fixtures__/textosFormatoFirmaV1.json';

/** El formato impreso de un tipo, con la función única del helper. */
async function descargarDe(tipo: TipoFormatoFirma) {
  const { descargarFormatoParaFirmaPdf } = await import('./formatoParaFirmaPdf');
  return (params: Parameters<typeof descargarFormatoParaFirmaPdf>[1]) => descargarFormatoParaFirmaPdf(tipo, params);
}

const trabajador = { nombre: 'JUAN', primerApellido: 'PÉREZ', segundoApellido: 'LÓPEZ' };
const proveedorSalud = {
  nombre: 'Clínica Norte',
  direccion: 'Av. 1',
  municipio: 'TIJUANA',
  estado: 'BAJA CALIFORNIA',
  telefono: '6641234567',
};

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
  getTexto.mockReset();
  getTexto.mockImplementation(async (tipo: keyof typeof textosV1) => ({ data: textosV1[tipo] }));
});

describe('texto desde el backend', () => {
  it('pide el formato que corresponde', async () => {
    const descargarDeclaracionVeracidadPdf = await descargarDe('DECLARACION_VERACIDAD');
    const descargarConsentimientoAntidopingPdf = await descargarDe('CONSENTIMIENTO_ANTIDOPING');
    await descargarDeclaracionVeracidadPdf({ trabajador, fecha: '2026-10-17', proveedorSalud });
    await descargarConsentimientoAntidopingPdf({ trabajador, fecha: '2026-10-17', proveedorSalud });
    expect(getTexto.mock.calls).toEqual([['DECLARACION_VERACIDAD'], ['CONSENTIMIENTO_ANTIDOPING']]);
  });

  it('si el backend no responde, no descarga nada y el error llega al modal', async () => {
    getTexto.mockRejectedValue(new Error('sin red'));
    const descargarDeclaracionVeracidadPdf = await descargarDe('DECLARACION_VERACIDAD');
    await expect(
      descargarDeclaracionVeracidadPdf({ trabajador, fecha: '2026-10-17', proveedorSalud }),
    ).rejects.toThrow('sin red');
    expect(descargas).toHaveLength(0);
  });

  it('una redacción nueva se refleja sin tocar el frontend', async () => {
    getTexto.mockResolvedValue({
      data: {
        ...textosV1.DECLARACION_VERACIDAD,
        version: 'v2',
        titulo: 'DECLARACIÓN DE VERACIDAD',
        bloques: [
          { tipo: 'parrafo', fragmentos: [{ texto: 'Yo, ' }, { campo: 'nombreTrabajador', negrita: true }, { texto: ', declaro.' }] },
        ],
      },
    });
    const descargarDeclaracionVeracidadPdf = await descargarDe('DECLARACION_VERACIDAD');
    await descargarDeclaracionVeracidadPdf({ trabajador, fecha: '2026-10-17', proveedorSalud });

    const { def } = descargas[0];
    expect(texto(def.header.columns[1]).trim()).toBe('DECLARACIÓN DE VERACIDAD');
    expect(def.content.map(texto)).toEqual([
      'Yo, JUAN PÉREZ LÓPEZ, declaro.',
      'Institución responsable: Clínica Norte',
      'Fecha: 17-10-2026',
      'Firma: ',
    ]);
    // Un solo párrafo: lleva el margen superior del primero y el inferior del último
    expect(def.content[0].margin).toEqual([0, 24, 0, 20]);
  });
});

describe('espaciado de la declaración (igual que antes de mover el texto al backend)', () => {
  it('lista con sangría, 4 pt dentro de la lista, 6 entre párrafos y 20 al final', async () => {
    const descargarDeclaracionVeracidadPdf = await descargarDe('DECLARACION_VERACIDAD');
    await descargarDeclaracionVeracidadPdf({ trabajador, fecha: '2026-10-17', proveedorSalud });

    const { def } = descargas[0];
    expect(def.content.slice(0, 9).map((b: any) => b.margin)).toEqual([
      [0, 24, 0, 6],
      [0, 0, 0, 6],
      [0, 0, 0, 6],
      [0, 0, 0, 4],
      [24, 0, 0, 4],
      [24, 0, 0, 4],
      [24, 0, 0, 6],
      [0, 0, 0, 6],
      [0, 0, 0, 20],
    ]);
    // «Reconozco que:» va como texto simple, sin justificar
    expect(def.content[3]).toEqual({ text: 'Reconozco que:', margin: [0, 0, 0, 4] });
  });
});

describe('consentimiento informado antidoping', () => {
  it('lleva el texto acordado con el nombre del trabajador y la fecha', async () => {
    const descargarConsentimientoAntidopingPdf = await descargarDe('CONSENTIMIENTO_ANTIDOPING');
    await descargarConsentimientoAntidopingPdf({ trabajador, fecha: '2026-10-17', proveedorSalud });

    const { def, nombre } = descargas[0];
    expect(nombre).toBe('Consentimiento_Antidoping_P_REZ_2026-10-17.pdf');
    // Un solo renglón, como la declaración (los espacios iniciales alargan la línea roja)
    expect(texto(def.header.columns[1])).toBe('  CONSENTIMIENTO INFORMADO PARA PRUEBA DE DETECCIÓN DE SUSTANCIAS\n');
    expect(def.styles.header.fontSize).toBe(13);

    // Lo que se enfatiza va en negritas
    const negritas = def.content
      .flatMap((p: any) => (Array.isArray(p.text) ? p.text : []))
      .filter((t: any) => typeof t === 'object' && t.bold === true)
      .map(texto);
    expect(negritas).toEqual([
      'JUAN PÉREZ LÓPEZ',
      'prueba para la detección de sustancias ',
      'y/o',
      ' sus metabolitos (antidoping)',
      'el resultado puede formar parte de mi evaluación médica laboral.',
      'este tipo de pruebas tiene alcances y limitaciones',
      'un resultado positivo en una prueba de tamizaje no necesariamente constituye, por sí solo, una confirmación definitiva del consumo de una sustancia.',
      'informar sobre medicamentos, tratamientos o productos que pudieran ser relevantes para la interpretación de los resultados',
      'otorgo mi consentimiento libre y voluntario',
      'Clínica Norte',
      '17-10-2026',
    ]);

    const parrafos = def.content.map(texto);
    expect(parrafos[0]).toBe(
      'Yo, JUAN PÉREZ LÓPEZ, manifiesto que he sido informado(a) sobre la realización de una prueba para la detección de sustancias y/o sus metabolitos (antidoping), mediante la obtención y análisis de una muestra biológica.',
    );
    expect(parrafos[1]).toMatch(/^Comprendo que la finalidad de esta prueba/);
    expect(parrafos[2]).toMatch(/^Asimismo, comprendo que este tipo de pruebas tiene alcances y limitaciones/);
    expect(parrafos[3]).toMatch(/no necesariamente constituye, por sí solo, una confirmación definitiva del consumo de una sustancia\.$/);
    expect(parrafos[4]).toMatch(/^Declaro que he tenido la oportunidad de informar/);
    expect(parrafos[5]).toMatch(/otorgo mi consentimiento libre y voluntario para la obtención de la muestra/);
    expect(parrafos[6]).toBe('Institución responsable: Clínica Norte');
    expect(parrafos[7]).toBe('Fecha: 17-10-2026');
    expect(parrafos[8]).toBe('Firma: ');
    expect(def.content).toHaveLength(9);
  });
});

describe('declaración de veracidad (sobre las piezas comunes)', () => {
  it('conserva título, nombre de archivo, contenido y pie', async () => {
    const descargarDeclaracionVeracidadPdf = await descargarDe('DECLARACION_VERACIDAD');
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

describe('consentimiento para evaluación médica laboral', () => {
  it('lleva la institución responsable en el texto y en su renglón, el cuerpo a 10.5 y «Firma del trabajador»', async () => {
    const descargar = await descargarDe('CONSENTIMIENTO_EVALUACION_MEDICA');
    await descargar({ trabajador, fecha: '2026-10-22', proveedorSalud });
    const { def, nombre } = descargas[0];
    expect(nombre).toBe('Consentimiento_Evaluacion_Medica_P_REZ_2026-10-22.pdf');
    expect(texto(def.content[0])).toMatch(
      /^Yo, JUAN PÉREZ LÓPEZ, manifiesto que .* que realizará Clínica Norte, cuyo propósito/,
    );
    expect(def.content).toHaveLength(8 + 3);
    expect(texto(def.content.at(-3))).toBe('Institución responsable: Clínica Norte');
    expect(texto(def.content.at(-2))).toBe('Fecha: 22-10-2026');
    expect(texto(def.content.at(-1))).toMatch(/^Firma del trabajador:/);
    expect(def.styles.paragraph.fontSize).toBe(10.5);
    expect(def.styles.header.fontSize).toBe(14);
  });

  it('un formato sin texto definitivo no se descarga', async () => {
    getTexto.mockResolvedValue({ data: { ...textosV1.CONSENTIMIENTO_EVALUACION_MEDICA, disponible: false } });
    const descargar = await descargarDe('CONSENTIMIENTO_EVALUACION_MEDICA');
    await expect(descargar({ trabajador, fecha: '2026-10-22', proveedorSalud })).rejects.toThrow(/texto definitivo/);
    expect(descargas).toHaveLength(0);
  });
});

describe('institución responsable en los otros formatos', () => {
  it('va antes de la fecha, con el nombre del proveedor', async () => {
    const descargar = await descargarDe('CONSENTIMIENTO_ANTIDOPING');
    await descargar({ trabajador, fecha: '2026-10-22', proveedorSalud });
    const { def } = descargas[0];
    expect(texto(def.content.at(-3))).toBe('Institución responsable: Clínica Norte');
    expect(texto(def.content.at(-1))).toMatch(/^Firma:/);
    expect(def.styles.paragraph.fontSize).toBe(11);
  });
});
