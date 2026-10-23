/**
 * Consulta de la fusión en el expediente (docs/fusion-trabajadores-especificacion.md, 5.4).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { FusionConsultada } from '@/interfaces/trabajador.interface';
import { coleccionesTrasladadas, textoMotivos } from '@/helpers/fusionConsulta';

const api = vi.hoisted(() => ({ getFusionesDeTrabajador: vi.fn() }));
vi.mock('@/api/TrabajadoresAPI', () => ({ default: api }));

const { default: FusionesTrabajador } = await import('./FusionesTrabajador.vue');

const fusion = (cambios: Partial<FusionConsultada> = {}): FusionConsultada => ({
  _id: 'h1',
  fecha: '2026-10-23T18:30:00.000Z',
  destinoId: 't1',
  fuenteId: 't2',
  indirecta: false,
  folioDestino: 'T0000311',
  folioFuente: 'T0000124',
  nombreFuente: 'MARIA FERNANDA LOPEZ',
  curpFuente: 'LORM900312MBCPZR09',
  actor: { nombre: 'Dra. Ana Pérez', email: 'ana@clinica.mx' },
  criterio: 'NINGUNO',
  motivos: ['CAMBIO_NOMBRE', 'OTRO'],
  motivoOtro: 'Corrección del RENAPO',
  comentario: 'Lo pidió RH',
  camposCambiados: [
    {
      clave: 'nombre',
      etiqueta: 'Nombre',
      origen: 'fuente',
      anterior: { nombre: 'MARIO FERNANDO' },
      nuevo: { nombre: 'MARIA FERNANDA' },
    },
    {
      clave: 'idCentroTrabajo',
      etiqueta: 'Centro de trabajo',
      origen: 'fuente',
      anterior: { idCentroTrabajo: 'c1' },
      nuevo: { idCentroTrabajo: 'c2' },
    },
  ],
  documentosMigradosPorColeccion: { HistoriaClinica: 1, DocumentoExterno: 1, RiesgoTrabajo: 2 },
  trasladados: {
    HistoriaClinica: [{ id: 'a', tipo: 'historiaClinica', fecha: '2026-03-01' }],
    DocumentoExterno: [{ id: 'b', tipo: 'documentoExterno', fecha: '2026-04-02', nombre: 'Laboratorio' }],
  },
  centrosNombre: { c1: 'Planta Norte', c2: 'Planta Sur' },
  ...cambios,
});

const montar = () =>
  mount(FusionesTrabajador, {
    props: { empresaId: 'e1', centroId: 'c1', trabajadorId: 't1' },
    global: { stubs: { Teleport: true } },
  });

describe('FusionesTrabajador', () => {
  beforeEach(() => {
    api.getFusionesDeTrabajador.mockReset();
  });

  it('sin fusiones no muestra nada', async () => {
    api.getFusionesDeTrabajador.mockResolvedValue({ data: [] });
    const w = montar();
    await flushPromises();
    expect(api.getFusionesDeTrabajador).toHaveBeenCalledWith('e1', 'c1', 't1');
    expect(w.find('.fusiones-trabajador').exists()).toBe(false);
  });

  it('muestra con quién, cuándo y quién, y abre el detalle', async () => {
    api.getFusionesDeTrabajador.mockResolvedValue({
      data: [fusion(), fusion({ _id: 'h2', indirecta: true, nombreFuente: null, folioFuente: 'T0000099', motivos: [] })],
    });
    const w = montar();
    await flushPromises();
    expect(w.find('.fusiones-trabajador').text()).toMatch(
      /Fusionado con MARIA FERNANDA LOPEZ \(folio T0000124\)\s+el 23\/10\/2026 por Dra\. Ana Pérez/,
    );
    expect(w.text()).toContain('2 fusiones en total');

    await w.find('.fusiones-trabajador button').trigger('click');
    const texto = w.text();
    expect(texto).toContain('Cambio de nombre, Otro: Corrección del RENAPO');
    expect(texto).toContain('«Lo pidió RH»');
    expect(texto).toMatch(/Centro de trabajo:\s*Planta Norte\s*→\s*Planta Sur/);
    expect(texto).toContain('Laboratorio 02/04/2026');
    // La fusión antigua o en cadena
    expect(texto).toContain('Fusionado con el registro folio T0000099');
    expect(texto).toContain('Llegó a este expediente con el registro folio T0000311');
    expect(texto).toContain('No se registró');
  });

  it('si la consulta falla, el expediente sigue sin la línea', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.getFusionesDeTrabajador.mockImplementation(async () => {
      throw new Error('red');
    });
    const w = montar();
    await flushPromises();
    expect(w.find('.fusiones-trabajador').exists()).toBe(false);
  });
});

describe('fusionConsulta', () => {
  it('ordena lo trasladado como la vista previa y usa la cantidad aunque no haya detalle', () => {
    expect(coleccionesTrasladadas(fusion()).map((c) => [c.etiqueta, c.cantidad])).toEqual([
      ['Historias Clínicas', 1],
      ['Documentos Externos', 1],
      ['Riesgos de trabajo', 2],
    ]);
  });

  it('el motivo «Otro» lleva su texto', () => {
    expect(textoMotivos(fusion({ motivos: ['OTRO'] }))).toBe('Otro: Corrección del RENAPO');
  });
});
