/**
 * Motor de coherencia clínica para Evento Seguimiento Cardiometabólico (ESC).
 * Estados calculados no se persisten; solo orientan UI y validación de envío.
 */
import {
  CODIGO_DIAGNOSTICO_OBESIDAD,
  GRADO_OBESIDAD_OPTS,
} from '@/helpers/eventoSeguimientoCardiometabolicoOptions';
import {
  clasificarGlucosa,
  clasificarHbA1c,
  clasificarHDL,
  clasificarLDL,
  clasificarTrigliceridos,
  clasificarColesterolTotal,
} from '@/helpers/cardiometabolico/laboratorioCategorias';

/** Persistido en BD */
export type EstadoControlPersistido = 'CONTROLADA' | 'NO_CONTROLADA' | 'NO_VALORABLE';

/** HTA, DM2, dislipidemia — solo UI */
export type EstadoCalculadoCondicion =
  | EstadoControlPersistido
  | 'SIN_DIAGNOSTICO_ACTIVO'
  | 'HALLAZGO_COMPATIBLE'
  | 'ALTERACION_DOCUMENTADA';

export type EstadoCalculadoObesidad =
  | 'SIN_OBESIDAD'
  | 'SOBREPESO'
  | 'OBESIDAD_I'
  | 'OBESIDAD_II'
  | 'OBESIDAD_III'
  | 'NO_VALORABLE';

export type AccionSugeridaAdvertencia =
  | 'NINGUNA'
  | 'REVISAR'
  | 'CORREGIR'
  | 'MARCAR_DIAGNOSTICO_ACTIVO';

export type ClaveCondicionControl = 'hipertensionArterial' | 'diabetesMellitusTipo2' | 'dislipidemia';

export interface EscCoherenciaContexto {
  sexoPaciente?: 'Masculino' | 'Femenino';
}

export const MAPA_DIAGNOSTICO_A_CONDICION: Record<string, ClaveCondicionControl | 'obesidad'> = {
  HIPERTENSION_ARTERIAL: 'hipertensionArterial',
  DIABETES_MELLITUS_TIPO_2: 'diabetesMellitusTipo2',
  DISLIPIDEMIA: 'dislipidemia',
  OBESIDAD: 'obesidad',
};

export const CONDICIONES_CON_CONTROL: ClaveCondicionControl[] = [
  'hipertensionArterial',
  'diabetesMellitusTipo2',
  'dislipidemia',
];

const TODOS_ESTADOS_CONTROL: EstadoControlPersistido[] = [
  'CONTROLADA',
  'NO_CONTROLADA',
  'NO_VALORABLE',
];

/** Únicos valores que el usuario puede elegir en Step 8 (con dx y datos objetivos). */
export const ESTADOS_CONTROL_SELECCION_MANUAL: EstadoControlPersistido[] = [
  'CONTROLADA',
  'NO_CONTROLADA',
];

export interface AdvertenciaCoherencia {
  codigo: string;
  severidad: 'info' | 'warning' | 'error';
  mensaje: string;
  accionSugerida: AccionSugeridaAdvertencia;
}

export interface EscFormCoherenciaInput {
  diagnosticosActivos?: string[];
  signosVitales?: {
    tensionArterialSistolica?: number;
    tensionArterialDiastolica?: number;
    categoriaTensionArterial?: string;
  };
  somatometria?: {
    indiceMasaCorporal?: number;
    categoriaIMC?: string;
  };
  laboratorio?: {
    glucosaMgDl?: number;
    categoriaGlucosa?: string;
    hba1cPorcentaje?: number;
    categoriaHbA1c?: string;
    ldlMgDl?: number;
    categoriaLDL?: string;
    trigliceridosMgDl?: number;
    categoriaTrigliceridos?: string;
    colesterolTotalMgDl?: number;
    categoriaColesterolTotal?: string;
    hdlMgDl?: number;
    categoriaHDL?: string;
  };
  estadoCondiciones?: {
    hipertensionArterial?: { control?: string };
    diabetesMellitusTipo2?: { control?: string };
    dislipidemia?: { control?: string };
    obesidad?: { grado?: string };
  };
}

export interface ResultadoCoherenciaCondicionControl {
  condicion: ClaveCondicionControl;
  diagnosticoActivo: boolean;
  estadoCalculado: EstadoCalculadoCondicion;
  estadoManualActual?: EstadoControlPersistido;
  controlSeleccionableManualmente: boolean;
  estadosPermitidos: EstadoControlPersistido[];
  estadosBloqueados: EstadoControlPersistido[];
  advertencias: AdvertenciaCoherencia[];
  razon: string;
  detalleObjetivo?: string;
  /**
   * Si false con `NO_VALORABLE`, no escribir `control` automático
   * (p. ej. rango glucémico intermedio con dx). Por defecto true.
   */
  persistirControlAutomatico?: boolean;
}

export interface ResultadoCoherenciaObesidad {
  condicion: 'obesidad';
  diagnosticoActivo: boolean;
  estadoCalculado: EstadoCalculadoObesidad;
  gradoPersistido?: string;
  advertencias: AdvertenciaCoherencia[];
  razon: string;
  detalleObjetivo?: string;
}

export interface ResultadoCoherenciaEsc {
  hipertensionArterial: ResultadoCoherenciaCondicionControl;
  diabetesMellitusTipo2: ResultadoCoherenciaCondicionControl;
  dislipidemia: ResultadoCoherenciaCondicionControl;
  obesidad: ResultadoCoherenciaObesidad;
  advertenciasGlobales: AdvertenciaCoherencia[];
}

function adv(
  codigo: string,
  severidad: AdvertenciaCoherencia['severidad'],
  mensaje: string,
  accionSugerida: AccionSugeridaAdvertencia,
): AdvertenciaCoherencia {
  return { codigo, severidad, mensaje, accionSugerida };
}

function esEstadoControlPersistido(v: unknown): v is EstadoControlPersistido {
  return v === 'CONTROLADA' || v === 'NO_CONTROLADA' || v === 'NO_VALORABLE';
}

function esEstadoSinControlPersistido(estado: EstadoCalculadoCondicion): boolean {
  return (
    estado === 'SIN_DIAGNOSTICO_ACTIVO' ||
    estado === 'HALLAZGO_COMPATIBLE' ||
    estado === 'ALTERACION_DOCUMENTADA'
  );
}

