/**
 * Tablero de salud: resumen de los diagnósticos de las notas médicas.
 * El servidor entrega un renglón por diagnóstico con código CIE-10, sin
 * identificar al trabajador; las notas anteriores al uso de la CIE-10 no aportan
 * (backend/src/modules/trabajadores/tablero-diagnosticos.util.ts).
 */

export interface DiagnosticoDeTablero {
  /** Código CIE-10. */
  clave: string;
  etiqueta: string;
  principal: boolean;
  mes: string;
  primeraVez?: boolean;
}

export interface Conteo {
  clave: string;
  etiqueta: string;
  cantidad: number;
}

interface Capitulo {
  clave: string;
  etiqueta: string;
  /** Rango de categorías de tres caracteres, ambos extremos incluidos. */
  desde: string;
  hasta: string;
}

/** Capítulos de la CIE-10, por rango de categorías. */
export const CAPITULOS_CIE10: Capitulo[] = [
  { clave: 'I', etiqueta: 'Infecciosas y parasitarias', desde: 'A00', hasta: 'B99' },
  { clave: 'II', etiqueta: 'Tumores', desde: 'C00', hasta: 'D48' },
  { clave: 'III', etiqueta: 'Sangre e inmunidad', desde: 'D50', hasta: 'D89' },
  { clave: 'IV', etiqueta: 'Endocrinas, nutricionales y metabólicas', desde: 'E00', hasta: 'E90' },
  { clave: 'V', etiqueta: 'Trastornos mentales y del comportamiento', desde: 'F00', hasta: 'F99' },
  { clave: 'VI', etiqueta: 'Sistema nervioso', desde: 'G00', hasta: 'G99' },
  { clave: 'VII', etiqueta: 'Ojo y sus anexos', desde: 'H00', hasta: 'H59' },
  { clave: 'VIII', etiqueta: 'Oído', desde: 'H60', hasta: 'H95' },
  { clave: 'IX', etiqueta: 'Sistema circulatorio', desde: 'I00', hasta: 'I99' },
  { clave: 'X', etiqueta: 'Sistema respiratorio', desde: 'J00', hasta: 'J99' },
  { clave: 'XI', etiqueta: 'Sistema digestivo', desde: 'K00', hasta: 'K93' },
  { clave: 'XII', etiqueta: 'Piel y tejido subcutáneo', desde: 'L00', hasta: 'L99' },
  { clave: 'XIII', etiqueta: 'Sistema musculoesquelético', desde: 'M00', hasta: 'M99' },
  { clave: 'XIV', etiqueta: 'Sistema genitourinario', desde: 'N00', hasta: 'N99' },
  { clave: 'XV', etiqueta: 'Embarazo, parto y puerperio', desde: 'O00', hasta: 'O99' },
  { clave: 'XVI', etiqueta: 'Afecciones perinatales', desde: 'P00', hasta: 'P96' },
  { clave: 'XVII', etiqueta: 'Malformaciones congénitas', desde: 'Q00', hasta: 'Q99' },
  { clave: 'XVIII', etiqueta: 'Síntomas y hallazgos no clasificados', desde: 'R00', hasta: 'R99' },
  { clave: 'XIX', etiqueta: 'Traumatismos y envenenamientos', desde: 'S00', hasta: 'T98' },
  { clave: 'XX', etiqueta: 'Causas externas', desde: 'V01', hasta: 'Y98' },
  { clave: 'XXI', etiqueta: 'Factores que influyen en la salud', desde: 'Z00', hasta: 'Z99' },
  { clave: 'XXII', etiqueta: 'Códigos para propósitos especiales', desde: 'U00', hasta: 'U99' },
];

export const OTRO_CAPITULO: Conteo = { clave: 'otro', etiqueta: 'Sin capítulo reconocido', cantidad: 0 };

/** Capítulo al que pertenece un código; null si no cae en ninguno. */
export function capituloDe(codigo: string): Capitulo | null {
  const categoria = codigo.slice(0, 3).toUpperCase();
  if (!/^[A-Z][0-9]{2}$/.test(categoria)) return null;
  return CAPITULOS_CIE10.find((c) => categoria >= c.desde && categoria <= c.hasta) ?? null;
}

const contar = (lista: { clave: string; etiqueta: string }[]): Conteo[] => {
  const porClave = new Map<string, Conteo>();
  for (const item of lista) {
    const actual = porClave.get(item.clave);
    if (actual) {
      actual.cantidad++;
      // Se conserva la etiqueta más descriptiva: la que trae el nombre además del código
      if (item.etiqueta.length > actual.etiqueta.length) actual.etiqueta = item.etiqueta;
    } else {
      porClave.set(item.clave, { clave: item.clave, etiqueta: item.etiqueta, cantidad: 1 });
    }
  }
  return [...porClave.values()].sort(
    (a, b) => b.cantidad - a.cantidad || a.etiqueta.localeCompare(b.etiqueta, 'es'),
  );
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const textoDeMes = (mes: string) => {
  const [anio, numero] = mes.split('-');
  return `${MESES[Number(numero) - 1] ?? numero} ${anio}`;
};

export interface ResumenDeDiagnosticos {
  /** Diagnósticos registrados, principales y secundarios. */
  total: number;
  /** Del más al menos frecuente. */
  porCodigo: Conteo[];
  porCapitulo: Conteo[];
  /** Entre los principales que lo indican. */
  primeraVez: number;
  subsecuentes: number;
}

export function resumirDiagnosticos(diagnosticos: DiagnosticoDeTablero[]): ResumenDeDiagnosticos {
  return {
    total: diagnosticos.length,
    porCodigo: contar(diagnosticos),
    porCapitulo: contar(
      diagnosticos.map((d) => {
        const capitulo = capituloDe(d.clave);
        return capitulo
          ? { clave: capitulo.clave, etiqueta: capitulo.etiqueta }
          : { clave: OTRO_CAPITULO.clave, etiqueta: OTRO_CAPITULO.etiqueta };
      }),
    ),
    primeraVez: diagnosticos.filter((d) => d.primeraVez === true).length,
    subsecuentes: diagnosticos.filter((d) => d.primeraVez === false).length,
  };
}

/** Consultas por mes, en orden; rellena los meses sin consultas entre el primero y el último. */
export function consultasPorMes(fechas: (string | null | undefined)[]): Conteo[] {
  const porMes = new Map<string, number>();
  for (const fecha of fechas) {
    const mes = typeof fecha === 'string' ? fecha.slice(0, 7) : '';
    if (/^\d{4}-\d{2}$/.test(mes)) porMes.set(mes, (porMes.get(mes) ?? 0) + 1);
  }
  const meses = [...porMes.keys()].sort();
  if (!meses.length) return [];
  const lista: Conteo[] = [];
  let [anio, mes] = meses[0].split('-').map(Number);
  const ultimo = meses[meses.length - 1];
  // Tope de seguridad: diez años
  for (let i = 0; i < 120; i++) {
    const clave = `${anio}-${String(mes).padStart(2, '0')}`;
    lista.push({ clave, etiqueta: textoDeMes(clave), cantidad: porMes.get(clave) ?? 0 });
    if (clave === ultimo) break;
    mes++;
    if (mes > 12) {
      mes = 1;
      anio++;
    }
  }
  return lista;
}
