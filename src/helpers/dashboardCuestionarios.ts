/**
 * Tablero de salud: Cuestionario Nórdico y Evaluación de sueño y vigilia.
 * El servidor entrega, de cada trabajador, el resultado de su documento más
 * reciente del periodo; aquí se cuentan trabajadores, no documentos.
 */
import { REGIONES_NORDICO, type SemaforoNordico } from './cuestionarioNordico';
import {
  ALERTAS_SUENO_VIGILIA,
  AREAS_SUENO_VIGILIA,
  ETIQUETA_NIVEL_SUENO_VIGILIA,
  MINUTOS_SUENO_CORTO,
  NIVELES_SUENO_VIGILIA,
  type NivelSuenoVigilia,
} from './evaluacionSuenoVigilia';
import type { TablaDeInforme } from './dashboardInformes';

export interface Conteo {
  clave: string;
  etiqueta: string;
  cantidad: number;
}

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const deMayorAMenor = (conteos: Conteo[]) =>
  conteos.filter((c) => c.cantidad > 0).sort((a, b) => b.cantidad - a.cantidad || a.etiqueta.localeCompare(b.etiqueta, 'es'));

// ---- Cuestionario Nórdico

export interface NordicoDeTablero {
  semaforo: string;
  regionesMolestia12Meses: string[];
  regionesMolestia7Dias: string[];
  regionesImpedimento: string[];
  regionesRelacionLaboral: string[];
  regionesPrioritarias: string[];
  intensidadMaxima: number;
  puesto: string;
}

/** Zonas del cuestionario original: los lados izquierdo y derecho cuentan como una sola. */
export const ZONAS_NORDICO: { clave: string; etiqueta: string }[] = [
  { clave: 'cuello', etiqueta: 'Cuello' },
  { clave: 'hombros', etiqueta: 'Hombros' },
  { clave: 'codos', etiqueta: 'Codos y antebrazos' },
  { clave: 'munecas', etiqueta: 'Muñecas y manos' },
  { clave: 'espaldaAlta', etiqueta: 'Espalda alta' },
  { clave: 'espaldaBaja', etiqueta: 'Espalda baja' },
  { clave: 'caderas', etiqueta: 'Cadera y muslos' },
  { clave: 'rodillas', etiqueta: 'Rodillas' },
  { clave: 'tobillos', etiqueta: 'Tobillos y pies' },
];

const zonaDeRegion = new Map<string, string>(REGIONES_NORDICO.map((region) => [region.clave, region.grupo]));

/** Trabajadores por zona: quien marcó ambos hombros cuenta una vez en «Hombros». */
function porZona(registros: NordicoDeTablero[], campo: keyof NordicoDeTablero): Conteo[] {
  const cantidades = new Map<string, number>();
  for (const registro of registros) {
    const zonas = new Set((registro[campo] as string[]).map((region) => zonaDeRegion.get(region)).filter(Boolean));
    for (const zona of zonas) cantidades.set(zona as string, (cantidades.get(zona as string) ?? 0) + 1);
  }
  return deMayorAMenor(ZONAS_NORDICO.map((zona) => ({ ...zona, cantidad: cantidades.get(zona.clave) ?? 0 })));
}

export const SEMAFOROS_NORDICO: { clave: SemaforoNordico; etiqueta: string }[] = [
  { clave: 'verde', etiqueta: 'Sin molestias' },
  { clave: 'amarillo', etiqueta: 'Con molestias' },
  { clave: 'rojo', etiqueta: 'Requieren seguimiento' },
];

export interface ResumenNordico {
  evaluados: number;
  /** Trabajadores por resultado, siempre en el orden verde, amarillo, rojo. */
  semaforo: Conteo[];
  conMolestia12Meses: number;
  conMolestia7Dias: number;
  conImpedimento: number;
  conRelacionLaboral: number;
  zonas12Meses: Conteo[];
  zonas7Dias: Conteo[];
  zonasImpedimento: Conteo[];
  zonasRelacionLaboral: Conteo[];
  /** Puestos con más trabajadores que reportaron molestias, con cuántos se evaluaron en cada uno. */
  puestos: (Conteo & { evaluados: number })[];
}

