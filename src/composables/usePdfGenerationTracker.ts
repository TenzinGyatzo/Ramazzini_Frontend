import { ref, onUnmounted, type Ref } from 'vue';
import DocumentosAPI from '@/api/DocumentosAPI';
import { headClinicalFile } from '@/lib/clinicalFiles';

export type PdfStatusValue = 'generating' | 'ready' | 'failed' | null | undefined;

type TrackerOptions = {
  documentType: string;
  trabajadorId: string;
  documentId: string;
  /** Ruta relativa del PDF para HEAD (opcional, refuerza detección de ready). */
  relativePdfPath?: string | (() => string | null | undefined);
  /** Intervalo inicial entre polls (ms). Por defecto 1200. */
  intervalMs?: number;
  /** Tope de backoff entre polls (ms). Por defecto 4000. */
  maxIntervalMs?: number;
  maxMs?: number;
  onStatus?: (status: PdfStatusValue) => void;
};

/**
 * Poll del pdfStatus del documento (endpoint liviano + HEAD opcional) hasta ready/failed/timeout.
 * Usa backoff exponencial para reducir carga mientras sigue en generating.
 */
export function usePdfGenerationTracker() {
  const localStatus: Ref<PdfStatusValue> = ref(undefined);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let startedAt = 0;
  let runId = 0;

  const stop = () => {
    runId += 1;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const start = (options: TrackerOptions) => {
    stop();
    const currentRunId = runId;
    localStatus.value = 'generating';
    options.onStatus?.('generating');
    startedAt = Date.now();

    const initialIntervalMs = options.intervalMs ?? 1200;
    const maxIntervalMs = options.maxIntervalMs ?? 4000;
    const maxMs = options.maxMs ?? 60000;
    let nextDelayMs = initialIntervalMs;

    const isActive = () => currentRunId === runId;

    const scheduleNext = () => {
      if (!isActive()) return;
      timer = setTimeout(() => {
        void tick();
      }, nextDelayMs);
      nextDelayMs = Math.min(
        Math.round(nextDelayMs * 1.5),
        maxIntervalMs,
      );
    };

    const tick = async () => {
      if (!isActive()) return;

      if (Date.now() - startedAt > maxMs) {
        localStatus.value = 'failed';
        options.onStatus?.('failed');
        stop();
        return;
      }

      try {
        const response = await DocumentosAPI.getPdfStatus(
          options.documentType,
          options.trabajadorId,
          options.documentId,
        );
        if (!isActive()) return;

        const status = response.data?.pdfStatus as PdfStatusValue;

        if (status === 'ready' || status === 'failed') {
          localStatus.value = status;
          options.onStatus?.(status);
          stop();
          return;
        }

        const path =
          typeof options.relativePdfPath === 'function'
            ? options.relativePdfPath()
            : options.relativePdfPath;

        if (path) {
          const available = await headClinicalFile(path, {
            contentType: 'application/pdf',
            probe: 'regenerable',
          });
          if (!isActive()) return;
          if (available) {
            localStatus.value = 'ready';
            options.onStatus?.('ready');
            stop();
            return;
          }
        }
      } catch (error) {
        console.warn('[usePdfGenerationTracker] poll error:', error);
      }

      scheduleNext();
    };

    void tick();
  };

  onUnmounted(stop);

  return {
    localStatus,
    start,
    stop,
  };
}
