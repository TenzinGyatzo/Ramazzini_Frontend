import { beforeEach, describe, expect, it, vi } from 'vitest';
import DocumentosAPI from '@/api/DocumentosAPI';
import type { Caso, Incapacidad } from './incapacidades';
import {
  errorDeArchivo,
  fechaSugerida,
  nombreDeRespaldo,
  rutaDeRespaldo,
  subirRespaldo,
  subirRespaldosPendientes,
  textoDeTamano,
  tiposParaCaso,
} from './incapacidadesRespaldos';

vi.mock('@/api/DocumentosAPI', () => ({
  default: { uploadExternalDocument: vi.fn() },
}));
vi.mock('@/lib/clinicalFiles', () => ({ fetchClinicalFileBlob: vi.fn() }));

const caso = (campos: Partial<Caso> = {}): Caso => ({
  _id: 'caso1',
  ramo: 'riesgoTrabajo',
  fechaInicio: '2026-03-02T00:00:00.000Z',
  diasAcumulados: 7,
  ...campos,
});

const incapacidad = (campos: Partial<Incapacidad> = {}): Incapacidad => ({
  _id: 'inc1',
  idCaso: 'caso1',
  origen: 'imss',
  caracter: 'inicial',
  folio: 'AB123456',
  fechaInicio: '2026-03-02T00:00:00.000Z',
  dias: 7,
  fechaTermino: '2026-03-08T00:00:00.000Z',
  ...campos,
});

const archivo = (nombre = 'Escaneo.PDF', bytes = 2048) =>
  new File([new Uint8Array(bytes)], nombre, { type: 'application/pdf' });

