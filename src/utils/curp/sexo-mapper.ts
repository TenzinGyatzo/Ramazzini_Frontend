/**
 * Maps sexo string to numeric code according to NOM-024 GIIS-B015
 * - 1 Masculino, 2 Femenino, 3 Intersexual
 */
export function mapSexoToGiisBiologico(sexo: string): 1 | 2 | 3 | null {
  if (!sexo) {
    return null;
  }

  const normalizedSexo = sexo.trim().toLowerCase();

  if (
    normalizedSexo === 'masculino' ||
    normalizedSexo === 'hombre' ||
    normalizedSexo === 'm' ||
    normalizedSexo === 'h'
  ) {
    return 1;
  }

  if (
    normalizedSexo === 'femenino' ||
    normalizedSexo === 'mujer' ||
    normalizedSexo === 'f'
  ) {
    return 2;
  }

  if (
    normalizedSexo === 'intersexual' ||
    normalizedSexo === 'otro' ||
    normalizedSexo === 'other' ||
    normalizedSexo === '3'
  ) {
    return 3;
  }

  return null;
}
