/** Clases compartidas por los pasos de la nota de enfermería (mismo estilo que los cuestionarios). */
export const claseOpcion = (seleccionada: boolean) => [
  'px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all duration-150 ease-in-out text-left',
  seleccionada
    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
    : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50/50',
];

export const claseInput =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';

export const claseEtiqueta = 'mb-1.5 text-sm font-medium text-gray-800';
