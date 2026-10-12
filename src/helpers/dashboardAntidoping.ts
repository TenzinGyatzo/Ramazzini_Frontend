/**
 * Tablero de salud: pruebas antidoping del periodo. Cuentan todas las pruebas;
 * un trabajador puede tener varias. El servidor no identifica al trabajador:
 * manda una clave opaca para saber cuántas personas distintas hay.
 */
import type { Conteo } from './dashboardCuestionarios';
import type { TablaDeInforme } from './dashboardInformes';

export interface AntidopingDeTablero {
  /** AAAA-MM */
  mes: string;
  trabajador: string;
  evaluadas: string[];
  positivos: string[];
}

export const SUSTANCIAS_ANTIDOPING: { clave: string; etiqueta: string }[] = [
  { clave: 'marihuana', etiqueta: 'Marihuana' },
  { clave: 'cocaina', etiqueta: 'Cocaína' },
  { clave: 'anfetaminas', etiqueta: 'Anfetaminas' },
  { clave: 'metanfetaminas', etiqueta: 'Metanfetaminas' },
  { clave: 'opiaceos', etiqueta: 'Opiáceos' },
  { clave: 'benzodiacepinas', etiqueta: 'Benzodiacepinas' },
  { clave: 'fenciclidina', etiqueta: 'Fenciclidina' },
  { clave: 'metadona', etiqueta: 'Metadona' },
  { clave: 'barbituricos', etiqueta: 'Barbitúricos' },
  { clave: 'antidepresivosTriciclicos', etiqueta: 'Antidepresivos tricíclicos' },
  { clave: 'metilendioximetanfetamina', etiqueta: 'MDMA (éxtasis)' },
  { clave: 'ketamina', etiqueta: 'Ketamina' },
];

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const textoDeMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1] ?? ''} ${mes.slice(2, 4)}`;
const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export interface ResumenAntidoping {
  pruebas: number;
  trabajadores: number;
  pruebasPositivas: number;
  trabajadoresConPositivo: number;
  /** Sustancias con al menos un positivo: en cuántas pruebas salió y en cuántas se evaluó. */
  porSustancia: (Conteo & { evaluadas: number })[];
  /** Meses con pruebas, en orden. */
  porMes: { clave: string; etiqueta: string; pruebas: number; positivas: number }[];
}

export function resumirAntidoping(registros: AntidopingDeTablero[]): ResumenAntidoping {
  const positivas = registros.filter((r) => r.positivos.length > 0);
  const porMes = new Map<string, { pruebas: number; positivas: number }>();
  for (const registro of registros) {
    if (!registro.mes) continue;
    const actual = porMes.get(registro.mes) ?? { pruebas: 0, positivas: 0 };
    actual.pruebas++;
    if (registro.positivos.length) actual.positivas++;
    porMes.set(registro.mes, actual);
  }
  return {
    pruebas: registros.length,
    trabajadores: new Set(registros.map((r) => r.trabajador)).size,
    pruebasPositivas: positivas.length,
    trabajadoresConPositivo: new Set(positivas.map((r) => r.trabajador)).size,
    porSustancia: SUSTANCIAS_ANTIDOPING.map((sustancia) => ({
      ...sustancia,
      cantidad: registros.filter((r) => r.positivos.includes(sustancia.clave)).length,
      evaluadas: registros.filter((r) => r.evaluadas.includes(sustancia.clave)).length,
    }))
      .filter((s) => s.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad),
    porMes: [...porMes.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, datos]) => ({ clave: mes, etiqueta: textoDeMes(mes), ...datos })),
  };
}

export const TITULOS_ANTIDOPING = {
  resumen: 'Pruebas antidoping',
  sustancias: 'Antidoping: positivos por sustancia',
  meses: 'Antidoping: pruebas por mes',
} as const;

export function tablasAntidoping(registros: AntidopingDeTablero[]): TablaDeInforme[] {
  if (!registros.length) return [];
  const r = resumirAntidoping(registros);
  const seccion = 'Antidoping';
  const tablas: TablaDeInforme[] = [
    {
      seccion,
      titulo: TITULOS_ANTIDOPING.resumen,
      columnas: ['Concepto', 'Cantidad', 'Porcentaje'],
      filas: [
        ['Pruebas realizadas', r.pruebas, ''],
        ['Pruebas con algún positivo', r.pruebasPositivas, `${pct(r.pruebasPositivas, r.pruebas)} %`],
        ['Trabajadores evaluados', r.trabajadores, ''],
        ['Trabajadores con algún positivo', r.trabajadoresConPositivo, `${pct(r.trabajadoresConPositivo, r.trabajadores)} %`],
      ],
    },
  ];
  if (r.porSustancia.length) {
    tablas.push({
      seccion,
      titulo: TITULOS_ANTIDOPING.sustancias,
      columnas: ['Sustancia', 'Pruebas positivas', 'Pruebas en que se evaluó'],
      filas: r.porSustancia.map((s) => [s.etiqueta, s.cantidad, s.evaluadas]),
    });
  }
  if (r.porMes.length > 1) {
    tablas.push({
      seccion,
      titulo: TITULOS_ANTIDOPING.meses,
      columnas: ['Mes', 'Pruebas', 'Con algún positivo'],
      filas: r.porMes.map((m) => [m.etiqueta, m.pruebas, m.positivas]),
    });
  }
  return tablas;
}

export function hallazgosAntidoping(registros: AntidopingDeTablero[]): string[] {
  if (!registros.length) return [];
  const r = resumirAntidoping(registros);
  const base = `Se realizaron ${plural(r.pruebas, 'prueba antidoping', 'pruebas antidoping')} a ${plural(r.trabajadores, 'trabajador', 'trabajadores')}`;
  if (!r.pruebasPositivas) return [`${base}; todas resultaron negativas.`];
  return [
    `${base}; ${r.pruebasPositivas} ${r.pruebasPositivas === 1 ? 'resultó positiva' : 'resultaron positivas'} a alguna sustancia (${pct(r.pruebasPositivas, r.pruebas)} %). La sustancia más frecuente fue ${r.porSustancia[0].etiqueta.toLowerCase()} (${plural(r.porSustancia[0].cantidad, 'prueba', 'pruebas')}).`,
  ];
}