describe('respaldos de incapacidad', () => {
  beforeEach(() => vi.clearAllMocks());

  it('los formatos ST solo se ofrecen en riesgo de trabajo', () => {
    expect(tiposParaCaso('riesgoTrabajo').map((t) => t.valor)).toEqual(['st7', 'st9', 'st2', 'st3', 'otro']);
    expect(tiposParaCaso('enfermedadGeneral').map((t) => t.valor)).toEqual(['otro']);
    expect(tiposParaCaso('maternidad').map((t) => t.valor)).toEqual(['otro']);
  });

  it('nombra el documento según lo que respalda', () => {
    expect(nombreDeRespaldo('certificadoIncapacidad', incapacidad())).toBe('Incapacidad IMSS folio AB123456');
    expect(nombreDeRespaldo('certificadoIncapacidad', incapacidad({ origen: 'empresa', folio: undefined }))).toBe(
      'Descanso otorgado por la empresa',
    );
    expect(nombreDeRespaldo('certificadoIncapacidad', incapacidad({ origen: 'particular', folio: undefined }))).toBe(
      'Reposo de médico particular',
    );
    expect(nombreDeRespaldo('st7')).toBe('ST-7 Probable accidente de trabajo');
    expect(nombreDeRespaldo('st2')).toBe('ST-2 Dictamen de alta');
  });

  it('propone la fecha del documento', () => {
    const hoy = '2026-10-09';
    expect(fechaSugerida('certificadoIncapacidad', caso(), incapacidad(), hoy)).toBe('2026-03-02');
    expect(
      fechaSugerida('certificadoIncapacidad', caso(), incapacidad({ fechaExpedicion: '2026-03-03T00:00:00.000Z' }), hoy),
    ).toBe('2026-03-03');
    expect(fechaSugerida('st7', caso({ fechaRiesgo: '2026-03-01T00:00:00.000Z' }), null, hoy)).toBe('2026-03-01');
    expect(fechaSugerida('st2', caso({ fechaAlta: '2026-03-20T00:00:00.000Z' }), null, hoy)).toBe('2026-03-20');
    expect(fechaSugerida('st2', caso(), null, hoy)).toBe(hoy);
    expect(fechaSugerida('otro', caso(), null, hoy)).toBe(hoy);
  });

  it('valida tipo y tamaño del archivo', () => {
    expect(errorDeArchivo(null)).toBe('Elige un archivo.');
    expect(errorDeArchivo({ name: 'acta.docx', size: 10 })).toContain('PDF, JPG o PNG');
    // Límite de 3 MB: cabe la foto de un certificado tomada con el celular
    expect(errorDeArchivo({ name: 'foto.JPG', size: 3 * 1024 * 1024 + 1 })).toContain('3 MB');
    expect(errorDeArchivo({ name: 'foto.JPG', size: 3 * 1024 * 1024 })).toBe('');
    expect(errorDeArchivo({ name: 'foto.png', size: 0 })).toContain('vacío');
    expect(errorDeArchivo({ name: 'foto.JPEG', size: 500 })).toBe('');
  });

  it('sube el documento ligado al caso y a la incapacidad', async () => {
    vi.mocked(DocumentosAPI.uploadExternalDocument).mockResolvedValue({} as any);
    await subirRespaldo({
      trabajadorId: 't1',
      usuarioId: 'u1',
      archivo: archivo(),
      tipo: 'certificadoIncapacidad',
      fecha: '2026-03-02',
      nombre: 'Incapacidad IMSS folio AB123456',
      idCaso: 'caso1',
      idIncapacidad: 'inc1',
    });

    const [trabajadorId, formulario] = vi.mocked(DocumentosAPI.uploadExternalDocument).mock.calls[0];
    expect(trabajadorId).toBe('t1');
    expect(formulario.get('nombreDocumento')).toBe('Incapacidad IMSS folio AB123456');
    expect(formulario.get('extension')).toBe('.pdf');
    expect(formulario.get('idCasoIncapacidad')).toBe('caso1');
    expect(formulario.get('idIncapacidad')).toBe('inc1');
    expect(formulario.get('tipoRespaldoIncapacidad')).toBe('certificadoIncapacidad');
    expect(formulario.get('createdBy')).toBe('u1');
    expect(String(formulario.get('fechaDocumento'))).toContain('2026-03-0');
    // La extensión viaja en minúsculas, que es como la busca el expediente
    expect((formulario.get('file') as File).name).toBe('respaldo.pdf');
  });

  it('si ya existe un archivo igual en esa fecha, lo sube con otro nombre', async () => {
    vi.mocked(DocumentosAPI.uploadExternalDocument)
      .mockRejectedValueOnce({ response: { status: 409 } })
      .mockResolvedValueOnce({} as any);
    await subirRespaldo({
      trabajadorId: 't1',
      usuarioId: 'u1',
      archivo: archivo('reverso.jpg'),
      tipo: 'st7',
      fecha: '2026-03-02',
      nombre: 'ST-7 Probable accidente de trabajo',
      idCaso: 'caso1',
    });
    const llamadas = vi.mocked(DocumentosAPI.uploadExternalDocument).mock.calls;
    expect(llamadas).toHaveLength(2);
    expect(llamadas[1][1].get('nombreDocumento')).toBe('ST-7 Probable accidente de trabajo (2)');
    expect(llamadas[1][1].get('idIncapacidad')).toBeNull();
  });

  it('otros errores del servidor no se reintentan', async () => {
    const rechazo = { response: { status: 400, data: { message: 'Fecha no permitida' } } };
    vi.mocked(DocumentosAPI.uploadExternalDocument).mockRejectedValue(rechazo);
    await expect(
      subirRespaldo({
        trabajadorId: 't1',
        usuarioId: 'u1',
        archivo: archivo(),
        tipo: 'otro',
        fecha: '2026-03-02',
        nombre: 'Documento de incapacidad',
        idCaso: 'caso1',
      }),
    ).rejects.toBe(rechazo);
    expect(DocumentosAPI.uploadExternalDocument).toHaveBeenCalledTimes(1);
  });

  it('arma la ruta del archivo como lo guarda el servidor', () => {
    expect(
      rutaDeRespaldo({
        _id: 'd1',
        nombreDocumento: 'ST-2 Dictamen de alta',
        fechaDocumento: '2026-03-20T12:00:00.000Z',
        extension: '.pdf',
        rutaDocumento: 'expedientes-medicos/Aceros/Planta/Ana_t1',
        tipo: 'st2',
      }),
    ).toBe('expedientes-medicos/Aceros/Planta/Ana_t1/ST-2 Dictamen de alta 20-03-2026.pdf');
  });

  it('al registrar, el certificado va a la incapacidad y los formatos al caso; avisa lo que no subió', async () => {
    vi.mocked(DocumentosAPI.uploadExternalDocument)
      .mockResolvedValueOnce({} as any)
      .mockRejectedValueOnce({ response: { status: 400 } })
      .mockResolvedValueOnce({} as any);

    const fallidos = await subirRespaldosPendientes(
      [
        { archivo: archivo('certificado.pdf'), tipo: 'certificadoIncapacidad' },
        { archivo: archivo('roto.pdf'), tipo: 'otro' },
        { archivo: archivo('st7.jpg'), tipo: 'st7' },
      ],
      {
        trabajadorId: 't1',
        usuarioId: 'u1',
        caso: caso({ fechaRiesgo: '2026-03-01T00:00:00.000Z' }),
        incapacidad: incapacidad(),
        hoy: '2026-10-09',
      },
    );

    expect(fallidos).toEqual(['roto.pdf']);
    const formularios = vi.mocked(DocumentosAPI.uploadExternalDocument).mock.calls.map((llamada) => llamada[1]);
    expect(formularios[0].get('nombreDocumento')).toBe('Incapacidad IMSS folio AB123456');
    expect(formularios[0].get('idIncapacidad')).toBe('inc1');
    expect(formularios[2].get('nombreDocumento')).toBe('ST-7 Probable accidente de trabajo');
    expect(formularios[2].get('idIncapacidad')).toBeNull();
    expect(formularios[2].get('idCasoIncapacidad')).toBe('caso1');
    expect(String(formularios[2].get('fechaDocumento'))).toContain('2026-03-0');
  });

  it('da el tamaño en KB o en MB', () => {
    expect(textoDeTamano(350 * 1024)).toBe('350 KB');
    expect(textoDeTamano(1024 * 1024)).toBe('1.00 MB');
  });
});
