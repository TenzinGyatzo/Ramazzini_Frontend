import { beforeEach, describe, expect, it, vi } from 'vitest';
import DocumentosAPI from '@/api/DocumentosAPI';
import {
  cargarDatosAnteriores,
  datosAnteriores,
  datosATraer,
  documentoAnterior,
  limpiarDatosAnteriores,
  quitarDatosAnteriores,
} from './datosDocumentoAnterior';

vi.mock('@/api/DocumentosAPI', () => ({
  default: { getHistoriasClinicas: vi.fn(), getExploracionesFisicas: vi.fn() },
}));
const api = DocumentosAPI as unknown as Record<string, ReturnType<typeof vi.fn>>;

const hcAnterior = {
  fechaHistoriaClinica: '2025-11-10T00:00:00.000Z',
  motivoExamen: 'Ingreso',
  resumenHistoriaClinica: 'Diabetes tipo 2.',
  diabeticosPP: 'Si',
  diabeticosPPEspecificar: 'Diabetes tipo 2',
  hipertensivosPP: 'No',
  hipertensivosPPEspecificar: 'Negado',
  alcoholismo: 'Si',
  alcoholismoEspecificar: 'Social, fines de semana',
  alimentacionDeficiente: 'No',
  alimentacionDeficienteEspecificar: 'Adecuada',
  menarca: '11 años',
  duracionPromedio: '5 días',
  gestas: '2',
  fechaUltimaRegla: '2025-10-28',
  embarazoActual: '12 semanas',
  vidaSexualActiva: '18 años',
  planificacionFamiliar: 'Ninguno',
  empresaAnterior1: 'Aceros del Norte',
  puestoAnterior1: 'Soldador',
  accidenteLaboral: 'Si',
  accidenteLaboralEspecificar: 'Caída de altura en 2019',
  descripcionDelDano: 'Fractura de tobillo',
  secuelas: 'Sin secuelas',
};

describe('datos del documento anterior (punto 54)', () => {
  it('elige el más reciente con fecha anterior y salta los anulados', () => {
    const docs = [
      { _id: 'a', fechaHistoriaClinica: '2024-01-01' },
      { _id: 'b', fechaHistoriaClinica: '2025-06-01', estado: 'anulado' },
      { _id: 'c', fechaHistoriaClinica: '2025-03-01T00:00:00.000Z' },
      { _id: 'd', fechaHistoriaClinica: '2026-11-22' },
    ];
    expect(documentoAnterior(docs, 'historiaClinica', '2026-11-22')?._id).toBe('c');
    expect(documentoAnterior([], 'historiaClinica', '2026-11-22')).toBeNull();
  });

  it('historia clínica: los «Sí» con su detalle, gineco completo (también lo típico) sin FUM ni embarazo, empleos y accidente', () => {
    expect(datosATraer('historiaClinica', hcAnterior, { esMujer: true })).toEqual({
      diabeticosPP: 'Si',
      diabeticosPPEspecificar: 'Diabetes tipo 2',
      alcoholismo: 'Si',
      alcoholismoEspecificar: 'Social, fines de semana',
      menarca: '11 años',
      duracionPromedio: '5 días',
      gestas: '2',
      vidaSexualActiva: '18 años',
      planificacionFamiliar: 'Ninguno',
      empresaAnterior1: 'Aceros del Norte',
      puestoAnterior1: 'Soldador',
      accidenteLaboral: 'Si',
      accidenteLaboralEspecificar: 'Caída de altura en 2019',
      descripcionDelDano: 'Fractura de tobillo',
      secuelas: 'Sin secuelas',
    });
  });

  it('historia clínica de un hombre: sin gineco', () => {
    const datos = datosATraer('historiaClinica', hcAnterior, { esMujer: false });
    expect(datos.menarca).toBeUndefined();
    expect(datos.vidaSexualActiva).toBeUndefined();
    expect(datos.diabeticosPP).toBe('Si');
  });

  it('exploración física: la altura y los hallazgos; nunca peso, cintura ni signos', () => {
    const datos = datosATraer(
      'exploracionFisica',
      {
        peso: 80,
        altura: 1.7,
        circunferenciaCintura: 95,
        tensionArterialSistolica: 130,
        craneoCaraPregunta: 'No',
        craneoCara: 'Sin hallazgos',
        rodillasPregunta: 'Si',
        rodillas: 'Crepitación en rodilla derecha',
        // Documento viejo sin la pregunta
        cicatrices: 'Cicatriz quirúrgica en abdomen',
        resumenExploracionFisica: 'Crepitación…',
      },
      { esMujer: false },
    );
    expect(datos).toEqual({
      altura: 1.7,
      rodillasPregunta: 'Si',
      rodillas: 'Crepitación en rodilla derecha',
      cicatricesPregunta: 'Si',
      cicatrices: 'Cicatriz quirúrgica en abdomen',
    });
  });

  describe('carga y «Empezar en blanco»', () => {
    beforeEach(() => {
      limpiarDatosAnteriores();
      api.getHistoriasClinicas.mockReset();
    });

    it('copia en el formulario, avisa la fecha y no pisa lo que ya tenga', async () => {
      api.getHistoriasClinicas.mockResolvedValue({ data: [hcAnterior] });
      const df: Record<string, any> = { alcoholismoEspecificar: 'Lo que escribió' };
      await cargarDatosAnteriores('historiaClinica', 't1', () => df, { esMujer: false, hoy: '2026-11-22' });
      expect(datosAnteriores.cargando).toBe(false);
      expect(datosAnteriores.fecha).toBe('10 de noviembre de 2025');
      expect(df.diabeticosPP).toBe('Si');
      expect(df.alcoholismoEspecificar).toBe('Lo que escribió');
      expect(df.motivoExamen).toBeUndefined();
      expect(df.resumenHistoriaClinica).toBeUndefined();

      // El resumen que se armó con lo traído también se va
      df.resumenHistoriaClinica = 'Diabetes tipo 2.';
      df.resumenHistoriaClinicaPregunta = 'Si';
      quitarDatosAnteriores(df);
      expect(df).toEqual({ alcoholismoEspecificar: 'Lo que escribió' });
      expect(datosAnteriores.fecha).toBeNull();
    });

    it('sin documento anterior (o si falla la consulta) no avisa nada', async () => {
      api.getHistoriasClinicas.mockResolvedValue({ data: { message: 'No se encontraron documentos' } });
      const df: Record<string, any> = {};
      await cargarDatosAnteriores('historiaClinica', 't1', () => df, { esMujer: false, hoy: '2026-11-22' });
      expect(datosAnteriores.fecha).toBeNull();
      expect(df).toEqual({});

      api.getHistoriasClinicas.mockRejectedValue(new Error('sin red'));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await cargarDatosAnteriores('historiaClinica', 't1', () => df, { esMujer: false, hoy: '2026-11-22' });
      expect(datosAnteriores.cargando).toBe(false);
      expect(datosAnteriores.fecha).toBeNull();
    });
  });
});
