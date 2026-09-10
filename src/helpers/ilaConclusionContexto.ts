import type { AudiometriaConcentradaLongitudinal } from '@/interfaces/documentos.inteface';
import { formatFechaHumanaIla, interpretarOidoIla } from '@/helpers/ilaInterpretacionOido';
import type { ResultadoHoElegibleIla } from '@/helpers/ilaHoElegible';
import { claveFechaClinicaIla } from '@/helpers/ilaHoElegible';

export type ChipContextoIla = { id: string; texto: string };

export type DetalleContextoIla = {
  ingreso?: string;
  empresaCentro?: string;
  hoBorrador?: boolean;
};

export type PreguntaRevisionIla = { id: string; texto: string; prioridad: number };

const MAX_PREGUNTAS_REVISION_ILA = 3;
export const AGENTE_RUIDO_CANONICO = 'Ruido';

export function fichaMarcaRuidoActual(agentes?: string[] | null): boolean {
  return (agentes || []).some((a) => String(a) === AGENTE_RUIDO_CANONICO);
}

function estudiosIncluidos(opts: {
  basal?: AudiometriaConcentradaLongitudinal | null;
  subsecuentes?: AudiometriaConcentradaLongitudinal[] | null;
}): AudiometriaConcentradaLongitudinal[] {
  const out: AudiometriaConcentradaLongitudinal[] = [];
  if (opts.basal) out.push(opts.basal);
  for (const s of opts.subsecuentes || []) {
    if (s) out.push(s);
  }
  return out;
}

export function construirChipsContextoIla(opts: {
  puesto?: string | null;
  agentesRiesgoActuales?: string[] | null;
  ho: ResultadoHoElegibleIla;
  basal?: AudiometriaConcentradaLongitudinal | null;
  subsecuentes?: AudiometriaConcentradaLongitudinal[] | null;
}): ChipContextoIla[] {
  const chips: ChipContextoIla[] = [];
  const puesto = String(opts.puesto || '').trim();
  if (puesto) {
    chips.push({ id: 'puesto', texto: `Ficha actual · puesto: ${puesto}` });
  }
  if (fichaMarcaRuidoActual(opts.agentesRiesgoActuales)) {
    chips.push({ id: 'ruidoPuesto', texto: 'Expuesto a ruido en su puesto actual' });
  }

  if (opts.ho.tipo === 'seleccionada') {
    const fechaTxt = formatFechaHumanaIla(opts.ho.historia.fechaHistoriaOtologica);
    const sufijoBorrador = opts.ho.estadoOrigen === 'borrador' ? ' · borrador' : '';
    chips.push({
      id: 'hoFecha',
      texto: `Historia otológica del ${fechaTxt}${sufijoBorrador}`,
    });
    if (opts.ho.historia.trabajoAmbientesRuidosos === 'SI') {
      chips.push({
        id: 'hoAmbientes',
        texto: `Refiere trabajo en ambientes ruidosos (HO ${fechaTxt})`,
      });
      const tiempo = String(opts.ho.historia.tiempoExposicionLaboral || '').trim();
      if (tiempo && tiempo !== 'NINGUNO') {
        chips.push({ id: 'hoTiempo', texto: tiempo });
      }
    }
  } else if (opts.ho.tipo === 'empate') {
    const fechaTxt = formatFechaHumanaIla(opts.ho.fecha);
    chips.push({
      id: 'hoEmpate',
      texto: `Varias historias otológicas del ${fechaTxt}`,
    });
  }

  const estudios = estudiosIncluidos(opts);
  const metodos = [
    ...new Set(estudios.map((e) => String(e.metodoAudiometria || '').trim()).filter(Boolean)),
  ];
  if (metodos.length === 1) {
    chips.push({ id: 'metodo', texto: `Método: ${metodos[0]}` });
  } else if (metodos.length > 1) {
    chips.push({ id: 'metodos', texto: `Métodos: ${metodos.join(' y ')}` });
  }

  for (const e of estudios) {
    const incompleto =
      e.estudioIncompleto || (Array.isArray(e.frecuenciasFaltantes) && e.frecuenciasFaltantes.length > 0);
    if (!incompleto) continue;
    const f = formatFechaHumanaIla(e.fechaAudiometria);
    chips.push({ id: `incompleto-${claveFechaClinicaIla(e.fechaAudiometria)}`, texto: `Estudio incompleto (${f})` });
  }

  return chips;
}

export function construirDetalleContextoIla(opts: {
  fechaIngreso?: string | Date | null;
  empresa?: string | null;
  centro?: string | null;
  ho: ResultadoHoElegibleIla;
}): DetalleContextoIla {
  const detalle: DetalleContextoIla = {};
  if (opts.fechaIngreso && claveFechaClinicaIla(opts.fechaIngreso)) {
    detalle.ingreso = `Ingreso: ${formatFechaHumanaIla(opts.fechaIngreso)}`;
  }
  const empresa = String(opts.empresa || '').trim();
  const centro = String(opts.centro || '').trim();
  const partes = [empresa, centro].filter(Boolean);
  if (partes.length) detalle.empresaCentro = partes.join(' · ');
  if (opts.ho.tipo === 'seleccionada' && opts.ho.estadoOrigen === 'borrador') {
    detalle.hoBorrador = true;
  }
  return detalle;
}

