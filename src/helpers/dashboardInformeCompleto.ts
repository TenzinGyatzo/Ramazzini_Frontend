/**
 * Informe completo del tablero de salud: secciones que se agregan al final,
 * antes de las conclusiones (diagnósticos de las consultas e inventario).
 * Devuelven contenido de pdfmake con los estilos que ya define el informe
 * (components/DescargarInformeDashboard.vue).
 */
import type { ResumenDeDiagnosticos } from './dashboardDiagnosticos';
import type { InsumoConsumido, TablaDeInforme } from './dashboardInformes';
import {
  hallazgosNordico,
  hallazgosSueno,
  tablasNordico,
  tablasSueno,
  type NordicoDeTablero,
  type SuenoDeTablero,
} from './dashboardCuestionarios';
import { LEYENDA_SUENO_VIGILIA } from './evaluacionSuenoVigilia';
import { hallazgosAntidoping, tablasAntidoping, type AntidopingDeTablero } from './dashboardAntidoping';
import { tablasHabitos, type HabitosDeTablero } from './dashboardHabitos';
import {
  hallazgosCardiometabolico,
  hallazgosOtologica,
  tablasCardiometabolico,
  tablasOtologica,
  type CardiometabolicoDeTablero,
  type OtologicaDeTablero,
} from './dashboardSeguimiento';

const FILAS_DE_DIAGNOSTICOS = 15;
const FILAS_DE_INSUMOS = 15;

type Contenido = Record<string, any>;

const tabla = (titulo: string, columnas: string[], filas: (string | number)[][], anchos?: (string | number)[]): Contenido[] => [
  { text: titulo, style: 'subtituloTabla', margin: [0, 15, 0, 5] },
  {
    table: {
      headerRows: 1,
      widths: anchos ?? ['*', ...columnas.slice(1).map(() => 'auto')],
      body: [
        columnas.map((columna) => ({ text: columna, style: 'tableHeader' })),
        ...filas.map((fila) => fila.map((celda) => ({ text: String(celda), style: 'tableCellMedium' }))),
      ],
    },
    layout: 'lightHorizontalLines',
    margin: [0, 5, 0, 15],
  },
];

const pct = (parte: number, total: number) => (total > 0 ? `${Math.round((parte / total) * 100)} %` : '0 %');

export interface SeccionesAdicionales {
  /** Resumen de los diagnósticos con código CIE-10 de las consultas del periodo. */
  diagnosticos?: ResumenDeDiagnosticos | null;
  totalConsultas?: number;
  /** Consumo de insumos; vacío o ausente si el proveedor no usa el inventario. */
  insumos?: InsumoConsumido[] | null;
  /** Periodo del consumo, ya redactado: «del 1/1/2026 al 10/10/2026». */
  periodoInventario?: string;
  /** Resultado del Cuestionario Nórdico más reciente de cada trabajador. */
  nordico?: NordicoDeTablero[] | null;
  /** Resultado de la evaluación de sueño y vigilia más reciente de cada trabajador. */
  sueno?: SuenoDeTablero[] | null;
  /** Hábitos referidos en la historia clínica más reciente de cada trabajador. */
  habitos?: HabitosDeTablero[] | null;
  /** Pruebas antidoping del periodo. */
  antidoping?: AntidopingDeTablero[] | null;
  /** Último evento de seguimiento cardiometabólico de cada trabajador. */
  cardiometabolico?: CardiometabolicoDeTablero[] | null;
  /** Historia otológica más reciente de cada trabajador. */
  otologica?: OtologicaDeTablero[] | null;
}

const tablasDeInforme = (tablas: TablaDeInforme[]): Contenido[] =>
  tablas.flatMap((t) => tabla(t.titulo, t.columnas, t.filas));

/**
 * Contenido de las secciones adicionales, numeradas a partir de `numeroSeccion`.
 * Una sección sin registros no se agrega ni consume número.
 */
