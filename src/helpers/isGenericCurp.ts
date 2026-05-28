/**
 * Detecta CURP genérica/placeholder (alineado con backend isGenericCURP).
 */
export function isGenericCurp(curp: string | null | undefined): boolean {
  if (!curp || typeof curp !== 'string') {
    return false;
  }

  const normalizedCurp = curp.trim().toUpperCase();

  if (normalizedCurp === 'XXXX999999XXXXXX99') {
    return true;
  }

  if (
    normalizedCurp.substring(0, 4) === 'XXXX' &&
    normalizedCurp.substring(4, 10) === '999999' &&
    normalizedCurp.substring(16, 18) === '99'
  ) {
    const middlePart = normalizedCurp.substring(11, 16);
    const xCount = (middlePart.match(/X/g) || []).length;
    if (xCount >= 4) {
      return true;
    }
  }

  return false;
}
