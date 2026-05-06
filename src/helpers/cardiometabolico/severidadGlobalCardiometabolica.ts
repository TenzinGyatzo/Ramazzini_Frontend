/**
 * Severidad global derivada solo en frontend (no persistida).
 * Orden de evaluación: A datos mínimos → B ALTO → C MODERADO → D BAJO → E NO_VALORABLE.
 * Sin IA; reglas explícitas y auditables (plan Step 8).
 */
import type { EventoSeguimientoCardiometabolico } from '@/interfaces/documentos.inteface';
import {
  CHIP_RIESGO_CARDIOVASCULAR_ELEVADO,
  CHIP_RIESGO_CARDIOMETABOLICO_AUMENTADO,
  CHIP_SIN_RIESGOS_CARDIOMETABOLICOS,
} from '@/helpers/cardiometabolico/riesgosActualesFacilidades';

/** Datos del evento tal como llegan del store (sin garantizar `_id`, etc.). */
export type FormularioEventoEsc = Partial<EventoSeguimientoCardiometabolico>;

export type NivelSeveridadGlobal = 'BAJO' | 'MODERADO' | 'ALTO' | 'NO_VALORABLE';

/** Síntomas que fuerzan ALTO si aparecen en `sintomasRelevantes` (match controlado). */
export const SINTOMAS_ALARMA_CARDIOMETABOLICOS = [
  'Dolor torácico',
  'Disnea',
  'Síncope',
  'Palpitaciones intensas',
  'Déficit neurológico focal',
  'Alteración del estado de conciencia',
] as const;

/** No elevan solos a ALTO; pueden apoyar MODERADO con objetivos o otros factores. */
export const SINTOMAS_RELEVANTES_CARDIOMETABOLICOS = [
  'Cefalea',
  'Mareo',
  'Fatiga',
  'Visión borrosa',
  'Poliuria',
  'Polidipsia',
  'Parestesias',
  'Edema en miembros inferiores',
] as const;

/** Variantes UI (Step 6); palpitaciones simples no equivalen a «Palpitaciones intensas». */
const PALPITACIONES_CHIP_UI = 'Palpitaciones';

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/** Determina si `sintomasRaw` contiene una frase de alarma (lista cerrada). */
export function sintomasContienenAlarma(sintomasRaw: string | undefined): boolean {
  if (sintomasRaw == null || String(sintomasRaw).trim() === '') return false;
  const folded = fold(String(sintomasRaw));

  for (const frase of SINTOMAS_ALARMA_CARDIOMETABOLICOS) {
    const f = fold(frase);
    if (f === fold(PALPITACIONES_CHIP_UI)) continue;
    if (folded.includes(f)) return true;
  }

  const tienePalpitaciones =
    folded.includes(fold(PALPITACIONES_CHIP_UI)) || folded.includes('palpitaciones');
  const intensas =
    folded.includes(' intensas') ||
    folded.includes(' intensa') ||
    folded.includes('palpitaciones intensas');
  if (tienePalpitaciones && intensas) return true;

  return false;
}

/** Match de síntomas relevantes no alarmantes (lista cerrada). */
export function sintomasContienenRelevanteNoAlarma(sintomasRaw: string | undefined): boolean {
  if (sintomasRaw == null || String(sintomasRaw).trim() === '') return false;
  const folded = fold(String(sintomasRaw));

  for (const frase of SINTOMAS_RELEVANTES_CARDIOMETABOLICOS) {
    if (folded.includes(fold(frase))) return true;
  }

  if (folded.includes(fold(PALPITACIONES_CHIP_UI)) || folded.includes('palpitaciones')) return true;

  return false;
}

function tieneLaboratorioRelevante(fd: FormularioEventoEsc): boolean {
  const L = fd.laboratorio;
  if (!L) return false;
  const keys: (keyof typeof L)[] = [
    'glucosaMgDl',
    'hba1cPorcentaje',
    'colesterolTotalMgDl',
    'ldlMgDl',
    'hdlMgDl',
    'trigliceridosMgDl',
  ];
  return keys.some((k) => L[k] != null && typeof L[k] === 'number' && !Number.isNaN(L[k] as number));
}

