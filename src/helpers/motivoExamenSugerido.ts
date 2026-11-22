/**
 * Punto (53): motivo del examen que se preselecciona al crear una historia clínica nueva.
 * - Con una aptitud anterior a la fecha de la historia clínica → «Periódico».
 * - Sin aptitud anterior: antigüedad menor a un mes → «Ingreso»; de un mes o más → «Inicial».
 * Sin fecha de ingreso (o «No recuerda») no se sugiere nada: queda lo de siempre («Ingreso»).
 */
import { formatDateYYYYMMDD } from '@/helpers/dates';

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

export function sugerirMotivoExamenHC({
  fechaHistoriaClinica,
  fechasAptitudes,
  fechaIngreso,
}: {
  fechaHistoriaClinica: string | null | undefined;
  fechasAptitudes: Array<string | Date | null | undefined>;
  fechaIngreso: string | Date | null | undefined;
}): MotivoExamenHC | null {
  const fechaHC = formatDateYYYYMMDD(fechaHistoriaClinica);
  if (!fechaHC) return null;

  const hayAptitudPrevia = fechasAptitudes.some((f) => {
    const fecha = formatDateYYYYMMDD(f);
    return !!fecha && fecha < fechaHC;
  });
  if (hayAptitudPrevia) return 'Periódico';

  const ingreso = fechaIngreso === 'No recuerda' ? '' : formatDateYYYYMMDD(fechaIngreso);
  if (!ingreso) return null;
  return fechaHC < unMesDespues(ingreso) ? 'Ingreso' : 'Inicial';
}
