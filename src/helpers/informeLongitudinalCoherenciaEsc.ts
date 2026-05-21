/**
 * Coherencia ESC por visita para agregación longitudinal (ILC).
 * No altera reglas del motor; solo adapta snapshots y series de tendencia.
 */
import type { EventoConcentradoCardiometabolicoEsc } from '@/interfaces/documentos.inteface';
import { CODIGO_DIAGNOSTICO_OBESIDAD } from '@/helpers/eventoSeguimientoCardiometabolicoOptions';
import {
  evaluarCoherenciaEsc,
  codigoDiagnosticoDesdeCondicion,
  tieneDiagnosticoActivo,
  type ClaveCondicionControl,
  type EscCoherenciaContexto,
  type EscFormCoherenciaInput,
  type EstadoCalculadoCondicion,
  type EstadoControlPersistido,
  type ResultadoCoherenciaCondicionControl,
  type ResultadoCoherenciaEsc,
} from '@/helpers/cardiometabolico/coherenciaClinicaEsc';

export type CondicionControlIlc = 'hipertension' | 'diabetes' | 'dislipidemia';

export const CONDICION_ILC_A_ESC: Record<CondicionControlIlc, ClaveCondicionControl> = {
  hipertension: 'hipertensionArterial',
  diabetes: 'diabetesMellitusTipo2',
  dislipidemia: 'dislipidemia',
};

export type TendenciaControl = 'MEJORIA' | 'EMPEORAMIENTO' | 'ESTABLE' | 'INSUFICIENTE';

export type CodigoControlClinicoTendencia = 'CONTROLADA' | 'NO_CONTROLADA';

function esControlPersistido(v: unknown): v is EstadoControlPersistido {
  return v === 'CONTROLADA' || v === 'NO_CONTROLADA' || v === 'NO_VALORABLE';
}

export function eventoConcentradoAEscForm(
  ev: EventoConcentradoCardiometabolicoEsc,
): EscFormCoherenciaInput {
  return {
    diagnosticosActivos: ev.diagnosticosActivos,
    signosVitales: ev.signosVitales,
    somatometria: ev.somatometria,
    laboratorio: ev.laboratorio,
    estadoCondiciones: ev.estadoCondiciones,
  };
}

export function evaluarCondicionEnEvento(
  ev: EventoConcentradoCardiometabolicoEsc,
  condicion: ClaveCondicionControl,
  ctx?: EscCoherenciaContexto,
): ResultadoCoherenciaCondicionControl {
  return evaluarCoherenciaEsc(eventoConcentradoAEscForm(ev), ctx)[condicion];
}

export function diagnosticoActivoEnEvento(
  ev: EventoConcentradoCardiometabolicoEsc,
  condicion: ClaveCondicionControl,
): boolean {
  return tieneDiagnosticoActivo(eventoConcentradoAEscForm(ev), codigoDiagnosticoDesdeCondicion(condicion));
}

export function diagnosticoObesidadEnEvento(ev: EventoConcentradoCardiometabolicoEsc): boolean {
  return tieneDiagnosticoActivo(eventoConcentradoAEscForm(ev), CODIGO_DIAGNOSTICO_OBESIDAD);
}

/** Código de vigencia en una visita (hallazgo, alteración o control). */
export function codigoEstadoVigenciaDesdeResultado(
  resultado: ResultadoCoherenciaCondicionControl,
  form: EscFormCoherenciaInput,
  condicion: ClaveCondicionControl,
): EstadoCalculadoCondicion {
  if (!resultado.diagnosticoActivo) {
    return resultado.estadoCalculado;
  }
  const manual = form.estadoCondiciones?.[condicion]?.control;
  if (resultado.controlSeleccionableManualmente && esControlPersistido(manual)) {
    return manual;
  }
  return resultado.estadoCalculado;
}

/**
 * Solo estados clínicos comparables para tendencia longitudinal (nunca NO_VALORABLE).
 */
export function codigoControlClinicoParaTendencia(
  resultado: ResultadoCoherenciaCondicionControl,
  form: EscFormCoherenciaInput,
  condicion: ClaveCondicionControl,
): CodigoControlClinicoTendencia | undefined {
  if (!resultado.diagnosticoActivo) return undefined;
  const manual = form.estadoCondiciones?.[condicion]?.control;
  if (manual === 'CONTROLADA' || manual === 'NO_CONTROLADA') return manual;
  if (resultado.estadoCalculado === 'CONTROLADA') return 'CONTROLADA';
  if (resultado.estadoCalculado === 'NO_CONTROLADA') return 'NO_CONTROLADA';
  return undefined;
}

export function estadoActualControlDesdeVisita(
  resultado: ResultadoCoherenciaCondicionControl,
  form: EscFormCoherenciaInput,
  condicion: ClaveCondicionControl,
): EstadoControlPersistido | undefined {
  if (!resultado.diagnosticoActivo) return undefined;
  const manual = form.estadoCondiciones?.[condicion]?.control;
  if (esControlPersistido(manual)) return manual;
  if (esControlPersistido(resultado.estadoCalculado)) return resultado.estadoCalculado;
  return undefined;
}

export function tendenciaControlDesdeSerie(
  serie: CodigoControlClinicoTendencia[],
): TendenciaControl {
  if (serie.length < 2) return 'INSUFICIENTE';
  const first = serie[0]!;
  const last = serie[serie.length - 1]!;
  if (first === last) return 'ESTABLE';
  if (first === 'NO_CONTROLADA' && last === 'CONTROLADA') return 'MEJORIA';
  if (first === 'CONTROLADA' && last === 'NO_CONTROLADA') return 'EMPEORAMIENTO';
  return 'INSUFICIENTE';
}

export function tendenciaControlAString(t: TendenciaControl): string | undefined {
  switch (t) {
    case 'MEJORIA':
      return 'Mejoría';
    case 'EMPEORAMIENTO':
      return 'Empeoramiento';
    case 'ESTABLE':
      return 'Estable';
    default:
      return undefined;
  }
}

export function evaluarEscEnEvento(
  ev: EventoConcentradoCardiometabolicoEsc,
  ctx?: EscCoherenciaContexto,
): ResultadoCoherenciaEsc {
  return evaluarCoherenciaEsc(eventoConcentradoAEscForm(ev), ctx);
}

export function coherenciaCtxDesdeSexo(sexo?: string | null): EscCoherenciaContexto | undefined {
  if (sexo === 'Masculino' || sexo === 'Femenino') return { sexoPaciente: sexo };
  return undefined;
}
