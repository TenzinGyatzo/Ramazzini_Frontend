/**
 * Captura rápida (punto 38): clases comunes de los campos, para que todas las secciones se
 * vean igual (mismo alto, mismo borde y el mismo enfoque verde). Son clases de Tailwind para
 * que el modo oscuro (remapeo en dark-mode.css) las tome como a las demás.
 */
export const CLASE_ETIQUETA = 'block text-sm font-medium text-gray-700';
export const CLASE_AYUDA = 'text-xs text-gray-500 leading-snug';
export const CLASE_ERROR = 'text-red-500 text-xs mt-1';
export const CLASE_INPUT =
  'w-full h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed';
export const CLASE_TEXTAREA =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y';
/** Casilla pequeña junto a la etiqueta («Se desconoce»). */
export const CLASE_CASILLA_LATERAL =
  'inline-flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none whitespace-nowrap';
