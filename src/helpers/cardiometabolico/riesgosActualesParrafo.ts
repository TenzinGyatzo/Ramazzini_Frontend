/**
 * Limpieza de chips y composición determinística del párrafo de riesgos actuales (Step 8).
 */
import {
  CHIP_RIESGO_CARDIOVASCULAR_ELEVADO,
  CHIP_RIESGO_CARDIOMETABOLICO_AUMENTADO,
  CHIP_SIN_RIESGOS_CARDIOMETABOLICOS,
  CHIPS_RIESGOS_ACTUALES,
} from '@/helpers/cardiometabolico/riesgosActualesFacilidades';
import {
  calcularSeveridadGlobalCardiometabolica,
  type FormularioEventoEsc,
  type NivelSeveridadGlobal,
} from '@/helpers/cardiometabolico/severidadGlobalCardiometabolica';

const CHIP_SET = new Set<string>(CHIPS_RIESGOS_ACTUALES);

/** «Sin riesgos…» coexistente con otros chips (bloquear en UI). */
export function hayConflictoChipSinRiesgos(labels: readonly string[]): boolean {
  if (!labels.includes(CHIP_SIN_RIESGOS_CARDIOMETABOLICOS)) return false;
  return labels.some((l) => l !== CHIP_SIN_RIESGOS_CARDIOMETABOLICOS);
}

export type BucketRiesgoChip =
  | 'nivel'
  | 'hallazgos'
  | 'factores'
  | 'recomendaciones'
  | 'sinRiesgo';

export type MetaChipRiesgo = {
  bucket: BucketRiesgoChip;
  /** Prioridad dentro del bucket para orden clínico global (menor = antes). */
  orden: number;
  /** Texto embedido en el párrafo (no repetir la etiqueta literal del chip si difiere). */
  fragmento?: string;
};

/** Metadatos por etiqueta exacta de chip (deterministico). */
export const META_CHIPS_RIESGO_PARRAFO: Record<string, MetaChipRiesgo> = {
  [CHIP_RIESGO_CARDIOMETABOLICO_AUMENTADO]: { bucket: 'nivel', orden: 0 },
  [CHIP_RIESGO_CARDIOVASCULAR_ELEVADO]: { bucket: 'nivel', orden: 1 },
  'Cifras tensionales elevadas durante la valoración': {
    bucket: 'hallazgos',
    orden: 1,
    fragmento: 'elevación de cifras tensionales',
  },
  'Descontrol glucémico probable': {
    bucket: 'hallazgos',
    orden: 2,
    fragmento: 'descontrol glucémico probable',
  },
  'Perfil lipídico alterado': {
    bucket: 'hallazgos',
    orden: 3,
    fragmento: 'alteraciones en el perfil lipídico',
  },
  'Riesgo asociado a obesidad': {
    bucket: 'factores',
    orden: 4,
    fragmento: 'obesidad',
  },
  'Riesgo asociado a circunferencia de cintura elevada': {
    bucket: 'factores',
    orden: 5,
    fragmento: 'circunferencia de cintura elevada',
  },
  'Riesgo asociado a adherencia terapéutica deficiente': {
    bucket: 'factores',
    orden: 6,
    fragmento: 'adherencia terapéutica deficiente',
  },
  'Riesgo asociado a sedentarismo': {
    bucket: 'factores',
    orden: 7,
    fragmento: 'sedentarismo',
  },
  'Requiere seguimiento médico estrecho': {
    bucket: 'recomendaciones',
    orden: 8,
    fragmento: 'seguimiento médico estrecho',
  },
  'Requiere control con médico tratante': {
    bucket: 'recomendaciones',
    orden: 9,
    fragmento: 'control con médico tratante',
  },
  [CHIP_SIN_RIESGOS_CARDIOMETABOLICOS]: { bucket: 'sinRiesgo', orden: 99 },
};

function unirListaEspanol(partes: string[]): string {
  const p = partes.filter(Boolean);
  if (p.length === 0) return '';
  if (p.length === 1) return p[0];
  if (p.length === 2) return `${p[0]} y ${p[1]}`;
  return `${p.slice(0, -1).join(', ')} y ${p[p.length - 1]}`;
}

/**
 * Quita duplicados exactos, elimina «Sin riesgos…» si coexisten otros chips,
 * fusiona nivel cardiometabólico + cardiovascular en uno solo.
 */
export function limpiarChipsRiesgosParaParrafo(labelsEnOrden: readonly string[]): string[] {
  const conocidos = labelsEnOrden.filter((l) => CHIP_SET.has(l));
  const unicos = [...new Set(conocidos)];

  const otros = unicos.filter((l) => l !== CHIP_SIN_RIESGOS_CARDIOMETABOLICOS);
  let base =
    otros.length > 0 ? otros : unicos.filter((l) => l === CHIP_SIN_RIESGOS_CARDIOMETABOLICOS);

  const tieneNivelCardio =
    base.includes(CHIP_RIESGO_CARDIOMETABOLICO_AUMENTADO) &&
    base.includes(CHIP_RIESGO_CARDIOVASCULAR_ELEVADO);
  if (tieneNivelCardio) {
    base = base.filter((l) => l !== CHIP_RIESGO_CARDIOVASCULAR_ELEVADO);
  }

  return [...base].sort((a, b) => {
    const ma = META_CHIPS_RIESGO_PARRAFO[a]?.orden ?? 50;
    const mb = META_CHIPS_RIESGO_PARRAFO[b]?.orden ?? 50;
    if (ma !== mb) return ma - mb;
    return labelsEnOrden.indexOf(a) - labelsEnOrden.indexOf(b);
  });
}

