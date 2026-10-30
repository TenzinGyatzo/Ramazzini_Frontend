export const TODO_EL_HISTORIAL = 'Todo el historial';

export const OPCIONES_PERIODO_PRODUCTIVIDAD = [
  'Hoy',
  'Esta semana',
  'Este mes',
  'Mes anterior',
  'Últimos 3 meses',
  'Últimos 6 meses',
  'Este año',
  'Año anterior',
  TODO_EL_HISTORIAL,
];

// toISOString pasaría a UTC y una fecha de la noche caería en el día siguiente
export const fechaLocal = (fecha: Date) => {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const rango = (inicio: Date, fin: Date) => ({ inicio: fechaLocal(inicio), fin: fechaLocal(fin) });

/** Fechas `YYYY-MM-DD` de un periodo rápido; las semanas van de lunes a domingo. */
export function fechasDePeriodo(periodo: string, hoy: Date = new Date()) {
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const dia = hoy.getDate();

  switch (periodo) {
    case 'Hoy':
      return rango(hoy, hoy);
    case 'Esta semana': {
      const diaDeLaSemana = hoy.getDay() || 7; // domingo es el último día, no el primero
      const lunes = dia - diaDeLaSemana + 1;
      return rango(new Date(anio, mes, lunes), new Date(anio, mes, lunes + 6));
    }
    case 'Este mes':
      return rango(new Date(anio, mes, 1), new Date(anio, mes + 1, 0));
    case 'Mes anterior':
      return rango(new Date(anio, mes - 1, 1), new Date(anio, mes, 0));
    case 'Últimos 3 meses':
      return rango(new Date(anio, mes - 2, 1), new Date(anio, mes + 1, 0));
    case 'Últimos 6 meses':
      return rango(new Date(anio, mes - 5, 1), new Date(anio, mes + 1, 0));
    case 'Este año':
      return rango(new Date(anio, 0, 1), new Date(anio, 11, 31));
    case 'Año anterior':
      return rango(new Date(anio - 1, 0, 1), new Date(anio - 1, 11, 31));
    default:
      return null;
  }
}
