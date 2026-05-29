import MedicoFirmanteAPI from '@/api/MedicoFirmanteAPI';
import EnfermeraFirmanteAPI from '@/api/EnfermeraFirmanteAPI';
import TecnicoFirmanteAPI from '@/api/TecnicoFirmanteAPI';
import { formatearTituloYNombreFirmante } from '@/helpers/nombres';

export type UsuarioReferencia =
  | string
  | { _id?: string; username?: string; nombre?: string }
  | null
  | undefined;

export interface FirmanteResumido {
  nombre: string;
  primerApellido?: string;
  segundoApellido?: string;
  tituloProfesional?: string;
}

const firmantePorUserIdCache = new Map<string, Promise<FirmanteResumido | null>>();

/** Extrae userId de finalizadoPor/anuladoPor (string id u objeto poblado). */
export function extractUserIdFromReferencia(
  value: UsuarioReferencia,
): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === 'object' && value._id) {
    return String(value._id);
  }
  return null;
}

/** Fallback cuando no hay firmante registrado (username del usuario). */
export function fallbackNombreFromReferencia(value: UsuarioReferencia): string {
  if (!value || typeof value !== 'object') return '';
  return (value.username || value.nombre || '').trim();
}

async function fetchFirmanteByUserId(
  userId: string,
): Promise<FirmanteResumido | null> {
  try {
    const results = await Promise.allSettled([
      MedicoFirmanteAPI.getMedicoFirmanteByUserId(userId),
      EnfermeraFirmanteAPI.getEnfermeraFirmanteByUserId(userId),
      TecnicoFirmanteAPI.getTecnicoFirmanteByUserId(userId),
    ]);

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value?.data) {
        const data = result.value.data;
        if (data._id && data.nombre) {
          return {
            nombre: data.nombre,
            primerApellido: data.primerApellido,
            segundoApellido: data.segundoApellido,
            tituloProfesional: data.tituloProfesional,
          };
        }
      }
    }
  } catch (error) {
    console.error('Error al cargar firmante por userId:', error);
  }

  return null;
}

function getFirmanteByUserIdCached(
  userId: string,
): Promise<FirmanteResumido | null> {
  let pending = firmantePorUserIdCache.get(userId);
  if (!pending) {
    pending = fetchFirmanteByUserId(userId);
    firmantePorUserIdCache.set(userId, pending);
  }
  return pending;
}

/** Resuelve título + nombre completo del firmante a partir de una referencia de usuario. */
export async function resolveNombreFirmantePorReferencia(
  value: UsuarioReferencia,
): Promise<string> {
  const userId = extractUserIdFromReferencia(value);
  if (userId) {
    const firmante = await getFirmanteByUserIdCached(userId);
    if (firmante) {
      return formatearTituloYNombreFirmante(firmante);
    }
  }
  return fallbackNombreFromReferencia(value);
}

/** Precarga nombres de firmantes para una lista de referencias de usuario. */
export async function prefetchNombresFirmantes(
  referencias: UsuarioReferencia[],
): Promise<Record<string, string>> {
  const userIds = [
    ...new Set(
      referencias
        .map(extractUserIdFromReferencia)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const entries = await Promise.all(
    userIds.map(async (userId) => {
      const firmante = await getFirmanteByUserIdCached(userId);
      if (!firmante) return null;
      return [userId, formatearTituloYNombreFirmante(firmante)] as const;
    }),
  );

  return Object.fromEntries(
    entries.filter((entry): entry is [string, string] => entry !== null),
  );
}

/** Nombre a mostrar usando cache precargado por userId. */
export function nombreFirmanteFromReferencia(
  value: UsuarioReferencia,
  cache: Record<string, string>,
): string {
  const userId = extractUserIdFromReferencia(value);
  if (userId && cache[userId]) {
    return cache[userId];
  }
  return fallbackNombreFromReferencia(value);
}
