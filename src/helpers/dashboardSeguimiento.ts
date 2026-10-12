/**
 * Tablero de salud: seguimiento cardiometabólico, historia otológica, detalle
 * de las consultas y resumen de incapacidades. Del seguimiento y de la historia
 * otológica cuenta el documento más reciente de cada trabajador en el periodo;
 * de las consultas cuentan todas.
 */
import type { Conteo, Tono } from './dashboardCuestionarios';
import type { TablaDeInforme } from './dashboardInformes';
import type { InformeIncapacidades } from './incapacidadesInforme';
import { RAMOS } from './incapacidades';

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// ---- Seguimiento cardiometabólico

export interface CardiometabolicoDeTablero {
  diagnosticos: string[];
  control: Record<string, string>;
  gradoObesidad: string;
  laboratorio: Record<string, string>;
}

export const CONDICIONES_CARDIOMETABOLICAS: { clave: string; etiqueta: string }[] = [
  { clave: 'HIPERTENSION_ARTERIAL', etiqueta: 'Hipertensión arterial' },
  { clave: 'DIABETES_MELLITUS_TIPO_2', etiqueta: 'Diabetes mellitus tipo 2' },
  { clave: 'DISLIPIDEMIA', etiqueta: 'Dislipidemia' },
  { clave: 'OBESIDAD', etiqueta: 'Obesidad' },
];

/** Estudios de laboratorio y las categorías que cuentan como fuera de meta. */
const LABORATORIO: { clave: string; etiqueta: string; fueraDeMeta: string[] }[] = [
  { clave: 'glucosa', etiqueta: 'Glucosa', fueraDeMeta: ['Alterada', 'Elevada'] },
  { clave: 'hba1c', etiqueta: 'Hemoglobina glucosilada (HbA1c)', fueraDeMeta: ['Prediabetes', 'Compatible con diabetes'] },
  { clave: 'colesterolTotal', etiqueta: 'Colesterol total', fueraDeMeta: ['Límite alto', 'Alto'] },
  { clave: 'ldl', etiqueta: 'Colesterol LDL', fueraDeMeta: ['Límite alto', 'Alto', 'Muy alto'] },
  { clave: 'hdl', etiqueta: 'Colesterol HDL', fueraDeMeta: ['Bajo'] },
  { clave: 'trigliceridos', etiqueta: 'Triglicéridos', fueraDeMeta: ['Límite alto', 'Alto', 'Muy alto'] },
];

/** Grados que el seguimiento registra para la obesidad, del menor al mayor. */
export const GRADOS_DE_OBESIDAD: { clave: string; etiqueta: string }[] = [
  { clave: 'SOBREPESO', etiqueta: 'Sobrepeso' },
  { clave: 'OBESIDAD_I', etiqueta: 'Obesidad I' },
  { clave: 'OBESIDAD_II', etiqueta: 'Obesidad II' },
  { clave: 'OBESIDAD_III', etiqueta: 'Obesidad III' },
];

export interface ResumenCardiometabolico {
  /** Trabajadores con al menos un evento de seguimiento en el periodo. */
  enSeguimiento: number;
  condiciones: Conteo[];
  /** Por condición con control valorado: cuántos controlados y cuántos no. */
  control: { clave: string; etiqueta: string; controlados: number; noControlados: number; valorados: number }[];
  /** Por estudio capturado: cuántos fuera de meta, de los que tienen un resultado valorable. */
  laboratorio: (Conteo & { evaluados: number })[];
  /**
   * La obesidad no se valora como controlada o no: el seguimiento registra su
   * grado. Los cuatro grados, en orden, y cuántos trabajadores lo tienen capturado.
   */
  obesidad: { total: number; grados: Conteo[] };
}

