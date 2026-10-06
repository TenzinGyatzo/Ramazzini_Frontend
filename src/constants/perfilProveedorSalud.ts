/** Tipo de proveedor: describe cómo opera el servicio, no la profesión de quien lo registra. */
export const PERFILES_PROVEEDOR_SALUD = [
  'Profesional único en una empresa',
  'Profesional independiente que brinda servicios a empresas',
  'Empresa de salud ocupacional',
  'Equipo de salud interno de una empresa',
  'Otro',
] as const;

// Textos anteriores, que hablaban de «médico»; el backend aún los acepta
const PERFILES_PROVEEDOR_SALUD_ANTERIORES: Record<string, string> = {
  'Médico único de empresa': 'Profesional único en una empresa',
  'Médico independiente que brinda servicios a empresas':
    'Profesional independiente que brinda servicios a empresas',
  'Equipo Médico Interno de la Empresa':
    'Equipo de salud interno de una empresa',
};

/** Convierte un valor guardado con el texto anterior a su equivalente vigente. */
export function normalizarPerfilProveedorSalud(
  valor: string | null | undefined,
): string {
  if (!valor) return '';
  return PERFILES_PROVEEDOR_SALUD_ANTERIORES[valor] ?? valor;
}
