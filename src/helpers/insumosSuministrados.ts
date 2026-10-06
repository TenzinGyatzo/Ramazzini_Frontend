export type UsoInsumo = 'ADMINISTRADO' | 'ENTREGADO';

/** Renglón en captura: puede estar incompleto mientras el usuario lo llena. */
export interface FilaInsumoSuministrado {
  idInsumo: string;
  cantidad: number | null | '';
  uso: UsoInsumo;
}

export interface InsumoSuministrado {
  idInsumo: string;
  cantidad: number;
  uso: UsoInsumo;
}

export interface LineaInventario {
  nombre: string;
  unidad: string;
  cantidad: number;
}

export interface ResumenInventario {
  descontados?: LineaInventario[];
  devueltos?: LineaInventario[];
  avisos?: string[];
}

/** Lo guardado en el documento → renglones editables. Acepta el insumo poblado o su id. */
export function filasDesdeDocumento(valor: unknown): FilaInsumoSuministrado[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .map((item) => {
      const crudo = (item as any)?.idInsumo;
      const idInsumo = String(
        (crudo && typeof crudo === 'object' ? crudo._id : crudo) ?? '',
      );
      return {
        idInsumo,
        cantidad: Number((item as any)?.cantidad) || 1,
        uso: ((item as any)?.uso === 'ENTREGADO'
          ? 'ENTREGADO'
          : 'ADMINISTRADO') as UsoInsumo,
      };
    })
    .filter((fila) => fila.idInsumo);
}

/**
 * Renglones listos para guardar: con insumo, cantidad entera ≥ 1 y sin insumos
 * repetidos (el servidor rechaza duplicados; se conserva el primero).
 */
export function filasValidas(filas: FilaInsumoSuministrado[]): InsumoSuministrado[] {
  const vistos = new Set<string>();
  const validas: InsumoSuministrado[] = [];
  for (const fila of filas) {
    const cantidad = Number(fila.cantidad);
    if (!fila.idInsumo || !Number.isInteger(cantidad) || cantidad < 1) continue;
    if (vistos.has(fila.idInsumo)) continue;
    vistos.add(fila.idInsumo);
    validas.push({ idInsumo: fila.idInsumo, cantidad, uso: fila.uso });
  }
  return validas;
}

const lista = (lineas: LineaInventario[]) =>
  lineas.map((l) => `${l.nombre} × ${l.cantidad}`).join(', ');

/** Mensajes para avisar al usuario qué movió el guardado en el inventario. */
export function mensajesDeInventario(resumen: ResumenInventario | null | undefined): {
  info: string[];
  avisos: string[];
} {
  const info: string[] = [];
  if (resumen?.descontados?.length) {
    info.push(`Se descontaron del inventario: ${lista(resumen.descontados)}`);
  }
  if (resumen?.devueltos?.length) {
    info.push(`Se devolvieron al inventario: ${lista(resumen.devueltos)}`);
  }
  return { info, avisos: resumen?.avisos ?? [] };
}