export function resumirCardiometabolico(registros: CardiometabolicoDeTablero[]): ResumenCardiometabolico {
  return {
    enSeguimiento: registros.length,
    condiciones: CONDICIONES_CARDIOMETABOLICAS.map((c) => ({
      ...c,
      cantidad: registros.filter((r) => r.diagnosticos.includes(c.clave)).length,
    })).filter((c) => c.cantidad > 0),
    control: CONDICIONES_CARDIOMETABOLICAS.map((c) => {
      const estados = registros.map((r) => r.control?.[c.clave]);
      const controlados = estados.filter((e) => e === 'CONTROLADA').length;
      const noControlados = estados.filter((e) => e === 'NO_CONTROLADA').length;
      return { ...c, controlados, noControlados, valorados: controlados + noControlados };
    }).filter((c) => c.valorados > 0),
    laboratorio: LABORATORIO.map((estudio) => {
      const categorias = registros
        .map((r) => r.laboratorio?.[estudio.clave])
        .filter((categoria) => !!categoria && categoria !== 'No valorable');
      return {
        clave: estudio.clave,
        etiqueta: estudio.etiqueta,
        cantidad: categorias.filter((categoria) => estudio.fueraDeMeta.includes(categoria)).length,
        evaluados: categorias.length,
      };
    }).filter((estudio) => estudio.evaluados > 0),
    obesidad: {
      total: registros.filter((r) => GRADOS_DE_OBESIDAD.some((grado) => grado.clave === r.gradoObesidad)).length,
      grados: GRADOS_DE_OBESIDAD.map((grado) => ({
        ...grado,
        cantidad: registros.filter((r) => r.gradoObesidad === grado.clave).length,
      })),
    },
  };
}

export const TITULOS_CARDIOMETABOLICO = {
  condiciones: 'Seguimiento cardiometabólico: condiciones',
  control: 'Seguimiento cardiometabólico: control en la última visita',
  laboratorio: 'Seguimiento cardiometabólico: laboratorio fuera de meta',
  obesidad: 'Seguimiento cardiometabólico: grado de obesidad',
} as const;

export function tablasCardiometabolico(registros: CardiometabolicoDeTablero[]): TablaDeInforme[] {
  if (!registros.length) return [];
  const r = resumirCardiometabolico(registros);
  const seccion = 'Cardiometabólico';
  const tablas: TablaDeInforme[] = [];
  if (r.condiciones.length) {
    tablas.push({
      seccion,
      titulo: TITULOS_CARDIOMETABOLICO.condiciones,
      columnas: ['Condición en seguimiento', 'Trabajadores', 'Porcentaje'],
      filas: r.condiciones.map((c) => [c.etiqueta, c.cantidad, `${pct(c.cantidad, r.enSeguimiento)} %`]),
    });
  }
  if (r.control.length) {
    tablas.push({
      seccion,
      titulo: TITULOS_CARDIOMETABOLICO.control,
      columnas: ['Condición', 'Controlados', 'No controlados', 'Porcentaje en control'],
      filas: r.control.map((c) => [c.etiqueta, c.controlados, c.noControlados, `${pct(c.controlados, c.valorados)} %`]),
    });
  }
  if (r.laboratorio.length) {
    tablas.push({
      seccion,
      titulo: TITULOS_CARDIOMETABOLICO.laboratorio,
      columnas: ['Estudio', 'Fuera de meta', 'Con resultado', 'Porcentaje'],
      filas: r.laboratorio.map((e) => [e.etiqueta, e.cantidad, e.evaluados, `${pct(e.cantidad, e.evaluados)} %`]),
    });
  }
  if (r.obesidad.total) {
    tablas.push({
      seccion,
      titulo: TITULOS_CARDIOMETABOLICO.obesidad,
      columnas: ['Grado en la última visita', 'Trabajadores', 'Porcentaje'],
      filas: r.obesidad.grados.map((g) => [g.etiqueta, g.cantidad, `${pct(g.cantidad, r.obesidad.total)} %`]),
    });
  }
  return tablas;
}

export function hallazgosCardiometabolico(registros: CardiometabolicoDeTablero[]): string[] {
  if (!registros.length) return [];
  const r = resumirCardiometabolico(registros);
  const hallazgos = [
    `${plural(r.enSeguimiento, 'trabajador tiene', 'trabajadores tienen')} seguimiento cardiometabólico en el periodo` +
      (r.condiciones.length
        ? `: ${r.condiciones.map((c) => `${c.etiqueta.toLowerCase()} ${c.cantidad}`).join(', ')}.`
        : '.'),
  ];
  const sinControl = r.control.filter((c) => c.noControlados > 0);
  if (sinControl.length) {
    hallazgos.push(
      `En su última visita no estaban en control: ${sinControl
        .map((c) => `${c.noControlados} de ${c.valorados} con ${c.etiqueta.toLowerCase()}`)
        .join(', ')}.`,
    );
  }
  return hallazgos;
}

// ---- Historia otológica

export type OtologicaDeTablero = Record<string, string | null>;

const esSi = (valor: unknown) => typeof valor === 'string' && /^s[ií]$/i.test(valor.trim());
const contestado = (valor: unknown) => typeof valor === 'string' && /^(s[ií]|no)$/i.test(valor.trim());

