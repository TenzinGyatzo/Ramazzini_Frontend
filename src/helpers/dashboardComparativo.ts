/**
 * Tablero de salud: comparación del periodo elegido contra otro periodo.
 * Los dos periodos se consultan con el mismo centro y los mismos filtros de
 * población; aquí se calculan los mismos indicadores para cada uno y su cambio.
 */
import {
  contarPorAptitudPuesto,
  contarPorCategoriaIMCConPorcentaje,
  contarPorCategoriaTensionArterial,
} from './dashboardDataProcessor';
import { resumirDiagnosticos, type DiagnosticoDeTablero } from './dashboardDiagnosticos';
import { registrosDe } from './dashboardSecciones';

type Datos = Parameters<typeof registrosDe>[0];

export type ModoDeComparacion = 'anterior' | 'anioAnterior';

export const MODOS_DE_COMPARACION: { valor: ModoDeComparacion; texto: string }[] = [
  { valor: 'anterior', texto: 'El periodo inmediato anterior' },
  { valor: 'anioAnterior', texto: 'El mismo periodo del año anterior' },
];

const MS_POR_DIA = 86_400_000;
const aFecha = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
const aISO = (fecha: Date) => fecha.toISOString().slice(0, 10);

/**
 * Periodo contra el que se compara (fechas AAAA-MM-DD); null si el periodo
 * elegido no es válido. «Anterior» es el tramo de igual duración que termina el
 * día previo; «año anterior», las mismas fechas un año antes.
 */
export function periodoDeReferencia(
  inicio: string | null | undefined,
  fin: string | null | undefined,
  modo: ModoDeComparacion,
): { desde: string; hasta: string } | null {
  if (!inicio || !fin || inicio > fin) return null;
  const desde = aFecha(inicio);
  const hasta = aFecha(fin);
  if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) return null;

  if (modo === 'anioAnterior') {
    const unAnioAntes = (fecha: Date) => {
      const copia = new Date(fecha);
      copia.setUTCFullYear(copia.getUTCFullYear() - 1);
      // 29 de febrero → 28 de febrero del año anterior
      if (copia.getUTCMonth() !== fecha.getUTCMonth()) copia.setUTCDate(0);
      return copia;
    };
    return { desde: aISO(unAnioAntes(desde)), hasta: aISO(unAnioAntes(hasta)) };
  }
  const dias = Math.round((hasta.getTime() - desde.getTime()) / MS_POR_DIA) + 1;
  const finAnterior = new Date(desde.getTime() - MS_POR_DIA);
  const inicioAnterior = new Date(finAnterior.getTime() - (dias - 1) * MS_POR_DIA);
  return { desde: aISO(inicioAnterior), hasta: aISO(finAnterior) };
}

export interface Indicador {
  clave: string;
  titulo: string;
  /** null cuando no hay con qué calcularlo. */
  valor: number | null;
  /** '%' para proporciones; cadena vacía para conteos. */
  unidad: '%' | '';
  /** De cuántos se calculó la proporción. */
  base?: number;
  /** Que suba es desfavorable (true), favorable (false) o ni lo uno ni lo otro (null). */
  subirEsMalo: boolean | null;
}

const suma = (filas: [string, number, ...unknown[]][]) => filas.reduce((total, fila) => total + fila[1], 0);
const proporcion = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : null);

/** Indicadores que dependen del periodo; la plantilla y los agentes de riesgo no cambian con él. */
export function indicadoresDelPeriodo(datos: Datos, indiceCentro: number | null): Indicador[] {
  const de = (clave: string) => registrosDe(datos, indiceCentro, clave) as any[];

  const imc = contarPorCategoriaIMCConPorcentaje(de('imc'));
  const conIMC = suma(imc);
  const exceso = suma(imc.filter(([categoria]) => /sobrepeso|obesidad/i.test(categoria)));

  const tension = contarPorCategoriaTensionArterial(de('tensionArterial'));
  const conTension = suma(tension);
  const elevada = suma(tension.filter(([categoria]) => /^alta$|hipertensi/i.test(categoria)));

  const cintura = de('circunferenciaCintura');
  const conCintura = cintura.filter((c) => c?.categoriaCircunferenciaCintura).length;
  const cinturaAlta = cintura.filter((c) => c?.categoriaCircunferenciaCintura?.trim() === 'Alto Riesgo').length;

  const aptitud = contarPorAptitudPuesto(de('aptitudes'));
  const conAptitud = suma(aptitud);
  const aptos = aptitud.find(([categoria]) => categoria === 'Apto Sin Restricciones')?.[1] ?? 0;

  return [
    { clave: 'exploraciones', titulo: 'Trabajadores con exploración física', valor: conIMC, unidad: '', subirEsMalo: null },
    {
      clave: 'sobrepeso',
      titulo: 'Con sobrepeso u obesidad',
      valor: proporcion(exceso, conIMC),
      unidad: '%',
      base: conIMC,
      subirEsMalo: true,
    },
    {
      clave: 'presion',
      titulo: 'Con presión arterial alta o hipertensión',
      valor: proporcion(elevada, conTension),
      unidad: '%',
      base: conTension,
      subirEsMalo: true,
    },
    {
      clave: 'cintura',
      titulo: 'Con cintura de alto riesgo',
      valor: proporcion(cinturaAlta, conCintura),
      unidad: '%',
      base: conCintura,
      subirEsMalo: true,
    },
    { clave: 'aptitudes', titulo: 'Trabajadores con aptitud evaluada', valor: conAptitud, unidad: '', subirEsMalo: null },
    {
      clave: 'aptos',
      titulo: 'Aptos sin restricciones',
      valor: proporcion(aptos, conAptitud),
      unidad: '%',
      base: conAptitud,
      subirEsMalo: false,
    },
    { clave: 'consultas', titulo: 'Consultas médicas', valor: de('consultas').length, unidad: '', subirEsMalo: null },
  ];
}

