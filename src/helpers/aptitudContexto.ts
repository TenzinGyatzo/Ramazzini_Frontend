/**
 * Aptitud al puesto, punto (45): lo que los textos generados toman del expediente. Antes cada
 * paso lo pedía al servidor al abrirse (alteraciones y medidas, los documentos vecinos;
 * resultados, el motivo del examen y los cuatro tamizajes psicológicos). En la captura rápida los
 * pasos se abren a la vez, y con vista previa una sección sin abrir no generaba su texto.
 *
 * Ahora se pide una vez por documento (FormStepper) y lo usan los pasos y el guardado. El más
 * cercano de cada tipo se calcula aquí, con la fecha de la aptitud (cambia sin volver a pedir).
 */
import { reactive } from 'vue';
import DocumentosAPI from '@/api/DocumentosAPI';
import ResultadosClinicosAPI from '@/api/ResultadosClinicosAPI';
import { findNearestDocument } from '@/helpers/findNearestDocuments';
import type { CuatroTamizajesDocs } from '@/helpers/tamizajePsicologicoPaso4Resultados';

type Doc = Record<string, any>;

export interface ContextoAptitud {
  /** Documentos de `aptitud-vecinos`, por tipo. */
  vecinos: Record<string, Doc[]>;
  motivoExamen: string | null;
  /** Resultados clínicos externos (EKG, espirometría…): la tabla de estudios de la captura rápida. */
  resultados?: Doc[];
  /** No llegaron los documentos vecinos (alteraciones y medidas se escriben a mano). */
  sinVecinos?: boolean;
  /** Listas completas de los cuatro tamizajes (los usa el texto de resultados). */
  tamizajes: {
    entrevistaPsicologica: Doc[];
    trastornosEstadoAnimo: Doc[];
    cuestionarioProdromalBreve: Doc[];
    trastornoLimitePersonalidad: Doc[];
  };
}

const NEAREST = { sameYearAsReference: true };

/** Campo de fecha de cada tipo de documento vecino. */
export const CAMPOS_FECHA_VECINOS: Record<string, string> = {
  historiaClinica: 'fechaHistoriaClinica',
  exploracionFisica: 'fechaExploracionFisica',
  examenVista: 'fechaExamenVista',
  audiometria: 'fechaAudiometria',
  entrevistaPsicologica: 'fechaEntrevistaPsicologica',
  trastornosEstadoAnimo: 'fechaTrastornosEstadoAnimo',
  cuestionarioProdromalBreve: 'fechaCuestionarioProdromalBreve',
  trastornoLimitePersonalidad: 'fechaTrastornoLimitePersonalidad',
  cuestionarioNordico: 'fechaCuestionarioNordico',
  evaluacionSuenoVigilia: 'fechaEvaluacionSuenoVigilia',
};

/** El documento más cercano de cada tipo a la fecha (mismo año), como lo calculaban los pasos. */
export function documentosCercanosAptitud(ctx: ContextoAptitud, fecha: string | null | undefined): Record<string, Doc | null> {
  const cercanos: Record<string, Doc | null> = {};
  for (const [tipo, campo] of Object.entries(CAMPOS_FECHA_VECINOS)) {
    cercanos[tipo] = (findNearestDocument(ctx.vecinos[tipo] ?? [], fecha, campo, NEAREST) as Doc | null) ?? null;
  }
  return cercanos;
}

