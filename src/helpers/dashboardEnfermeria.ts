/**
 * Tablero de salud: sección «Atención de enfermería» (docs/nota-enfermeria-especificacion.md, 6).
 * El servidor entrega una fila por nota de enfermería del periodo, sin identificar al
 * trabajador (backend/src/modules/trabajadores/tablero-enfermeria.util.ts). Cuentan
 * todas las atenciones, como las consultas; los borradores sí y los anulados no.
 */
import {
  CAPITULOS_CIE10,
  OTRO_CAPITULO,
  capituloDe,
  consultasPorMes,
  type Conteo,
  type DiagnosticoDeTablero,
} from './dashboardDiagnosticos';
import {
  DESTINOS_NOTA_ENFERMERIA,
  ORIGENES_NOTA_ENFERMERIA,
  PROCEDIMIENTOS_NOTA_ENFERMERIA,
  SISTEMAS_NOTA_ENFERMERIA,
  TIPOS_PROBLEMA_NOTA_ENFERMERIA,
  type OpcionNotaEnfermeria,
} from './notaEnfermeria';

export interface MedicamentoDeAtencion {
  nombre: string;
  cantidad: number;
  uso: string;
  catalogo: boolean;
}

export interface AtencionEnfermeriaDeTablero {
  mes: string;
  relacionTemporal: string | null;
  tipoProblema: string | null;
  sistema: string | null;
  origen: string | null;
  destino: string | null;
  procedimientos: string[];
  medicamentos: MedicamentoDeAtencion[];
  trabajador: string;
}

export interface MedicamentoDelPeriodo {
  nombre: string;
  administrado: number;
  entregado: number;
  total: number;
}

export interface ResumenEnfermeria {
  atenciones: number;
  /** Personas atendidas (claves opacas distintas). */
  trabajadores: number;
  primeraVez: number;
  subsecuentes: number;
  porMes: Conteo[];
  porTipo: Conteo[];
  porSistema: Conteo[];
  porOrigen: Conteo[];
  porDestino: Conteo[];
  /** Atenciones en que se hizo cada procedimiento. */
  procedimientos: Conteo[];
  /** Atenciones con al menos un procedimiento. */
  conProcedimiento: number;
  /** Del catálogo y escritos a mano, sumados por nombre. */
  medicamentos: MedicamentoDelPeriodo[];
  conMedicamento: number;
}

const ordenar = (conteos: Conteo[]) =>
  conteos
    .filter((c) => c.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad || a.etiqueta.localeCompare(b.etiqueta, 'es'));

/** Cuenta una clasificación con las etiquetas de su lista; una clave desconocida conserva su texto. */
function contarPor(
  atenciones: AtencionEnfermeriaDeTablero[],
  campo: 'tipoProblema' | 'sistema' | 'origen' | 'destino',
  opciones: readonly OpcionNotaEnfermeria[],
): Conteo[] {
  const porClave = new Map<string, Conteo>();
  for (const atencion of atenciones) {
    const clave = atencion[campo];
    if (!clave) continue;
    const actual = porClave.get(clave);
    if (actual) actual.cantidad++;
    else {
      const etiqueta = opciones.find((o) => o.clave === clave)?.etiqueta ?? clave;
      porClave.set(clave, { clave, etiqueta, cantidad: 1 });
    }
  }
  return ordenar([...porClave.values()]);
}

