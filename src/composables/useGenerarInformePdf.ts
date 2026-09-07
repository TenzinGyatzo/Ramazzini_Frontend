import axios from 'axios';
import { authRequestConfig } from '@/lib/attachAuthToken';
import DocumentosAPI from '@/api/DocumentosAPI';
import { generarGraficaAudiometria } from '@/helpers/generarGraficaAudiometria';
import { generarGraficasIlc } from '@/helpers/generarGraficasIlc';
import { generarGraficasIla } from '@/helpers/generarGraficasIla';
import type { AudiometriaConcentradaLongitudinal } from '@/interfaces/documentos.inteface';
import { usePdfGenerationStore } from '@/stores/pdfGeneration';

export type GenerarInformePdfOptions = {
  tipo: string;
  empresaId: string;
  trabajadorId: string;
  documentoId: string;
  userId: string;
  documento?: Record<string, unknown> | null;
};

const TIPO_INFORME_API: Record<string, string> = {
  informelongitudinalcardiometabolico: 'informeLongitudinalCardiometabolico',
  informelongitudinalaudiometrico: 'informeLongitudinalAudiometrico',
  certificadoexpedito: 'certificadoExpedito',
  examenvista: 'examenVista',
  exploracionfisica: 'exploracionFisica',
  historiaclinica: 'historiaClinica',
  notamedica: 'notaMedica',
  notaaclaratoria: 'notaAclaratoria',
  controlprenatal: 'controlPrenatal',
  historiaotologica: 'historiaOtologica',
  previoespirometria: 'previoEspirometria',
  constanciaaptitud: 'constanciaAptitud',
  entrevistapsicologica: 'entrevistaPsicologica',
  trastornosestadoanimo: 'trastornosEstadoAnimo',
  cuestionarioprodromalbreve: 'cuestionarioProdromalBreve',
  trastornolimitepersonalidad: 'trastornoLimitePersonalidad',
  eventoseguimientocardiometabolico: 'eventoSeguimientoCardiometabolico',
};

export function toInformeApiTipo(tipo: string): string {
  const compact = tipo.replace(/\s+/g, '');
  return TIPO_INFORME_API[compact.toLowerCase()] || compact;
}

function isNonEmptyGraph(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function pickIlcGraficas(
  doc: Record<string, unknown> | null | undefined,
): Record<string, string> | null {
  if (!doc) return null;
  const graficas = {
    graficaEvolucionGlucemica: doc.graficaEvolucionGlucemica,
    graficaEvolucionPresionArterial: doc.graficaEvolucionPresionArterial,
    graficaEvolucionPesoImc: doc.graficaEvolucionPesoImc,
    graficaEvolucionPerfilLipidico: doc.graficaEvolucionPerfilLipidico,
  };
  return Object.values(graficas).every(isNonEmptyGraph)
    ? (graficas as Record<string, string>)
    : null;
}

function pickIlaGraficas(
  doc: Record<string, unknown> | null | undefined,
): Record<string, string> | null {
  if (!doc) return null;
  const graficas = {
    graficaAudiogramaOidoDerecho: doc.graficaAudiogramaOidoDerecho,
    graficaAudiogramaOidoIzquierdo: doc.graficaAudiogramaOidoIzquierdo,
  };
  return Object.values(graficas).every(isNonEmptyGraph)
    ? (graficas as Record<string, string>)
    : null;
}

async function resolveDocumento(
  tipoApi: string,
  trabajadorId: string,
  documentoId: string,
  documento?: Record<string, unknown> | null,
): Promise<Record<string, unknown>> {
  if (documento && typeof documento === 'object') {
    return documento;
  }
  const response = await DocumentosAPI.getDocumentById(
    tipoApi,
    trabajadorId,
    documentoId,
  );
  return response.data;
}

/**
 * Genera (o regenera) el PDF de un informe. El HTTP de /informes es síncrono:
 * 200 implica archivo escrito. No hace poll HEAD.
 */
export async function generarInformePdf(
  options: GenerarInformePdfOptions,
): Promise<void> {
  const tipoApi = toInformeApiTipo(options.tipo);
  const { empresaId, trabajadorId, documentoId, userId } = options;
  const pdfGenerationStore = usePdfGenerationStore();
  pdfGenerationStore.markLocalGenerating(documentoId);

  const apiEndpoint = `${import.meta.env.VITE_API_URL}/informes/${tipoApi}/${empresaId}/${trabajadorId}/${documentoId}/${userId}`;

  try {
    try {
      await DocumentosAPI.markPdfGenerating(tipoApi, trabajadorId, documentoId);
    } catch (markError) {
      console.warn('No se pudo marcar pdfStatus generating:', markError);
    }

    if (tipoApi === 'audiometria') {
      const doc = await resolveDocumento(
        tipoApi,
        trabajadorId,
        documentoId,
        options.documento,
      );
      const graficaBase64 = generarGraficaAudiometria(doc);
      await axios.post(apiEndpoint, { grafica: graficaBase64 }, authRequestConfig());
      return;
    }

    if (tipoApi === 'informeLongitudinalCardiometabolico') {
      const doc = await resolveDocumento(
        tipoApi,
        trabajadorId,
        documentoId,
        options.documento,
      );
      const persistidas = pickIlcGraficas(doc);
      if (persistidas) {
        await axios.post(apiEndpoint, persistidas, authRequestConfig());
        return;
      }
      const graficas = generarGraficasIlc(doc?.eventosConcentrados);
      try {
        await DocumentosAPI.updateDocument(tipoApi, trabajadorId, documentoId, {
          ...graficas,
          idTrabajador: trabajadorId,
          fechaInformeLongitudinalCardiometabolico:
            doc.fechaInformeLongitudinalCardiometabolico,
          updatedBy: userId,
        });
      } catch (persistError) {
        console.warn(
          'No se pudieron persistir gráficas ILC (se envían en POST):',
          persistError,
        );
      }
      await axios.post(apiEndpoint, graficas, authRequestConfig());
      return;
    }

    if (tipoApi === 'informeLongitudinalAudiometrico') {
      const doc = await resolveDocumento(
        tipoApi,
        trabajadorId,
        documentoId,
        options.documento,
      );
      const persistidas = pickIlaGraficas(doc);
      if (persistidas) {
        await axios.post(apiEndpoint, persistidas, authRequestConfig());
        return;
      }
      const graficas = generarGraficasIla(
        doc?.audiometriaBasalConcentrada as
          | AudiometriaConcentradaLongitudinal
          | null
          | undefined,
        (doc?.audiometriasSubsecuentesConcentradas as
          | AudiometriaConcentradaLongitudinal[]
          | undefined) || [],
      );
      try {
        await DocumentosAPI.updateDocument(tipoApi, trabajadorId, documentoId, {
          ...graficas,
          idTrabajador: trabajadorId,
          fechaInformeLongitudinalAudiometrico:
            doc.fechaInformeLongitudinalAudiometrico,
          updatedBy: userId,
        });
      } catch (persistError) {
        console.warn(
          'No se pudieron persistir gráficas ILA (se envían en POST):',
          persistError,
        );
      }
      await axios.post(apiEndpoint, graficas, authRequestConfig());
      return;
    }

    await axios.get(apiEndpoint, authRequestConfig());
  } catch (error) {
    pdfGenerationStore.clearLocalGenerating(documentoId);
    throw error;
  }
}

export function useGenerarInformePdf() {
  return { generarInformePdf };
}