/** Los cuatro tamizajes más cercanos (null si falta la fecha o alguno), como el paso de resultados. */
export function cuatroTamizajesCercanos(ctx: ContextoAptitud, fecha: string | null | undefined): CuatroTamizajesDocs | null {
  if (!fecha) return null;
  const t = ctx.tamizajes;
  const ep = findNearestDocument(t.entrevistaPsicologica, fecha, 'fechaEntrevistaPsicologica', NEAREST);
  const tea = findNearestDocument(t.trastornosEstadoAnimo, fecha, 'fechaTrastornosEstadoAnimo', NEAREST);
  const pqb = findNearestDocument(t.cuestionarioProdromalBreve, fecha, 'fechaCuestionarioProdromalBreve', NEAREST);
  const tlp = findNearestDocument(t.trastornoLimitePersonalidad, fecha, 'fechaTrastornoLimitePersonalidad', NEAREST);
  if (!ep || !tea || !pqb || !tlp) return null;
  return {
    entrevistaPsicologica: ep as Doc,
    trastornosEstadoAnimo: tea as Doc,
    cuestionarioProdromalBreve: pqb as Doc,
    trastornoLimitePersonalidad: tlp as Doc,
  };
}

async function datos<T>(promesa: Promise<{ data: T }>, porDefecto: T, alFallar?: () => void): Promise<T> {
  try {
    return (await promesa).data ?? porDefecto;
  } catch (error) {
    console.error('Aptitud: no se pudo consultar parte del expediente', error);
    alFallar?.();
    return porDefecto;
  }
}

/** Pide al servidor lo que usan los textos (en paralelo; lo que falle queda vacío). */
export async function pedirContextoAptitud(trabajadorId: string): Promise<ContextoAptitud> {
  let sinVecinos = false;
  const [vecinos, motivo, ep, tea, pqb, tlp, resultados] = await Promise.all([
    datos(DocumentosAPI.getAptitudInformeVecinos(trabajadorId) as Promise<{ data: Record<string, Doc[]> }>, {}, () => {
      sinVecinos = true;
    }),
    datos(DocumentosAPI.getMotivoExamenReciente(trabajadorId) as Promise<{ data: any }>, null),
    datos(DocumentosAPI.getEntrevistaPsicologica(trabajadorId) as Promise<{ data: Doc[] }>, []),
    datos(DocumentosAPI.getTrastornosEstadoAnimo(trabajadorId) as Promise<{ data: Doc[] }>, []),
    datos(DocumentosAPI.getCuestionarioProdromalBreve(trabajadorId) as Promise<{ data: Doc[] }>, []),
    datos(DocumentosAPI.getTrastornoLimitePersonalidad(trabajadorId) as Promise<{ data: Doc[] }>, []),
    datos(ResultadosClinicosAPI.getByTrabajador(trabajadorId) as Promise<{ data: Doc[] }>, []),
  ]);
  return {
    vecinos: vecinos ?? {},
    sinVecinos,
    motivoExamen: motivo?.data?.motivoExamen ?? null,
    resultados: resultados ?? [],
    tamizajes: {
      entrevistaPsicologica: ep ?? [],
      trastornosEstadoAnimo: tea ?? [],
      cuestionarioProdromalBreve: pqb ?? [],
      trastornoLimitePersonalidad: tlp ?? [],
    },
  };
}

/**
 * El contexto de la aptitud en curso (uno a la vez). FormStepper lo pide al abrir la aptitud;
 * los pasos lo leen.
 */
export const contextoAptitud = reactive<{
  trabajadorId: string | null;
  cargando: boolean;
  /** No se pudo consultar (nada llegó). */
  fallo: boolean;
  datos: ContextoAptitud | null;
}>({ trabajadorId: null, cargando: false, fallo: false, datos: null });

let solicitud = 0;
export async function cargarContextoAptitud(trabajadorId: string | null | undefined): Promise<void> {
  if (!trabajadorId) return;
  const mia = ++solicitud;
  contextoAptitud.trabajadorId = trabajadorId;
  contextoAptitud.cargando = true;
  contextoAptitud.fallo = false;
  contextoAptitud.datos = null;
  try {
    const ctx = await pedirContextoAptitud(trabajadorId);
    if (mia !== solicitud) return;
    contextoAptitud.datos = ctx;
  } catch {
    if (mia === solicitud) contextoAptitud.fallo = true;
  } finally {
    if (mia === solicitud) contextoAptitud.cargando = false;
  }
}
