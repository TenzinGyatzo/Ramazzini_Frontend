type Oido = 'Derecho' | 'Izquierdo';

export interface AudiometriaCalculosInput {
  metodoAudiometria?: string;
  oidoDerecho500?: number | null;
  oidoDerecho1000?: number | null;
  oidoDerecho2000?: number | null;
  oidoDerecho3000?: number | null;
  oidoIzquierdo500?: number | null;
  oidoIzquierdo1000?: number | null;
  oidoIzquierdo2000?: number | null;
  oidoIzquierdo3000?: number | null;
  perdidaAuditivaBilateralAMA?: number | null;
  hipoacusiaBilateralCombinada?: number | null;
}

function umbral(
  audiometria: AudiometriaCalculosInput,
  oido: Oido,
  freq: number,
): number {
  const campo = `oido${oido}${freq}` as keyof AudiometriaCalculosInput;
  const val = audiometria[campo];
  return val !== null && val !== undefined ? Number(val) : 0;
}

export function calcularPTA_AMA(
  audiometria: AudiometriaCalculosInput,
  oido: Oido,
): number {
  const frecuencias = [500, 1000, 2000, 3000];
  const valores = frecuencias.map((freq) => umbral(audiometria, oido, freq));
  return valores.reduce((acc, val) => acc + val, 0) / frecuencias.length;
}

export function calcularPorcentajeMonauralAMA(
  audiometria: AudiometriaCalculosInput,
  oido: Oido,
): number {
  const pta = calcularPTA_AMA(audiometria, oido);
  const perdida = Math.max(0, pta - 25) * 1.5;
  return Math.round(perdida * 100) / 100;
}

export function calcularPerdidaAuditivaBilateralAMA(
  audiometria: AudiometriaCalculosInput,
): number {
  const od = calcularPorcentajeMonauralAMA(audiometria, 'Derecho');
  const oi = calcularPorcentajeMonauralAMA(audiometria, 'Izquierdo');
  const menor = Math.min(od, oi);
  const mayor = Math.max(od, oi);
  return Math.round(((5 * menor) + mayor) / 6 * 100) / 100;
}

/** HBC registrada: un 0 % es un resultado (audición normal), no un dato faltante. */
export function tieneHipoacusiaBilateralCombinada(audiometria: AudiometriaCalculosInput | null | undefined): boolean {
  const valor = audiometria?.hipoacusiaBilateralCombinada as unknown;
  return valor !== null && valor !== undefined && valor !== '' && Number.isFinite(Number(valor));
}

/** PAB (AMA) o HBC (LFT) calculados desde frecuencias, alineados con visualizador/PDF. */
export function obtenerResultadoBinauralAudiometria(
  audiometria: AudiometriaCalculosInput,
): number | null {
  const metodo = audiometria.metodoAudiometria || 'AMA';
  if (metodo === 'AMA') {
    return calcularPerdidaAuditivaBilateralAMA(audiometria);
  }
  if (metodo === 'LFT') {
    return audiometria.hipoacusiaBilateralCombinada ?? null;
  }
  return audiometria.hipoacusiaBilateralCombinada ?? null;
}
