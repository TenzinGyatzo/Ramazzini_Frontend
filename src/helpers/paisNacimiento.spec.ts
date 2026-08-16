import { describe, expect, it } from 'vitest';
import { sortPaisesForSelector } from './paisNacimiento';

const sampleCatalog = [
  { code: '1', description: 'PAIS A' },
  { code: '3', description: 'PAIS C' },
  { code: '142', description: 'MÉXICO' },
  { code: '246', description: 'OTRO' },
  { code: '2', description: 'PAIS B' },
];

describe('sortPaisesForSelector', () => {
  it('trabajador: 142, 246, 247, 248 y resto numérico', () => {
    const ordered = sortPaisesForSelector(sampleCatalog, {
      geoContext: 'trabajador',
    });
    expect(ordered.map((item) => String(item.code))).toEqual([
      '142',
      '246',
      '247',
      '248',
      '1',
      '2',
      '3',
    ]);
  });

  it('firmante: 142, 246 y resto numérico sin 247/248', () => {
    const ordered = sortPaisesForSelector(sampleCatalog, {
      geoContext: 'firmante',
      excludeCodes: ['247', '248'],
    });
    expect(ordered.map((item) => String(item.code))).toEqual([
      '142',
      '246',
      '1',
      '2',
      '3',
    ]);
  });

  it('no inyecta 247/248 en búsqueda tipada salvo que ya vengan en items', () => {
    const withoutSentinels = sortPaisesForSelector(sampleCatalog, {
      geoContext: 'trabajador',
      injectMissingSentinels: false,
    });
    expect(withoutSentinels.map((item) => String(item.code))).toEqual([
      '142',
      '246',
      '1',
      '2',
      '3',
    ]);

    const withMatchingSentinel = sortPaisesForSelector(
      [...sampleCatalog, { code: '247', description: 'SE IGNORA' }],
      {
        geoContext: 'trabajador',
        injectMissingSentinels: false,
      },
    );
    expect(withMatchingSentinel.map((item) => String(item.code))).toEqual([
      '142',
      '246',
      '247',
      '1',
      '2',
      '3',
    ]);
  });
});
