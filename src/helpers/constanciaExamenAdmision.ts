/**
 * Constancia de examen médico de admisión (punto 35, docs/constancia-examen-admision-especificacion.md).
 * Mismas reglas que el PDF: backend/src/modules/informes/documents/constancia-examen-admision.informe.ts.
 */
import { toTitleCase } from '@/helpers/toTitleCase';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** `2026-11-16` (o ISO a medianoche UTC) → «lunes, 16 de noviembre de 2026». */
export function fechaConDiaDeLaSemana(fecha: string | Date | null | undefined): string {
  if (!fecha) return '';
  const texto = typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T00:00:00.000Z` : fecha;
  const f = new Date(texto);
  if (isNaN(f.getTime())) return '';
  return `${DIAS[f.getUTCDay()]}, ${f.getUTCDate()} de ${MESES[f.getUTCMonth()]} de ${f.getUTCFullYear()}`;
}

/** «Ahome, Sinaloa»: municipio y estado del proveedor, sin los que falten. */
export function lugarDelProveedor(proveedor: { municipio?: string | null; estado?: string | null } | null | undefined): string {
  return [proveedor?.municipio, proveedor?.estado]
    .map((parte) => toTitleCase(parte ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

export function conclusionConstanciaAdmision(sexo: string | null | undefined): string {
  return sexo === 'Femenino'
    ? 'CLÍNICAMENTE SANA Y APTA PARA EL PUESTO'
    : 'CLÍNICAMENTE SANO Y APTO PARA EL PUESTO';
}

/** Primer apellido, segundo apellido y nombre, en mayúsculas. */
export function nombreConstanciaAdmision(
  trabajador: { primerApellido?: string | null; segundoApellido?: string | null; nombre?: string | null } | null | undefined,
): string {
  return [trabajador?.primerApellido, trabajador?.segundoApellido, trabajador?.nombre]
    .map((parte) => String(parte ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
}

/** Igual que el servidor: `Constancia Examen Admision dd-mm-aaaa.pdf`. */
export function nombreArchivoConstanciaExamenAdmision(fecha: string | Date | null | undefined): string {
  const texto = typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T00:00:00.000Z` : fecha;
  const f = new Date(texto ?? '');
  if (isNaN(f.getTime())) return 'Constancia Examen Admision.pdf';
  const dd = String(f.getUTCDate()).padStart(2, '0');
  const mm = String(f.getUTCMonth() + 1).padStart(2, '0');
  return `Constancia Examen Admision ${dd}-${mm}-${f.getUTCFullYear()}.pdf`;
}
