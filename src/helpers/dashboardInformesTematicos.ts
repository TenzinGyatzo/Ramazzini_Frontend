/**
 * Tablero de salud: informes temáticos. Cada uno reúne, de las tablas del
 * tablero, las que tocan un tema (riesgo cardiometabólico, salud auditiva,
 * sistema musculoesquelético), los diagnósticos de consulta de sus capítulos de
 * la CIE-10 y unos hallazgos redactados a partir de esas cifras.
 */
import { capituloDe, type DiagnosticoDeTablero } from './dashboardDiagnosticos';
import {
  armarInforme,
  tablasDelTablero,
  type InformeDeTablero,
  type TablaDeInforme,
} from './dashboardInformes';
import { registrosDe } from './dashboardSecciones';

export type TemaDeInforme = 'cardiometabolico' | 'auditivo' | 'musculoesqueletico';

export const TEMAS_DE_INFORME: { valor: TemaDeInforme; texto: string; titulo: string }[] = [
  { valor: 'cardiometabolico', texto: 'Riesgo cardiometabólico', titulo: 'Informe de riesgo cardiometabólico' },
  { valor: 'auditivo', texto: 'Salud auditiva', titulo: 'Informe de salud auditiva' },
  { valor: 'musculoesqueletico', texto: 'Sistema musculoesquelético', titulo: 'Informe del sistema musculoesquelético' },
];

export const tituloDeTema = (tema: TemaDeInforme) =>
  TEMAS_DE_INFORME.find((t) => t.valor === tema)?.titulo ?? 'Informe temático';

type Fuentes = Parameters<typeof tablasDelTablero>[0];
type Contexto = Parameters<typeof armarInforme>[1];
type Fila = TablaDeInforme['filas'][number];

const numero = (fila: Fila) => (typeof fila[1] === 'number' ? fila[1] : 0);
const total = (tabla: TablaDeInforme | undefined) => (tabla?.filas ?? []).reduce((s, fila) => s + numero(fila), 0);
const sumaDe = (tabla: TablaDeInforme | undefined, patron: RegExp) =>
  (tabla?.filas ?? []).filter((fila) => patron.test(String(fila[0]))).reduce((s, fila) => s + numero(fila), 0);
const pct = (parte: number, entre: number) => (entre > 0 ? Math.round((parte / entre) * 100) : 0);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** La misma tabla con solo algunas filas y otro título; null si ninguna tiene registros. */
function recortar(tabla: TablaDeInforme | undefined, patron: RegExp, titulo: string): TablaDeInforme | null {
  const filas = (tabla?.filas ?? []).filter((fila) => patron.test(String(fila[0])));
  return filas.some((fila) => numero(fila) > 0) ? { ...tabla!, titulo, filas } : null;
}

/** Diagnósticos de consulta de ciertos capítulos de la CIE-10, del más al menos frecuente. */
export function diagnosticosDeCapitulos(
  diagnosticos: DiagnosticoDeTablero[],
  capitulos: string[],
  titulo: string,
): TablaDeInforme | null {
  const porCodigo = new Map<string, { etiqueta: string; cantidad: number }>();
  for (const diagnostico of diagnosticos) {
    if (!capitulos.includes(capituloDe(diagnostico.clave)?.clave ?? '')) continue;
    const actual = porCodigo.get(diagnostico.clave) ?? { etiqueta: diagnostico.etiqueta, cantidad: 0 };
    actual.cantidad++;
    if (diagnostico.etiqueta.length > actual.etiqueta.length) actual.etiqueta = diagnostico.etiqueta;
    porCodigo.set(diagnostico.clave, actual);
  }
  if (!porCodigo.size) return null;
  const filas = [...porCodigo.values()].sort(
    (a, b) => b.cantidad - a.cantidad || a.etiqueta.localeCompare(b.etiqueta, 'es'),
  );
  return {
    seccion: 'Consultas',
    titulo,
    columnas: ['Diagnóstico (CIE-10)', 'Registros'],
    filas: filas.map((fila) => [fila.etiqueta, fila.cantidad]),
  };
}

const hallazgoDeDiagnosticos = (tabla: TablaDeInforme | null, de: string): string[] =>
  tabla
    ? [
        `En las consultas del periodo se registraron ${plural(total(tabla), `diagnóstico ${de}`, `diagnósticos ${de}`)}; el más frecuente fue ${tabla.filas[0][0]} (${plural(numero(tabla.filas[0]), 'registro', 'registros')}).`,
      ]
    : [];

