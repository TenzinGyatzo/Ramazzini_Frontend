/**
 * Tablero de salud: cobertura de vigilancia según la exposición. De los
 * trabajadores activos expuestos a un agente, cuántos tienen en el periodo el
 * estudio que le corresponde. El servidor entrega los conteos por centro; aquí
 * se suman y se decide qué filas mostrar.
 */

export type EstudioDeCobertura = 'audiometria' | 'espirometria' | 'nordico';

export interface CoberturaDeTablero {
  agente: string;
  estudio: EstudioDeCobertura;
  expuestos: number;
  conEstudio: number;
}

export interface FilaDeCobertura {
  clave: EstudioDeCobertura;
  etiqueta: string;
  cantidad: number;
  total: number;
}

/** Sección del tablero cuyo historial dice si el centro usa ese estudio. */
const DE_CADA_ESTUDIO: Record<EstudioDeCobertura, { etiqueta: string; seccion: string }> = {
  audiometria: { etiqueta: 'Ruido: con audiometría', seccion: 'gabinete' },
  espirometria: { etiqueta: 'Polvos: con espirometría', seccion: 'gabinete' },
  nordico: { etiqueta: 'Ergonómicos: con Cuestionario Nórdico', seccion: 'musculoesqueletico' },
};

/**
 * Una fila por estudio, solo si hay expuestos. Si el centro nunca ha usado ese
 * estudio, la fila se omite: un «0 de 20» diría que falta algo que no usan.
 * Con estudios en el periodo se muestra siempre.
 */
export function resumirCobertura(
  registros: CoberturaDeTablero[],
  historial: Record<string, boolean> = {},
): FilaDeCobertura[] {
  return (Object.keys(DE_CADA_ESTUDIO) as EstudioDeCobertura[])
    .map((estudio) => {
      const suyos = registros.filter((r) => r?.estudio === estudio);
      return {
        clave: estudio,
        etiqueta: DE_CADA_ESTUDIO[estudio].etiqueta,
        cantidad: suyos.reduce((suma, r) => suma + (Number(r.conEstudio) || 0), 0),
        total: suyos.reduce((suma, r) => suma + (Number(r.expuestos) || 0), 0),
      };
    })
    .filter((fila) => fila.total > 0 && (fila.cantidad > 0 || historial[DE_CADA_ESTUDIO[fila.clave].seccion] !== false));
}

export const porcentajeDeCobertura = (fila: FilaDeCobertura) =>
  fila.total > 0 ? Math.round((fila.cantidad / fila.total) * 100) : 0;