export function seccionesAdicionalesDelInforme(
  datos: SeccionesAdicionales,
  numeroSeccion: number,
): { contenido: Contenido[]; siguienteNumero: number } {
  const contenido: Contenido[] = [];
  let numero = numeroSeccion;

  const habitos = tablasHabitos(datos.habitos ?? []);
  if (habitos.length) {
    contenido.push(
      { text: `${numero}. HÁBITOS Y ESTILO DE VIDA`, style: 'tituloSeccion', pageBreak: 'before' },
      {
        text: 'Hábitos que los trabajadores refirieron en su historia clínica más reciente del periodo. Cada porcentaje se calcula sobre quienes contestaron esa pregunta. Son factores que se pueden modificar y sobre los que tienen más efecto las acciones preventivas.',
        style: 'textoNormal',
      },
      ...tablasDeInforme(habitos),
    );
    numero++;
  }

  const cardiometabolico = datos.cardiometabolico ?? [];
  if (cardiometabolico.length) {
    contenido.push(
      { text: `${numero}. SEGUIMIENTO CARDIOMETABÓLICO`, style: 'tituloSeccion', pageBreak: 'before' },
      {
        text: 'Trabajadores con hipertensión, diabetes, dislipidemia u obesidad que tienen seguimiento en el servicio médico. De cada uno se toma su visita más reciente del periodo: si la condición estaba en control y cómo salieron sus estudios de laboratorio.',
        style: 'textoNormal',
      },
      { ul: hallazgosCardiometabolico(cardiometabolico), style: 'textoNormal', margin: [0, 6, 0, 0] },
      ...tablasDeInforme(tablasCardiometabolico(cardiometabolico)),
    );
    numero++;
  }

  const otologica = tablasOtologica(datos.otologica ?? []);
  if (otologica.length) {
    const hallazgos = hallazgosOtologica(datos.otologica ?? []);
    contenido.push(
      { text: `${numero}. ANTECEDENTES AUDITIVOS`, style: 'tituloSeccion', pageBreak: 'before' },
      {
        text: 'Lo que los trabajadores refirieron en su historia otológica más reciente del periodo: síntomas auditivos, exposición a ruido y uso de protección auditiva. Cada porcentaje se calcula sobre quienes contestaron esa pregunta.',
        style: 'textoNormal',
      },
      ...(hallazgos.length ? [{ ul: hallazgos, style: 'textoNormal', margin: [0, 6, 0, 0] }] : []),
      ...tablasDeInforme(otologica),
    );
    numero++;
  }

  const nordico = datos.nordico ?? [];
  if (nordico.length) {
    contenido.push(
      { text: `${numero}. MOLESTIAS MUSCULOESQUELÉTICAS`, style: 'tituloSeccion', pageBreak: 'before' },
      {
        text: 'Resultados del Cuestionario Nórdico, en el que cada trabajador señala las zonas del cuerpo donde ha tenido dolor o molestias. De cada trabajador se toma su cuestionario más reciente del periodo. Un trabajador puede reportar varias zonas, por lo que los porcentajes se calculan sobre los trabajadores evaluados y no suman 100 %.',
        style: 'textoNormal',
      },
      { ul: hallazgosNordico(nordico), style: 'textoNormal', margin: [0, 6, 0, 0] },
      ...tablasDeInforme(tablasNordico(nordico)),
    );
    numero++;
  }

  const sueno = datos.sueno ?? [];
  if (sueno.length) {
    contenido.push(
      { text: `${numero}. SUEÑO Y VIGILIA`, style: 'tituloSeccion', pageBreak: 'before' },
      {
        text: 'Resultados de la evaluación de sueño y vigilia: qué tan seguido los trabajadores reportan problemas para dormir, somnolencia, fatiga o falta de concentración. De cada trabajador se toma su evaluación más reciente del periodo.',
        style: 'textoNormal',
      },
      { ul: hallazgosSueno(sueno), style: 'textoNormal', margin: [0, 6, 0, 0] },
      ...tablasDeInforme(tablasSueno(sueno)),
      { text: LEYENDA_SUENO_VIGILIA, style: 'textoNormal', italics: true },
    );
    numero++;
  }

  const antidoping = datos.antidoping ?? [];
  if (antidoping.length) {
    contenido.push(
      { text: `${numero}. PRUEBAS ANTIDOPING`, style: 'tituloSeccion', pageBreak: 'before' },
      {
        text: 'Pruebas de detección de sustancias realizadas en el periodo. Se cuentan todas las pruebas: un mismo trabajador puede tener más de una.',
        style: 'textoNormal',
      },
      { ul: hallazgosAntidoping(antidoping), style: 'textoNormal', margin: [0, 6, 0, 0] },
      ...tablasDeInforme(tablasAntidoping(antidoping)),
    );
    numero++;
  }

  const diagnosticos = datos.diagnosticos;
  if (diagnosticos && diagnosticos.total > 0) {
    const consultas = datos.totalConsultas ?? 0;
    contenido.push(
      { text: `${numero}. DIAGNÓSTICOS DE LAS CONSULTAS MÉDICAS`, style: 'tituloSeccion', pageBreak: 'before' },
      {
        text: [
          'Esta sección muestra de qué consultaron los trabajadores en el periodo. Se registraron ',
          { text: `${diagnosticos.total} ${diagnosticos.total === 1 ? 'diagnóstico' : 'diagnósticos'}`, bold: true },
          ' con código CIE-10, entre principales y secundarios, en ',
          { text: `${consultas} ${consultas === 1 ? 'consulta' : 'consultas'}`, bold: true },
          '. Conocer los motivos de consulta más frecuentes permite orientar las acciones preventivas hacia los padecimientos que más afectan a la plantilla.',
        ],
        style: 'textoNormal',
      },
      ...tabla(
        diagnosticos.porCodigo.length > FILAS_DE_DIAGNOSTICOS
          ? `Los ${FILAS_DE_DIAGNOSTICOS} diagnósticos más frecuentes`
          : 'Diagnósticos más frecuentes',
        ['Diagnóstico (CIE-10)', 'Registros', 'Porcentaje'],
        diagnosticos.porCodigo
          .slice(0, FILAS_DE_DIAGNOSTICOS)
          .map((d) => [d.etiqueta, d.cantidad, pct(d.cantidad, diagnosticos.total)]),
      ),
      ...tabla(
        'Diagnósticos por grupo de enfermedades',
        ['Grupo (capítulo de la CIE-10)', 'Registros', 'Porcentaje'],
        diagnosticos.porCapitulo.map((d) => [d.etiqueta, d.cantidad, pct(d.cantidad, diagnosticos.total)]),
      ),
    );
    if (diagnosticos.primeraVez || diagnosticos.subsecuentes) {
      contenido.push({
        text: `De los diagnósticos principales, ${diagnosticos.primeraVez} fueron de primera vez y ${diagnosticos.subsecuentes} subsecuentes.`,
        style: 'textoNormal',
      });
    }
    numero++;
  }

  const insumos = (datos.insumos ?? []).filter((insumo) => insumo.consumo > 0 || insumo.bajas > 0);
  if (insumos.length) {
    const masConsumidos = [...insumos].sort((a, b) => b.consumo - a.consumo);
    contenido.push(
      { text: `${numero}. CONSUMO DE INSUMOS DEL SERVICIO MÉDICO`, style: 'tituloSeccion', pageBreak: 'before' },
      {
        text: [
          'Insumos que el servicio médico utilizó en la atención de los trabajadores',
          datos.periodoInventario ? `, ${datos.periodoInventario}` : '',
          '. «Administrado» es lo aplicado o usado durante la consulta; «entregado», lo que el trabajador se llevó. Las bajas corresponden a caducidad, daño o merma.',
        ],
        style: 'textoNormal',
      },
      ...tabla(
        masConsumidos.length > FILAS_DE_INSUMOS ? `Los ${FILAS_DE_INSUMOS} insumos más consumidos` : 'Consumo por insumo',
        ['Insumo', 'Unidad', 'Consumo', 'Administrado', 'Entregado', 'Bajas'],
        masConsumidos
          .slice(0, FILAS_DE_INSUMOS)
          .map((i) => [i.nombre, i.unidad, i.consumo, i.administrado, i.entregado, i.bajas]),
      ),
    );
    numero++;
  }

  return { contenido, siguienteNumero: numero };
}