/** Una condición «valorada» en estadoCondiciones (control o grado de obesidad). */
function tieneEstadoCondicionValorada(fd: FormularioEventoEsc): boolean {
  const ec = fd.estadoCondiciones;
  if (!ec) return false;
  const ha = ec.hipertensionArterial?.control;
  const dm = ec.diabetesMellitusTipo2?.control;
  const dis = ec.dislipidemia?.control;
  const ob = ec.obesidad?.grado;
  return (
    (ha != null && ha !== '') ||
    (dm != null && dm !== '') ||
    (dis != null && dis !== '') ||
    (ob != null && ob !== '')
  );
}

/**
 * Criterio § plan: hay base para estimar si existe al menos uno de los datos listados.
 */
export function hayDatosMinimosParaSeveridad(fd: FormularioEventoEsc | undefined): boolean {
  if (!fd) return false;

  const sv = fd.signosVitales;
  if (
    (sv?.tensionArterialSistolica != null && !Number.isNaN(Number(sv.tensionArterialSistolica))) ||
    (sv?.tensionArterialDiastolica != null && !Number.isNaN(Number(sv.tensionArterialDiastolica)))
  ) {
    return true;
  }

  const som = fd.somatometria;
  if (som != null) {
    if (som.indiceMasaCorporal != null && !Number.isNaN(Number(som.indiceMasaCorporal))) return true;
    if (som.categoriaIMC != null && String(som.categoriaIMC).trim() !== '') return true;
    if (som.circunferenciaCintura != null && !Number.isNaN(Number(som.circunferenciaCintura))) return true;
    if (som.categoriaCircunferenciaCintura != null && String(som.categoriaCircunferenciaCintura).trim() !== '')
      return true;
  }

  if (tieneLaboratorioRelevante(fd)) return true;

  if (tieneEstadoCondicionValorada(fd)) return true;

  const sint = fd.sintomasRelevantes;
  if (sint != null && String(sint).trim() !== '') {
    return true;
  }

  const adh = fd.adherenciaTerapeutica;
  if (adh != null && String(adh).trim() !== '') return true;

  return false;
}

const CHIPS_FRASE_ALTO_USUARIO = new Set<string>([
  CHIP_RIESGO_CARDIOMETABOLICO_AUMENTADO,
  CHIP_RIESGO_CARDIOVASCULAR_ELEVADO,
]);

export function chipsAltoRiesgoUsuarioSeleccionados(labels: readonly string[]): boolean {
  return labels.some((l) => CHIPS_FRASE_ALTO_USUARIO.has(l));
}

/** Chips que sugieren riesgo distinto de «sin riesgos documentados». */
export function chipsSugierenRiesgo(labels: readonly string[]): boolean {
  return labels.some((l) => l !== CHIP_SIN_RIESGOS_CARDIOMETABOLICOS);
}

export function soloChipSinRiesgos(labels: readonly string[]): boolean {
  return labels.length === 1 && labels[0] === CHIP_SIN_RIESGOS_CARDIOMETABOLICOS;
}

function glucosa(fd: FormularioEventoEsc): number | undefined {
  const g = fd.laboratorio?.glucosaMgDl;
  return g != null && !Number.isNaN(Number(g)) ? Number(g) : undefined;
}

function hba1c(fd: FormularioEventoEsc): number | undefined {
  const h = fd.laboratorio?.hba1cPorcentaje;
  return h != null && !Number.isNaN(Number(h)) ? Number(h) : undefined;
}

function ldl(fd: FormularioEventoEsc): number | undefined {
  const x = fd.laboratorio?.ldlMgDl;
  return x != null && !Number.isNaN(Number(x)) ? Number(x) : undefined;
}

function trigliceridos(fd: FormularioEventoEsc): number | undefined {
  const x = fd.laboratorio?.trigliceridosMgDl;
  return x != null && !Number.isNaN(Number(x)) ? Number(x) : undefined;
}

function tension(fd: FormularioEventoEsc): { sys?: number; dias?: number } {
  const sv = fd.signosVitales;
  const sys =
    sv?.tensionArterialSistolica != null && !Number.isNaN(Number(sv.tensionArterialSistolica))
      ? Number(sv.tensionArterialSistolica)
      : undefined;
  const dias =
    sv?.tensionArterialDiastolica != null && !Number.isNaN(Number(sv.tensionArterialDiastolica))
      ? Number(sv.tensionArterialDiastolica)
      : undefined;
  return { sys, dias };
}

