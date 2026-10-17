/**
 * Filtro por tipo de documento en el expediente: qué tipos tiene el trabajador (con cuántos),
 * y el filtro en la dirección (`?tipos=audiometria,historiaOtologica`).
 *
 * Si se sale a capturar un documento y al guardar se vuelve al expediente sin parámetros,
 * el filtro se recupera de la sesión de la pestaña, por trabajador.
 */

import { TIPOS_DOCUMENTO_EXPEDIENTE, nombreTipoDocumento } from './documentosExpediente';

export interface TipoConConteo {
  tipo: string;
  nombre: string;
  cantidad: number;
}

type DocumentosPorAnio = Record<string, Record<string, unknown[] | undefined> | undefined>;

const contar = (lista: unknown) => (Array.isArray(lista) ? lista.length : 0);

/** Tipos que tiene el expediente, en el orden por defecto, con su cantidad. Sin tipos vacíos. */
export function tiposConConteo(documentosPorAnio: DocumentosPorAnio | null | undefined): TipoConConteo[] {
  const anios = Object.values(documentosPorAnio ?? {});
  return TIPOS_DOCUMENTO_EXPEDIENTE.map(({ clave, tipo }) => ({
    tipo,
    nombre: nombreTipoDocumento(tipo),
    cantidad: anios.reduce((total, anio) => total + contar(anio?.[clave]), 0),
  })).filter((t) => t.cantidad > 0);
}

/** Tipos del parámetro `tipos` que existen y que el expediente tiene. */
export function tiposDeLaConsulta(valor: unknown, disponibles: readonly string[]): string[] {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  if (typeof texto !== 'string' || !texto) return [];
  const pedidos = new Set(texto.split(',').map((t) => t.trim()).filter(Boolean));
  return disponibles.filter((tipo) => pedidos.has(tipo));
}

export const tiposAConsulta = (tipos: readonly string[]): string | undefined =>
  tipos.length ? tipos.join(',') : undefined;

/** ¿El año tiene algún documento de esos tipos? */
export function anioTieneTipos(documentosDelAnio: Record<string, unknown[] | undefined> | undefined, tipos: readonly string[]): boolean {
  if (!documentosDelAnio) return false;
  return TIPOS_DOCUMENTO_EXPEDIENTE.some(
    ({ clave, tipo }) => tipos.includes(tipo) && contar(documentosDelAnio[clave]) > 0,
  );
}

export function cantidadDeTipos(tipos: readonly TipoConConteo[], elegidos: readonly string[]): number {
  return tipos.filter((t) => elegidos.includes(t.tipo)).reduce((total, t) => total + t.cantidad, 0);
}

// ---- Último filtro por trabajador en la sesión de la pestaña

const clave = (trabajadorId: string) => `ramazzini:expediente:tipos:${trabajadorId}`;

export function guardarFiltroDeSesion(trabajadorId: string | undefined, tipos: readonly string[]): void {
  if (!trabajadorId) return;
  try {
    if (tipos.length) sessionStorage.setItem(clave(trabajadorId), tipos.join(','));
    else sessionStorage.removeItem(clave(trabajadorId));
  } catch {
    // ignorar
  }
}

export function leerFiltroDeSesion(trabajadorId: string | undefined): string | null {
  if (!trabajadorId) return null;
  try {
    return sessionStorage.getItem(clave(trabajadorId));
  } catch {
    return null;
  }
}