export function tieneDiagnosticoActivo(form: EscFormCoherenciaInput, codigo: string): boolean {
  const arr = form.diagnosticosActivos;
  return Array.isArray(arr) && arr.includes(codigo);
}

function controlManual(
  form: EscFormCoherenciaInput,
  condicion: ClaveCondicionControl,
): EstadoControlPersistido | undefined {
  const c = form.estadoCondiciones?.[condicion]?.control;
  return esEstadoControlPersistido(c) ? c : undefined;
}

function esEstadoControlValorado(estado: EstadoCalculadoCondicion): boolean {
  return estado === 'CONTROLADA' || estado === 'NO_CONTROLADA';
}

interface PermisosControlOpts {
  /** Con dx y `NO_VALORABLE` calculado: permite elegir control sin auto-persistir NO_VALORABLE. */
  permitirSeleccionManualConNoValorables?: boolean;
}

function permisosControlCondicion(
  diagnosticoActivo: boolean,
  estadoCalculado: EstadoCalculadoCondicion,
  opts?: PermisosControlOpts,
): Pick<
  ResultadoCoherenciaCondicionControl,
  'controlSeleccionableManualmente' | 'estadosPermitidos' | 'estadosBloqueados'
> {
  if (!diagnosticoActivo) {
    return {
      controlSeleccionableManualmente: false,
      estadosPermitidos: [],
      estadosBloqueados: [...TODOS_ESTADOS_CONTROL],
    };
  }
  if (estadoCalculado === 'CONTROLADA') {
    return {
      controlSeleccionableManualmente: false,
      estadosPermitidos: [],
      estadosBloqueados: [...TODOS_ESTADOS_CONTROL],
    };
  }
  if (
    estadoCalculado === 'NO_CONTROLADA' ||
    (opts?.permitirSeleccionManualConNoValorables && estadoCalculado === 'NO_VALORABLE')
  ) {
    return {
      controlSeleccionableManualmente: true,
      estadosPermitidos: [...ESTADOS_CONTROL_SELECCION_MANUAL],
      estadosBloqueados: ['NO_VALORABLE'],
    };
  }
  return {
    controlSeleccionableManualmente: false,
    estadosPermitidos: [],
    estadosBloqueados: [...TODOS_ESTADOS_CONTROL],
  };
}

function advertenciaControlHuerfano(manual?: EstadoControlPersistido): AdvertenciaCoherencia | null {
  if (!manual) return null;
  return adv(
    'CONTROL_SIN_DIAGNOSTICO',
    'error',
    'Existe valoración de control sin diagnóstico activo; se eliminará al guardar.',
    'CORREGIR',
  );
}

function advertenciaContradiccion(
  manual: EstadoControlPersistido,
  sugerido: EstadoCalculadoCondicion,
): AdvertenciaCoherencia | null {
  if (!esEstadoControlPersistido(sugerido)) return null;
  if (manual === sugerido) return null;
  return adv(
    'CONTROL_CONTRADICE_OBJETIVO',
    'warning',
    'Tu selección difiere de lo que sugieren los datos de esta visita. Mantén esta valoración solo si cumple la meta terapéutica del paciente.',
    'REVISAR',
  );
}

export function advertenciaMarcarDiagnostico(codigo: string, mensaje: string): AdvertenciaCoherencia {
  return adv(codigo, 'warning', mensaje, 'MARCAR_DIAGNOSTICO_ACTIVO');
}

const MAPA_CONDICION_A_DIAGNOSTICO: Record<ClaveCondicionControl, string> = {
  hipertensionArterial: 'HIPERTENSION_ARTERIAL',
  diabetesMellitusTipo2: 'DIABETES_MELLITUS_TIPO_2',
  dislipidemia: 'DISLIPIDEMIA',
};

export function codigoDiagnosticoDesdeCondicion(condicion: ClaveCondicionControl): string {
  return MAPA_CONDICION_A_DIAGNOSTICO[condicion];
}

/** Añade diagnóstico activo sin auto-valorar control ni modificar datos objetivos. */
export function marcarDiagnosticoActivoEsc(
  form: EscFormCoherenciaInput,
  condicion: ClaveCondicionControl,
  ctx?: EscCoherenciaContexto,
): void {
  const codigo = codigoDiagnosticoDesdeCondicion(condicion);
  if (!form.diagnosticosActivos) form.diagnosticosActivos = [];
  if (!form.diagnosticosActivos.includes(codigo)) {
    form.diagnosticosActivos.push(codigo);
  }
  sincronizarEstadoControlAutomatico(form, ctx);
}

function tieneTensionArterialCompleta(sv: EscFormCoherenciaInput['signosVitales']): boolean {
  if (!sv) return false;
  const s = sv.tensionArterialSistolica;
  const d = sv.tensionArterialDiastolica;
  return typeof s === 'number' && !Number.isNaN(s) && typeof d === 'number' && !Number.isNaN(d);
}

function categoriaTaHipertensionGrado(cat: string): boolean {
  return /Hipertensión grado [123]/i.test(cat);
}

/** Sin dx: TA «Alta» o grado HTA → hallazgo compatible (no alteración documentada). */
function categoriaTaElevadaSinDx(cat: string): boolean {
  return cat === 'Alta' || categoriaTaHipertensionGrado(cat);
}

const RAZON_TA_HALLAZGO_SIN_DX =
  'TA elevada en esta visita; una medición aislada no confirma diagnóstico. Se recomienda vigilancia o nueva toma.';

function categoriaTaDesfavorable(cat: string): boolean {
  if (!cat) return false;
  return cat === 'Alta' || categoriaTaHipertensionGrado(cat);
}

function detalleTensionArterial(sv: EscFormCoherenciaInput['signosVitales']): string | undefined {
  if (!sv || !tieneTensionArterialCompleta(sv)) return undefined;
  const cat = sv.categoriaTensionArterial?.trim();
  const base = `TA ${sv.tensionArterialSistolica}/${sv.tensionArterialDiastolica} mmHg`;
  return cat ? `${base} — ${cat}` : base;
}