const SINTOMAS_OTOLOGICOS: { clave: string; etiqueta: string }[] = [
  { clave: 'zumbidoTinnitus', etiqueta: 'Zumbido en los oídos' },
  { clave: 'perdidaAudicion', etiqueta: 'Sensación de pérdida de audición' },
  { clave: 'mareoVertigo', etiqueta: 'Mareo o vértigo' },
  { clave: 'trabajoAmbientesRuidosos', etiqueta: 'Trabaja en ambientes ruidosos' },
  { clave: 'musicaFuerteAudifonos', etiqueta: 'Música fuerte con audífonos' },
];

const PROTECCION: { clave: string; etiqueta: string; tono: Tono }[] = [
  { clave: 'SIEMPRE', etiqueta: 'Siempre', tono: 'favorable' },
  { clave: 'A VECES', etiqueta: 'A veces', tono: 'atencion' },
  { clave: 'NUNCA', etiqueta: 'Nunca', tono: 'riesgo' },
];

export interface ResumenOtologico {
  evaluados: number;
  /** Respuestas afirmativas, cada una sobre quienes contestaron esa pregunta. */
  respuestas: (Conteo & { evaluados: number })[];
  /** Uso de protección auditiva entre quienes dijeron trabajar en ambientes ruidosos. */
  proteccion: Conteo[];
  expuestosConRespuesta: number;
}

export function resumirOtologica(registros: OtologicaDeTablero[]): ResumenOtologico {
  const expuestos = registros.filter(
    (r) => esSi(r?.trabajoAmbientesRuidosos) && PROTECCION.some((p) => p.clave === r?.usoProteccionAuditiva),
  );
  return {
    evaluados: registros.length,
    respuestas: SINTOMAS_OTOLOGICOS.map((s) => ({
      ...s,
      cantidad: registros.filter((r) => esSi(r?.[s.clave])).length,
      evaluados: registros.filter((r) => contestado(r?.[s.clave])).length,
    })).filter((s) => s.evaluados > 0),
    proteccion: PROTECCION.map((p) => ({
      ...p,
      cantidad: expuestos.filter((r) => r.usoProteccionAuditiva === p.clave).length,
    })),
    expuestosConRespuesta: expuestos.length,
  };
}

export const TITULOS_OTOLOGICA = {
  respuestas: 'Historia otológica: síntomas y exposición referidos',
  proteccion: 'Uso de protección auditiva entre quienes trabajan con ruido',
} as const;

export function tablasOtologica(registros: OtologicaDeTablero[]): TablaDeInforme[] {
  if (!registros.length) return [];
  const r = resumirOtologica(registros);
  const tablas: TablaDeInforme[] = [];
  if (r.respuestas.length) {
    tablas.push({
      seccion: 'Audición',
      titulo: TITULOS_OTOLOGICA.respuestas,
      columnas: ['Referido por el trabajador', 'Trabajadores', 'Porcentaje'],
      filas: r.respuestas.map((s) => [s.etiqueta, s.cantidad, `${pct(s.cantidad, s.evaluados)} %`]),
    });
  }
  if (r.expuestosConRespuesta) {
    tablas.push({
      seccion: 'Audición',
      titulo: TITULOS_OTOLOGICA.proteccion,
      columnas: ['Usa protección auditiva', 'Trabajadores', 'Porcentaje'],
      filas: r.proteccion.map((p) => [p.etiqueta, p.cantidad, `${pct(p.cantidad, r.expuestosConRespuesta)} %`]),
    });
  }
  return tablas;
}

export function hallazgosOtologica(registros: OtologicaDeTablero[]): string[] {
  const r = resumirOtologica(registros);
  if (!r.expuestosConRespuesta) return [];
  const sinSiempre = r.expuestosConRespuesta - (r.proteccion.find((p) => p.clave === 'SIEMPRE')?.cantidad ?? 0);
  return [
    `De ${plural(r.expuestosConRespuesta, 'trabajador que refiere', 'trabajadores que refieren')} trabajar en ambientes ruidosos, ${sinSiempre} no ${sinSiempre === 1 ? 'usa' : 'usan'} protección auditiva siempre (${pct(sinSiempre, r.expuestosConRespuesta)} %).`,
  ];
}

// ---- Consultas

export interface ConsultaDeTablero {
  fechaNotaMedica?: string | null;
  tipoNota?: string | null;
  /** Clave opaca del trabajador; ausente si el servidor aún no la manda. */
  trabajador?: string;
}

export const CONSULTAS_FRECUENTES = 3;

