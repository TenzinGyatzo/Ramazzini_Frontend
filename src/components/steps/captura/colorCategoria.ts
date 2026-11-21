/**
 * Color sólido de la insignia de una categoría calculada (punto 41, como la nota médica):
 * verde lo normal, ámbar lo que hay que vigilar, rojo lo de riesgo. Cubre las categorías de
 * somatometría y signos vitales de la exploración física.
 */
const VERDE = new Set(['Normal', 'Óptima', 'Excelente', 'Buena', 'Bajo Riesgo']);
const AMBAR = new Set([
  'Bajo peso',
  'Sobrepeso',
  'Riesgo elevado',
  'Riesgo Aumentado',
  'Alta',
  'Elevada',
  'Bradipnea',
  'Taquipnea',
  'Aceptable',
  'Moderadamente baja',
]);

export function colorCategoria(categoria: string | null | undefined): string {
  if (!categoria) return 'bg-gray-400';
  if (VERDE.has(categoria)) return 'bg-emerald-600';
  if (AMBAR.has(categoria)) return 'bg-amber-600';
  if (categoria === 'Obesidad clase III' || categoria === 'Hipertensión grado 3' || categoria === 'Hipoxemia grave') {
    return 'bg-red-800';
  }
  if (categoria === 'Obesidad clase II' || categoria === 'Hipertensión grado 2') return 'bg-red-700';
  return 'bg-red-600';
}
