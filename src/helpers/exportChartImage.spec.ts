import { describe, expect, it } from 'vitest';
import { clonarConFunciones } from './exportChartImage';

describe('clonarConFunciones', () => {
  it('conserva los formateadores y copia lo demás', () => {
    const formatter = (valor: number) => `${valor} (50 %)`;
    const original = {
      type: 'doughnut',
      data: { labels: ['Sí', 'No'], datasets: [{ data: [1, 1] }] },
      options: { plugins: { datalabels: { font: { size: 12 }, formatter } } },
    };
    const copia = clonarConFunciones(original);

    expect(copia.options.plugins.datalabels.formatter).toBe(formatter);
    expect(copia).toEqual(original);
    // Ajustar la copia (como hace la exportación) no toca la gráfica de la pantalla
    copia.options.plugins.datalabels.font.size = 40;
    copia.data.datasets[0].data.push(3);
    expect(original.options.plugins.datalabels.font.size).toBe(12);
    expect(original.data.datasets[0].data).toEqual([1, 1]);
  });
});
