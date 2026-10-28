/**
 * Datos del resumen de la carga masiva de trabajadores: cómo nombrar cada renglón,
 * sus motivos de error y el reporte de errores en Excel.
 */

export interface TrabajadorDelRenglon {
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

export interface ResultadoDeRenglon {
  /** Renglón del Excel (el 2 es el primero después de los encabezados) */
  fila?: number
  success: boolean
  worker?: TrabajadorDelRenglon
  error?: string
  validationErrors?: string[]
}

/** «PÉREZ LÓPEZ JUAN» sin huecos ni «undefined» cuando falta un apellido. */
export function nombreDelRenglon(worker?: TrabajadorDelRenglon): string {
  const partes = [worker?.primerApellido, worker?.segundoApellido, worker?.nombre]
    .map((parte) => (parte == null ? '' : String(parte).trim()))
    .filter(Boolean)
  return partes.length > 0 ? partes.join(' ') : 'Sin nombre'
}

/** Los motivos de un renglón rechazado, uno por problema. */
export function motivosDelRenglon(resultado: ResultadoDeRenglon): string[] {
  if (resultado.validationErrors && resultado.validationErrors.length > 0) {
    return resultado.validationErrors
  }
  return resultado.error ? [resultado.error] : ['No se pudo registrar este renglón.']
}

/** dd/mm/aaaa; las fechas solo-día se leen en UTC para no correr un día. */
export function fechaDelRenglon(fecha?: string | Date): string {
  if (!fecha) return ''
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return String(fecha)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

const texto = (valor: unknown) => (valor == null ? '' : String(valor))

export const ENCABEZADOS_REPORTE_ERRORES = [
  'Renglón',
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
 * Renglones del reporte de errores: uno por motivo, repitiendo los datos del trabajador,
 * para poder filtrar por renglón o por tipo de error en Excel.
 */
export function filasReporteErrores(resultados: ResultadoDeRenglon[]): string[][] {
  const filas: string[][] = [[...ENCABEZADOS_REPORTE_ERRORES]]
  for (const resultado of resultados) {
    if (resultado.success) continue
    const w = resultado.worker ?? {}
    for (const motivo of motivosDelRenglon(resultado)) {
      filas.push([
        texto(resultado.fila),
        motivo,
        texto(w.curp),
        texto(w.primerApellido),
        texto(w.segundoApellido),
        texto(w.nombre),
        fechaDelRenglon(w.fechaNacimiento),
        texto(w.sexo),
        texto(w.numeroEmpleado),
        texto(w.nss),
        texto(w.puesto),
        fechaDelRenglon(w.fechaIngreso),
        texto(w.telefono),
        texto(w.escolaridad),
        texto(w.estadoCivil),
      ])
    }
  }
  return filas
}