export function resumirEnfermeria(atenciones: AtencionEnfermeriaDeTablero[]): ResumenEnfermeria {
  const lista = (atenciones ?? []).filter(Boolean);

  const procedimientos = new Map<string, Conteo>();
  for (const atencion of lista) {
    for (const clave of new Set(atencion.procedimientos ?? [])) {
      const actual = procedimientos.get(clave);
      if (actual) actual.cantidad++;
      else {
        const etiqueta = PROCEDIMIENTOS_NOTA_ENFERMERIA.find((p) => p.clave === clave)?.etiqueta ?? clave;
        procedimientos.set(clave, { clave, etiqueta, cantidad: 1 });
      }
    }
  }

  const medicamentos = new Map<string, MedicamentoDelPeriodo>();
  for (const atencion of lista) {
    for (const fila of atencion.medicamentos ?? []) {
      const actual = medicamentos.get(fila.nombre) ?? { nombre: fila.nombre, administrado: 0, entregado: 0, total: 0 };
      if (fila.uso === 'ENTREGADO') actual.entregado += fila.cantidad;
      else actual.administrado += fila.cantidad;
      actual.total += fila.cantidad;
      medicamentos.set(fila.nombre, actual);
    }
  }

  return {
    atenciones: lista.length,
    trabajadores: new Set(lista.map((a) => a.trabajador).filter(Boolean)).size,
    primeraVez: lista.filter((a) => a.relacionTemporal === 'primeraVez').length,
    subsecuentes: lista.filter((a) => a.relacionTemporal === 'subsecuente').length,
    porMes: consultasPorMes(lista.map((a) => a.mes)),
    porTipo: contarPor(lista, 'tipoProblema', TIPOS_PROBLEMA_NOTA_ENFERMERIA),
    porSistema: contarPor(lista, 'sistema', SISTEMAS_NOTA_ENFERMERIA),
    porOrigen: contarPor(lista, 'origen', ORIGENES_NOTA_ENFERMERIA),
    porDestino: contarPor(lista, 'destino', DESTINOS_NOTA_ENFERMERIA),
    procedimientos: ordenar([...procedimientos.values()]),
    conProcedimiento: lista.filter((a) => (a.procedimientos ?? []).length > 0).length,
    medicamentos: [...medicamentos.values()].sort(
      (a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'),
    ),
    conMedicamento: lista.filter((a) => (a.medicamentos ?? []).length > 0).length,
  };
}

export interface FilaPorSistema {
  clave: string;
  etiqueta: string;
  consultas: number;
  enfermeria: number;
  total: number;
}

const SIN_SISTEMA = { clave: 'general', etiqueta: 'General o sin sistema' };

/**
 * «Atenciones por sistema»: consultas médicas por el capítulo CIE-10 de su diagnóstico
 * principal y atenciones de enfermería por el capítulo equivalente de su sistema.
 * Una consulta sin código CIE-10 no aporta; enfermería «General» y «No aplica» van juntas.
 */
export function atencionesPorSistema(
  diagnosticos: DiagnosticoDeTablero[],
  atenciones: AtencionEnfermeriaDeTablero[],
): FilaPorSistema[] {
  const filas = new Map<string, FilaPorSistema>();
  const sumar = (grupo: { clave: string; etiqueta: string }, tipo: 'consultas' | 'enfermeria') => {
    const fila = filas.get(grupo.clave) ?? { ...grupo, consultas: 0, enfermeria: 0, total: 0 };
    fila[tipo]++;
    fila.total++;
    filas.set(grupo.clave, fila);
  };
  for (const diagnostico of diagnosticos ?? []) {
    if (!diagnostico?.principal) continue;
    const capitulo = capituloDe(diagnostico.clave);
    sumar(capitulo ? { clave: capitulo.clave, etiqueta: capitulo.etiqueta } : OTRO_CAPITULO, 'consultas');
  }
  for (const atencion of atenciones ?? []) {
    if (!atencion?.sistema) continue;
    const romano = SISTEMAS_NOTA_ENFERMERIA.find((s) => s.clave === atencion.sistema)?.capituloCie10;
    const capitulo = romano ? CAPITULOS_CIE10.find((c) => c.clave === romano) : null;
    sumar(capitulo ? { clave: capitulo.clave, etiqueta: capitulo.etiqueta } : SIN_SISTEMA, 'enfermeria');
  }
  return [...filas.values()].sort((a, b) => b.total - a.total || a.etiqueta.localeCompare(b.etiqueta, 'es'));
}

// ---- Informes

type Celda = string | number;
interface Tabla {
  seccion: string;
  titulo: string;
  columnas: string[];
  filas: Celda[][];
}

const SECCION = 'Enfermería';
const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);
const conPorcentaje = (titulo: string, concepto: string, conteos: Conteo[], total: number): Tabla => ({
  seccion: SECCION,
  titulo,
  columnas: [concepto, 'Atenciones', 'Porcentaje'],
  filas: conteos.map((c) => [c.etiqueta, c.cantidad, `${pct(c.cantidad, total)} %`]),
});

