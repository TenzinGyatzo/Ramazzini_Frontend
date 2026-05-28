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

function calcularEdad(dateString: string): number {
  const fechaNacimiento = new Date(dateString);
  // if (isNaN(fechaNacimiento.getTime())) {
  //   throw new Error("La fecha proporcionada no es válida.");
  // }

  const hoy = new Date().getTime();
  const edad = Math.floor(
    (hoy - fechaNacimiento.getTime()) / (1000 * 60 * 60 * 24 * 365)
  );
  return edad;
}

function calcularEdadPrecisa(dateString: string): number {
  const fechaNacimiento = new Date(dateString);
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const mesDiff = hoy.getMonth() - fechaNacimiento.getMonth();
  if (
    mesDiff < 0 ||
    (mesDiff === 0 && hoy.getDate() < fechaNacimiento.getDate())
  ) {
    edad--;
  }
  return edad;
}

function calcularAntiguedad(dateString: string): string {
  // Si no hay fecha de ingreso, retornar guión
  if (!dateString || dateString === '' || dateString === 'No recuerda') {
    return '-';
  }

  const fechaIngreso = new Date(dateString);
  
  // Validar que la fecha sea válida
  if (isNaN(fechaIngreso.getTime())) {
    return 'Fecha inválida';
  }

  const fechaIngresoMilisegundos = fechaIngreso.getTime();
  const hoy = new Date();
  const hoyMilisegundos = new Date().getTime();
  const antiguedadEnMilisegundos = hoyMilisegundos - fechaIngresoMilisegundos;
  
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
  
  // Calcular meses y años
  const totalMonths =
    (hoy.getFullYear() - fechaIngreso.getFullYear()) * 12 +
    hoy.getMonth() -
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
  determinarVistaCorregida
};
