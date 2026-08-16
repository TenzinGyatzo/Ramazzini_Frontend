function convertirFechaISOaDDMMYYYY(dateString: string): string {
  // Si la fecha está vacía o es null/undefined, retornar string vacío
  if (!dateString || dateString === '' || dateString === 'No recuerda') {
    return '';
  }

  const fecha = new Date(dateString);

  if (isNaN(fecha.getTime())) {
    // En lugar de lanzar error, retornar string vacío
    return '';
  }

  const dia = String(fecha.getUTCDate()).padStart(2, "0"); // Obtiene el día en UTC
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0"); // Mes en UTC (suma 1 porque empieza en 0)
  const año = fecha.getUTCFullYear(); // Año en UTC

  return `${dia}-${mes}-${año}`;
}

function convertirFechaISOaYYYYMMDD(dateString: string): string {
  if (!dateString) {
    return ""; // Retorna un string vacío si el parámetro es una cadena vacía
  }

  const fecha = new Date(dateString);

  if (isNaN(fecha.getTime())) {
    throw new Error("La fecha proporcionada no es válida.");
  }

  const dia = String(fecha.getUTCDate()).padStart(2, "0"); // Obtiene el día en UTC con dos dígitos
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0"); // Los meses empiezan en 0, por eso se suma 1
  const año = fecha.getUTCFullYear(); // Obtiene el año completo en UTC

  return `${año}-${mes}-${dia}`;
}

function calcularEdadPrecisa(
  dateString: string,
  fechaReferencia?: Date | string,
): number {
  const fechaNacimiento = new Date(dateString);
  const referencia = fechaReferencia ? new Date(fechaReferencia) : new Date();
  let edad = referencia.getFullYear() - fechaNacimiento.getFullYear();
  const mesDiff = referencia.getMonth() - fechaNacimiento.getMonth();
  if (
    mesDiff < 0 ||
    (mesDiff === 0 && referencia.getDate() < fechaNacimiento.getDate())
  ) {
    edad--;
  }
  return edad;
}

function calcularEdad(
  dateString: string,
  fechaReferencia?: Date | string,
): number {
  return calcularEdadPrecisa(dateString, fechaReferencia);
}