function aperturaSegunSeveridad(nivel: NivelSeveridadGlobal): string {
  switch (nivel) {
    case 'ALTO':
      return 'Se identifica riesgo cardiometabólico alto';
    case 'MODERADO':
      return 'Se identifica riesgo cardiometabólico moderado';
    case 'BAJO':
      return 'En esta valoración no se documentan riesgos cardiometabólicos relevantes';
    case 'NO_VALORABLE':
      return 'La información disponible es insuficiente para establecer un nivel global de riesgo cardiometabólico';
    default:
      return 'La información disponible es insuficiente para establecer un nivel global de riesgo cardiometabólico';
  }
}

export type GenerarParrafoRiesgosParams = {
  formData: FormularioEventoEsc | undefined;
  /** Chips seleccionados en orden UI (antes de limpiar). */
  labelsSeleccionadas: readonly string[];
};

/**
 * Devuelve `null` si no hay chips conocidos tras limpiar (no debería ocurrir si el botón exige selección).
 */
export function generarParrafoRiesgosActuales(p: GenerarParrafoRiesgosParams): string | null {
  const limpios = limpiarChipsRiesgosParaParrafo(p.labelsSeleccionadas);
  if (limpios.length === 0) return null;

  const soloSinRiesgos =
    limpios.length === 1 && limpios[0] === CHIP_SIN_RIESGOS_CARDIOMETABOLICOS;
  if (soloSinRiesgos) {
    return `${aperturaSegunSeveridad('BAJO')}.`;
  }

  const sev = calcularSeveridadGlobalCardiometabolica(p.formData, limpios);

  if (sev.perfilChipsSinObjetivos && sev.nivel === 'MODERADO') {
    const partes: string[] = [
      'Con la información disponible se identifican elementos que sugieren riesgo cardiometabólico, por lo que se recomienda completar valoración y dar seguimiento.',
    ];
    const narrativa = construirCuerpoDesdeChips(limpios, true);
    if (narrativa) partes.push(narrativa);
    return partes.join(' ');
  }

  if (sev.nivel === 'NO_VALORABLE') {
    return `${aperturaSegunSeveridad('NO_VALORABLE')}. Se recomienda completar la valoración con signos vitales, somatometría y laboratorios disponibles.`;
  }

  const cuerpo = construirCuerpoDesdeChips(limpios, false);
  const opening = aperturaSegunSeveridad(sev.nivel);
  if (!cuerpo) return `${opening}.`;
  return `${opening}${cuerpo}`;
}

function ordenFragmentoHallazgo(fragmento: string): number {
  const entry = Object.entries(META_CHIPS_RIESGO_PARRAFO).find(
    ([, v]) => v.bucket === 'hallazgos' && v.fragmento === fragmento,
  );
  return entry?.[1]?.orden ?? 99;
}

function ordenFactor(fragmento: string): number {
  const entry = Object.entries(META_CHIPS_RIESGO_PARRAFO).find(
    ([, v]) => v.bucket === 'factores' && v.fragmento === fragmento,
  );
  return entry?.[1]?.orden ?? 99;
}

function ordenRecomendacion(fragmento: string): number {
  const entry = Object.entries(META_CHIPS_RIESGO_PARRAFO).find(
    ([, v]) => v.bucket === 'recomendaciones' && v.fragmento === fragmento,
  );
  return entry?.[1]?.orden ?? 99;
}

function construirCuerpoDesdeChips(limpios: string[], prudentSinObjetivos: boolean): string {
  const hallazgos: string[] = [];
  const factores: string[] = [];
  const recomendaciones: string[] = [];

  for (const etiqueta of limpios) {
    if (etiqueta === CHIP_SIN_RIESGOS_CARDIOMETABOLICOS) continue;
    const meta = META_CHIPS_RIESGO_PARRAFO[etiqueta];
    if (!meta?.fragmento) continue;
    if (meta.bucket === 'hallazgos') hallazgos.push(meta.fragmento);
    else if (meta.bucket === 'factores') factores.push(meta.fragmento);
    else if (meta.bucket === 'recomendaciones') recomendaciones.push(meta.fragmento);
  }

  const h = [...new Set(hallazgos)].sort((a, b) => ordenFragmentoHallazgo(a) - ordenFragmentoHallazgo(b));
  const f = [...new Set(factores)].sort((a, b) => ordenFactor(a) - ordenFactor(b));
  const r = [...new Set(recomendaciones)].sort((a, b) => ordenRecomendacion(a) - ordenRecomendacion(b));

  if (prudentSinObjetivos) {
    const bloques: string[] = [];
    if (h.length) bloques.push(`Se describen ${unirListaEspanol(h)}.`);
    if (f.length) bloques.push(`El riesgo se asocia a ${unirListaEspanol(f)}.`);
    if (r.length) bloques.push(`Se recomienda ${unirListaEspanol(r)}.`);
    return bloques.join(' ');
  }

  if (h.length === 0 && f.length === 0 && r.length === 0) return '';

  let tail = '';
  if (h.length) tail += `, con ${unirListaEspanol(h)}`;
  tail += '.';
  if (f.length) tail += ` El riesgo se asocia a ${unirListaEspanol(f)}.`;
  if (r.length) tail += ` Se recomienda ${unirListaEspanol(r)}.`;
  return tail.trim();
}
