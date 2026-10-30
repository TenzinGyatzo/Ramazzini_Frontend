export const AYUDA_OTROS_DOCUMENTOS =
  'Certificados, constancias, recetas, cuestionarios, evaluaciones, informes y demás documentos sin columna propia';

export const REGLAS_POR_DEFECTO = {
  aptitudes: 3,
  historias: 1,
  exploraciones: 1,
  examenesVista: 1,
  audiometrias: 1,
  antidopings: 1,
  notas: 2,
  externos: 0,
  otros: 1,
};

export type ReglasDePuntaje = typeof REGLAS_POR_DEFECTO;

export const COLUMNAS_DOCUMENTOS: {
  clave: string;
  regla: keyof ReglasDePuntaje;
  titulo: string;
  ayuda: string;
}[] = [
  { clave: 'totalAptitudes', regla: 'aptitudes', titulo: 'Aptitudes', ayuda: 'Aptitudes' },
  { clave: 'totalHistoriasClinicas', regla: 'historias', titulo: 'Historias', ayuda: 'Historias Clínicas' },
  { clave: 'totalExploracionesFisicas', regla: 'exploraciones', titulo: 'Exploraciones', ayuda: 'Exploraciones Físicas' },
  { clave: 'totalExamenesVista', regla: 'examenesVista', titulo: 'Ex. Vista', ayuda: 'Exámenes de la Vista' },
  { clave: 'totalAudiometrias', regla: 'audiometrias', titulo: 'Audiometrías', ayuda: 'Audiometrías' },
  { clave: 'totalAntidopings', regla: 'antidopings', titulo: 'Antidopings', ayuda: 'Antidopings' },
  { clave: 'totalNotasMedicas', regla: 'notas', titulo: 'Notas', ayuda: 'Notas Médicas' },
  { clave: 'totalDocumentosExternos', regla: 'externos', titulo: 'Externos', ayuda: 'Documentos Externos' },
  { clave: 'totalOtrosDocumentos', regla: 'otros', titulo: 'Otros', ayuda: AYUDA_OTROS_DOCUMENTOS },
];

export interface UsuarioProductividad {
  _id: string;
  username: string;
  email?: string;
  role?: string;
  proveedorNombre?: string;
  productividad?: Record<string, any>;
}

export interface FilaProductividad extends UsuarioProductividad {
  puntuacion: number;
  /** Documentos del periodo anterior; `null` si no hay contra qué comparar. */
  anterior: number | null;
  diferencia: number | null;
}

export function calcularPuntuacion(productividad: Record<string, any> | undefined, reglas: ReglasDePuntaje) {
  if (!productividad) return 0;
  return COLUMNAS_DOCUMENTOS.reduce(
    (puntos, { clave, regla }) => puntos + (productividad[clave] || 0) * (reglas[regla] || 0),
    0,
  );
}

export function armarFilas(
  usuarios: UsuarioProductividad[],
  reglas: ReglasDePuntaje,
  anteriores: Map<string, number> | null,
): FilaProductividad[] {
  return usuarios.map((usuario) => {
    const anterior = anteriores ? (anteriores.get(usuario._id) ?? 0) : null;
    return {
      ...usuario,
      puntuacion: calcularPuntuacion(usuario.productividad, reglas),
      anterior,
      diferencia: anterior === null ? null : (usuario.productividad?.totalDocumentos || 0) - anterior,
    };
  });
}

const valorParaOrdenar = (fila: FilaProductividad, clave: string): string | number => {
  switch (clave) {
    case 'usuario':
      return fila.username.toLocaleLowerCase('es');
    case 'puntos':
      return fila.puntuacion;
    case 'cambio':
      return fila.diferencia ?? 0;
    case 'ultimoInforme':
      return fila.productividad?.ultimoInforme ? new Date(fila.productividad.ultimoInforme).getTime() : 0;
    default:
      return fila.productividad?.[clave] || 0;
  }
};

export function ordenarFilas(filas: FilaProductividad[], clave: string, descendente: boolean) {
  const signo = descendente ? -1 : 1;
  return [...filas].sort((a, b) => {
    const valorA = valorParaOrdenar(a, clave);
    const valorB = valorParaOrdenar(b, clave);
    if (valorA < valorB) return -signo;
    if (valorA > valorB) return signo;
    return a.username.localeCompare(b.username, 'es');
  });
}

export const textoDeDiferencia = (diferencia: number | null) => {
  if (diferencia === null) return '—';
  if (diferencia === 0) return 'Sin cambio';
  return diferencia > 0 ? `+${diferencia}` : `−${Math.abs(diferencia)}`;
};

export const fechaCorta = (fecha: string | Date) =>
  new Date(fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });

/** `YYYY-MM-DD` como día de calendario, sin que la zona horaria lo recorra. */
export const diaCorto = (fecha: string) =>
  new Date(fecha).toLocaleDateString('es-MX', { timeZone: 'UTC' });

export function tiempoTranscurrido(fecha: string | Date | null | undefined, ahora: Date = new Date()) {
  if (!fecha) return 'Sin actividad';
  const minutos = Math.floor((ahora.getTime() - new Date(fecha).getTime()) / 60000);
  if (minutos < 60) return minutos <= 1 ? 'Hace 1 minuto' : `Hace ${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return horas === 1 ? 'Hace 1 hora' : `Hace ${horas} horas`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'Hace 1 día' : `Hace ${dias} días`;
}

export function filasParaExcel(
  filas: FilaProductividad[],
  { conPuntos, conProveedor }: { conPuntos: boolean; conProveedor: boolean },
) {
  return filas.map((fila) => {
    const productividad = fila.productividad ?? {};
    const documentos = Object.fromEntries(
      COLUMNAS_DOCUMENTOS.map(({ clave, ayuda, titulo }) => [
        titulo === 'Otros' ? 'Otros documentos' : ayuda,
        productividad[clave] || 0,
      ]),
    );
    return {
      Usuario: fila.username,
      Correo: fila.email ?? '',
      Rol: fila.role ?? '',
      ...(conProveedor ? { Proveedor: fila.proveedorNombre || 'Sin proveedor' } : {}),
      ...(conPuntos ? { Puntos: fila.puntuacion } : {}),
      ...documentos,
      'Total de documentos': productividad.totalDocumentos || 0,
      ...(fila.anterior === null
        ? {}
        : { 'Periodo anterior': fila.anterior, Diferencia: fila.diferencia ?? 0 }),
      'Último informe': productividad.ultimoInforme ? fechaCorta(productividad.ultimoInforme) : '',
    } as Record<string, string | number>;
  });
}