function evaluarHipertension(
  form: EscFormCoherenciaInput,
  _ctx?: EscCoherenciaContexto,
): ResultadoCoherenciaCondicionControl {
  const condicion = 'hipertensionArterial' as const;
  const diagnosticoActivo = tieneDiagnosticoActivo(form, 'HIPERTENSION_ARTERIAL');
  const manual = controlManual(form, condicion);
  const sv = form.signosVitales;
  const detalleObjetivo = detalleTensionArterial(sv);
  const advertencias: AdvertenciaCoherencia[] = [];
  const cat = (sv?.categoriaTensionArterial ?? '').trim();

  let estadoCalculado: EstadoCalculadoCondicion;
  let razon: string;
  let persistirControlAutomatico = true;
  let permisosOpts: PermisosControlOpts | undefined;

  if (!diagnosticoActivo) {
    const h = advertenciaControlHuerfano(manual);
    if (h) advertencias.push(h);
    if (!tieneTensionArterialCompleta(sv)) {
      estadoCalculado = 'SIN_DIAGNOSTICO_ACTIVO';
      razon = 'Sin diagnóstico activo de hipertensión; no hay tensión arterial registrada en esta visita.';
    } else if (categoriaTaElevadaSinDx(cat)) {
      estadoCalculado = 'HALLAZGO_COMPATIBLE';
      razon = RAZON_TA_HALLAZGO_SIN_DX;
    } else {
      estadoCalculado = 'SIN_DIAGNOSTICO_ACTIVO';
      razon = 'Sin diagnóstico activo de hipertensión; la TA de la visita no sugiere sospecha en este registro.';
    }
  } else {
    if (!tieneTensionArterialCompleta(sv)) {
      estadoCalculado = 'NO_VALORABLE';
      razon = 'Diagnóstico activo; no hay tensión arterial completa en esta visita.';
      advertencias.push(
        adv('TA_FALTANTE', 'info', 'No hay tensión arterial completa en esta visita.', 'NINGUNA'),
      );
    } else if (categoriaTaDesfavorable(cat)) {
      estadoCalculado = 'NO_CONTROLADA';
      razon = 'Diagnóstico activo; TA elevada o en rango de hipertensión según categoría de la visita.';
    } else {
      estadoCalculado = 'CONTROLADA';
      razon = 'Diagnóstico activo; TA en rango óptimo o normal según categoría de la visita.';
    }
  }

  const permisos = permisosControlCondicion(diagnosticoActivo, estadoCalculado, permisosOpts);
  if (manual && permisos.controlSeleccionableManualmente) {
    const c = advertenciaContradiccion(manual, estadoCalculado);
    if (c) advertencias.push(c);
  }

  return {
    condicion,
    diagnosticoActivo,
    estadoCalculado,
    estadoManualActual: manual,
    ...permisos,
    advertencias,
    razon,
    detalleObjetivo,
    persistirControlAutomatico,
  };
}

function catGlucosa(form: EscFormCoherenciaInput): string | undefined {
  const L = form.laboratorio;
  if (!L) return undefined;
  if (L.categoriaGlucosa) return L.categoriaGlucosa;
  if (L.glucosaMgDl != null) return clasificarGlucosa(L.glucosaMgDl);
  return undefined;
}

function catHbA1c(form: EscFormCoherenciaInput): string | undefined {
  const L = form.laboratorio;
  if (!L) return undefined;
  if (L.categoriaHbA1c) return L.categoriaHbA1c;
  if (L.hba1cPorcentaje != null) return clasificarHbA1c(L.hba1cPorcentaje);
  return undefined;
}

function glucosaAlteracionDocumentada(form: EscFormCoherenciaInput, cat?: string): boolean {
  const L = form.laboratorio;
  if (L?.glucosaMgDl != null && L.glucosaMgDl >= 126) return true;
  const c = cat ?? catGlucosa(form);
  return c === 'Elevada';
}

function glucosaHallazgoCompatible(cat: string | undefined): boolean {
  return cat === 'Alterada';
}

function hbaAlteracionDocumentada(form: EscFormCoherenciaInput, cat?: string): boolean {
  const L = form.laboratorio;
  if (L?.hba1cPorcentaje != null && L.hba1cPorcentaje >= 6.5) return true;
  const c = cat ?? catHbA1c(form);
  return c === 'Compatible con diabetes';
}

function hbaHallazgoCompatible(cat: string | undefined): boolean {
  return cat === 'Prediabetes';
}

function glucosaIntermedia(cat: string | undefined): boolean {
  return cat === 'Alterada';
}

function hbaIntermedia(cat: string | undefined): boolean {
  return cat === 'Prediabetes';
}

function glucosaClaramenteDesfavorable(form: EscFormCoherenciaInput, cat?: string): boolean {
  return glucosaAlteracionDocumentada(form, cat);
}

function hbaClaramenteDesfavorable(form: EscFormCoherenciaInput, cat?: string): boolean {
  return hbaAlteracionDocumentada(form, cat);
}

/** Con dx: prediabetes/alterada leve sin criterios de diabetes franca. */
function perfilGlucemicoIntermedioConDx(
  form: EscFormCoherenciaInput,
  cg: string | undefined,
  ch: string | undefined,
): boolean {
  const intermedio = glucosaIntermedia(cg) || hbaIntermedia(ch);
  const claro = glucosaClaramenteDesfavorable(form, cg) || hbaClaramenteDesfavorable(form, ch);
  return intermedio && !claro;
}

function advertenciaDm2RangoIntermedio(): AdvertenciaCoherencia {
  return adv(
    'DM2_RANGO_INTERMEDIO',
    'warning',
    'Valores glucémicos en rango intermedio; la valoración de control debe ser determinada por el médico según metas individuales y contexto clínico.',
    'REVISAR',
  );
}

function glucosaDesfavorable(cat: string | undefined): boolean {
  if (!cat || cat === 'No valorable') return false;
  return cat === 'Alterada' || cat === 'Elevada';
}

function hbaDesfavorable(cat: string | undefined): boolean {
  if (!cat || cat === 'No valorable') return false;
  return cat === 'Prediabetes' || cat === 'Compatible con diabetes';
}

function glucosaNormal(cat: string | undefined): boolean {
  return cat === 'Normal';
}

function hbaNormal(cat: string | undefined): boolean {
  return cat === 'Normal';
}

function tieneLaboratorioDm2(form: EscFormCoherenciaInput): boolean {
  const g = catGlucosa(form);
  const h = catHbA1c(form);
  return Boolean(g && g !== 'No valorable') || Boolean(h && h !== 'No valorable');
}

