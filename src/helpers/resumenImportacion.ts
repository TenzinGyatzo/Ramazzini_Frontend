/**
 * Datos del resumen de la carga masiva de trabajadores: cómo nombrar cada fila,
 * sus motivos de error y el reporte de errores en Excel.
 */

export interface TrabajadorDeFila {
  primerApellido?: string
  segundoApellido?: string
  nombre?: string
  curp?: string
  sexo?: string
  fechaNacimiento?: string | Date
  fechaIngreso?: string | Date
  escolaridad?: string
  puesto?: string
  estadoCivil?: string
  numeroEmpleado?: string | number
  telefono?: string | number
  nss?: string | number
  [campo: string]: unknown
}

export interface ResultadoDeFila {
  /** Fila del Excel (la 2 es la primera después de los encabezados) */
  fila?: number
  success: boolean
  worker?: TrabajadorDeFila
  error?: string
  validationErrors?: string[]
}

/** «PÉREZ LÓPEZ JUAN» sin huecos ni «undefined» cuando falta un apellido. */
export function nombreDeFila(worker?: TrabajadorDeFila): string {
  const partes = [worker?.primerApellido, worker?.segundoApellido, worker?.nombre]
    .map((parte) => (parte == null ? '' : String(parte).trim()))
    .filter(Boolean)
  return partes.length > 0 ? partes.join(' ') : 'Sin nombre'
}

/** Los motivos de una fila rechazada, uno por problema. */
export function motivosDeFila(resultado: ResultadoDeFila): string[] {
  if (resultado.validationErrors && resultado.validationErrors.length > 0) {
    return resultado.validationErrors
  }
  return resultado.error ? [resultado.error] : ['No se pudo registrar esta fila.']
}

/** dd/mm/aaaa; las fechas solo-día se leen en UTC para no correr un día. */
export function fechaDeFila(fecha?: string | Date): string {
  if (!fecha) return ''
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return String(fecha)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

const texto = (valor: unknown) => (valor == null ? '' : String(valor))

export const ENCABEZADOS_REPORTE_ERRORES = [
  'Fila',
  'Motivo',
  'CURP',
  'Primer Apellido',
  'Segundo Apellido',
  'Nombre',
  'Fecha Nacimiento',
  'Sexo',
  'Número Empleado',
  'NSS',
  'Puesto',
  'Fecha Ingreso',
  'Teléfono',
  'Escolaridad',
  'Estado Civil',
] as const

/**
 * Filas del reporte de errores: una por motivo, repitiendo los datos del trabajador,
 * para poder filtrar por fila o por tipo de error en Excel.
 */
export function filasReporteErrores(resultados: ResultadoDeFila[]): string[][] {
  const filas: string[][] = [[...ENCABEZADOS_REPORTE_ERRORES]]
  for (const resultado of resultados) {
    if (resultado.success) continue
    const w = resultado.worker ?? {}
    for (const motivo of motivosDeFila(resultado)) {
      filas.push([
        texto(resultado.fila),
        motivo,
        texto(w.curp),
        texto(w.primerApellido),
        texto(w.segundoApellido),
        texto(w.nombre),
        fechaDeFila(w.fechaNacimiento),
        texto(w.sexo),
        texto(w.numeroEmpleado),
        texto(w.nss),
        texto(w.puesto),
        fechaDeFila(w.fechaIngreso),
        texto(w.telefono),
        texto(w.escolaridad),
        texto(w.estadoCivil),
      ])
    }
  }
  return filas
}
