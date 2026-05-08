import DocumentosAPI from '@/api/DocumentosAPI';
import { findNearestDocument } from '@/helpers/findNearestDocuments';
import { hayHallazgosSignificativos } from '@/helpers/conclusionEntrevistaPsicologica';
import { cumpleCriterioTriajePositivoMdq } from '@/helpers/trastornosEstadoAnimoSteps';
import {
  contarFrecuenciaPQB,
  esPositivoRiesgoPsicoticoPQB,
  sumarMalestarPQB,
} from '@/helpers/cuestionarioProdromalBreveSteps';
import { puntajeTrastornoLimitePersonalidad } from '@/helpers/resumenesCuestionariosPsicologicosAptitud';

const nearestOpts = { sameYearAsReference: true };

export type CuatroTamizajesDocs = {
  entrevistaPsicologica: Record<string, unknown>;
  trastornosEstadoAnimo: Record<string, unknown>;
  cuestionarioProdromalBreve: Record<string, unknown>;
  trastornoLimitePersonalidad: Record<string, unknown>;
};

function unirListaEspanol(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

/**
 * Cuatro tamizajes psicológicos con fecha más próxima dentro del mismo año que la aptitud.
 * Devuelve null si falta fecha de aptitud o cualquiera de los cuatro documentos en ese criterio.
 */
export async function obtenerCuatroTamizajesPsicologicosCercanos(
  trabajadorId: string,
  fechaAptitudPuesto: string | null | undefined,
): Promise<CuatroTamizajesDocs | null> {
  if (!fechaAptitudPuesto) {
    return null;
  }
  try {
    const [rEp, rTea, rPqb, rTlp] = await Promise.all([
      DocumentosAPI.getEntrevistaPsicologica(trabajadorId),
      DocumentosAPI.getTrastornosEstadoAnimo(trabajadorId),
      DocumentosAPI.getCuestionarioProdromalBreve(trabajadorId),
      DocumentosAPI.getTrastornoLimitePersonalidad(trabajadorId),
    ]);
    const entrevistaPsicologica = findNearestDocument(
      rEp.data || [],
      fechaAptitudPuesto,
      'fechaEntrevistaPsicologica',
      nearestOpts,
    );
    const trastornosEstadoAnimo = findNearestDocument(
      rTea.data || [],
      fechaAptitudPuesto,
      'fechaTrastornosEstadoAnimo',
      nearestOpts,
    );
    const cuestionarioProdromalBreve = findNearestDocument(
      rPqb.data || [],
      fechaAptitudPuesto,
      'fechaCuestionarioProdromalBreve',
      nearestOpts,
    );
    const trastornoLimitePersonalidad = findNearestDocument(
      rTlp.data || [],
      fechaAptitudPuesto,
      'fechaTrastornoLimitePersonalidad',
      nearestOpts,
    );
    if (
      !entrevistaPsicologica ||
      !trastornosEstadoAnimo ||
      !cuestionarioProdromalBreve ||
      !trastornoLimitePersonalidad
    ) {
      return null;
    }
    return {
      entrevistaPsicologica: entrevistaPsicologica as Record<string, unknown>,
      trastornosEstadoAnimo: trastornosEstadoAnimo as Record<string, unknown>,
      cuestionarioProdromalBreve: cuestionarioProdromalBreve as Record<string, unknown>,
      trastornoLimitePersonalidad: trastornoLimitePersonalidad as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

/**
 * Párrafo(s) para el campo Resultados de aptitud cuando existen los cuatro tamizajes en el año de referencia.
 */
export function construirTextoPaso4TamizajePsi(d: CuatroTamizajesDocs): string {
  const baseHallazgos =
    'Los tamizajes psicológicos son orientadores y sugestivos; no constituyen diagnóstico ni definen por sí solos la aptitud psicolaboral en esta evaluación.';

  const hallazgoEntrevista = hayHallazgosSignificativos(d.entrevistaPsicologica);
  const mdqPositivo = cumpleCriterioTriajePositivoMdq(d.trastornosEstadoAnimo);
  const fPqb = contarFrecuenciaPQB(d.cuestionarioProdromalBreve);
  const mPqb = sumarMalestarPQB(d.cuestionarioProdromalBreve);
  const pqbPositivo = esPositivoRiesgoPsicoticoPQB(fPqb, mPqb);
  const puntajeTlp = puntajeTrastornoLimitePersonalidad(d.trastornoLimitePersonalidad);
  const tlpSugestivo = puntajeTlp > 4;

  if (!hallazgoEntrevista && !mdqPositivo && !pqbPositivo && !tlpSugestivo) {
    return ' En los cuestionarios de tamizaje psicológico aplicados no se identificaron hallazgos que sugieran influencia sobre la aptitud psicolaboral.';
  }

  const instrumentos: string[] = [];
  if (hallazgoEntrevista) {
    instrumentos.push('entrevista estructurada');
  }
  if (mdqPositivo) {
    instrumentos.push('MDQ (riesgo bipolar)');
  }
  if (pqbPositivo) {
    instrumentos.push('cuestionario prodromal breve (riesgo psicótico)');
  }
  if (tlpSugestivo) {
    instrumentos.push('MSI-BPD');
  }

  const cierre = ` Hallazgos sugestivos en ${unirListaEspanol(instrumentos)}: sin valor diagnóstico ni suficientes por sí solos para un juicio de aptitud psicolaboral; conviene valoración por especialista en salud mental si procede.`;

  return ` ${baseHallazgos}${cierre}`;
}