function detalleLaboratorioDm2(form: EscFormCoherenciaInput): string | undefined {
  const L = form.laboratorio;
  if (!L) return undefined;
  const partes: string[] = [];
  if (L.glucosaMgDl != null) {
    const c = catGlucosa(form);
    partes.push(`Glucosa ${L.glucosaMgDl} mg/dL${c ? ` — ${c}` : ''}`);
  }
  if (L.hba1cPorcentaje != null) {
    const c = catHbA1c(form);
    partes.push(`HbA1c ${L.hba1cPorcentaje}%${c ? ` — ${c}` : ''}`);
  }
  return partes.length ? partes.join('\n') : undefined;
}

function evaluarDm2SinDiagnostico(
  form: EscFormCoherenciaInput,
  advertencias: AdvertenciaCoherencia[],
  cg: string | undefined,
  ch: string | undefined,
): { estadoCalculado: EstadoCalculadoCondicion; razon: string } {
  if (!tieneLaboratorioDm2(form)) {
    return {
      estadoCalculado: 'SIN_DIAGNOSTICO_ACTIVO',
      razon: 'Sin diagnóstico activo de DM2; sin glucosa ni HbA1c en esta visita.',
    };
  }

  const glucDoc = glucosaAlteracionDocumentada(form, cg);
  const hbaDoc = hbaAlteracionDocumentada(form, ch);

  if (glucDoc || hbaDoc) {
    if (glucDoc && hbaDoc) {
      advertencias.push(
        advertenciaMarcarDiagnostico(
          'DM2_AMBOS_CRITERIOS',
          'Glucosa y HbA1c en rangos compatibles con diabetes. Considere marcar DM2 como diagnóstico activo.',
        ),
      );
    } else if (glucDoc) {
      advertencias.push(
        advertenciaMarcarDiagnostico(
          'DM2_GLUCOSA_DOCUMENTADA',
          'Glucosa en rango compatible con diabetes. Considere marcar DM2 como diagnóstico activo.',
        ),
      );
    } else {
      advertencias.push(
        advertenciaMarcarDiagnostico(
          'DM2_HBA1C_DOCUMENTADA',
          'HbA1c en rango compatible con diabetes. Considere marcar DM2 como diagnóstico activo.',
        ),
      );
    }
    const razon =
      glucDoc && hbaDoc
        ? 'Glucosa y HbA1c en rangos compatibles con diabetes en esta visita.'
        : glucDoc
          ? 'Glucosa en rango compatible con diabetes en esta visita.'
          : 'HbA1c en rango compatible con diabetes en esta visita.';
    return { estadoCalculado: 'ALTERACION_DOCUMENTADA', razon };
  }

  if (glucosaHallazgoCompatible(cg) || hbaHallazgoCompatible(ch)) {
    return {
      estadoCalculado: 'HALLAZGO_COMPATIBLE',
      razon:
        'Sin diagnóstico activo; hallazgo de laboratorio compatible con alteración glucémica (requiere correlación clínica).',
    };
  }

  return {
    estadoCalculado: 'SIN_DIAGNOSTICO_ACTIVO',
    razon:
      'Sin diagnóstico activo de DM2; laboratorio disponible sin criterios que sugieran diabetes mellitus en esta visita.',
  };
}

function evaluarDm2(
  form: EscFormCoherenciaInput,
  _ctx?: EscCoherenciaContexto,
): ResultadoCoherenciaCondicionControl {
  const condicion = 'diabetesMellitusTipo2' as const;
  const diagnosticoActivo = tieneDiagnosticoActivo(form, 'DIABETES_MELLITUS_TIPO_2');
  const manual = controlManual(form, condicion);
  const advertencias: AdvertenciaCoherencia[] = [];
  const detalleObjetivo = detalleLaboratorioDm2(form);
  const cg = catGlucosa(form);
  const ch = catHbA1c(form);

  let estadoCalculado: EstadoCalculadoCondicion;
  let razon: string;
  let persistirControlAutomatico = true;
  let permisosOpts: PermisosControlOpts | undefined;

  if (!diagnosticoActivo) {
    const h = advertenciaControlHuerfano(manual);
    if (h) advertencias.push(h);
    const sinDx = evaluarDm2SinDiagnostico(form, advertencias, cg, ch);
    estadoCalculado = sinDx.estadoCalculado;
    razon = sinDx.razon;
  } else {
    if (!tieneLaboratorioDm2(form)) {
      estadoCalculado = 'NO_VALORABLE';
      razon = 'Diagnóstico activo de DM2; sin glucosa ni HbA1c en esta visita.';
    } else if (glucosaClaramenteDesfavorable(form, cg) || hbaClaramenteDesfavorable(form, ch)) {
      estadoCalculado = 'NO_CONTROLADA';
      razon = 'Diagnóstico activo; al menos un analito glucémico en categoría no favorable (orientativo).';
    } else if (
      (cg === undefined || glucosaNormal(cg)) &&
      (ch === undefined || hbaNormal(ch)) &&
      (glucosaNormal(cg) || hbaNormal(ch))
    ) {
      estadoCalculado = 'CONTROLADA';
      razon = 'Diagnóstico activo; analitos disponibles en categoría favorable (orientativo).';
    } else if (perfilGlucemicoIntermedioConDx(form, cg, ch)) {
      // Sin estado persistido «intermedio»: chip NO_VALORABLE, control manual sin auto-persistir.
      estadoCalculado = 'NO_VALORABLE';
      razon =
        'Diagnóstico activo; valores glucémicos en rango intermedio. Valoración de control a criterio médico.';
      persistirControlAutomatico = false;
      permisosOpts = { permitirSeleccionManualConNoValorables: true };
      advertencias.push(advertenciaDm2RangoIntermedio());
    } else {
      estadoCalculado = 'NO_VALORABLE';
      razon = 'Diagnóstico activo; datos de laboratorio no concluyentes para sugerencia de control.';
    }
  }

  const permisos = permisosControlCondicion(diagnosticoActivo, estadoCalculado, permisosOpts);
  if (manual && permisos.controlSeleccionableManualmente) {
    const c = advertenciaContradiccion(manual, estadoCalculado);
    if (c) advertencias.push(c);
  }

  return {
    condicion,
    diagnosticoActivo,
    estadoCalculado,
    estadoManualActual: manual,
    ...permisos,
    advertencias,
    razon,
    detalleObjetivo,
    persistirControlAutomatico,
  };
}

