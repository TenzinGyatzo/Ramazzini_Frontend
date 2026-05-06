import type { DocumentsByYear } from '@/stores/documentos';
import type { ExploracionFisica } from '@/interfaces/documentos.inteface';

/** Altura en metros (consistente con exploración física y ESC). */
const ALTURA_MIN_M = 0.8;
const ALTURA_MAX_M = 2.5;

/** kg — mismo orden que validaciones Step 3 ESC */
const PESO_MIN_KG = 35;
const PESO_MAX_KG = 300;

function pesoValidoKg(p: unknown): number | undefined {
  if (p == null || typeof p !== 'number' || Number.isNaN(p) || !Number.isFinite(p)) return undefined;
  if (p < PESO_MIN_KG || p > PESO_MAX_KG) return undefined;
  return p;
}

function alturaValidaM(a: unknown): number | undefined {
  if (a == null || typeof a !== 'number' || Number.isNaN(a) || !Number.isFinite(a)) return undefined;
  if (a < ALTURA_MIN_M || a > ALTURA_MAX_M) return undefined;
  return a;
}

/**
 * Peso y/o altura de la exploración física más reciente por fecha (`fechaExploracionFisica`).
 * Solo el último documento del trabajador; si ese informe no trae un dato válido, no se buscan otros estudios.
 */
export type SomatometriaUltimaExploracionFisica = {
  peso?: number;
  altura?: number;
  /** Fecha del informe EF usado como fuente (misma que `fechaExploracionFisica` del documento más reciente). */
  fechaExploracionFisica?: string;
};

export function obtenerSomatometriaUltimaExploracionFisica(
  documentsByYear: DocumentsByYear | undefined | null,
  trabajadorId: string | undefined | null,
): SomatometriaUltimaExploracionFisica | undefined {
  if (!documentsByYear || !trabajadorId) return undefined;

  const todas: ExploracionFisica[] = [];
  for (const yearData of Object.values(documentsByYear)) {
    const arr = yearData?.exploracionesFisicas;
    if (Array.isArray(arr)) todas.push(...arr);
  }

  const delTrabajador = todas.filter((d) => d.idTrabajador === trabajadorId);
  if (delTrabajador.length === 0) return undefined;

  delTrabajador.sort((x, y) => {
    const tx = new Date(x.fechaExploracionFisica).getTime();
    const ty = new Date(y.fechaExploracionFisica).getTime();
    return ty - tx;
  });

  const ultima = delTrabajador[0];
  const peso = pesoValidoKg(ultima?.peso);
  const altura = alturaValidaM(ultima?.altura);

  if (peso === undefined && altura === undefined) return {};

  const fechaExploracionFisica =
    typeof ultima?.fechaExploracionFisica === 'string' && ultima.fechaExploracionFisica.trim() !== ''
      ? ultima.fechaExploracionFisica
      : undefined;

  return {
    ...(peso !== undefined ? { peso } : {}),
    ...(altura !== undefined ? { altura } : {}),
    ...(fechaExploracionFisica !== undefined ? { fechaExploracionFisica } : {}),
  };
}

/** Altura del mismo último informe que `obtenerSomatometriaUltimaExploracionFisica`. */
export function obtenerAlturaUltimaExploracionFisica(
  documentsByYear: DocumentsByYear | undefined | null,
  trabajadorId: string | undefined | null,
): number | undefined {
  return obtenerSomatometriaUltimaExploracionFisica(documentsByYear, trabajadorId)?.altura;
}