export function resumirNordico(registros: NordicoDeTablero[]): ResumenNordico {
  const con = (campo: keyof NordicoDeTablero) => registros.filter((r) => (r[campo] as string[]).length > 0).length;
  const porPuesto = new Map<string, { evaluados: number; conMolestia: number }>();
  for (const registro of registros) {
    if (!registro.puesto) continue;
    const actual = porPuesto.get(registro.puesto) ?? { evaluados: 0, conMolestia: 0 };
    actual.evaluados++;
    if (registro.regionesMolestia12Meses.length) actual.conMolestia++;
    porPuesto.set(registro.puesto, actual);
  }
  return {
    evaluados: registros.length,
    semaforo: SEMAFOROS_NORDICO.map((s) => ({ ...s, cantidad: registros.filter((r) => r.semaforo === s.clave).length })),
    conMolestia12Meses: con('regionesMolestia12Meses'),
    conMolestia7Dias: con('regionesMolestia7Dias'),
    conImpedimento: con('regionesImpedimento'),
    conRelacionLaboral: con('regionesRelacionLaboral'),
    zonas12Meses: porZona(registros, 'regionesMolestia12Meses'),
    zonas7Dias: porZona(registros, 'regionesMolestia7Dias'),
    zonasImpedimento: porZona(registros, 'regionesImpedimento'),
    zonasRelacionLaboral: porZona(registros, 'regionesRelacionLaboral'),
    puestos: [...porPuesto.entries()]
      .map(([puesto, datos]) => ({ clave: puesto, etiqueta: puesto, cantidad: datos.conMolestia, evaluados: datos.evaluados }))
      .filter((p) => p.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad || a.etiqueta.localeCompare(b.etiqueta, 'es')),
  };
}

// ---- Evaluación de sueño y vigilia

export interface SuenoDeTablero {
  prioridad: string;
  areas: Record<string, string>;
  alertas: string[];
  horarioLaboral: string;
  calidadGeneralSueno: string;
  minutosSuenoDiarios: number | null;
}

const NIVELES = NIVELES_SUENO_VIGILIA.map((nivel) => ({ clave: nivel, etiqueta: ETIQUETA_NIVEL_SUENO_VIGILIA[nivel] }));
const porNivel = (niveles: (string | undefined)[]): Conteo[] =>
  NIVELES.map((nivel) => ({ ...nivel, cantidad: niveles.filter((n) => n === nivel.clave).length }));

/** Síntomas al menos semanales: los niveles que el documento marca para seguimiento. */
const esRelevante = (nivel: string | undefined) => nivel === 'naranja' || nivel === 'rojo';

export interface ResumenSueno {
  evaluados: number;
  /** Trabajadores por nivel general, de «sin síntomas» a «frecuente». */
  prioridad: Conteo[];
  /** Trabajadores con síntomas semanales o frecuentes, o con una alerta de ese nivel. */
  conSeguimiento: number;
  /** Por área: cuántos la tienen evaluada y cuántos con síntomas semanales o frecuentes. */
  areas: (Conteo & { evaluados: number; niveles: Conteo[] })[];
  alertas: Conteo[];
  horarios: Conteo[];
  /** Con horas de sueño capturadas. */
  conHoras: number;
  suenoCorto: number;
  promedioHoras: number | null;
}

