/**
 * Chrome y Edge toman como número de tarjeta todo campo de texto cuyo name, etiqueta o texto de
 * ayuda diga «número» (salvo teléfono o documento); junto a una fecha DD/MM/AAAA, que leen como
 * vencimiento, creen que el formulario es de pago: Chrome muestra un aviso de pagos sin HTTPS y
 * Edge ofrece las tarjetas guardadas. `autocomplete="off"` no lo evita.
 *
 * En un archivo con campos de fecha, todo campo así debe presentarse al navegador con otro name
 * (`sections-schema`) y escribir «Núm​ero» con un espacio de ancho cero.
 */
import { describe, expect, it } from 'vitest';

const archivos = import.meta.glob('/src/**/*.vue', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const ETIQUETA_FORMKIT = /<FormKit\b(?:[^>"']|"[^"]*"|'[^']*')*>/g;
const TIPOS_SIN_TEXTO = /type="(date|hidden|select|checkbox|radio|form|group|list)"/;
const PARECE_NUMERO = /[Nn][úu]mero(?![^"]*(fono|document|calle|colonia))/;

export function camposQueParecenTarjeta(fuentes: Record<string, string>): string[] {
  const hallazgos: string[] = [];
  for (const [ruta, fuente] of Object.entries(fuentes)) {
    const conFecha = /type="date"|FormKitFecha|CampoFecha/.test(fuente);
    if (!conFecha) continue;
    for (const m of fuente.matchAll(ETIQUETA_FORMKIT)) {
      const etiqueta = m[0];
      if (TIPOS_SIN_TEXTO.test(etiqueta)) continue;
      const nombre = /\sname="([^"]*)"/.exec(etiqueta)?.[1] ?? '';
      const textos = [...etiqueta.matchAll(/\s(?:label|placeholder)="([^"]*)"/g)].map((t) => t[1]);
      const nombreRiesgoso = /numero/i.test(nombre) && !etiqueta.includes('sections-schema');
      const textoRiesgoso = textos.some((t) => PARECE_NUMERO.test(t));
      if (nombreRiesgoso || textoRiesgoso) hallazgos.push(`${ruta} → ${nombre || textos.join(' / ')}`);
    }
  }
  return hallazgos.sort();
}

describe('campos que el navegador toma por número de tarjeta', () => {
  it('ningún formulario con fechas tiene un campo «número» a la vista del navegador', () => {
    expect(camposQueParecenTarjeta(archivos)).toEqual([]);
  });

  it('la regla detecta el caso y respeta la corrección', () => {
    const fecha = '<FormKit type="date" name="fechaIngreso" />';
    expect(
      camposQueParecenTarjeta({
        'Mal.vue': `${fecha}<FormKit type="text" label="Número de Empleado" name="numeroEmpleado" />`,
        'Bien.vue': `${fecha}<FormKit type="text" label="Núm​ero de Empleado" name="numeroEmpleado" :sections-schema="{ input: { attrs: { name: 'noEmpleado' } } }" />`,
        'Telefono.vue': `${fecha}<FormKit type="text" label="Teléfono" name="telefono" placeholder="Número de teléfono" />`,
        'SinFecha.vue': '<FormKit type="text" label="Número de Empleado" name="numeroEmpleado" />',
      }),
    ).toEqual(['Mal.vue → numeroEmpleado']);
  });
});
