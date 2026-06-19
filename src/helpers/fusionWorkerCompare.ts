import { calcularEdad, calcularAntiguedad } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import type { DuplicateWorkerSummary } from '@/interfaces/trabajador.interface';

export type FusionWorkerCompareField =
  | 'nombre'
  | 'puesto'
  | 'sexo'
  | 'fechaNacimiento'
  | 'fechaIngreso'
  | 'curp'
  | 'folio'
  | 'numeroEmpleado'
  | 'centroTrabajo';

const FIELD_LABELS: Record<FusionWorkerCompareField, string> = {
  nombre: 'Nombre',
  puesto: 'Puesto',
  sexo: 'Sexo',
  fechaNacimiento: 'Edad',
  fechaIngreso: 'Antigüedad',
  curp: 'CURP',
  folio: 'Folio',
  numeroEmpleado: 'Número de empleado',
  centroTrabajo: 'Centro de trabajo',
};

function normalizeText(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function normalizeDate(value?: string | null): string {
  if (!value?.trim()) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return normalizeText(value);
  return d.toISOString().slice(0, 10);
}

export function nombreCompletoWorker(w: DuplicateWorkerSummary): string {
  return formatNombreCompleto(w);
}

export function labelEdadWorker(w: DuplicateWorkerSummary): string {
  if (!w.fechaNacimiento) return 'Edad desconocida';
  return `${calcularEdad(w.fechaNacimiento)} años`;
}

export function labelAntiguedadWorker(w: DuplicateWorkerSummary): string {
  if (!w.fechaIngreso) return 'Antigüedad desconocida';
  const antiguedad = calcularAntiguedad(w.fechaIngreso);
  return antiguedad === '-' ? 'Antigüedad desconocida' : antiguedad;
}

export function labelPuestoWorker(w: DuplicateWorkerSummary): string {
  return w.puesto?.trim() || 'Puesto no registrado';
}

export function labelSexoWorker(w: DuplicateWorkerSummary): string {
  return w.sexo?.trim() || '—';
}

export function fieldValuesEqual(
  field: FusionWorkerCompareField,
  a: DuplicateWorkerSummary,
  b: DuplicateWorkerSummary,
): boolean {
  switch (field) {
    case 'nombre':
      return normalizeText(nombreCompletoWorker(a)) === normalizeText(nombreCompletoWorker(b));
    case 'puesto':
      return normalizeText(a.puesto) === normalizeText(b.puesto);
    case 'sexo':
      return normalizeText(a.sexo) === normalizeText(b.sexo);
    case 'fechaNacimiento':
      return normalizeDate(a.fechaNacimiento) === normalizeDate(b.fechaNacimiento);
    case 'fechaIngreso':
      return normalizeDate(a.fechaIngreso) === normalizeDate(b.fechaIngreso);
    case 'curp':
      return normalizeText(a.curp) === normalizeText(b.curp);
    case 'folio':
      return normalizeText(a.folio) === normalizeText(b.folio);
    case 'numeroEmpleado':
      return normalizeText(a.numeroEmpleado) === normalizeText(b.numeroEmpleado);
    case 'centroTrabajo':
      return a.idCentroTrabajo === b.idCentroTrabajo;
    default:
      return true;
  }
}

export function fieldDiffers(
  field: FusionWorkerCompareField,
  registro: DuplicateWorkerSummary,
  opuesto: DuplicateWorkerSummary,
): boolean {
  return !fieldValuesEqual(field, registro, opuesto);
}

export function differingFields(
  a: DuplicateWorkerSummary,
  b: DuplicateWorkerSummary,
): FusionWorkerCompareField[] {
  const fields: FusionWorkerCompareField[] = [
    'nombre',
    'puesto',
    'sexo',
    'fechaNacimiento',
    'fechaIngreso',
    'curp',
    'folio',
    'numeroEmpleado',
    'centroTrabajo',
  ];
  return fields.filter((f) => fieldDiffers(f, a, b));
}

export function labelForDiffField(field: FusionWorkerCompareField): string {
  return FIELD_LABELS[field];
}

export function summarizeDifferences(
  a: DuplicateWorkerSummary,
  b: DuplicateWorkerSummary,
): string {
  const diffs = differingFields(a, b).map(labelForDiffField);
  if (!diffs.length) return '';
  if (diffs.length === 1) return diffs[0];
  if (diffs.length === 2) return `${diffs[0]} y ${diffs[1]}`;
  return `${diffs.slice(0, -1).join(', ')} y ${diffs[diffs.length - 1]}`;
}
