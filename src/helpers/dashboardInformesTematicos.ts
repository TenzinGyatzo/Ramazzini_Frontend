/**
 * Tablero de salud: informes temáticos. Cada uno reúne, de las tablas del
 * tablero, las que tocan un tema (riesgo cardiometabólico, salud auditiva,
 * sistema musculoesquelético), los diagnósticos de consulta de sus capítulos de
 * la CIE-10 y unos hallazgos redactados a partir de esas cifras.
 *
 * Son para presentar resultados a gerentes y directivos: cada uno lleva sus
 * gráficas principales (hasta GRAFICAS_POR_TEMA), cada una con un titular que dice
 * la conclusión, y las tablas quedan como anexo de detalle.
 */
import { capituloDe, type DiagnosticoDeTablero } from './dashboardDiagnosticos';
import {
  armarInforme,
  tablasDelTablero,
  type InformeDeTablero,
  type TablaDeInforme,
} from './dashboardInformes';
import { historialDe, registrosDe } from './dashboardSecciones';
import { porcentajeDeCobertura, resumirCobertura, type CoberturaDeTablero } from './dashboardCobertura';
import { TITULOS_NORDICO, hallazgosNordico, resumirNordico, type NordicoDeTablero } from './dashboardCuestionarios';
import {
  COLOR_DE_TONO,
  barrasDeTabla,
  donaDe,
  graficasCardiometabolico,
  graficasNordico,
  graficasOtologica,
  type GraficaDeInforme,
} from './dashboardGraficasInforme';
import { TITULO_HABITOS, hallazgosHabitos, type HabitosDeTablero } from './dashboardHabitos';
import {
  TITULOS_CARDIOMETABOLICO,
  TITULOS_OTOLOGICA,
  hallazgosCardiometabolico,
  hallazgosOtologica,
  resumirCardiometabolico,
  resumirOtologica,
  type CardiometabolicoDeTablero,
  type OtologicaDeTablero,
} from './dashboardSeguimiento';

export type TemaDeInforme = 'cardiometabolico' | 'auditivo' | 'musculoesqueletico';

export const TEMAS_DE_INFORME: { valor: TemaDeInforme; texto: string; titulo: string }[] = [
  { valor: 'cardiometabolico', texto: 'Riesgo cardiometabólico', titulo: 'Informe de riesgo cardiometabólico' },
  { valor: 'auditivo', texto: 'Salud auditiva', titulo: 'Informe de salud auditiva' },
  { valor: 'musculoesqueletico', texto: 'Sistema musculoesquelético', titulo: 'Informe del sistema musculoesquelético' },
];

export const TITULO_COBERTURA_AUDIOMETRIA = 'Expuestos a ruido con audiometría en el periodo';

/** Tablas que cada informe temático puede llevar, en orden; salen las que tienen registros. */
export const TABLAS_DE_TEMA: Record<TemaDeInforme, string[]> = {
  cardiometabolico: [
    'Índice de masa corporal',
    'Circunferencia de cintura',
    'Presión arterial',
    'Antecedentes de diabetes, hipertensión y cardiopatía',
    'Diagnósticos metabólicos y cardiovasculares en las consultas',
    TITULO_HABITOS,
    ...Object.values(TITULOS_CARDIOMETABOLICO),
  ],
  auditivo: [
    'Exposición a ruido',
    TITULO_COBERTURA_AUDIOMETRIA,
    'Audiometría',
    'Diagnósticos de oído en las consultas',
    ...Object.values(TITULOS_OTOLOGICA),
  ],
  musculoesqueletico: [
    'Exposición a factores ergonómicos y vibraciones',
    'Antecedentes de lumbalgia y accidentes',
    'Diagnósticos musculoesqueléticos y traumatismos en las consultas',
    // Del Cuestionario Nórdico, si el proveedor lo aplica
    ...Object.values(TITULOS_NORDICO),
  ],
};

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

/** Gráficas principales de cada informe temático; las demás cifras quedan en las tablas. */
export const GRAFICAS_POR_TEMA = 3;

const minusculaInicial = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);

/** La fila con más casos de una tabla, o undefined si ninguna tiene. */
const mayorFila = (tabla: TablaDeInforme | null | undefined) =>
  (tabla?.filas ?? []).reduce<Fila | undefined>((mayor, fila) => (numero(fila) > (mayor ? numero(mayor) : 0) ? fila : mayor), undefined);