export interface ResumenConsultas {
  consultas: number;
  /** null si el servidor no manda con quién fue cada consulta. */
  trabajadores: number | null;
  promedio: number | null;
  /** Trabajadores con tres o más consultas en el periodo. */
  frecuentes: number | null;
  tipos: Conteo[];
}

export function resumirConsultas(registros: ConsultaDeTablero[]): ResumenConsultas {
  const porTrabajador = new Map<string, number>();
  for (const consulta of registros) {
    if (consulta?.trabajador) porTrabajador.set(consulta.trabajador, (porTrabajador.get(consulta.trabajador) ?? 0) + 1);
  }
  const conClave = porTrabajador.size > 0;
  return {
    consultas: registros.length,
    trabajadores: conClave ? porTrabajador.size : null,
    promedio: conClave ? Math.round((registros.length / porTrabajador.size) * 10) / 10 : null,
    frecuentes: conClave ? [...porTrabajador.values()].filter((n) => n >= CONSULTAS_FRECUENTES).length : null,
    tipos: ['Inicial', 'Seguimiento', 'Alta']
      .map((tipo) => ({ clave: tipo, etiqueta: tipo, cantidad: registros.filter((c) => c?.tipoNota === tipo).length }))
      .filter((tipo) => tipo.cantidad > 0),
  };
}

export const TITULO_CONSULTAS = 'Consultas del periodo';

export function tablasConsultas(registros: ConsultaDeTablero[]): TablaDeInforme[] {
  const r = resumirConsultas(registros);
  if (!r.consultas || r.trabajadores === null) return [];
  return [
    {
      seccion: 'Consultas',
      titulo: TITULO_CONSULTAS,
      columnas: ['Concepto', 'Cantidad'],
      filas: [
        ['Consultas', r.consultas],
        ['Trabajadores atendidos', r.trabajadores],
        ['Consultas por trabajador atendido', r.promedio ?? 0],
        [`Trabajadores con ${CONSULTAS_FRECUENTES} o más consultas`, r.frecuentes ?? 0],
        ...r.tipos.map((tipo): (string | number)[] => [`Notas de tipo «${tipo.etiqueta}»`, tipo.cantidad]),
      ],
    },
  ];
}

// ---- Incapacidades (del módulo de incapacidades, mismo periodo y centro)

export interface ResumenIncapacidades {
  casos: number;
  dias: number;
  trabajadores: number;
  /** Porcentaje de días perdidos sobre los días trabajables; null si no se puede calcular. */
  ausentismo: number | null;
  porRamo: (Conteo & { dias: number })[];
}

/** null si no hay nada que mostrar. */
export function resumirIncapacidades(informe: InformeIncapacidades | null | undefined): ResumenIncapacidades | null {
  if (!informe) return null;
  const { totales } = informe;
  if (!totales.casosNuevos && !totales.dias.total) return null;
  return {
    casos: totales.casosNuevos,
    dias: totales.dias.total,
    trabajadores: totales.trabajadoresConIncapacidad,
    ausentismo: informe.indicadores.tasaAusentismo,
    porRamo: RAMOS.map((ramo) => ({
      clave: ramo.valor,
      etiqueta: ramo.texto,
      cantidad: totales.casosPorRamo?.[ramo.valor] ?? 0,
      dias: totales.diasPorRamo?.[ramo.valor] ?? 0,
    })).filter((ramo) => ramo.cantidad > 0 || ramo.dias > 0),
  };
}

export const TITULO_INCAPACIDADES = 'Incapacidades del periodo';

export function tablasIncapacidades(resumen: ResumenIncapacidades | null | undefined): TablaDeInforme[] {
  if (!resumen) return [];
  return [
    {
      seccion: 'Incapacidades',
      titulo: TITULO_INCAPACIDADES,
      columnas: ['Ramo', 'Casos nuevos', 'Días de incapacidad'],
      filas: [...resumen.porRamo.map((ramo): (string | number)[] => [ramo.etiqueta, ramo.cantidad, ramo.dias]), ['Total', resumen.casos, resumen.dias]],
    },
  ];
}

export function hallazgosIncapacidades(resumen: ResumenIncapacidades | null | undefined): string[] {
  if (!resumen) return [];
  return [
    `Se registraron ${plural(resumen.casos, 'caso nuevo de incapacidad', 'casos nuevos de incapacidad')} y ${plural(resumen.dias, 'día de incapacidad', 'días de incapacidad')} en ${plural(resumen.trabajadores, 'trabajador', 'trabajadores')}` +
      (resumen.ausentismo !== null ? `; la tasa de ausentismo fue de ${resumen.ausentismo} %.` : '.'),
  ];
}
