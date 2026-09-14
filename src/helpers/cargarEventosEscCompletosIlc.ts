/**
 * ESC completos para ILC: `findDocuments` por tipo, no el listado flaco de `/todos`.
 * Deduplica in-flight para que Step1 y el visualizador compartan un solo GET.
 */
import DocumentosAPI from '@/api/DocumentosAPI';
import {
  listaEventosEscDesdeRespuestaApi,
  type EventoEscFuenteIlc,
} from '@/helpers/informeLongitudinalTratamiento';
import { mongoIdStr } from '@/helpers/mongoId';

const inflight = new Map<string, Promise<EventoEscFuenteIlc[]>>();

export async function fetchEventosEscCompletosIlc(
  trabajadorId: string | null | undefined,
): Promise<EventoEscFuenteIlc[]> {
  const tid = mongoIdStr(trabajadorId);
  if (!tid) return [];
  const existing = inflight.get(tid);
  if (existing) return existing;

  const p = DocumentosAPI.getEventoSeguimientoCardiometabolico(tid)
    .then(({ data }) => listaEventosEscDesdeRespuestaApi(data))
    .catch((err) => {
      console.error('No se pudieron cargar eventos CM completos para el ILC', err);
      return [] as EventoEscFuenteIlc[];
    })
    .finally(() => {
      inflight.delete(tid);
    });

  inflight.set(tid, p);
  return p;
}