export function detalleContextoTieneContenido(d: DetalleContextoIla): boolean {
  return Boolean(d.ingreso || d.hoBorrador);
}

function hayCalidadIncompleta(estudios: AudiometriaConcentradaLongitudinal[]): boolean {
  return estudios.some(
    (e) =>
      Boolean(e.estudioIncompleto) ||
      (Array.isArray(e.frecuenciasFaltantes) && e.frecuenciasFaltantes.length > 0),
  );
}

function hayMetodosDistintos(estudios: AudiometriaConcentradaLongitudinal[]): boolean {
  const metodos = [
    ...new Set(estudios.map((e) => String(e.metodoAudiometria || '').trim()).filter(Boolean)),
  ];
  return metodos.length >= 2;
}

function haySenalTrayectoria(opts: {
  basal?: AudiometriaConcentradaLongitudinal | null;
  matriz?: Parameters<typeof interpretarOidoIla>[1];
}): boolean {
  if (!opts.basal) return false;
  const od = interpretarOidoIla(opts.basal, opts.matriz || [], 'Derecho');
  const oi = interpretarOidoIla(opts.basal, opts.matriz || [], 'Izquierdo');
  const fluctuacion = od.trayectoria === 'fluctuacion' || oi.trayectoria === 'fluctuacion';
  const estadoOd = String(od.estado || '');
  const estadoOi = String(oi.estado || '');
  const distintoEstado = Boolean(estadoOd && estadoOi && estadoOd !== estadoOi);
  const trayOdUtil = od.trayectoria && od.trayectoria !== 'omitir';
  const trayOiUtil = oi.trayectoria && oi.trayectoria !== 'omitir';
  const distintaTray = Boolean(trayOdUtil && trayOiUtil && od.trayectoria !== oi.trayectoria);
  return fluctuacion || distintoEstado || distintaTray;
}

export function seleccionarPreguntasRevisionIla(opts: {
  basal?: AudiometriaConcentradaLongitudinal | null;
  subsecuentes?: AudiometriaConcentradaLongitudinal[] | null;
  matriz?: Parameters<typeof interpretarOidoIla>[1];
  agentesRiesgoActuales?: string[] | null;
  ho: ResultadoHoElegibleIla;
}): PreguntaRevisionIla[] {
  const estudios = estudiosIncluidos(opts);
  const candidatas: PreguntaRevisionIla[] = [];

  if (hayCalidadIncompleta(estudios)) {
    candidatas.push({
      id: 'calidad',
      prioridad: 1,
      texto: 'Hay frecuencias no comparables en un estudio incluido. ¿Le basta para concluir?',
    });
  }
  if (haySenalTrayectoria(opts)) {
    candidatas.push({
      id: 'trayectoria',
      prioridad: 2,
      texto:
        'Las interpretaciones describen fluctuación o un patrón distinto entre oídos. ¿Requiere confirmación antes de cerrar?',
    });
  }
  if (fichaMarcaRuidoActual(opts.agentesRiesgoActuales)) {
    candidatas.push({
      id: 'ruidoFicha',
      prioridad: 3,
      texto: 'La ficha actual marca exposición a ruido en el puesto. ¿Cómo lo pondera al emitir su juicio?',
    });
  }

  if (opts.ho.tipo === 'seleccionada') {
    const fechaTxt = formatFechaHumanaIla(opts.ho.historia.fechaHistoriaOtologica);
    const siAmbientes = opts.ho.historia.trabajoAmbientesRuidosos === 'SI';
    candidatas.push({
      id: 'hoElegible',
      prioridad: 4,
      texto: siAmbientes
        ? `La historia otológica del ${fechaTxt} refiere ambientes ruidosos. ¿La considera en su juicio?`
        : `Hay una historia otológica elegible del ${fechaTxt} en el expediente. ¿La tuvo en cuenta?`,
    });
  } else if (opts.ho.tipo === 'empate') {
    const fechaTxt = formatFechaHumanaIla(opts.ho.fecha);
    candidatas.push({
      id: 'hoEmpate',
      prioridad: 4,
      texto: `Hay más de una historia otológica del ${fechaTxt} con el mismo estado. No se tomó una como referencia. ¿Desea revisarlas en el expediente antes de concluir?`,
    });
  } else {
    candidatas.push({
      id: 'sinHo',
      prioridad: 4,
      texto:
        'No se localizó una historia otológica elegible en el expediente revisado (fecha anterior o igual a la del informe y no anulada). Ello no significa que el trabajador carezca de antecedentes otológicos.',
    });
  }

  if (hayMetodosDistintos(estudios)) {
    candidatas.push({
      id: 'metodos',
      prioridad: 5,
      texto: 'Los estudios incluidos usan métodos distintos (AMA y LFT). Las escalas no se mezclan.',
    });
  }

  return candidatas.sort((a, b) => a.prioridad - b.prioridad).slice(0, MAX_PREGUNTAS_REVISION_ILA);
}
