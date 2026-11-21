/**
 * Punto 43: color sólido de la interpretación de la agudeza visual y del Ishihara (como las
 * categorías de la exploración física): verde lo normal, ámbar lo ligeramente reducido,
 * naranja lo moderado o significativo, rojo lo muy reducido o la ceguera, gris lo no evaluable.
 * Con un solo ojo («OI: …» / «OD: …») o los dos en renglones, manda el peor.
 */
const ORDEN = [
  { color: 'bg-emerald-600', textos: ['Visión excepcional', 'Visión normal', 'Normal'] },
  { color: 'bg-amber-600', textos: ['Visión ligeramente reducida'] },
  { color: 'bg-orange-600', textos: ['Visión moderadamente reducida', 'Visión significativamente reducida'] },
  { color: 'bg-red-600', textos: ['Visión muy reducida', 'Ceguera total', 'Daltonismo'] },
];

export function colorAgudeza(interpretacion: string | null | undefined): string {
  if (!interpretacion) return 'bg-gray-400';
  const partes = interpretacion
    .split(/\s*(?:OI|OD):\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  let peor = -1;
  for (const parte of partes) {
    const i = ORDEN.findIndex((o) => o.textos.includes(parte));
    if (i > peor) peor = i;
  }
  return peor >= 0 ? ORDEN[peor].color : 'bg-slate-500';
}