function categoriaTaGradoNumerico(fd: FormularioEventoEsc): number {
  const cat = fd.signosVitales?.categoriaTensionArterial;
  if (!cat) return 0;
  if (cat.includes('grado 3')) return 3;
  if (cat.includes('grado 2')) return 2;
  if (cat.includes('grado 1')) return 1;
  return 0;
}

function adherenciaIrregular(fd: FormularioEventoEsc): boolean {
  const a = fd.adherenciaTerapeutica;
  if (a == null || String(a).trim() === '') return false;
  const f = fold(String(a));
  return (
    f.includes('irregular') ||
    f.includes('mala adherencia') ||
    f.includes('olvido') ||
    f.includes('suspension voluntaria') ||
    f.includes('suspensión voluntaria') ||
    f.includes('no cuenta con tratamiento') ||
    f.includes('desconoce nombre') ||
    f.includes('apego parcial') ||
    f.includes('no realiza actividad fisica') ||
    f.includes('no realiza actividad física')
  );
}

function obesidadPresente(fd: FormularioEventoEsc): boolean {
  const dx = fd.diagnosticosActivos ?? [];
  if (dx.some((c) => c === 'OBESIDAD')) return true;
  const grado = fd.estadoCondiciones?.obesidad?.grado;
  if (grado != null && grado !== '') return true;
  const cat = fd.somatometria?.categoriaIMC ?? '';
  const c = String(cat);
  return c.includes('Obesidad') || c.includes('obesidad');
}

function cinturaElevada(fd: FormularioEventoEsc): boolean {
  const cc = fd.somatometria?.categoriaCircunferenciaCintura ?? '';
  const s = String(cc).toLowerCase();
  if (s.includes('elev') || s.includes('alto')) return true;
  return false;
}

function condicionesNoControladasCount(fd: FormularioEventoEsc): number {
  const ec = fd.estadoCondiciones;
  if (!ec) return 0;
  let n = 0;
  const chk = (c?: string) => (c === 'NO_CONTROLADA' ? 1 : 0);
  n += chk(ec.hipertensionArterial?.control);
  n += chk(ec.diabetesMellitusTipo2?.control);
  n += chk(ec.dislipidemia?.control);
  return n;
}

function criterioAltoLaboratorio(fd: FormularioEventoEsc): boolean {
  const g = glucosa(fd);
  if (g != null && g >= 300) return true;
  const hb = hba1c(fd);
  if (hb != null && hb >= 9) return true;
  const l = ldl(fd);
  if (l != null && l >= 190) return true;
  const t = trigliceridos(fd);
  if (t != null && t >= 500) return true;
  return false;
}

function criterioAltoTension(fd: FormularioEventoEsc): boolean {
  const { sys, dias } = tension(fd);
  if (sys != null && sys >= 160) return true;
  if (dias != null && dias >= 100) return true;
  return categoriaTaGradoNumerico(fd) >= 2;
}

function criterioModeradoLaboratorio(fd: FormularioEventoEsc): boolean {
  const g = glucosa(fd);
  if (g != null && g >= 126 && g < 300) return true;
  const hb = hba1c(fd);
  if (hb != null && hb >= 6.5 && hb < 9) return true;
  const l = ldl(fd);
  if (l != null && l >= 130 && l < 190) return true;
  const t = trigliceridos(fd);
  if (t != null && t >= 200 && t < 500) return true;
  return false;
}

function criterioModeradoTension(fd: FormularioEventoEsc): boolean {
  const { sys, dias } = tension(fd);
  const grado = categoriaTaGradoNumerico(fd);
  if (grado === 1) return true;
  if (sys != null && dias != null) {
    if (sys >= 130 && sys <= 159 && dias < 100) return true;
    if (dias >= 80 && dias <= 99 && sys < 160) return true;
  }
  return false;
}

export type ResultadoSeveridadCardiometabolica = {
  nivel: NivelSeveridadGlobal;
  /** Sin datos mínimos pero el usuario marcó chips de riesgo: cap de ALTO y texto prudente § plan. */
  perfilChipsSinObjetivos: boolean;
};

/**
 * Calcula severidad global. `labelsRiesgosActuales` = chips Step 8 seleccionados (limpios).
 */