export function resumirSueno(registros: SuenoDeTablero[]): ResumenSueno {
  const conHoras = registros.filter((r) => typeof r.minutosSuenoDiarios === 'number');
  const horarios = new Map<string, number>();
  for (const registro of registros) {
    if (registro.horarioLaboral) horarios.set(registro.horarioLaboral, (horarios.get(registro.horarioLaboral) ?? 0) + 1);
  }
  return {
    evaluados: registros.length,
    prioridad: porNivel(registros.map((r) => r.prioridad)),
    conSeguimiento: registros.filter((r) => esRelevante(r.prioridad)).length,
    areas: AREAS_SUENO_VIGILIA.map((area) => {
      const niveles = registros.map((r) => r.areas?.[area.clave]).filter(Boolean);
      return {
        clave: area.clave,
        etiqueta: area.etiqueta,
        cantidad: niveles.filter(esRelevante).length,
        evaluados: niveles.length,
        niveles: porNivel(niveles),
      };
    }).filter((area) => area.evaluados > 0),
    // En empates conserva el orden del catálogo: de la más a la menos grave
    alertas: ALERTAS_SUENO_VIGILIA.map((alerta) => ({
      clave: alerta.clave,
      etiqueta: alerta.texto,
      cantidad: registros.filter((r) => r.alertas.includes(alerta.clave)).length,
    }))
      .filter((alerta) => alerta.cantidad > 0)
      .sort((x, y) => y.cantidad - x.cantidad),
    horarios: deMayorAMenor([...horarios.entries()].map(([horario, cantidad]) => ({ clave: horario, etiqueta: horario, cantidad }))),
    conHoras: conHoras.length,
    suenoCorto: conHoras.filter((r) => (r.minutosSuenoDiarios as number) < MINUTOS_SUENO_CORTO).length,
    promedioHoras: conHoras.length
      ? Math.round((conHoras.reduce((suma, r) => suma + (r.minutosSuenoDiarios as number), 0) / conHoras.length / 60) * 10) / 10
      : null,
  };
}

// ---- Para los informes

const tablaDeConteos = (
  seccion: string,
  titulo: string,
  concepto: string,
  conteos: Conteo[],
  total: number,
): TablaDeInforme | null =>
  conteos.some((c) => c.cantidad > 0)
    ? {
        seccion,
        titulo,
        columnas: [concepto, 'Trabajadores', 'Porcentaje'],
        filas: conteos.map((c) => [c.etiqueta, c.cantidad, `${pct(c.cantidad, total)} %`]),
      }
    : null;

export const TITULOS_NORDICO = {
  resultado: 'Cuestionario Nórdico: resultado',
  zonas12: 'Molestias musculoesqueléticas en los últimos 12 meses',
  zonas7: 'Molestias musculoesqueléticas en los últimos 7 días',
  impedimento: 'Molestias que impidieron trabajar',
  laboral: 'Molestias que el trabajador relaciona con su trabajo',
} as const;

export function tablasNordico(registros: NordicoDeTablero[]): TablaDeInforme[] {
  if (!registros.length) return [];
  const r = resumirNordico(registros);
  const seccion = 'Musculoesquelético';
  return [
    tablaDeConteos(seccion, TITULOS_NORDICO.resultado, 'Resultado', r.semaforo, r.evaluados),
    tablaDeConteos(seccion, TITULOS_NORDICO.zonas12, 'Zona del cuerpo', r.zonas12Meses, r.evaluados),
    tablaDeConteos(seccion, TITULOS_NORDICO.zonas7, 'Zona del cuerpo', r.zonas7Dias, r.evaluados),
    tablaDeConteos(seccion, TITULOS_NORDICO.impedimento, 'Zona del cuerpo', r.zonasImpedimento, r.evaluados),
    tablaDeConteos(seccion, TITULOS_NORDICO.laboral, 'Zona del cuerpo', r.zonasRelacionLaboral, r.evaluados),
  ].filter((tabla): tabla is TablaDeInforme => !!tabla);
}

