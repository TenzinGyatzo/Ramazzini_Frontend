import { describe, expect, it } from 'vitest';
import { resolverHistoriaOtologicaElegibleIla } from './ilaHoElegible';

const INFORME = '2026-06-01';

function ho(parcial: {
  _id: string;
  fechaHistoriaOtologica: string;
  estado?: string;
  trabajoAmbientesRuidosos?: string;
}) {
  return {
    usoProteccionAuditiva: 'SIEMPRE',
    tiempoExposicionLaboral: 'NINGUNO',
    ...parcial,
  };
}

describe('resolverHistoriaOtologicaElegibleIla', () => {
  it('elige la finalizada si hay finalizada y borrador en la misma fecha', () => {
    const r = resolverHistoriaOtologicaElegibleIla(
      [
        ho({ _id: 'b', fechaHistoriaOtologica: '2025-05-12', estado: 'borrador' }),
        ho({ _id: 'f', fechaHistoriaOtologica: '2025-05-12', estado: 'finalizado' }),
      ],
      INFORME,
    );
    expect(r.tipo).toBe('seleccionada');
    if (r.tipo === 'seleccionada') {
      expect(r.historia._id).toBe('f');
      expect(r.estadoOrigen).toBe('finalizado');
    }
  });

  it('elige la finalizada aunque el borrador sea más reciente', () => {
    const r = resolverHistoriaOtologicaElegibleIla(
      [
        ho({ _id: 'f', fechaHistoriaOtologica: '2024-01-10', estado: 'finalizado' }),
        ho({ _id: 'b', fechaHistoriaOtologica: '2025-06-01', estado: 'borrador' }),
      ],
      INFORME,
    );
    expect(r.tipo).toBe('seleccionada');
    if (r.tipo === 'seleccionada') {
      expect(r.historia._id).toBe('f');
    }
  });

  it('declara empate si hay dos finalizadas en la misma fecha', () => {
    const r = resolverHistoriaOtologicaElegibleIla(
      [
        ho({ _id: 'f1', fechaHistoriaOtologica: '2025-05-12', estado: 'finalizado' }),
        ho({ _id: 'f2', fechaHistoriaOtologica: '2025-05-12', estado: 'finalizado' }),
      ],
      INFORME,
    );
    expect(r).toMatchObject({ tipo: 'empate', fecha: '2025-05-12', estadoOrigen: 'finalizado' });
  });

  it('declara empate si hay dos borradores en la misma fecha y no hay finalizadas', () => {
    const r = resolverHistoriaOtologicaElegibleIla(
      [
        ho({ _id: 'b1', fechaHistoriaOtologica: '2025-05-12', estado: 'borrador' }),
        ho({ _id: 'b2', fechaHistoriaOtologica: '2025-05-12', estado: 'borrador' }),
      ],
      INFORME,
    );
    expect(r).toMatchObject({ tipo: 'empate', fecha: '2025-05-12', estadoOrigen: 'borrador' });
  });

  it('ignora la anulada más reciente', () => {
    const r = resolverHistoriaOtologicaElegibleIla(
      [
        ho({ _id: 'a', fechaHistoriaOtologica: '2026-01-01', estado: 'anulado' }),
        ho({ _id: 'f', fechaHistoriaOtologica: '2024-01-01', estado: 'finalizado' }),
      ],
      INFORME,
    );
    expect(r.tipo).toBe('seleccionada');
    if (r.tipo === 'seleccionada') {
      expect(r.historia._id).toBe('f');
    }
  });

  it('excluye HO posterior a la fecha del informe', () => {
    const r = resolverHistoriaOtologicaElegibleIla(
      [ho({ _id: 'f', fechaHistoriaOtologica: '2026-12-01', estado: 'finalizado' })],
      INFORME,
    );
    expect(r).toEqual({ tipo: 'ninguna' });
  });

  it('devuelve ninguna si el listado está vacío, solo hay anuladas o solo hay futuras', () => {
    expect(resolverHistoriaOtologicaElegibleIla([], INFORME)).toEqual({ tipo: 'ninguna' });
    expect(
      resolverHistoriaOtologicaElegibleIla(
        [ho({ _id: 'a', fechaHistoriaOtologica: '2024-01-01', estado: 'anulado' })],
        INFORME,
      ),
    ).toEqual({ tipo: 'ninguna' });
    expect(
      resolverHistoriaOtologicaElegibleIla(
        [ho({ _id: 'f', fechaHistoriaOtologica: '2026-12-01', estado: 'finalizado' })],
        INFORME,
      ),
    ).toEqual({ tipo: 'ninguna' });
  });

  it('no usa _id para desempatar', () => {
    const r = resolverHistoriaOtologicaElegibleIla(
      [
        ho({ _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', fechaHistoriaOtologica: '2025-05-12', estado: 'finalizado' }),
        ho({ _id: '000000000000000000000000', fechaHistoriaOtologica: '2025-05-12', estado: 'finalizado' }),
      ],
      INFORME,
    );
    expect(r.tipo).toBe('empate');
  });
});
