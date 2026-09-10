import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  construirChipsContextoIla,
  construirDetalleContextoIla,
  detalleContextoTieneContenido,
  fichaMarcaRuidoActual,
  seleccionarPreguntasRevisionIla,
} from './ilaConclusionContexto';
import type { ResultadoHoElegibleIla } from './ilaHoElegible';

const ninguna: ResultadoHoElegibleIla = { tipo: 'ninguna' };

function hoSeleccionada(opts?: {
  fecha?: string;
  si?: boolean;
  borrador?: boolean;
}): ResultadoHoElegibleIla {
  return {
    tipo: 'seleccionada',
    fecha: opts?.fecha || '2025-05-12',
    estadoOrigen: opts?.borrador ? 'borrador' : 'finalizado',
    historia: {
      _id: 'ho1',
      fechaHistoriaOtologica: opts?.fecha || '2025-05-12',
      trabajoAmbientesRuidosos: opts?.si ? 'SI' : 'NO',
      tiempoExposicionLaboral: opts?.si ? '1 A 5 AÑOS' : 'NINGUNO',
    },
  };
}

describe('fichaMarcaRuidoActual', () => {
  it('solo afirma ruido con el literal exacto Ruido', () => {
    expect(fichaMarcaRuidoActual(['Ruido'])).toBe(true);
    expect(fichaMarcaRuidoActual(['ruido'])).toBe(false);
    expect(fichaMarcaRuidoActual(['Vibración', 'Polvo'])).toBe(false);
    expect(fichaMarcaRuidoActual([])).toBe(false);
  });
});

describe('construirChipsContextoIla', () => {
  it('omite frases negativas si no hay Ruido ni HO', () => {
    const chips = construirChipsContextoIla({
      puesto: 'Operador',
      agentesRiesgoActuales: ['Polvo'],
      ho: ninguna,
    });
    expect(chips.map((c) => c.texto)).toEqual(['Ficha actual · puesto: Operador']);
    expect(chips.some((c) => /no expuesto|sin antecedentes/i.test(c.texto))).toBe(false);
  });

  it('añade el chip de ruido solo si el agente es Ruido', () => {
    const con = construirChipsContextoIla({
      agentesRiesgoActuales: ['Ruido'],
      ho: ninguna,
    });
    const sin = construirChipsContextoIla({
      agentesRiesgoActuales: ['Ruido industrial'],
      ho: ninguna,
    });
    expect(con.some((c) => c.id === 'ruidoPuesto')).toBe(true);
    expect(sin.some((c) => c.id === 'ruidoPuesto')).toBe(false);
  });

  it('en empate muestra varias HO y no deriva exposición', () => {
    const chips = construirChipsContextoIla({
      ho: { tipo: 'empate', fecha: '2025-05-12', estadoOrigen: 'finalizado', cantidad: 2 },
    });
    expect(chips.map((c) => c.texto)).toEqual(['Varias historias otológicas del 12/05/2025']);
    expect(chips.some((c) => /ambientes ruidosos/i.test(c.texto))).toBe(false);
  });

  it('copia SI y tiempo de la HO seleccionada', () => {
    const chips = construirChipsContextoIla({
      ho: hoSeleccionada({ si: true }),
    });
    expect(chips.some((c) => c.texto === 'Historia otológica del 12/05/2025')).toBe(true);
    expect(chips.some((c) => c.texto.includes('ambientes ruidosos'))).toBe(true);
    expect(chips.some((c) => c.texto === '1 A 5 AÑOS')).toBe(true);
  });
});

describe('detalleContextoTieneContenido', () => {
  it('no abre Detalle solo por empresa o centro ya visibles en el chrome', () => {
    const soloEmpresa = construirDetalleContextoIla({
      empresa: 'ACME',
      centro: 'Planta 1',
      ho: ninguna,
    });
    expect(soloEmpresa.empresaCentro).toBe('ACME · Planta 1');
    expect(detalleContextoTieneContenido(soloEmpresa)).toBe(false);
    expect(
      detalleContextoTieneContenido(
        construirDetalleContextoIla({ fechaIngreso: '2020-01-15', ho: ninguna }),
      ),
    ).toBe(true);
  });
});

describe('seleccionarPreguntasRevisionIla', () => {
  it('recorta a tres preguntas por prioridad', () => {
    const preguntas = seleccionarPreguntasRevisionIla({
      agentesRiesgoActuales: ['Ruido'],
      ho: hoSeleccionada({ si: true }),
      basal: {
        idAudiometriaOriginal: 'b',
        fechaAudiometria: '2023-03-15',
        metodoAudiometria: 'AMA',
        rolEnInforme: 'basal',
        estudioIncompleto: true,
      } as any,
      subsecuentes: [
        {
          idAudiometriaOriginal: 's',
          fechaAudiometria: '2024-03-15',
          metodoAudiometria: 'LFT',
          rolEnInforme: 'subsecuente',
        } as any,
      ],
    });
    expect(preguntas).toHaveLength(3);
    expect(preguntas.map((p) => p.id)).toEqual(['calidad', 'ruidoFicha', 'hoElegible']);
  });

  it('declara alcance en sinHo y no niega antecedentes', () => {
    const [pregunta] = seleccionarPreguntasRevisionIla({ ho: ninguna });
    expect(pregunta.id).toBe('sinHo');
    expect(pregunta.texto).toContain('No se localizó una historia otológica elegible');
    expect(pregunta.texto).toContain('no significa que el trabajador carezca de antecedentes otológicos');
  });

  it('usa interpretarOidoIla y no lee cambioUmbralOido', () => {
    const src = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'ilaConclusionContexto.ts'),
      'utf8',
    );
    expect(src).toContain('interpretarOidoIla');
    expect(src).not.toMatch(/cambioUmbralOido(Derecho|Izquierdo)/);
  });
});
