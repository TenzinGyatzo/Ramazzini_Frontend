import { describe, expect, it } from 'vitest';
import { validarCamposRequeridos } from './validacionCampos';
import { problemasPorFaltantes } from './problemasDocumento';
import {
  aplicarSeDesconocePesoTalla,
  hidratarPesoTallaDesconocidoNotaMedica,
} from './notaMedicaCexRanges';

const opciones = { cie10Required: true, showSiresUI: true, esMujer: false };
const faltantes = (datos: Record<string, unknown>) =>
  validarCamposRequeridos('notaMedica', datos, opciones).camposFaltantes.map((c) => c.campo);

describe('nota médica: cintura obligatoria (valor o «Se desconoce»)', () => {
  it('vacía se pide con su instrucción; con valor o marcada no', () => {
    expect(faltantes({ circunferenciaCintura: null })).toContain('circunferenciaCintura');
    expect(faltantes({ circunferenciaCintura: 92 })).not.toContain('circunferenciaCintura');
    expect(faltantes({ circunferenciaCintura: null, circunferenciaCinturaSeDesconoce: true })).not.toContain(
      'circunferenciaCintura',
    );
    const [problema] = problemasPorFaltantes(
      validarCamposRequeridos('notaMedica', { circunferenciaCintura: null }, opciones).camposFaltantes.filter(
        (c) => c.campo === 'circunferenciaCintura',
      ),
    );
    expect(problema.mensaje).toBe('Escribe la circunferencia de cintura o marca «Se desconoce».');
  });

  it('sin cumplimiento normativo no se exige (el paso no existe)', () => {
    const sinRegimen = validarCamposRequeridos('notaMedica', { circunferenciaCintura: null }, {
      ...opciones,
      showSiresUI: false,
    }).camposFaltantes.map((c) => c.campo);
    expect(sinRegimen).not.toContain('circunferenciaCintura');
  });

  it('peso y talla: «… o marca «Se desconoce».»', () => {
    const textos = problemasPorFaltantes(
      validarCamposRequeridos('notaMedica', {}, opciones).camposFaltantes.filter(
        (c) => c.campo === 'peso' || c.campo === 'talla',
      ),
    ).map((p) => p.mensaje);
    expect(textos).toEqual(['Escribe el peso o marca «Se desconoce».', 'Escribe la talla o marca «Se desconoce».']);
  });

  it('al enviar, «Se desconoce» va como 0 y la casilla no viaja', () => {
    expect(
      aplicarSeDesconocePesoTalla({ circunferenciaCintura: null, circunferenciaCinturaSeDesconoce: true }),
    ).toEqual({ circunferenciaCintura: 0 });
  });

  it('al abrir una nota guardada, 0 (o vacía en notas anteriores) se muestra marcada', () => {
    expect(hidratarPesoTallaDesconocidoNotaMedica({ circunferenciaCintura: 0 })).toMatchObject({
      circunferenciaCintura: null,
      circunferenciaCinturaSeDesconoce: true,
    });
    expect(hidratarPesoTallaDesconocidoNotaMedica({ circunferenciaCintura: 95 })).toMatchObject({
      circunferenciaCintura: 95,
      circunferenciaCinturaSeDesconoce: false,
    });
  });
});