function catLdl(form: EscFormCoherenciaInput): string | undefined {
  const L = form.laboratorio;
  if (!L) return undefined;
  if (L.categoriaLDL) return L.categoriaLDL;
  if (L.ldlMgDl != null) return clasificarLDL(L.ldlMgDl);
  return undefined;
}

function catTg(form: EscFormCoherenciaInput): string | undefined {
  const L = form.laboratorio;
  if (!L) return undefined;
  if (L.categoriaTrigliceridos) return L.categoriaTrigliceridos;
  if (L.trigliceridosMgDl != null) return clasificarTrigliceridos(L.trigliceridosMgDl);
  return undefined;
}

function catCt(form: EscFormCoherenciaInput): string | undefined {
  const L = form.laboratorio;
  if (!L) return undefined;
  if (L.categoriaColesterolTotal) return L.categoriaColesterolTotal;
  if (L.colesterolTotalMgDl != null) return clasificarColesterolTotal(L.colesterolTotalMgDl);
  return undefined;
}

function catHdl(form: EscFormCoherenciaInput): string | undefined {
  const L = form.laboratorio;
  if (!L) return undefined;
  if (L.categoriaHDL) return L.categoriaHDL;
  if (L.hdlMgDl != null) return clasificarHDL(L.hdlMgDl);
  return undefined;
}

function hdlBajoRelevante(hdl: number | undefined, ctx?: EscCoherenciaContexto): boolean {
  if (hdl == null || Number.isNaN(hdl)) return false;
  if (ctx?.sexoPaciente === 'Femenino') return hdl < 50;
  return hdl < 40;
}

function lipidosAlteracionDocumentada(
  form: EscFormCoherenciaInput,
  ctx?: EscCoherenciaContexto,
): { documentada: boolean; tgMuyAlto: boolean; hdlBajoAislado: boolean } {
  const L = form.laboratorio;
  const ldl = L?.ldlMgDl;
  const tg = L?.trigliceridosMgDl;
  const ct = L?.colesterolTotalMgDl;
  const hdl = L?.hdlMgDl;
  const hdlCat = catHdl(form);
  const hdlBajo = hdlBajoRelevante(hdl, ctx) || hdlCat === 'Bajo';
  const tgMuyAlto = tg != null && !Number.isNaN(tg) && tg >= 500;

  if (ldl != null && !Number.isNaN(ldl) && ldl >= 160) {
    return { documentada: true, tgMuyAlto, hdlBajoAislado: false };
  }
  if (tg != null && !Number.isNaN(tg) && tg >= 200) {
    return { documentada: true, tgMuyAlto, hdlBajoAislado: false };
  }
  if (ct != null && !Number.isNaN(ct) && ct >= 240) {
    return { documentada: true, tgMuyAlto, hdlBajoAislado: false };
  }
  if (hdlBajo) {
    const companionAlterado =
      (tg != null && !Number.isNaN(tg) && tg >= 200) ||
      (ldl != null && !Number.isNaN(ldl) && ldl >= 160) ||
      (ct != null && !Number.isNaN(ct) && ct >= 240);
    if (companionAlterado) {
      return { documentada: true, tgMuyAlto, hdlBajoAislado: false };
    }
    return { documentada: false, tgMuyAlto, hdlBajoAislado: true };
  }
  return { documentada: false, tgMuyAlto, hdlBajoAislado: false };
}

function lipidosDesfavorable(ldl?: string, tg?: string, ct?: string, hdl?: string): boolean {
  if (ldl === 'Límite alto' || ldl === 'Alto' || ldl === 'Muy alto') return true;
  if (tg === 'Límite alto' || tg === 'Alto' || tg === 'Muy alto') return true;
  if (ct === 'Límite alto' || ct === 'Alto') return true;
  if (hdl === 'Bajo') return true;
  return false;
}

function lipidosFavorable(ldl?: string, tg?: string, ct?: string): boolean {
  const tieneDato = Boolean(ldl && ldl !== 'No valorable') || Boolean(tg && tg !== 'No valorable');
  if (!tieneDato) return false;
  const ldlOk = !ldl || ldl === 'No valorable' || ldl === 'Óptimo' || ldl === 'Cerca de óptimo';
  const tgOk = !tg || tg === 'No valorable' || tg === 'Normal';
  const ctOk = !ct || ct === 'No valorable' || ct === 'Deseable';
  return ldlOk && tgOk && ctOk && (ldl === 'Óptimo' || ldl === 'Cerca de óptimo' || tg === 'Normal');
}

function tienePanelLipidico(form: EscFormCoherenciaInput): boolean {
  const ldl = catLdl(form);
  const tg = catTg(form);
  const ct = catCt(form);
  const hdl = catHdl(form);
  return (
    Boolean(ldl && ldl !== 'No valorable') ||
    Boolean(tg && tg !== 'No valorable') ||
    Boolean(ct && ct !== 'No valorable') ||
    Boolean(hdl && hdl !== 'No valorable')
  );
}

function detalleLipidos(form: EscFormCoherenciaInput): string | undefined {
  const L = form.laboratorio;
  if (!L) return undefined;
  const partes: string[] = [];
  if (L.colesterolTotalMgDl != null) {
    const c = catCt(form);
    partes.push(`CT ${L.colesterolTotalMgDl} mg/dL${c ? ` — ${c}` : ''}`);
  }
  if (L.ldlMgDl != null) {
    const c = catLdl(form);
    partes.push(`LDL ${L.ldlMgDl} mg/dL${c ? ` — ${c}` : ''}`);
  }
  if (L.hdlMgDl != null) {
    const c = catHdl(form);
    partes.push(`HDL ${L.hdlMgDl} mg/dL${c ? ` — ${c}` : ''}`);
  }
  if (L.trigliceridosMgDl != null) {
    const c = catTg(form);
    partes.push(`TG ${L.trigliceridosMgDl} mg/dL${c ? ` — ${c}` : ''}`);
  }
  return partes.length ? partes.join('\n') : undefined;
}

