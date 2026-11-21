<script setup lang="ts">
/**
 * Captura rápida (punto 38): a quién se le está capturando, sin abrir la vista previa.
 * Dos filas: arriba, nombre con sexo y edad (lo primero que se revisa); abajo, puesto,
 * antigüedad y empresa con íconos de color y divisores (los del encabezado del expediente), y
 * el número de empleado al final. El sexo como se registra: Masculino, Femenino o Intersexual.
 * Edad y antigüedad a la fecha del documento, como en el documento impreso. Lo que el
 * trabajador no tenga capturado no aparece.
 */
import { computed } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useEdadAntiguedadDocumento } from '@/composables/useEdadAntiguedadDocumento';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';

const props = defineProps<{ fechaDocumento?: Date | string | null }>();

const trabajadores = useTrabajadoresStore();
const empresas = useEmpresasStore();
const centros = useCentrosTrabajoStore();
const { edad, antiguedad } = useEdadAntiguedadDocumento(() => props.fechaDocumento);

const trabajador = computed(() => trabajadores.currentTrabajador as Record<string, any> | null | undefined);

const iniciales = computed(() => {
  const t = trabajador.value;
  if (!t) return '';
  // Como el nombre completo: primero el apellido y luego el nombre
  return [t.primerApellido, t.nombre]
    .map((p: unknown) => (typeof p === 'string' ? p.trim().charAt(0) : ''))
    .join('')
    .toUpperCase();
});

const SEXOS = ['Masculino', 'Femenino', 'Intersexual'];

/** «Femenino · 35 años» */
const sexoYEdad = computed(() => {
  const t = trabajador.value;
  const sexo = SEXOS.includes(t?.sexo) ? t?.sexo : '';
  const anios = edad.value != null ? `${edad.value} años` : '';
  return [sexo, anios].filter(Boolean).join(' · ');
});

const textoAntiguedad = computed(() => {
  const a = antiguedad.value;
  if (!a || a === '-' || a === 'Fecha inválida') return '';
  if (a === 'Nuevo Ingreso') return 'Nuevo ingreso';
  return `${a} en la empresa`;
});

const lugar = computed(() =>
  [empresas.currentEmpresa?.nombreComercial, centros.currentCentroTrabajo?.nombreCentro]
    .filter((v) => typeof v === 'string' && v.trim() !== '')
    .join(' · '),
);

const datos = computed(() =>
  [
    trabajador.value?.puesto
      ? { clave: 'puesto', icono: 'fa-briefcase text-blue-500', texto: trabajador.value.puesto, titulo: 'Puesto' }
      : null,
    textoAntiguedad.value
      ? { clave: 'antiguedad', icono: 'fa-clock text-cyan-500', texto: textoAntiguedad.value, titulo: 'Antigüedad' }
      : null,
    lugar.value
      ? { clave: 'empresa', icono: 'fa-building text-emerald-600', texto: lugar.value, titulo: 'Empresa y centro de trabajo' }
      : null,
  ].filter((d): d is { clave: string; icono: string; texto: string; titulo: string } => d !== null),
);
</script>

<template>
  <!-- Dos filas en todos los anchos; en celular, letra más chica, círculo más chico y datos
       seguidos (sin divisores) -->
  <div
    v-if="trabajador"
    data-encabezado-trabajador
    class="mb-3 flex items-center gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white px-3 py-2"
  >
    <div
      class="shrink-0 w-8 h-8 text-xs sm:w-9 sm:h-9 sm:text-sm rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center font-semibold"
      aria-hidden="true"
    >{{ iniciales }}</div>
    <div class="min-w-0 flex-1">
      <p class="flex flex-wrap items-baseline gap-x-2 leading-tight">
        <span class="text-sm sm:text-base font-semibold text-gray-900">{{ formatNombreCompleto(trabajador) }}</span>
        <span v-if="sexoYEdad" class="text-xs sm:text-sm text-gray-500">{{ sexoYEdad }}</span>
      </p>
      <ul class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 sm:gap-x-0 text-xs sm:text-sm text-gray-700">
        <li
          v-for="(d, i) in datos"
          :key="d.clave"
          :title="d.titulo"
          :class="[
            'flex items-center gap-1.5 sm:pr-2.5',
            i > 0 ? 'sm:pl-2.5 sm:border-l sm:border-gray-300 sm:dark:border-slate-600' : '',
          ]"
        >
          <i :class="['fas', d.icono]" aria-hidden="true"></i>
          <span class="sr-only">{{ d.titulo }}:</span>
          {{ d.texto }}
        </li>
        <li
          v-if="trabajador.numeroEmpleado"
          :class="[
            'text-gray-500',
            datos.length ? 'sm:pl-2.5 sm:border-l sm:border-gray-300 sm:dark:border-slate-600' : '',
          ]"
          title="Número de empleado"
        >
          <i class="fas fa-id-badge text-purple-500 mr-1" aria-hidden="true"></i>No. {{ trabajador.numeroEmpleado }}
        </li>
      </ul>
    </div>
  </div>
</template>