/** Tablas de la sección para el Excel y el informe completo; solo las que tienen datos. */
export function tablasEnfermeria(
  atenciones: AtencionEnfermeriaDeTablero[],
  diagnosticos: DiagnosticoDeTablero[] = [],
): Tabla[] {
  const r = resumirEnfermeria(atenciones);
  if (!r.atenciones) return [];
  const tablas: Tabla[] = [
    {
      seccion: SECCION,
      titulo: 'Atenciones de enfermería',
      columnas: ['Concepto', 'Cantidad'],
      filas: [
        ['Atenciones', r.atenciones],
        ['Trabajadores atendidos', r.trabajadores],
        ...(r.primeraVez || r.subsecuentes
          ? ([
              ['Primera vez', r.primeraVez],
              ['Subsecuentes', r.subsecuentes],
            ] as Celda[][])
          : []),
        ['Con algún procedimiento', r.conProcedimiento],
        ['Con medicamento administrado o entregado', r.conMedicamento],
      ],
    },
  ];
  if (r.porTipo.length) tablas.push(conPorcentaje('Atenciones por tipo de problema', 'Tipo de problema', r.porTipo, r.atenciones));
  if (r.porSistema.length) tablas.push(conPorcentaje('Atenciones por aparato o sistema', 'Aparato o sistema', r.porSistema, r.atenciones));
  if (r.porOrigen.length) tablas.push(conPorcentaje('Atenciones por origen', 'Origen', r.porOrigen, r.atenciones));
  if (r.porDestino.length) tablas.push(conPorcentaje('Destino del trabajador', 'Destino', r.porDestino, r.atenciones));
  if (r.procedimientos.length) {
    tablas.push(conPorcentaje('Procedimientos realizados', 'Procedimiento', r.procedimientos, r.atenciones));
  }
  if (r.medicamentos.length) {
    tablas.push({
      seccion: SECCION,
      titulo: 'Medicamentos administrados y entregados',
      columnas: ['Medicamento', 'Administrado', 'Entregado', 'Total'],
      filas: r.medicamentos.map((m) => [m.nombre, m.administrado, m.entregado, m.total]),
    });
  }
  const combinada = atencionesPorSistema(diagnosticos, atenciones);
  if (combinada.some((f) => f.consultas > 0)) {
    tablas.push({
      seccion: SECCION,
      titulo: 'Atenciones por sistema (consultas y enfermería)',
      columnas: ['Sistema (capítulo de la CIE-10)', 'Consultas médicas', 'Enfermería', 'Total'],
      filas: combinada.map((f) => [f.etiqueta, f.consultas, f.enfermeria, f.total]),
    });
  }
  if (r.porMes.length) {
    tablas.push({
      seccion: SECCION,
      titulo: 'Atenciones de enfermería por mes',
      columnas: ['Mes', 'Atenciones'],
      filas: r.porMes.map((m) => [m.etiqueta, m.cantidad]),
    });
  }
  return tablas;
}

/** Hallazgos redactados: solo lo que muestran los datos. */
export function hallazgosEnfermeria(atenciones: AtencionEnfermeriaDeTablero[]): string[] {
  const r = resumirEnfermeria(atenciones);
  if (!r.atenciones) return [];
  const hallazgos = [
    `Enfermería registró ${r.atenciones} ${r.atenciones === 1 ? 'atención' : 'atenciones'} a ${r.trabajadores} ${
      r.trabajadores === 1 ? 'trabajador' : 'trabajadores'
    }.`,
  ];
  // Solo se nombra «el más frecuente» si no empata con el segundo
  const primero = (conteos: Conteo[]) =>
    conteos[0] && conteos[0].cantidad > (conteos[1]?.cantidad ?? 0) ? conteos[0] : null;
  const partes = [
    [primero(r.porTipo), 'El tipo de problema más frecuente fue'],
    [primero(r.porSistema), 'El aparato o sistema más atendido fue'],
  ] as const;
  for (const [conteo, frase] of partes) {
    if (conteo) hallazgos.push(`${frase} ${conteo.etiqueta.toLowerCase()} (${pct(conteo.cantidad, r.atenciones)} %).`);
  }
  const regresan = r.porDestino.find((d) => d.clave === 'regresaPuesto');
  if (regresan) {
    hallazgos.push(`${pct(regresan.cantidad, r.atenciones)} % de las atenciones terminó con el regreso del trabajador a su puesto.`);
  }
  return hallazgos;
}