function evaluarDislipidemiaSinDiagnostico(
  form: EscFormCoherenciaInput,
  advertencias: AdvertenciaCoherencia[],
  ldl: string | undefined,
  tg: string | undefined,
  ct: string | undefined,
  hdl: string | undefined,
  ctx?: EscCoherenciaContexto,
): { estadoCalculado: EstadoCalculadoCondicion; razon: string } {
  if (!tienePanelLipidico(form)) {
    return {
      estadoCalculado: 'SIN_DIAGNOSTICO_ACTIVO',
      razon: 'Sin diagnóstico activo de dislipidemia; sin perfil lipídico en esta visita.',
    };
  }

  const { documentada, tgMuyAlto, hdlBajoAislado } = lipidosAlteracionDocumentada(form, ctx);

  if (documentada) {
    advertencias.push(
      advertenciaMarcarDiagnostico(
        'DIS_PERFIL_ALTERADO',
        'Perfil lipídico alterado. Considere marcar Dislipidemia como diagnóstico activo.',
      ),
    );
    if (tgMuyAlto) {
      advertencias.push(
        adv(
          'DIS_TG_MUY_ALTO',
          'warning',
          'Triglicéridos muy elevados (≥500 mg/dL); valoración de riesgo y manejo según protocolo.',
          'MARCAR_DIAGNOSTICO_ACTIVO',
        ),
      );
    }
    return {
      estadoCalculado: 'ALTERACION_DOCUMENTADA',
      razon: 'Perfil lipídico alterado en esta visita.',
    };
  }

  if (hdlBajoAislado) {
    return {
      estadoCalculado: 'HALLAZGO_COMPATIBLE',
      razon:
        'HDL bajo aislado; hallazgo compatible que requiere correlación con el perfil lipídico completo.',
    };
  }

  if (lipidosDesfavorable(ldl, tg, ct, hdl)) {
    return {
      estadoCalculado: 'HALLAZGO_COMPATIBLE',
      razon: 'Sin diagnóstico activo; perfil lipídico con hallazgos leves o límite (orientativo).',
    };
  }

  return {
    estadoCalculado: 'SIN_DIAGNOSTICO_ACTIVO',
    razon: 'Sin diagnóstico activo de dislipidemia; perfil lipídico sin hallazgo relevante en este registro.',
  };
}

function evaluarDislipidemia(
  form: EscFormCoherenciaInput,
  ctx?: EscCoherenciaContexto,
): ResultadoCoherenciaCondicionControl {
  const condicion = 'dislipidemia' as const;
  const diagnosticoActivo = tieneDiagnosticoActivo(form, 'DISLIPIDEMIA');
  const manual = controlManual(form, condicion);
  const advertencias: AdvertenciaCoherencia[] = [];
  const detalleObjetivo = detalleLipidos(form);
  const ldl = catLdl(form);
  const tg = catTg(form);
  const ct = catCt(form);
  const hdl = catHdl(form);

  let estadoCalculado: EstadoCalculadoCondicion;
  let razon: string;

  if (!diagnosticoActivo) {
    const h = advertenciaControlHuerfano(manual);
    if (h) advertencias.push(h);
    const sinDx = evaluarDislipidemiaSinDiagnostico(form, advertencias, ldl, tg, ct, hdl, ctx);
    estadoCalculado = sinDx.estadoCalculado;
    razon = sinDx.razon;
  } else {
    if (!tienePanelLipidico(form)) {
      estadoCalculado = 'NO_VALORABLE';
      razon = 'Diagnóstico activo de dislipidemia; sin perfil lipídico en esta visita.';
    } else if (lipidosDesfavorable(ldl, tg, ct, hdl)) {
      estadoCalculado = 'NO_CONTROLADA';
      razon = 'Diagnóstico activo; perfil lipídico con alteraciones relevantes (orientativo).';
    } else if (lipidosFavorable(ldl, tg, ct)) {
      estadoCalculado = 'CONTROLADA';
      razon = 'Diagnóstico activo; perfil lipídico orientativamente aceptable en esta visita.';
    } else {
      estadoCalculado = 'NO_VALORABLE';
      razon = 'Diagnóstico activo; datos lipídicos no concluyentes para sugerencia de control.';
    }
  }

  const permisos = permisosControlCondicion(diagnosticoActivo, estadoCalculado);
  if (manual && permisos.controlSeleccionableManualmente) {
    const c = advertenciaContradiccion(manual, estadoCalculado);
    if (c) advertencias.push(c);
  }

  return {
    condicion,
    diagnosticoActivo,
    estadoCalculado,
    estadoManualActual: manual,
    ...permisos,
    advertencias,
    razon,
    detalleObjetivo,
    persistirControlAutomatico: true,
  };
}

function estadoObesidadDesdeImc(imc: number): EstadoCalculadoObesidad {
  if (imc < 25) return 'SIN_OBESIDAD';
  if (imc < 30) return 'SOBREPESO';
  if (imc < 35) return 'OBESIDAD_I';
  if (imc < 40) return 'OBESIDAD_II';
  return 'OBESIDAD_III';
}

function estadoObesidadDesdeCategoria(cat: string): EstadoCalculadoObesidad | undefined {
  const c = cat.trim();
  if (!c || c === 'Bajo peso' || c === 'Normal') return 'SIN_OBESIDAD';
  if (c === 'Sobrepeso') return 'SOBREPESO';
  if (c === 'Obesidad clase I' || c === 'Obesidad grado I') return 'OBESIDAD_I';
  if (c === 'Obesidad clase II' || c === 'Obesidad grado II') return 'OBESIDAD_II';
  if (c === 'Obesidad clase III' || c === 'Obesidad grado III') return 'OBESIDAD_III';
  return undefined;
}