/** Diagnósticos de un grupo como barras, con el más frecuente en el titular. */
const graficaDeDiagnosticos = (tabla: TablaDeInforme | null, titulo: string, de: string) => {
  const mayor = mayorFila(tabla);
  return mayor
    ? barrasDeTabla(titulo, tabla!.filas, {
        titular: `El diagnóstico ${de} más frecuente fue ${mayor[0]}`,
        nota: `Sobre ${plural(total(tabla!), 'diagnóstico registrado', 'diagnósticos registrados')} de este grupo en las consultas del periodo.`,
      })
    : null;
};

/** Las filas de antecedentes nombran a las personas («Hipertensivos»); el titular, la enfermedad. */
const ENFERMEDAD_DE_ANTECEDENTE: Record<string, string> = {
  Diabéticos: 'diabetes',
  Hipertensivos: 'hipertensión',
  Cardiopáticos: 'cardiopatía',
};

const principales = (candidatas: (GraficaDeInforme | null | undefined)[]) =>
  candidatas.filter((grafica): grafica is GraficaDeInforme => !!grafica).slice(0, GRAFICAS_POR_TEMA);

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
  let graficas: GraficaDeInforme[] = [];

  if (tema === 'cardiometabolico') {
    const imc = tabla('Índice de masa corporal');
    const cintura = tabla('Circunferencia de cintura');
    const presion = tabla('Presión arterial');
    const titulos = TABLAS_DE_TEMA.cardiometabolico;
    const cronicas = recortar(tabla('Enfermedades crónicas'), /diab|hipertens|cardi/i, titulos[3]);
    const dx = diagnosticosDeCapitulos(diagnosticos, ['IV', 'IX'], titulos[4]);
    tablas = [
      imc,
      cintura,
      presion,
      cronicas,
      tabla(TITULO_HABITOS),
      ...Object.values(TITULOS_CARDIOMETABOLICO).map((titulo) => tabla(titulo)),
      dx,
    ];

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
    hallazgos.push(...hallazgosHabitos(registrosDe(fuentes.datos, fuentes.indiceCentro, 'habitos') as HabitosDeTablero[]));
    hallazgos.push(
      ...hallazgosCardiometabolico(
        registrosDe(fuentes.datos, fuentes.indiceCentro, 'cardiometabolico') as CardiometabolicoDeTablero[],
      ),
    );
    hallazgos.push(...hallazgoDeDiagnosticos(dx, 'del grupo metabólico o cardiovascular'));

    // Peso, presión y las condiciones en seguimiento (o, sin seguimiento, los antecedentes)
    const seguimiento = resumirCardiometabolico(
      registrosDe(fuentes.datos, fuentes.indiceCentro, 'cardiometabolico') as CardiometabolicoDeTablero[],
    );
    const condicion = [...seguimiento.condiciones].sort((a, b) => b.cantidad - a.cantidad)[0];
    const [condiciones] = graficasCardiometabolico(seguimiento);
    const cronica = mayorFila(cronicas);
    graficas = principales([
      barrasDeTabla('Índice de masa corporal', imc?.filas, {
        titular: `${pct(sumaDe(imc, /sobrepeso|obesidad/i), total(imc))} % tiene sobrepeso u obesidad`,
        nota: `${plural(total(imc), 'trabajador', 'trabajadores')} con exploración física en el periodo.`,
      }),
      barrasDeTabla('Presión arterial', presion?.filas, {
        titular: `${pct(sumaDe(presion, /^alta$|hipertensi/i), total(presion))} % tiene presión arterial alta o en rango de hipertensión`,
        nota: `${plural(total(presion), 'trabajador', 'trabajadores')} con presión arterial registrada en el periodo.`,
      }),
      condiciones && condicion
        ? {
            ...condiciones,
            titular: `${plural(seguimiento.enSeguimiento, 'trabajador', 'trabajadores')} en seguimiento; la condición más frecuente es ${minusculaInicial(condicion.etiqueta)}`,
          }
        : cronica
          ? barrasDeTabla(titulos[3], cronicas!.filas, {
              titular: `El antecedente más referido es ${ENFERMEDAD_DE_ANTECEDENTE[String(cronica[0])] ?? minusculaInicial(String(cronica[0]))} (${plural(numero(cronica), 'trabajador', 'trabajadores')})`,
            })
          : null,
      barrasDeTabla('Circunferencia de cintura', cintura?.filas, {
        titular: `${pct(sumaDe(cintura, /alto riesgo/i), total(cintura))} % tiene circunferencia de cintura de alto riesgo`,
      }),
    ]);
  }

  if (tema === 'auditivo') {
    const titulos = TABLAS_DE_TEMA.auditivo;
    const ruido = recortar(agentes, /^ruido$/i, titulos[0]);
    const audiometria = tabla('Audiometría');
    const dx = diagnosticosDeCapitulos(diagnosticos, ['VIII'], titulos[3]);
    // De los expuestos a ruido, cuántos tienen audiometría en el periodo (la misma cifra que
    // «Vigilancia según la exposición» del tablero; si el centro nunca ha hecho audiometrías, no sale)
    const vigilancia = resumirCobertura(
      registrosDe(fuentes.datos, fuentes.indiceCentro, 'coberturaExposicion') as CoberturaDeTablero[],
      historialDe(fuentes.datos, fuentes.indiceCentro),
    ).find((fila) => fila.clave === 'audiometria');
    const cobertura: TablaDeInforme | null = vigilancia
      ? {
          seccion: 'Exposición',
          titulo: TITULO_COBERTURA_AUDIOMETRIA,
          columnas: ['Expuestos a ruido', 'Trabajadores', 'Porcentaje'],
          filas: [
            ['Con audiometría en el periodo', vigilancia.cantidad, `${porcentajeDeCobertura(vigilancia)} %`],
            [
              'Sin audiometría en el periodo',
              vigilancia.total - vigilancia.cantidad,
              `${100 - porcentajeDeCobertura(vigilancia)} %`,
            ],
          ],
        }
      : null;
    tablas = [ruido, cobertura, audiometria, ...Object.values(TITULOS_OTOLOGICA).map((titulo) => tabla(titulo)), dx];

    if (ruido) {
      const expuestos = numero(ruido.filas[0]);
      hallazgos.push(
        `${plural(expuestos, 'trabajador está expuesto', 'trabajadores están expuestos')} a ruido (${pct(expuestos, plantilla)} % de la plantilla).`,
      );
    }
    if (vigilancia) {
      hallazgos.push(
        `De ${plural(vigilancia.total, 'trabajador expuesto', 'trabajadores expuestos')} a ruido, ${vigilancia.cantidad} ${vigilancia.cantidad === 1 ? 'tiene' : 'tienen'} audiometría en el periodo (${porcentajeDeCobertura(vigilancia)} %).`,
      );
    }
    if (total(audiometria)) {
      const normales = sumaDe(audiometria, /^normal/i);
      const alterados = total(audiometria) - normales;
      hallazgos.push(
        `De ${plural(total(audiometria), 'audiometría', 'audiometrías')}, ${alterados} ${alterados === 1 ? 'tuvo' : 'tuvieron'} un resultado distinto de normal (${pct(alterados, total(audiometria))} %).`,
      );
    }
    hallazgos.push(
      ...hallazgosOtologica(registrosDe(fuentes.datos, fuentes.indiceCentro, 'otologica') as OtologicaDeTablero[]),
    );
    hallazgos.push(...hallazgoDeDiagnosticos(dx, 'de oído'));

    // Audiometrías, protección auditiva y exposición a ruido
    const otologica = resumirOtologica(registrosDe(fuentes.datos, fuentes.indiceCentro, 'otologica') as OtologicaDeTablero[]);
    const [proteccion, sintomas] = graficasOtologica(otologica);
    const sinProteccionSiempre = otologica.proteccion
      .filter((p) => p.clave !== 'SIEMPRE')
      .reduce((suma, p) => suma + p.cantidad, 0);
    const alteradas = total(audiometria) - sumaDe(audiometria, /^normal/i);
    const expuestos = ruido ? numero(ruido.filas[0]) : 0;
    const sintoma = sintomas?.tipo === 'barras' ? [...sintomas.filas].sort((a, b) => b.cantidad - a.cantidad)[0] : undefined;
    graficas = principales([
      // Lo primero que pregunta quien dirige: ¿los expuestos tienen su audiometría?
      vigilancia
        ? donaDe(
            'Vigilancia de los expuestos a ruido',
            [
              { etiqueta: 'Con audiometría en el periodo', cantidad: vigilancia.cantidad, color: COLOR_DE_TONO.favorable },
              {
                etiqueta: 'Sin audiometría en el periodo',
                cantidad: vigilancia.total - vigilancia.cantidad,
                color: COLOR_DE_TONO.atencion,
              },
            ],
            {
              titular: `${porcentajeDeCobertura(vigilancia)} % de los expuestos a ruido tiene su audiometría del periodo`,
              nota: 'La exposición es la registrada hoy en cada trabajador; la audiometría cuenta si se hizo dentro del periodo.',
            },
          )
        : null,
      barrasDeTabla('Resultados de audiometría', audiometria?.filas, {
        titular: alteradas
          ? `${pct(alteradas, total(audiometria))} % de las audiometrías tuvo un resultado distinto de normal`
          : 'Todas las audiometrías del periodo resultaron normales',
        nota: `${plural(total(audiometria), 'audiometría', 'audiometrías')} en el periodo.`,
      }),
      proteccion?.tipo === 'dona'
        ? {
            ...proteccion,
            titular: `${pct(sinProteccionSiempre, otologica.expuestosConRespuesta)} % de quienes trabajan con ruido no usa siempre protección auditiva`,
          }
        : null,
      expuestos && plantilla
        ? donaDe(
            'Exposición a ruido',
            [
              { etiqueta: 'Expuestos a ruido', cantidad: expuestos, color: COLOR_DE_TONO.atencion },
              { etiqueta: 'Sin exposición registrada', cantidad: Math.max(0, plantilla - expuestos), color: COLOR_DE_TONO.resto },
            ],
            { titular: `${pct(expuestos, plantilla)} % de la plantilla está expuesta a ruido` },
          )
        : null,
      sintomas && sintoma
        ? { ...sintomas, titular: `Lo más referido en la historia otológica: ${minusculaInicial(sintoma.etiqueta)} (${pct(sintoma.cantidad, sintoma.total)} %)` }
        : null,
      graficaDeDiagnosticos(dx, titulos[3], 'de oído'),
    ]);
  }

  if (tema === 'musculoesqueletico') {
    const titulos = TABLAS_DE_TEMA.musculoesqueletico;
    const ergonomia = recortar(agentes, /ergon|vibraci/i, titulos[0]);
    const antecedentes = recortar(tabla('Antecedentes referidos'), /lumbalg|accidente/i, titulos[1]);
    const dx = diagnosticosDeCapitulos(diagnosticos, ['XIII', 'XIX'], titulos[2]);
    const nordico = generales.filter((t) => (Object.values(TITULOS_NORDICO) as string[]).includes(t.titulo));
    tablas = [ergonomia, antecedentes, ...nordico, dx];

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
    hallazgos.push(
      ...hallazgosNordico(registrosDe(fuentes.datos, fuentes.indiceCentro, 'cuestionarioNordico') as NordicoDeTablero[]),
    );
    hallazgos.push(...hallazgoDeDiagnosticos(dx, 'del grupo musculoesquelético o de traumatismos'));

    // Cuestionario Nórdico (resultado y zonas), exposición ergonómica, antecedentes y diagnósticos
    const resumen = resumirNordico(registrosDe(fuentes.datos, fuentes.indiceCentro, 'cuestionarioNordico') as NordicoDeTablero[]);
    const [resultado, zonas] = graficasNordico(resumen);
    const requieren = resumen.semaforo.find((s) => s.clave === 'rojo')?.cantidad ?? 0;
    const zona = resumen.zonas12Meses.find((z) => z.cantidad > 0);
    const vibraciones = sumaDe(ergonomia ?? undefined, /vibraci/i);
    const lumbalgia = sumaDe(antecedentes ?? undefined, /lumbalg/i);
    const accidentes = sumaDe(antecedentes ?? undefined, /accidente/i);
    graficas = principales([
      resultado
        ? {
            ...resultado,
            titular: requieren
              ? `${pct(requieren, resumen.evaluados)} % de los evaluados requiere seguimiento por molestias musculoesqueléticas`
              : `${pct(resumen.conMolestia12Meses, resumen.evaluados)} % de los evaluados reportó molestias en los últimos 12 meses`,
          }
        : null,
      zonas && zona
        ? { ...zonas, titular: `La zona con más molestias es ${minusculaInicial(zona.etiqueta)} (${pct(zona.cantidad, resumen.evaluados)} % de los evaluados)` }
        : null,
      barrasDeTabla(titulos[0], ergonomia?.filas, {
        titular: ergonomicos
          ? `${pct(ergonomicos, plantilla)} % de la plantilla está expuesta a factores ergonómicos`
          : `${pct(vibraciones, plantilla)} % de la plantilla está expuesta a vibraciones`,
        color: COLOR_DE_TONO.atencion,
      }),
      barrasDeTabla(titulos[1], antecedentes?.filas, {
        titular: lumbalgia
          ? `${plural(lumbalgia, 'trabajador refiere', 'trabajadores refieren')} antecedente de lumbalgia`
          : `${plural(accidentes, 'trabajador refiere', 'trabajadores refieren')} antecedente de accidentes`,
      }),
      graficaDeDiagnosticos(dx, titulos[2], 'musculoesquelético o de traumatismo'),
    ]);
  }

  return {
    ...armarInforme({ ...fuentes, conFiltros: !!contexto.segmento }, { ...contexto, comparativo: null, porCentro: null }),
    hallazgos,
    graficas,
    tablas: tablas.filter((t): t is TablaDeInforme => !!t && t.filas.some((fila) => numero(fila) > 0)),
  };
}