export interface FilaComparativa {
  clave: string;
  titulo: string;
  unidad: '%' | '';
  referencia: number | null;
  actual: number | null;
  /** Actual menos referencia: puntos porcentuales en las proporciones, unidades en los conteos. */
  cambio: number | null;
  sentido: 'sube' | 'baja' | 'igual' | null;
  /** Si el cambio es favorable, desfavorable o no se califica. */
  lectura: 'favorable' | 'desfavorable' | 'neutra';
}

export function comparar(actual: Indicador[], referencia: Indicador[]): FilaComparativa[] {
  return actual.map((indicador) => {
    const anterior = referencia.find((r) => r.clave === indicador.clave)?.valor ?? null;
    const cambio =
      indicador.valor === null || anterior === null ? null : Math.round((indicador.valor - anterior) * 10) / 10;
    const sentido = cambio === null ? null : cambio > 0 ? 'sube' : cambio < 0 ? 'baja' : 'igual';
    const lectura =
      indicador.subirEsMalo === null || sentido === null || sentido === 'igual'
        ? 'neutra'
        : (sentido === 'sube') === indicador.subirEsMalo
          ? 'desfavorable'
          : 'favorable';
    return {
      clave: indicador.clave,
      titulo: indicador.titulo,
      unidad: indicador.unidad,
      referencia: anterior,
      actual: indicador.valor,
      cambio,
      sentido,
      lectura,
    };
  });
}

export const textoDeValor = (valor: number | null, unidad: '%' | '') =>
  valor === null ? '—' : unidad === '%' ? `${valor} %` : String(valor);

/** «+3.5 pp», «−2», «Sin cambio» o «—». */
export function textoDeCambio(fila: FilaComparativa): string {
  if (fila.cambio === null) return '—';
  if (fila.cambio === 0) return 'Sin cambio';
  const signo = fila.cambio > 0 ? '+' : '−';
  return `${signo}${Math.abs(fila.cambio)}${fila.unidad === '%' ? ' pp' : ''}`;
}

/** Diagnóstico más frecuente de un periodo, o cadena vacía. */
export function diagnosticoPrincipal(datos: Datos, indiceCentro: number | null): string {
  const resumen = resumirDiagnosticos(registrosDe(datos, indiceCentro, 'diagnosticos') as DiagnosticoDeTablero[]);
  const principal = resumen.porCodigo[0];
  return principal ? `${principal.etiqueta} (${principal.cantidad})` : '';
}

// ---- Entre centros de trabajo

export interface FilaDeCentro {
  id: string;
  nombre: string;
  activos: number;
  indicadores: Indicador[];
}

export interface ComparativoDeCentros {
  filas: FilaDeCentro[];
  /**
   * Por indicador calificable, el centro con el valor menos favorable. Solo se
   * señala cuando al menos dos centros tienen el dato y no están empatados.
   */
  menosFavorable: Record<string, string>;
}

/** Los mismos indicadores para cada centro; el periodo y los filtros son los del tablero. */
export function compararCentros(
  datos: Datos,
  centros: { _id: string; nombreCentro: string }[],
): ComparativoDeCentros {
  const filas: FilaDeCentro[] = centros.map((centro, indice) => ({
    id: String(centro._id),
    nombre: centro.nombreCentro,
    activos: registrosDe(datos, indice, 'grupoEtario').length,
    indicadores: indicadoresDelPeriodo(datos, indice),
  }));

  const menosFavorable: Record<string, string> = {};
  for (const indicador of filas[0]?.indicadores ?? []) {
    if (indicador.subirEsMalo === null) continue;
    const conDato = filas
      .map((fila) => ({ id: fila.id, valor: fila.indicadores.find((i) => i.clave === indicador.clave)?.valor ?? null }))
      .filter((fila): fila is { id: string; valor: number } => fila.valor !== null);
    if (conDato.length < 2) continue;
    const valores = conDato.map((fila) => fila.valor);
    const peor = indicador.subirEsMalo ? Math.max(...valores) : Math.min(...valores);
    const empatados = conDato.filter((fila) => fila.valor === peor);
    if (empatados.length === 1 && Math.max(...valores) !== Math.min(...valores)) {
      menosFavorable[indicador.clave] = empatados[0].id;
    }
  }
  return { filas, menosFavorable };
}

/** Columnas de la tabla por centro, en el orden de los indicadores. */
export const columnasDeCentros = (comparativo: ComparativoDeCentros): string[] => [
  'Centro de trabajo',
  'Trabajadores activos',
  ...(comparativo.filas[0]?.indicadores ?? []).map((indicador) => indicador.titulo),
];