function evaluarObesidad(form: EscFormCoherenciaInput): ResultadoCoherenciaObesidad {
  const diagnosticoActivo = tieneDiagnosticoActivo(form, CODIGO_DIAGNOSTICO_OBESIDAD);
  const som = form.somatometria;
  const imc = som?.indiceMasaCorporal;
  const cat = (som?.categoriaIMC ?? '').trim();
  const gradoPersistido = form.estadoCondiciones?.obesidad?.grado;
  const advertencias: AdvertenciaCoherencia[] = [];

  let estadoCalculado: EstadoCalculadoObesidad;
  let razon: string;
  let detalleObjetivo: string | undefined;

  const imcNum = typeof imc === 'number' && !Number.isNaN(imc) ? imc : undefined;

  if (imcNum == null && !cat) {
    estadoCalculado = 'NO_VALORABLE';
    razon = 'No hay IMC ni categoría antropométrica registrada en esta visita.';
    detalleObjetivo = undefined;
    advertencias.push(
      adv('IMC_FALTANTE', 'info', 'No hay IMC registrado en esta visita.', 'NINGUNA'),
    );
  } else {
    const desdeCat = cat ? estadoObesidadDesdeCategoria(cat) : undefined;
    const desdeImc = imcNum != null ? estadoObesidadDesdeImc(imcNum) : undefined;
    estadoCalculado = desdeCat ?? desdeImc ?? 'NO_VALORABLE';
    detalleObjetivo =
      imcNum != null
        ? `IMC ${imcNum}${cat ? ` — ${cat}` : ''}`
        : cat
          ? cat
          : undefined;

    if (estadoCalculado === 'SIN_OBESIDAD') {
      razon = 'Antropometría sin sobrepeso ni obesidad en esta visita.';
    } else if (estadoCalculado === 'SOBREPESO') {
      razon = 'Sobrepeso por IMC; no equivale a diagnóstico de obesidad.';
    } else {
      razon = `Clasificación antropométrica: ${estadoCalculado.replace('OBESIDAD_', 'Obesidad ')}.`;
    }
  }

  if (diagnosticoActivo && imcNum != null && imcNum < 30) {
    advertencias.push(
      adv(
        'DX_OBESIDAD_IMC_NORMAL',
        'warning',
        'Diagnóstico activo de obesidad con IMC actual por debajo de 30; revise coherencia clínica.',
        'REVISAR',
      ),
    );
  }

  return {
    condicion: 'obesidad',
    diagnosticoActivo,
    estadoCalculado,
    gradoPersistido,
    advertencias,
    razon,
    detalleObjetivo,
  };
}

export function evaluarCoherenciaEsc(
  form: EscFormCoherenciaInput,
  ctx?: EscCoherenciaContexto,
): ResultadoCoherenciaEsc {
  const hipertensionArterial = evaluarHipertension(form, ctx);
  const diabetesMellitusTipo2 = evaluarDm2(form, ctx);
  const dislipidemia = evaluarDislipidemia(form, ctx);
  const obesidad = evaluarObesidad(form);

  return {
    hipertensionArterial,
    diabetesMellitusTipo2,
    dislipidemia,
    obesidad,
    advertenciasGlobales: [],
  };
}

export function etiquetaEstadoCalculadoControl(estado: EstadoCalculadoCondicion): string {
  switch (estado) {
    case 'CONTROLADA':
      return 'Controlada';
    case 'NO_CONTROLADA':
      return 'No controlada';
    case 'NO_VALORABLE':
      return 'No valorada en esta visita';
    case 'SIN_DIAGNOSTICO_ACTIVO':
      return 'Sin diagnóstico activo';
    case 'HALLAZGO_COMPATIBLE':
      return 'Hallazgo compatible';
    case 'ALTERACION_DOCUMENTADA':
      return 'Alteración documentada';
    default:
      return estado;
  }
}

export function etiquetaEstadoCalculadoObesidad(estado: EstadoCalculadoObesidad): string {
  switch (estado) {
    case 'SIN_OBESIDAD':
      return 'Sin obesidad documentada';
    case 'SOBREPESO':
      return 'Sobrepeso';
    case 'OBESIDAD_I':
      return 'Obesidad clase I';
    case 'OBESIDAD_II':
      return 'Obesidad clase II';
    case 'OBESIDAD_III':
      return 'Obesidad clase III';
    case 'NO_VALORABLE':
      return 'No valorable';
    default:
      return estado;
  }
}

export type ClaveFilaEstadoCondicionEsc = ClaveCondicionControl | 'obesidad';

function labelGradoObesidadPersistido(code: string): string {
  const o = GRADO_OBESIDAD_OPTS.find((x) => x.value === code);
  return o?.label ?? code.replace(/_/g, ' ');
}

/** Estado calculado por datos de visita (ignora selección manual de control). */
export function textoEstadoSugeridoCondicionEscVista(
  form: EscFormCoherenciaInput,
  key: ClaveCondicionControl,
  ctx?: EscCoherenciaContexto,
): string {
  const r = evaluarCoherenciaEsc(form, ctx)[key];
  return etiquetaEstadoCalculadoControl(r.estadoCalculado);
}

/** Estado efectivo en lectura: manual si existe y aplica; si no, calculado. */
export function textoEstadoCondicionEscVista(
  form: EscFormCoherenciaInput,
  key: ClaveFilaEstadoCondicionEsc,
  ctx?: EscCoherenciaContexto,
): string {
  const evaluacion = evaluarCoherenciaEsc(form, ctx);
  if (key === 'obesidad') {
    const g = form.estadoCondiciones?.obesidad?.grado?.trim();
    if (g) return labelGradoObesidadPersistido(g);
    return etiquetaEstadoCalculadoObesidad(evaluacion.obesidad.estadoCalculado);
  }
  const r = evaluacion[key];
  const manual = controlManual(form, key);
  if (r.controlSeleccionableManualmente && manual) {
    return etiquetaEstadoCalculadoControl(manual);
  }
  return etiquetaEstadoCalculadoControl(r.estadoCalculado);
}

export function claseCssEstadoCondicionEscVista(
  form: EscFormCoherenciaInput,
  key: ClaveFilaEstadoCondicionEsc,
  ctx?: EscCoherenciaContexto,
): string {
  const evaluacion = evaluarCoherenciaEsc(form, ctx);
  if (key === 'obesidad') {
    const g = form.estadoCondiciones?.obesidad?.grado;
    if (g === 'OBESIDAD_I') return 'text-red-600';
    if (g === 'OBESIDAD_II') return 'text-red-700';
    if (g === 'OBESIDAD_III') return 'text-red-900';
    const est = evaluacion.obesidad.estadoCalculado;
    if (est === 'OBESIDAD_I') return 'text-red-600';
    if (est === 'OBESIDAD_II') return 'text-red-700';
    if (est === 'OBESIDAD_III') return 'text-red-900';
    return 'text-gray-900';
  }
  const r = evaluacion[key];
  const manual = controlManual(form, key);
  const estado: EstadoCalculadoCondicion =
    r.controlSeleccionableManualmente && manual ? manual : r.estadoCalculado;
  switch (estado) {
    case 'CONTROLADA':
      return 'text-emerald-700';
    case 'NO_CONTROLADA':
      return 'text-red-700';
    case 'ALTERACION_DOCUMENTADA':
      return 'text-red-700';
    case 'HALLAZGO_COMPATIBLE':
      return 'text-amber-700';
    case 'NO_VALORABLE':
      return 'text-gray-600';
    default:
      return 'text-gray-900';
  }
}

