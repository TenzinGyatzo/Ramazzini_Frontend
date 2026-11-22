/**
 * Punto (53): motivo del examen que se preselecciona al crear una historia clínica nueva.
 * - Con una aptitud anterior a la fecha de la historia clínica → «Periódico».
 * - Sin aptitud anterior: antigüedad menor a un mes → «Ingreso»; de un mes o más → «Inicial».
 * Sin fecha de ingreso (o «No recuerda») no se sugiere nada: queda lo de siempre («Ingreso»).
 */
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { fechaLegible } from '@/helpers/medicionesClinicas';

export type MotivoExamenHC = 'Ingreso' | 'Inicial' | 'Periódico';

/** La fecha más un mes de calendario (31 de enero → 28/29 de febrero), en AAAA-MM-DD. */
function unMesDespues(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const anio = m === 12 ? y + 1 : y;
  const mes = m === 12 ? 1 : m + 1;
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const dia = Math.min(d, ultimoDia);
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

interface DatosSugerencia {
  fechaHistoriaClinica: string | null | undefined;
  fechasAptitudes: Array<string | Date | null | undefined>;
  fechaIngreso: string | Date | null | undefined;
}

export function sugerirMotivoExamenHC(datos: DatosSugerencia): MotivoExamenHC | null {
  return motivoSugeridoConRazon(datos)?.motivo ?? null;
}

/**
 * El motivo y una aclaración corta de por qué (se muestra bajo las opciones mientras el usuario
 * no elija): con aptitud anterior, la fecha de la más reciente; sin ella, la fecha de ingreso.
 */
export function motivoSugeridoConRazon({
  fechaHistoriaClinica,
  fechasAptitudes,
  fechaIngreso,
}: DatosSugerencia): { motivo: MotivoExamenHC; razon: string } | null {
  const fechaHC = formatDateYYYYMMDD(fechaHistoriaClinica);
  if (!fechaHC) return null;

  const previas = fechasAptitudes
    .map((f) => formatDateYYYYMMDD(f))
    .filter((f) => !!f && f < fechaHC)
    .sort();
  if (previas.length > 0) {
    return { motivo: 'Periódico', razon: `Ya tiene una aptitud anterior (${fechaLegible(previas[previas.length - 1])}).` };
  }

  const ingreso = fechaIngreso === 'No recuerda' ? '' : formatDateYYYYMMDD(fechaIngreso);
  if (!ingreso) return null;
  // La fecha basta para entender el motivo; si el ingreso es posterior a la historia clínica
  // (examen antes de entrar), en futuro
  const cuando = ingreso > fechaHC ? `ingresa el ${fechaLegible(ingreso)}` : `ingresó el ${fechaLegible(ingreso)}`;
  return {
    motivo: fechaHC < unMesDespues(ingreso) ? 'Ingreso' : 'Inicial',
    razon: `Sin aptitud anterior; ${cuando}.`,
  };
}
