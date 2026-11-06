/**
 * Clases compartidas por los pasos de la nota de enfermería (mismo estilo que los cuestionarios).
 * El formulario ocupa 2/5 del ancho en pantallas grandes: las rejillas son de una o dos columnas
 * fijas, nunca dependientes del ancho de la ventana.
 */
export const claseOpcion = (seleccionada: boolean) => [
  'px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all duration-150 ease-in-out text-left',
  seleccionada
    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
    : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50/50',
];

/** Opción dentro de una lista en columna: mismo aspecto, ancho completo y más compacta. */
export const claseOpcionLista = (seleccionada: boolean) => {
  const [base, estado] = claseOpcion(seleccionada);
  return [base.replace('py-1.5', 'py-2'), estado, 'w-full'];
};

/** Botón de una elección de dos (Administrado / Entregado), del alto de un campo. */
export const claseSegmento = (seleccionada: boolean) => [
  'w-full rounded-lg border-2 px-2 py-[0.4rem] text-center text-sm font-medium transition-all duration-150 ease-in-out',
  seleccionada
    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
    : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50/50',
];

const BASE_INPUT =
  'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1';
const BORDE_NORMAL = 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-500';
const BORDE_ERROR = 'border-red-400 focus:border-red-500 focus:ring-red-500';

export const claseInput = `${BASE_INPUT} ${BORDE_NORMAL}`;

/** Campo con borde rojo si tiene error. */
export const claseCampo = (conError = false) => `${BASE_INPUT} ${conError ? BORDE_ERROR : BORDE_NORMAL}`;

/** Cifras: centradas, como los signos vitales de la nota médica. */
export const claseNumero = (conError = false) => `${claseCampo(conError)} text-center tabular-nums`;

export const claseEtiqueta = 'mb-1.5 text-sm font-medium text-gray-800';

/** Etiqueta de un campo dentro de una tarjeta (medicamentos, signos vitales). */
export const claseEtiquetaCampo = 'mb-1 block text-xs font-medium text-gray-600';

/** Texto de ayuda bajo una etiqueta. */
export const claseAyuda = 'mb-2 text-xs text-gray-500';

/** Aviso breve bajo un campo. */
export const claseError = 'mt-1 text-xs font-medium text-red-600';

export const claseBotonAgregar =
  'inline-flex items-center gap-2 rounded-lg border border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50';

export const claseBotonQuitar =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600';