export function claseCssChipEstadoCalculadoEsc(estado: EstadoCalculadoCondicion): string {
  switch (estado) {
    case 'ALTERACION_DOCUMENTADA':
      return 'border-amber-400 bg-amber-50 text-amber-950';
    case 'HALLAZGO_COMPATIBLE':
      return 'border-amber-200 bg-amber-50/80 text-amber-900';
    case 'CONTROLADA':
      return 'border-emerald-300 bg-emerald-50 text-emerald-900';
    case 'NO_CONTROLADA':
      return 'border-red-300 bg-red-50 text-red-900';
    default:
      return 'border-gray-300 bg-gray-100 text-gray-800';
  }
}

export function tieneAdvertenciaMarcarDiagnostico(r: ResultadoCoherenciaCondicionControl): boolean {
  return r.advertencias.some((a) => a.accionSugerida === 'MARCAR_DIAGNOSTICO_ACTIVO');
}

export function sincronizarEstadoControlAutomatico(
  form: EscFormCoherenciaInput,
  ctx?: EscCoherenciaContexto,
): void {
  const evaluacion = evaluarCoherenciaEsc(form, ctx);

  for (const condicion of CONDICIONES_CON_CONTROL) {
    const r = evaluacion[condicion];
    let bloque = form.estadoCondiciones?.[condicion];

    const limpiarBloque = () => {
      if (!bloque?.control) return;
      delete bloque.control;
      if (Object.keys(bloque).length === 0 && form.estadoCondiciones) {
        delete form.estadoCondiciones[condicion];
        bloque = undefined;
      }
    };

    if (!r.diagnosticoActivo || esEstadoSinControlPersistido(r.estadoCalculado)) {
      limpiarBloque();
      continue;
    }

    if (r.estadoCalculado === 'CONTROLADA' && !r.controlSeleccionableManualmente) {
      if (!form.estadoCondiciones) form.estadoCondiciones = {};
      if (!form.estadoCondiciones[condicion]) form.estadoCondiciones[condicion] = {};
      form.estadoCondiciones[condicion].control = 'CONTROLADA';
      continue;
    }

    if (
      r.estadoCalculado === 'NO_VALORABLE' &&
      r.persistirControlAutomatico !== false
    ) {
      if (!form.estadoCondiciones) form.estadoCondiciones = {};
      if (!form.estadoCondiciones[condicion]) form.estadoCondiciones[condicion] = {};
      form.estadoCondiciones[condicion].control = 'NO_VALORABLE';
      continue;
    }

    if (r.estadoCalculado === 'NO_VALORABLE' && r.persistirControlAutomatico === false) {
      limpiarBloque();
      continue;
    }

    if (r.estadoCalculado === 'NO_CONTROLADA' && r.controlSeleccionableManualmente) {
      const manual = controlManual(form, condicion);
      if (!manual) {
        if (!form.estadoCondiciones) form.estadoCondiciones = {};
        if (!form.estadoCondiciones[condicion]) form.estadoCondiciones[condicion] = {};
        form.estadoCondiciones[condicion].control = 'NO_CONTROLADA';
      }
      continue;
    }

    if (r.controlSeleccionableManualmente) {
      const manual = controlManual(form, condicion);
      if (manual === 'NO_VALORABLE') limpiarBloque();
    }
  }

  if (form.estadoCondiciones && Object.keys(form.estadoCondiciones).length === 0) {
    delete form.estadoCondiciones;
  }
}

export function tieneControlHuerfano(form: EscFormCoherenciaInput): boolean {
  if (!form.estadoCondiciones) return false;
  for (const condicion of CONDICIONES_CON_CONTROL) {
    const control = form.estadoCondiciones[condicion]?.control;
    if (!control) continue;
    const dx = MAPA_CONDICION_A_DIAGNOSTICO[condicion];
    if (!tieneDiagnosticoActivo(form, dx)) return true;
  }
  return false;
}

export function limpiarControlSinDiagnostico(form: EscFormCoherenciaInput): void {
  if (!form.estadoCondiciones) return;
  for (const condicion of CONDICIONES_CON_CONTROL) {
    const dx = MAPA_CONDICION_A_DIAGNOSTICO[condicion];
    const bloque = form.estadoCondiciones[condicion];
    if (!bloque?.control) continue;
    if (!tieneDiagnosticoActivo(form, dx)) {
      delete bloque.control;
      if (Object.keys(bloque).length === 0) {
        delete form.estadoCondiciones[condicion];
      }
    }
  }
  if (form.estadoCondiciones && Object.keys(form.estadoCondiciones).length === 0) {
    delete form.estadoCondiciones;
  }
}

export function limpiarControlAlDesmarcarDiagnostico(
  form: EscFormCoherenciaInput,
  codigoDiagnostico: string,
): boolean {
  const clave = MAPA_DIAGNOSTICO_A_CONDICION[codigoDiagnostico];
  if (!clave || clave === 'obesidad') return false;
  if (!form.estadoCondiciones?.[clave]?.control) return false;
  const bloque = form.estadoCondiciones[clave];
  delete bloque.control;
  if (Object.keys(bloque).length === 0) {
    delete form.estadoCondiciones[clave];
  }
  if (form.estadoCondiciones && Object.keys(form.estadoCondiciones).length === 0) {
    delete form.estadoCondiciones;
  }
  return true;
}

export function labelDiagnosticoParaCondicion(condicion: ClaveCondicionControl): string {
  const codigo = MAPA_CONDICION_A_DIAGNOSTICO[condicion];
  const labels: Record<string, string> = {
    HIPERTENSION_ARTERIAL: 'hipertensión arterial',
    DIABETES_MELLITUS_TIPO_2: 'diabetes mellitus tipo 2',
    DISLIPIDEMIA: 'dislipidemia',
  };
  return labels[codigo] ?? condicion;
}
