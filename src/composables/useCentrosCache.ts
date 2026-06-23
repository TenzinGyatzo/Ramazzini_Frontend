import AssignmentsAPI from '@/api/AssignmentsAPI';

export interface CentroTrabajoCached {
  _id: string;
  nombreCentro: string;
  direccion?: string;
  idEmpresa: string;
}

const cache = new Map<string, CentroTrabajoCached[]>();

async function fetchAndCache(pending: string[]): Promise<void> {
  if (pending.length === 0) return;

  const { data } = await AssignmentsAPI.getCentrosByEmpresas(pending);
  const centros: CentroTrabajoCached[] = data ?? [];
  const byEmpresa = new Map<string, CentroTrabajoCached[]>();

  for (const id of pending) {
    byEmpresa.set(id, []);
  }

  for (const centro of centros) {
    const empresaId = String(centro.idEmpresa);
    if (!byEmpresa.has(empresaId)) {
      byEmpresa.set(empresaId, []);
    }
    byEmpresa.get(empresaId)!.push(centro);
  }

  for (const id of pending) {
    cache.set(id, byEmpresa.get(id) ?? []);
  }
}

export async function preloadCentros(empresaIds: string[]): Promise<void> {
  const unique = [...new Set(empresaIds.filter(Boolean))];
  const pending = unique.filter((id) => !cache.has(id));
  await fetchAndCache(pending);
}

export async function getCentrosForEmpresas(
  empresaIds: string[],
): Promise<CentroTrabajoCached[]> {
  await preloadCentros(empresaIds);
  const unique = [...new Set(empresaIds.filter(Boolean))];
  return unique.flatMap((id) => cache.get(id) ?? []);
}

export function clearCentrosCache(): void {
  cache.clear();
}
