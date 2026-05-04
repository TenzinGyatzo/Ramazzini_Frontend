export type FindNearestDocumentOptions = {
  sameYearAsReference?: boolean;
};

function toDate(value: unknown): Date | null {
  if (value == null || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export const findNearestDocument = <T extends Record<string, unknown>>(
  documents: T[],
  referenceDateField: string | Date | null | undefined,
  dateField: keyof T & string,
  options: FindNearestDocumentOptions = {},
): T | null => {
  const sameYearAsReference = options.sameYearAsReference === true;

  if (!referenceDateField || !documents.length) {
    return null;
  }

  const referenceDate = new Date(referenceDateField);

  if (isNaN(referenceDate.getTime())) {
    console.error('Fecha de referencia no válida:', referenceDateField);
    return null;
  }

  const referenceYear = referenceDate.getFullYear();

  return documents.reduce<T | null>((closest, current) => {
    const currentDate = toDate(current[dateField]);

    if (!currentDate) {
      console.error('Fecha de documento no válida:', current[dateField]);
      return closest;
    }

    if (sameYearAsReference && currentDate.getFullYear() !== referenceYear) {
      return closest;
    }

    const currentDiff = Math.abs(currentDate.getTime() - referenceDate.getTime());
    let closestDiff = Infinity;
    if (closest) {
      const closestDate = toDate(closest[dateField]);
      if (closestDate) {
        closestDiff = Math.abs(closestDate.getTime() - referenceDate.getTime());
      }
    }

    return currentDiff < closestDiff ? current : closest;
  }, null);
};
