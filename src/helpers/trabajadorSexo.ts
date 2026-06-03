/** Helpers de sexo del trabajador (no aplican a firmantes). */

export function esTrabajadorFemenino(sexo: string | null | undefined): boolean {
  return sexo === 'Femenino';
}

/** Masculino e Intersexual: comportamiento UI/reglas por defecto no femenino. */
export function esTrabajadorMasculinoPorDefecto(
  sexo: string | null | undefined,
): boolean {
  return sexo !== 'Femenino';
}