function calcularAntiguedad(
  dateString: string,
  fechaReferencia?: Date | string,
): string {
  if (!dateString || dateString === '' || dateString === 'No recuerda') {
    return '-';
  }

  const fechaIngreso = new Date(dateString);

  if (isNaN(fechaIngreso.getTime())) {
    return 'Fecha inválida';
  }

  const referencia = fechaReferencia ? new Date(fechaReferencia) : new Date();
  const fechaIngresoMilisegundos = fechaIngreso.getTime();
  const referenciaMilisegundos = referencia.getTime();
  const antiguedadEnMilisegundos =
    referenciaMilisegundos - fechaIngresoMilisegundos;
  
  // Convertir a días
  const dias = Math.floor(antiguedadEnMilisegundos / (1000 * 60 * 60 * 24));
  
  // Menos de 7 días
  if (dias < 7) {
    return "Nuevo Ingreso";
  }
  
  // Entre 7 y 28 días (1-4 semanas)
  if (dias <= 28) {
    const semanas = Math.floor(dias / 7);
    return `${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
  }
  
  const totalMonths =
    (referencia.getFullYear() - fechaIngreso.getFullYear()) * 12 +
    referencia.getMonth() -
    fechaIngreso.getMonth();
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  
  // Menos de 1 año
  if (years < 1) {
    const mesText = months === 1 ? "mes" : "meses";
    return `${months} ${mesText}`;
  }
  
  // 1 año o más
  const mesText = months === 1 ? "mes" : "meses";
  const yearText = years === 1 ? "año" : "años";
  
  if (months === 0) {
    return `${years} ${yearText}`;
  }
  
  return `${years} ${yearText}, ${months} ${mesText}`;
}

  function formatDateDDMMYYYY(date) {
    if (!date) return '';
  
    const d = new Date(date); // Sin modificar la fecha
    if (isNaN(d.getTime())) return ''; // Validar si la fecha es válida
  
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
  
    return `${day}-${month}-${year}`;
  }

  function formatDateDDMMYYYYHHMMSS(date) {
    if (!date) return '';
  
    const d = new Date(date); // Sin modificar la fecha
    if (isNaN(d.getTime())) return ''; // Validar si la fecha es válida
  
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }

  function formatDateDDMMYYYYHHMM(date) {
    if (!date) return '';
  
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
  
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  function formatDateYYYYMMDD(date) {
    if (!date) return '';
  
    const d = new Date(date); // Sin modificar la fecha
    if (isNaN(d.getTime())) return ''; // Validar si la fecha es válida
  
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
  
    return `${year}-${month}-${day}`;
  }
  
  function convertirYYYYMMDDaISO(dateString) {
    if (!dateString) {
      throw new Error("La fecha proporcionada no es válida o está vacía.");
    }
  
    // Dividimos el string en partes (YYYY, MM, DD)
    const [year, month, day] = dateString.split("-").map(Number);
  
    // Validamos que los valores sean correctos
    if (!year || !month || !day || month > 12 || day > 31) {
      throw new Error("La fecha proporcionada no tiene un formato válido (YYYY-MM-DD).");
    }
  
    // Crear una fecha en UTC
    const fecha = new Date(Date.UTC(year, month - 1, day));
  
    if (isNaN(fecha.getTime())) {
      throw new Error("La fecha no pudo ser convertida a ISO.");
    }
  
    return fecha.toISOString(); // Convertimos la fecha a formato ISO
  }

  function convertirFechaISOaDDMesYYYY(dateString: string): string {
    // Si la fecha está vacía o es null/undefined, retornar string vacío
    if (!dateString || dateString === '' || dateString === 'No recuerda') {
      return '';
    }

    const fecha = new Date(dateString);

    if (isNaN(fecha.getTime())) {
      // En lugar de lanzar error, retornar string vacío
      return '';
    }

    // Array con abreviaciones de meses en español
    const mesesAbreviados = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
    ];

    const dia = String(fecha.getUTCDate()).padStart(2, "0"); // Obtiene el día en UTC
    const mes = mesesAbreviados[fecha.getUTCMonth()]; // Obtiene la abreviación del mes
    const año = fecha.getUTCFullYear(); // Año en UTC

    return `${dia}-${mes}-${año}`;
  }

  const determinarVistaCorregida = (
    requiereLentesUsoGeneral?: string | null,
    ojoIzquierdoLejanaConCorreccion?: number | null,
    ojoDerechoLejanaConCorreccion?: number | null
  ): string => {
    if (requiereLentesUsoGeneral === 'No') return 'No requiere';
    if (requiereLentesUsoGeneral === 'Si') {
      return ((ojoIzquierdoLejanaConCorreccion ?? 0) > 0 || (ojoDerechoLejanaConCorreccion ?? 0) > 0)
        ? 'Corregida' : 'Sin corregir';
    }
    return '-';
  };

const DATE_ONLY_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

function toLocalDateOnly(year: number, month: number, day: number): Date {
  const local = new Date(year, month - 1, day);
  if (
    local.getFullYear() !== year ||
    local.getMonth() !== month - 1 ||
    local.getDate() !== day
  ) {
    throw new Error('Fecha inválida');
  }
  return local;
}

function isUtcDateOnlyStorage(date: Date): boolean {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

function dateComponentsFromDateOnlyValue(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  if (isUtcDateOnlyStorage(date)) {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function parseDateOnlyValue(date: Date | string): Date {
  if (date instanceof Date) {
    if (isNaN(date.getTime())) {
      throw new Error('Fecha inválida');
    }
    const { year, month, day } = dateComponentsFromDateOnlyValue(date);
    return toLocalDateOnly(year, month, day);
  }

  const trimmed = date.trim();
  const match = DATE_ONLY_PREFIX.exec(trimmed);
  if (match) {
    return toLocalDateOnly(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
    );
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    throw new Error('Fecha inválida');
  }
  const { year, month, day } = dateComponentsFromDateOnlyValue(parsed);
  return toLocalDateOnly(year, month, day);
}

function normalizeDateOnlyLocal(date: Date | string): Date {
  return parseDateOnlyValue(date);
}

function subtractCalendarYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() - years);
  return result;
}

function getBirthDateBounds(
  fechaReferencia: Date | string,
  minYears: number,
  maxYears: number,
): { min: Date; max: Date } {
  const referencia = normalizeDateOnlyLocal(fechaReferencia);
  return {
    min: normalizeDateOnlyLocal(subtractCalendarYears(referencia, maxYears)),
    max: normalizeDateOnlyLocal(subtractCalendarYears(referencia, minYears)),
  };
}

function isBirthDateInRegistrationRange(
  fechaNacimiento: Date | string,
  fechaReferencia: Date | string,
  minYears: number,
  maxYears: number,
): boolean {
  try {
    if (
      fechaNacimiento == null ||
      (typeof fechaNacimiento === 'string' && fechaNacimiento.trim() === '')
    ) {
      return false;
    }
    const birth = normalizeDateOnlyLocal(fechaNacimiento);
    const { min, max } = getBirthDateBounds(fechaReferencia, minYears, maxYears);
    return birth >= min && birth <= max;
  } catch {
    // Fechas parciales/invalidas no deben tumbar el render (p. ej. feedback en modal).
    return false;
  }
}

function calculateExactAgeDuration(
  fechaNacimiento: Date | string,
  fechaReferencia: Date | string = new Date(),
): { years: number; months: number; days: number } {
  const birth = normalizeDateOnlyLocal(fechaNacimiento);
  const ref = normalizeDateOnlyLocal(fechaReferencia);

  let years = ref.getFullYear() - birth.getFullYear();
  let months = ref.getMonth() - birth.getMonth();
  let days = ref.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(ref.getFullYear(), ref.getMonth(), 0).getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
}

function formatExactAgeDuration(duration: {
  years: number;
  months: number;
  days: number;
}): string {
  return `${duration.years} años, ${duration.months} meses y ${duration.days} días`;
}

function buildRegistrationAgeRangeMessage(
  minYears: number,
  maxYears: number,
  fechaNacimiento: Date | string,
  fechaReferencia: Date | string = new Date(),
): string {
  try {
    const duration = calculateExactAgeDuration(
      fechaNacimiento,
      fechaReferencia,
    );
    return `Edad fuera de rango (${minYears} a ${maxYears} años, incluyendo meses y días). Edad calculada: ${formatExactAgeDuration(duration)}.`;
  } catch {
    return `Edad fuera de rango (${minYears} a ${maxYears} años, incluyendo meses y días).`;
  }
}

function formatBirthDateBoundForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRegistrationBirthDateInputBounds(
  minYears: number,
  maxYears: number,
  fechaReferencia?: Date | string,
): { min: string; max: string } {
  const { min, max } = getBirthDateBounds(
    fechaReferencia ?? new Date(),
    minYears,
    maxYears,
  );
  return {
    min: formatBirthDateBoundForInput(min),
    max: formatBirthDateBoundForInput(max),
  };
}


export {
  convertirFechaISOaDDMMYYYY,
  convertirFechaISOaYYYYMMDD,
  convertirFechaISOaDDMesYYYY,
  calcularEdad,
  calcularEdadPrecisa,
  calcularAntiguedad,
  formatDateDDMMYYYY,
  formatDateDDMMYYYYHHMMSS,
  formatDateDDMMYYYYHHMM,
  formatDateYYYYMMDD,
  convertirYYYYMMDDaISO,
  determinarVistaCorregida,
  getBirthDateBounds,
  isBirthDateInRegistrationRange,
  getRegistrationBirthDateInputBounds,
  buildRegistrationAgeRangeMessage,
  calculateExactAgeDuration,
  formatExactAgeDuration,
};
