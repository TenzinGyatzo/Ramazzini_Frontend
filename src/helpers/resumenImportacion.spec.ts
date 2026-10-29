import { describe, expect, it } from 'vitest'
import {
  ENCABEZADOS_REPORTE_ERRORES,
  fechaDeFila,
  filasReporteErrores,
  motivosDeFila,
  nombreDeFila,
} from '@/helpers/resumenImportacion'

describe('nombreDeFila', () => {
  it('sin segundo apellido no escribe «undefined»', () => {
    expect(nombreDeFila({ primerApellido: 'PÉREZ', nombre: 'JUAN' })).toBe('PÉREZ JUAN')
  })

  it('sin datos dice «Sin nombre»', () => {
    expect(nombreDeFila(undefined)).toBe('Sin nombre')
    expect(nombreDeFila({ primerApellido: '  ' })).toBe('Sin nombre')
  })
})

describe('motivosDeFila', () => {
  it('usa los motivos detallados antes que el resumen genérico', () => {
    expect(
      motivosDeFila({
        success: false,
        error: 'Hay errores de validación',
        validationErrors: ['Pos. 2 …', 'Pos. 10 …'],
      }),
    ).toEqual(['Pos. 2 …', 'Pos. 10 …'])
  })

  it('sin motivos detallados usa el error', () => {
    expect(motivosDeFila({ success: false, error: 'Número de empleado repetido' })).toEqual([
      'Número de empleado repetido',
    ])
  })
})

describe('fechaDeFila', () => {
  it('una fecha a medianoche UTC no se corre un día', () => {
    expect(fechaDeFila('1990-05-15T00:00:00.000Z')).toBe('15/05/1990')
  })
})

describe('filasReporteErrores', () => {
  it('una fila por motivo, con la fila del Excel, CURP y NSS; omite los registrados', () => {
    const filas = filasReporteErrores([
      { fila: 2, success: true, worker: { nombre: 'ANA' } },
      {
        fila: 3,
        success: false,
        worker: {
          primerApellido: 'GARCIA',
          nombre: 'JUAN',
          curp: 'GEXJ900516HDFRXN01',
          nss: '12345678901',
        },
        validationErrors: ['Pos. 2 …', 'Pos. 10 …'],
      },
    ])

    expect(filas[0]).toEqual([...ENCABEZADOS_REPORTE_ERRORES])
    expect(filas).toHaveLength(3)
    const col = (nombre: (typeof ENCABEZADOS_REPORTE_ERRORES)[number]) =>
      ENCABEZADOS_REPORTE_ERRORES.indexOf(nombre)
    expect(filas.slice(1).map((f) => f[col('Motivo')])).toEqual(['Pos. 2 …', 'Pos. 10 …'])
    expect(filas[1][col('Fila')]).toBe('3')
    expect(filas[1][col('CURP')]).toBe('GEXJ900516HDFRXN01')
    expect(filas[1][col('NSS')]).toBe('12345678901')
    expect(filas[1][col('Segundo Apellido')]).toBe('')
  })
})