export function informeTematico(tema: TemaDeInforme, fuentes: Fuentes, contexto: Contexto): InformeDeTablero {
  const generales = tablasDelTablero(fuentes);
  const tabla = (titulo: string) => generales.find((t) => t.titulo === titulo);
  const diagnosticos = registrosDe(fuentes.datos, fuentes.indiceCentro, 'diagnosticos') as DiagnosticoDeTablero[];
  const agentes = tabla('Agentes de riesgo');
  const plantilla = registrosDe(fuentes.datos, fuentes.indiceCentro, 'grupoEtario').length;

  let tablas: (TablaDeInforme | null | undefined)[] = [];
  const hallazgos: string[] = [];

  if (tema === 'cardiometabolico') {
    const imc = tabla('Índice de masa corporal');
    const cintura = tabla('Circunferencia de cintura');
    const presion = tabla('Presión arterial');
    const cronicas = recortar(
      tabla('Enfermedades crónicas'),
      /diab|hipertens|cardi/i,
      'Antecedentes de diabetes, hipertensión y cardiopatía',
    );
    const dx = diagnosticosDeCapitulos(
      diagnosticos,
      ['IV', 'IX'],
      'Diagnósticos metabólicos y cardiovasculares en las consultas',
    );
    tablas = [imc, cintura, presion, cronicas, dx];

    if (total(imc)) {
      const exceso = sumaDe(imc, /sobrepeso|obesidad/i);
      hallazgos.push(
        `${pct(exceso, total(imc))} % de los trabajadores con exploración física tiene sobrepeso u obesidad (${exceso} de ${total(imc)}).`,
      );
    }
    if (total(cintura)) {
      const alto = sumaDe(cintura, /alto riesgo/i);
      hallazgos.push(`${pct(alto, total(cintura))} % tiene circunferencia de cintura de alto riesgo (${alto} de ${total(cintura)}).`);
    }
    if (total(presion)) {
      const elevada = sumaDe(presion, /^alta$|hipertensi/i);
      hallazgos.push(
        `${pct(elevada, total(presion))} % presentó presión arterial alta o en rango de hipertensión (${elevada} de ${total(presion)}).`,
      );
    }
    if (cronicas) {
      hallazgos.push(
        `Antecedentes referidos en la historia clínica: ${cronicas.filas
          .filter((fila) => numero(fila) > 0)
          .map((fila) => `${String(fila[0]).toLowerCase()} ${numero(fila)}`)
          .join(', ')}.`,
      );
    }
    hallazgos.push(...hallazgoDeDiagnosticos(dx, 'del grupo metabólico o cardiovascular'));
  }

  if (tema === 'auditivo') {
    const ruido = recortar(agentes, /^ruido$/i, 'Exposición a ruido');
    const audiometria = tabla('Audiometría');
    const dx = diagnosticosDeCapitulos(diagnosticos, ['VIII'], 'Diagnósticos de oído en las consultas');
    tablas = [ruido, audiometria, dx];

    if (ruido) {
      const expuestos = numero(ruido.filas[0]);
      hallazgos.push(
        `${plural(expuestos, 'trabajador está expuesto', 'trabajadores están expuestos')} a ruido (${pct(expuestos, plantilla)} % de la plantilla).`,
      );
    }
    if (total(audiometria)) {
      const normales = sumaDe(audiometria, /^normal/i);
      const alterados = total(audiometria) - normales;
      hallazgos.push(
        `De ${plural(total(audiometria), 'audiometría', 'audiometrías')}, ${alterados} ${alterados === 1 ? 'tuvo' : 'tuvieron'} un resultado distinto de normal (${pct(alterados, total(audiometria))} %).`,
      );
    }
    hallazgos.push(...hallazgoDeDiagnosticos(dx, 'de oído'));
  }

  if (tema === 'musculoesqueletico') {
    const ergonomia = recortar(agentes, /ergon|vibraci/i, 'Exposición a factores ergonómicos y vibraciones');
    const antecedentes = recortar(
      tabla('Antecedentes referidos'),
      /lumbalg|accidente/i,
      'Antecedentes de lumbalgia y accidentes',
    );
    const dx = diagnosticosDeCapitulos(
      diagnosticos,
      ['XIII', 'XIX'],
      'Diagnósticos musculoesqueléticos y traumatismos en las consultas',
    );
    tablas = [ergonomia, antecedentes, dx];

    const ergonomicos = sumaDe(ergonomia ?? undefined, /ergon/i);
    if (ergonomicos) {
      hallazgos.push(
        `${plural(ergonomicos, 'trabajador está expuesto', 'trabajadores están expuestos')} a factores ergonómicos (${pct(ergonomicos, plantilla)} % de la plantilla).`,
      );
    }
    const lumbalgias = sumaDe(antecedentes ?? undefined, /lumbalg/i);
    if (lumbalgias) {
      hallazgos.push(`${plural(lumbalgias, 'trabajador refiere', 'trabajadores refieren')} antecedente de lumbalgia en su historia clínica.`);
    }
    hallazgos.push(...hallazgoDeDiagnosticos(dx, 'del grupo musculoesquelético o de traumatismos'));
  }

  return {
    ...armarInforme({ ...fuentes, conFiltros: !!contexto.segmento }, { ...contexto, comparativo: null }),
    hallazgos,
    tablas: tablas.filter((t): t is TablaDeInforme => !!t && t.filas.some((fila) => numero(fila) > 0)),
  };
}
