/** Colores que el Principal puede elegir para encabezados y tablas de los informes en PDF. */
export const COLORES_INFORME = [
  { name: 'Gris Oscuro', hex: '#343A40' },
  { name: 'Gris', hex: '#6C757D' },
  { name: 'Azul Oscuro', hex: '#004085' },
  { name: 'Azul Profesional', hex: '#007BFF' },
  { name: 'Turquesa Oscuro', hex: '#138496' },
  { name: 'Turquesa', hex: '#17A2B8' },
  { name: 'Azul Claro', hex: '#2BB9D9' },
  { name: 'Verde Teal', hex: '#006763' },
  { name: 'Verde Oscuro', hex: '#1E7E34' },
  { name: 'Verde Médico', hex: '#28A745' },
  { name: 'Rojo Oscuro', hex: '#C82333' },
  { name: 'Rojo Médico', hex: '#DC3545' },
  { name: 'Naranja', hex: '#E67E22' },
  { name: 'Oro', hex: '#E0A800' },
] as const;

/** Mismo valor que el schema del proveedor. */
export const COLOR_INFORME_POR_DEFECTO = '#343A40';

/** Nombre del color, o el código si no es de la lista. */
export function nombreColorInforme(hex: string | null | undefined): string {
  if (!hex) return '';
  return COLORES_INFORME.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex;
}
