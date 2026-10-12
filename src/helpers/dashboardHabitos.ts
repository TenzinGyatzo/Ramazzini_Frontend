/**
 * Tablero de salud: hábitos y estilo de vida referidos en la historia clínica
 * más reciente de cada trabajador en el periodo. Cada hábito se mide sobre
 * quienes lo tienen contestado.
 */
import type { Conteo } from './dashboardCuestionarios';
import type { TablaDeInforme } from './dashboardInformes';

export type HabitosDeTablero = Partial<
  Record<'tabaquismo' | 'alcoholismo' | 'toxicomanias' | 'alimentacionDeficiente' | 'actividadFisicaDeficiente', string | null>
>;

export const HABITOS: { clave: keyof HabitosDeTablero; etiqueta: string }[] = [
  { clave: 'tabaquismo', etiqueta: 'Tabaquismo' },
  { clave: 'alcoholismo', etiqueta: 'Consumo de alcohol' },
  { clave: 'toxicomanias', etiqueta: 'Consumo de otras sustancias' },
  { clave: 'actividadFisicaDeficiente', etiqueta: 'Actividad física insuficiente' },
  { clave: 'alimentacionDeficiente', etiqueta: 'Alimentación deficiente' },
];

const esSi = (valor: unknown) => typeof valor === 'string' && /^s[ií]$/i.test(valor.trim());
const esNo = (valor: unknown) => typeof valor === 'string' && /^no$/i.test(valor.trim());
const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

export interface ResumenHabitos {
  /** Historias clínicas con al menos un hábito contestado. */
  evaluados: number;
  /** Hábitos contestados por alguien, en el orden del catálogo. */
  habitos: (Conteo & { evaluados: number })[];
}

export function resumirHabitos(registros: HabitosDeTablero[]): ResumenHabitos {
  const habitos = HABITOS.map((habito) => ({
    clave: habito.clave as string,
    etiqueta: habito.etiqueta,
    cantidad: registros.filter((r) => esSi(r?.[habito.clave])).length,
    evaluados: registros.filter((r) => esSi(r?.[habito.clave]) || esNo(r?.[habito.clave])).length,
  })).filter((habito) => habito.evaluados > 0);
  return {
    evaluados: registros.filter((r) => HABITOS.some((h) => esSi(r?.[h.clave]) || esNo(r?.[h.clave]))).length,
    habitos,
  };
}

export const TITULO_HABITOS = 'Hábitos y estilo de vida';

export function tablasHabitos(registros: HabitosDeTablero[]): TablaDeInforme[] {
  const r = resumirHabitos(registros);
  if (!r.habitos.length) return [];
  return [
    {
      seccion: 'Antecedentes',
      titulo: TITULO_HABITOS,
      columnas: ['Hábito referido', 'Trabajadores', 'Porcentaje'],
      filas: r.habitos.map((h) => [h.etiqueta, h.cantidad, `${pct(h.cantidad, h.evaluados)} %`]),
    },
  ];
}

/** Tabaquismo y consumo de alcohol siempre que se hayan preguntado, aunque nadie los refiera. */
export function hallazgosHabitos(registros: HabitosDeTablero[]): string[] {
  const habitos = resumirHabitos(registros).habitos.filter((h) => h.clave === 'tabaquismo' || h.clave === 'alcoholismo');
  if (!habitos.length) return [];
  return [
    `Hábitos referidos en la historia clínica: ${habitos
      .map((h) => `${h.etiqueta.toLowerCase()} ${pct(h.cantidad, h.evaluados)} % (${h.cantidad} de ${h.evaluados})`)
      .join(' y ')}.`,
  ];
}