export function hallazgosNordico(registros: NordicoDeTablero[]): string[] {
  if (!registros.length) return [];
  const r = resumirNordico(registros);
  const hallazgos = [
    `De ${plural(r.evaluados, 'trabajador con Cuestionario Nórdico', 'trabajadores con Cuestionario Nórdico')}, ${pct(r.conMolestia12Meses, r.evaluados)} % reportó molestias musculoesqueléticas en los últimos 12 meses (${r.conMolestia12Meses})` +
      (r.zonas12Meses[0] ? `; la zona más frecuente fue ${r.zonas12Meses[0].etiqueta.toLowerCase()} (${r.zonas12Meses[0].cantidad}).` : '.'),
  ];
  if (r.conImpedimento) {
    hallazgos.push(
      `${plural(r.conImpedimento, 'trabajador reportó', 'trabajadores reportaron')} que alguna molestia le impidió hacer su trabajo habitual.`,
    );
  }
  if (r.conRelacionLaboral) {
    hallazgos.push(
      `${plural(r.conRelacionLaboral, 'trabajador relaciona', 'trabajadores relacionan')} alguna de sus molestias con su trabajo.`,
    );
  }
  return hallazgos;
}

export const TITULOS_SUENO = {
  nivel: 'Sueño y vigilia: nivel general',
  areas: 'Sueño y vigilia: síntomas semanales o frecuentes por área',
  alertas: 'Sueño y vigilia: hallazgos y alertas',
} as const;

export function tablasSueno(registros: SuenoDeTablero[]): TablaDeInforme[] {
  if (!registros.length) return [];
  const r = resumirSueno(registros);
  const seccion = 'Sueño y vigilia';
  const areas: TablaDeInforme | null = r.areas.some((a) => a.cantidad > 0)
    ? {
        seccion,
        titulo: TITULOS_SUENO.areas,
        columnas: ['Área', 'Trabajadores', 'Porcentaje'],
        filas: r.areas.map((a) => [a.etiqueta, a.cantidad, `${pct(a.cantidad, a.evaluados)} %`]),
      }
    : null;
  return [
    tablaDeConteos(seccion, TITULOS_SUENO.nivel, 'Nivel', r.prioridad, r.evaluados),
    areas,
    tablaDeConteos(seccion, TITULOS_SUENO.alertas, 'Hallazgo', r.alertas, r.evaluados),
  ].filter((tabla): tabla is TablaDeInforme => !!tabla);
}

export function hallazgosSueno(registros: SuenoDeTablero[]): string[] {
  if (!registros.length) return [];
  const r = resumirSueno(registros);
  const hallazgos = [
    `De ${plural(r.evaluados, 'trabajador con evaluación de sueño y vigilia', 'trabajadores con evaluación de sueño y vigilia')}, ${pct(r.conSeguimiento, r.evaluados)} % presenta síntomas semanales o frecuentes, o un hallazgo que requiere seguimiento (${r.conSeguimiento}).`,
  ];
  const deSeguridad = (clave: string) => r.alertas.find((a) => a.clave === clave)?.cantidad ?? 0;
  const peligrosa = deSeguridad('suenoActividadPeligrosa');
  const accidente = deSeguridad('accidenteOCasiAccidente');
  if (peligrosa || accidente) {
    hallazgos.push(
      [
        peligrosa ? `${plural(peligrosa, 'trabajador reportó', 'trabajadores reportaron')} somnolencia en una actividad peligrosa` : '',
        accidente
          ? `${plural(accidente, 'reportó', 'reportaron')} un accidente o casi accidente relacionado con sueño, fatiga o falta de concentración`
          : '',
      ]
        .filter(Boolean)
        .join(' y ') + '.',
    );
  }
  if (r.conHoras && r.suenoCorto) {
    hallazgos.push(`${pct(r.suenoCorto, r.conHoras)} % duerme menos de 7 horas por cada 24 (${r.suenoCorto} de ${r.conHoras}).`);
  }
  return hallazgos;
}

export type { NivelSuenoVigilia };
