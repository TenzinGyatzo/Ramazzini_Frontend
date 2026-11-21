/**
 * En un componente con `<script setup>` sin `lang="ts"`, una anotación como
 * `ref<HTMLElement | null>(null)` no da error: se lee como comparaciones (`ref < HTMLElement`)
 * y deja un número en lugar de una referencia. La revisión de tipos no revisa esos archivos.
 * Así quedó apilada la nota médica con vista previa (punto 38).
 */
import { describe, expect, it } from 'vitest';

const archivos = import.meta.glob('/src/**/*.vue', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const SCRIPT_JS = /<script\b(?![^>]*lang=["']ts["'])[^>]*>([\s\S]*?)<\/script>/g;
const GENERICO_TS = /\b(?:ref|shallowRef|computed|reactive|readonly|defineProps|defineEmits|defineModel|inject)\s*<\s*[A-Za-z{[(]/;

export function genericosEnJs(fuentes: Record<string, string>): string[] {
  const hallazgos: string[] = [];
  for (const [ruta, fuente] of Object.entries(fuentes)) {
    for (const m of fuente.matchAll(SCRIPT_JS)) {
      const linea = m[1].split('\n').find((l) => GENERICO_TS.test(l) && !l.trim().startsWith('//') && !l.trim().startsWith('*'));
      if (linea) hallazgos.push(`${ruta}: ${linea.trim()}`);
    }
  }
  return hallazgos.sort();
}

describe('anotaciones de tipo en componentes JavaScript', () => {
  it('ningún componente sin lang="ts" usa genéricos de TypeScript', () => {
    expect(genericosEnJs(archivos)).toEqual([]);
  });

  it('la regla detecta el caso', () => {
    expect(
      genericosEnJs({
        'Mal.vue': '<script setup>\nconst a = ref<HTMLElement | null>(null);\n</script>',
        'Bien.vue': '<script setup>\nconst a = ref(null);\n</script>',
        'Ts.vue': '<script setup lang="ts">\nconst a = ref<HTMLElement | null>(null);\n</script>',
      }),
    ).toEqual(['Mal.vue: const a = ref<HTMLElement | null>(null);']);
  });
});
