/**
 * Régimen de cumplimiento normativo (SIRES_NOM024), regla E2: en la fecha del documento el
 * trabajador ya debe tener 17 años y el firmante 18. Espejo de
 * backend/src/modules/expedientes/validators/date-validators.ts (validateEdadEnFechaDocumento).
 * Sin régimen no hay restricción.
 */
import { formatearFechaDDMMAAAA, parseDateOnlyValue } from '@/helpers/dates';
import { FIRMANTE_EDAD_MINIMA, TRABAJADOR_EDAD_MINIMA } from '../../formkit.config';

type FechaEntrada = Date | string | null | undefined;

function aYYYYMMDD(fecha: Date): string {
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mm}-${dd}`;
}

/** Día (AAAA-MM-DD) en que cumple `years` años; null si no hay fecha válida. 29/02 → 01/03. */
export function fechaEnQueCumple(fechaNacimiento: FechaEntrada, years: number): string | null {
  if (!fechaNacimiento) return null;
  try {
    const cumple = parseDateOnlyValue(fechaNacimiento);
    cumple.setFullYear(cumple.getFullYear() + years);
    return aYYYYMMDD(cumple);
  } catch {
    return null;
  }
}

export interface EdadesFirmanteTrabajador {
  trabajadorNacimiento?: FechaEntrada;
  firmanteNacimiento?: FechaEntrada;
}

/** Días (AAAA-MM-DD) desde los que trabajador y firmante tienen la edad mínima. */
export function fechasMinimasPorEdad({ trabajadorNacimiento, firmanteNacimiento }: EdadesFirmanteTrabajador) {
  return {
    trabajador: fechaEnQueCumple(trabajadorNacimiento, TRABAJADOR_EDAD_MINIMA),
    firmante: fechaEnQueCumple(firmanteNacimiento, FIRMANTE_EDAD_MINIMA),
  };
}

/**
 * Mensaje si la fecha del documento es anterior a la edad mínima; '' si está bien.
 * Mismo texto que el servidor.
 */
export function mensajeEdadEnFechaDocumento(
  fechaDocumento: FechaEntrada,
  edades: EdadesFirmanteTrabajador,
): string {
  if (!fechaDocumento) return '';
  let fecha: string;
  try {
    fecha = aYYYYMMDD(parseDateOnlyValue(fechaDocumento));
  } catch {
    return '';
  }
  const { trabajador, firmante } = fechasMinimasPorEdad(edades);
  if (trabajador && fecha < trabajador) {
    return `En la fecha del documento el trabajador aún no tenía ${TRABAJADOR_EDAD_MINIMA} años (los cumple el ${formatearFechaDDMMAAAA(trabajador)}).`;
  }
  if (firmante && fecha < firmante) {
    return `En la fecha del documento aún no tenías ${FIRMANTE_EDAD_MINIMA} años. Solo puedes firmar atenciones con fecha a partir del ${formatearFechaDDMMAAAA(firmante)}.`;
  }
  return '';
}