export function calcularSeveridadGlobalCardiometabolica(
  fd: FormularioEventoEsc | undefined,
  labelsRiesgosActuales: readonly string[],
): ResultadoSeveridadCardiometabolica {
  if (!fd) {
    if (soloChipSinRiesgos(labelsRiesgosActuales))
      return { nivel: 'BAJO', perfilChipsSinObjetivos: false };
    if (chipsSugierenRiesgo(labelsRiesgosActuales))
      return { nivel: 'MODERADO', perfilChipsSinObjetivos: true };
    return { nivel: 'NO_VALORABLE', perfilChipsSinObjetivos: false };
  }

  if (soloChipSinRiesgos(labelsRiesgosActuales)) {
    return { nivel: 'BAJO', perfilChipsSinObjetivos: false };
  }

  const datosMin = hayDatosMinimosParaSeveridad(fd);
  const perfilChipsSinObjetivos = !datosMin && chipsSugierenRiesgo(labelsRiesgosActuales);

  if (!datosMin && !chipsSugierenRiesgo(labelsRiesgosActuales)) {
    return { nivel: 'NO_VALORABLE', perfilChipsSinObjetivos: false };
  }

  if (!datosMin && chipsSugierenRiesgo(labelsRiesgosActuales)) {
    return { nivel: 'MODERADO', perfilChipsSinObjetivos: true };
  }

  const sintomasRaw = fd.sintomasRelevantes;

  // B: ALTO (con datos objetivos mínimos ya garantizados)
  if (sintomasContienenAlarma(sintomasRaw)) {
    return { nivel: 'ALTO', perfilChipsSinObjetivos: false };
  }

  if (criterioAltoLaboratorio(fd)) return { nivel: 'ALTO', perfilChipsSinObjetivos: false };
  if (criterioAltoTension(fd)) return { nivel: 'ALTO', perfilChipsSinObjetivos: false };

  const nc = condicionesNoControladasCount(fd);
  if (nc >= 2) return { nivel: 'ALTO', perfilChipsSinObjetivos: false };

  // C: MODERADO
  let factoresModerados = 0;
  if (criterioModeradoLaboratorio(fd)) factoresModerados += 1;
  if (criterioModeradoTension(fd)) factoresModerados += 1;
  if (obesidadPresente(fd)) factoresModerados += 1;
  if (cinturaElevada(fd)) factoresModerados += 1;
  if (fd.estadoCondiciones?.dislipidemia?.control === 'NO_CONTROLADA') factoresModerados += 1;
  if (adherenciaIrregular(fd)) factoresModerados += 1;
  if (nc === 1) factoresModerados += 1;

  const sintNoAlarma = sintomasContienenRelevanteNoAlarma(sintomasRaw);
  const hayAlteracionObj =
    criterioModeradoLaboratorio(fd) ||
    criterioModeradoTension(fd) ||
    obesidadPresente(fd) ||
    cinturaElevada(fd) ||
    nc >= 1 ||
    fd.estadoCondiciones?.dislipidemia?.control === 'NO_CONTROLADA';

  if (sintNoAlarma && hayAlteracionObj) factoresModerados += 1;
  else if (sintNoAlarma && factoresModerados >= 2) factoresModerados += 1;

  if (obesidadPresente(fd) && cinturaElevada(fd) && adherenciaIrregular(fd)) {
    return { nivel: 'MODERADO', perfilChipsSinObjetivos: false };
  }

  if (
    factoresModerados >= 2 ||
    criterioModeradoLaboratorio(fd) ||
    criterioModeradoTension(fd)
  ) {
    return { nivel: 'MODERADO', perfilChipsSinObjetivos: false };
  }

  if (sintNoAlarma && !hayAlteracionObj && factoresModerados <= 1) {
    return { nivel: 'BAJO', perfilChipsSinObjetivos: false };
  }

  // D: BAJO
  const labsWorrisome =
    criterioModeradoLaboratorio(fd) ||
    criterioAltoLaboratorio(fd) ||
    criterioModeradoTension(fd) ||
    criterioAltoTension(fd);

  if (!labsWorrisome && nc === 0 && !adherenciaIrregular(fd)) {
    return { nivel: 'BAJO', perfilChipsSinObjetivos: false };
  }

  if (
    !labsWorrisome &&
    fd.estadoCondiciones?.hipertensionArterial?.control === 'CONTROLADA' &&
    fd.estadoCondiciones?.diabetesMellitusTipo2?.control === 'CONTROLADA' &&
    fd.estadoCondiciones?.dislipidemia?.control === 'CONTROLADA'
  ) {
    return { nivel: 'BAJO', perfilChipsSinObjetivos: false };
  }

  return { nivel: 'MODERADO', perfilChipsSinObjetivos: false };
}
