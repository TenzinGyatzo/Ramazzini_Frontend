/**
 * Tabla de trabajadores: cuando la audiometría que cuenta es la registrada como
 * resultado clínico (hecha por un tercero), su resultado y su grado se muestran
 * con las mismas palabras que una audiometría capturada en Ramazzini, para que
 * los filtros las incluyan.
 */
interface ResumenConExterna {
  externa?: { resultadoGlobal?: string | null; gradoHipoacusia?: string | null } | null;
}

const CATEGORIA_POR_GRADO: Record<string, string> = {
  LEVE: 'Hipoacusia leve',
  MODERADA: 'Hipoacusia moderada',
  MODERADA_SEVERA: 'H. moderada-severa',
  SEVERA: 'Hipoacusia severa',
  PROFUNDA: 'Hipoacusia profunda',
};

/** «Normal», «Anormal» o «-»; `null` si la audiometría no es externa. */
export function resultadoDeAudiometriaExterna(resumen: ResumenConExterna | null | undefined): string | null {
  if (!resumen?.externa) return null;
  if (resumen.externa.resultadoGlobal === 'NORMAL') return 'Normal';
  if (resumen.externa.resultadoGlobal === 'ANORMAL') return 'Anormal';
  return '-';
}

/** «Normal», el grado de hipoacusia o «-»; `null` si la audiometría no es externa. */
export function categoriaDeAudiometriaExterna(resumen: ResumenConExterna | null | undefined): string | null {
  if (!resumen?.externa) return null;
  if (resumen.externa.resultadoGlobal === 'NORMAL') return 'Normal';
  if (resumen.externa.resultadoGlobal === 'ANORMAL') {
    return CATEGORIA_POR_GRADO[resumen.externa.gradoHipoacusia ?? ''] ?? '-';
  }
  return '-';
}
