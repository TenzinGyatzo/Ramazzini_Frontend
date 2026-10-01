import ProveedorSaludAPI from '@/api/ProveedorSaludAPI';

/** Código con el que el servidor rechaza crear una HC cuando el cupo del mes está lleno. */
export const LIMITE_HISTORIAS_ALCANZADO = 'LIMITE_HISTORIAS_ALCANZADO';

export function esLimiteHistoriasAlcanzado(error: unknown): boolean {
  return (error as any)?.response?.data?.code === LIMITE_HISTORIAS_ALCANZADO;
}

/**
 * Antes de abrir una historia clínica nueva: vuelve a contar las HC del mes (otro usuario del
 * mismo proveedor pudo crear alguna desde que se abrió el expediente) y compara con el límite.
 * Si la consulta falla se usa el último conteo conocido, como antes.
 */
export async function verificarLimiteHistoriasDelMes(opciones: {
  idProveedor: string | null | undefined;
  limite: number | null | undefined;
  conteoAnterior: number | null;
}): Promise<{ conteo: number | null; alcanzado: boolean }> {
  const { idProveedor, limite, conteoAnterior } = opciones;
  if (limite == null) return { conteo: conteoAnterior, alcanzado: false };

  let conteo = conteoAnterior;
  if (idProveedor) {
    try {
      const { data } = await ProveedorSaludAPI.getHistoriasClinicasDelMes(idProveedor);
      if (typeof data === 'number') conteo = data;
    } catch (error) {
      console.error('No se pudo actualizar el conteo de historias clínicas del mes:', error);
    }
  }
  return { conteo, alcanzado: conteo != null && conteo >= limite };
}
