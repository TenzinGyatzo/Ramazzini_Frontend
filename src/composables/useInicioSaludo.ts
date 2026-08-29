export type InicioSaludoPeriodo = 'días' | 'tardes' | 'noches';

export function getInicioSaludoPeriodo(
  date: Date = new Date(),
): InicioSaludoPeriodo {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'días';
  if (hour >= 12 && hour < 19) return 'tardes';
  return 'noches';
}

export function formatInicioSaludo(
  username: string,
  date: Date = new Date(),
): string {
  const periodo = getInicioSaludoPeriodo(date);
  const name = username.trim();
  const prefijo = periodo === 'días' ? 'Buenos' : 'Buenas';
  return name ? `${prefijo} ${periodo}, ${name}` : `${prefijo} ${periodo}`;
}
