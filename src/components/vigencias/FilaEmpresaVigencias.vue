<script setup lang="ts">
/**
 * Una empresa de la vista «Vigencias» con sus centros. En pantallas anchas es una fila de
 * columnas; en angostas, una tarjeta con los números como etiquetas. Los números de un centro
 * llevan a la tabla de trabajadores ya filtrada; los de la empresa despliegan sus centros.
 */
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { ConteosVigencia, EmpresaVigencias } from '@/api/VigenciasAptitudAPI';
import {
  COLUMNAS_VIGENCIA as COLUMNAS,
  FILTRO_DE_TABLA,
  REJILLA_VIGENCIAS as rejilla,
  TITULO_VENCEN,
  porcentajeAlDia,
  type ColumnaVigencia,
} from '@/helpers/vigenciasGlobales';

const props = defineProps<{
  empresa: EmpresaVigencias;
  expandida: boolean;
  puedeExportar: boolean;
  exportando: boolean;
}>();

const emit = defineEmits<{
  (e: 'alternar'): void;
  (e: 'exportar'): void;
}>();


const conPendientes = computed(() => {
  const c = props.empresa.conteos;
  return c.porVencer + c.vencidasRecientes + c.vencidasAntiguas + c.sinAptitud > 0;
});

const textoAlDia = (conteos: ConteosVigencia) => {
  const porcentaje = porcentajeAlDia(conteos);
  return porcentaje === null ? '—' : `${porcentaje}%`;
};

const colorAlDia = (conteos: ConteosVigencia) => {
  const porcentaje = porcentajeAlDia(conteos) ?? 100;
  if (porcentaje >= 80) return 'text-emerald-700 dark:text-emerald-400';
  if (porcentaje >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const enlaceTabla = (idCentro: string, columna: ColumnaVigencia) => ({
  name: 'trabajadores',
  params: { idEmpresa: props.empresa.idEmpresa, idCentroTrabajo: idCentro },
  query: { vigencia: FILTRO_DE_TABLA[columna] },
});

const tituloVencen = (c: ConteosVigencia) =>
  `Vencen en los próximos 30 días: ${c.vencen30} · de 31 a 60 días: ${c.vencen60} · de 61 a 90 días: ${c.vencen90}`;


const boton =
  'vigencias__enlace inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition duration-150 hover:scale-110 hover:bg-gray-100 motion-reduce:transform-none dark:text-slate-400 dark:hover:bg-slate-700';
</script>

<template>
  <div class="vigencias__empresa" :data-empresa="empresa.idEmpresa">
    <!-- Resumen de la empresa: al hacer clic se despliegan sus centros -->
    <div
      :class="[rejilla, 'vigencias__fila cursor-pointer px-4 py-2.5 transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-slate-700/50']"
      data-test="fila-empresa"
      @click="emit('alternar')"
    >
      <div class="flex min-w-0 items-center gap-2 pr-12 xl:pr-0">
        <button
          type="button"
          class="flex min-w-0 items-center gap-2 text-left"
          :aria-expanded="expandida"
          :aria-label="`${expandida ? 'Ocultar' : 'Ver'} centros de trabajo de ${empresa.nombreEmpresa}`"
          @click.stop="emit('alternar')"
        >
          <i
            class="fas fa-chevron-right w-3 shrink-0 text-xs text-gray-400 transition-transform duration-150 motion-reduce:transition-none"
            :class="{ 'rotate-90': expandida }"
            aria-hidden="true"
          ></i>
          <span class="truncate text-sm font-medium text-gray-900 dark:text-slate-100" :title="empresa.nombreEmpresa">{{ empresa.nombreEmpresa }}</span>
        </button>
      </div>

      <!-- Números: columnas en pantallas anchas, etiquetas en angostas -->
      <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-5 text-sm xl:contents">
        <span class="xl:text-right">
          <span class="mr-1 text-xs text-gray-500 xl:hidden dark:text-slate-400">Activos</span>
          <span class="font-medium tabular-nums text-gray-900 dark:text-slate-100" data-test="activos">{{ empresa.conteos.activos }}</span>
        </span>
        <span v-for="columna in COLUMNAS" :key="columna.clave" class="xl:text-right">
          <span class="mr-1 text-xs text-gray-500 xl:hidden dark:text-slate-400">{{ columna.titulo }}</span>
          <span
            class="font-medium tabular-nums"
            :class="empresa.conteos[columna.clave] ? columna.color : 'vigencias__cero text-gray-300 dark:text-slate-600'"
            :data-test="`empresa-${columna.clave}`"
          >{{ empresa.conteos[columna.clave] }}</span>
        </span>
        <span class="xl:text-center" :title="tituloVencen(empresa.conteos)">
          <span class="mr-1 text-xs text-gray-500 xl:hidden dark:text-slate-400">{{ TITULO_VENCEN }}</span>
          <span class="tabular-nums text-gray-700 dark:text-slate-300">
            {{ empresa.conteos.vencen30 }} · {{ empresa.conteos.vencen60 }} · {{ empresa.conteos.vencen90 }}
          </span>
        </span>
        <span class="xl:text-right">
          <span class="mr-1 text-xs text-gray-500 xl:hidden dark:text-slate-400">Al día</span>
          <span class="font-semibold tabular-nums" :class="colorAlDia(empresa.conteos)">{{ textoAlDia(empresa.conteos) }}</span>
        </span>
      </div>

      <!-- Acciones: a un clic, sin menús -->
      <div class="absolute right-3 top-2 flex items-center gap-0.5 xl:static xl:justify-end" @click.stop>
        <button
          v-if="puedeExportar && conPendientes"
          type="button"
          :class="[boton, 'hover:text-emerald-600']"
          :disabled="exportando"
          title="Exportar pendientes a Excel"
          :aria-label="`Exportar pendientes de ${empresa.nombreEmpresa} a Excel`"
          data-test="exportar"
          @click="emit('exportar')"
        >
          <i :class="exportando ? 'fas fa-spinner fa-spin' : 'fas fa-file-excel'" class="text-sm" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <!-- Centros de trabajo: sus números llevan a la tabla de trabajadores ya filtrada -->
    <Transition name="vigencias-aparecer">
      <ul v-if="expandida" class="border-t border-gray-100 bg-gray-50/60 dark:border-slate-700 dark:bg-slate-900/30" data-test="centros">
        <li v-if="!empresa.centros.length" class="px-4 py-2 pl-9 text-xs text-gray-500 dark:text-slate-400">
          Sin trabajadores activos en sus centros de trabajo.
        </li>
        <li
          v-for="centro in empresa.centros"
          :key="centro.idCentro"
          :class="[rejilla, 'px-4 py-2 pl-9 text-sm']"
          data-test="fila-centro"
        >
          <span class="block truncate text-gray-700 dark:text-slate-300">{{ centro.nombreCentro }}</span>
          <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 xl:contents">
            <span class="xl:text-right">
              <span class="mr-1 text-xs text-gray-500 xl:hidden dark:text-slate-400">Activos</span>
              <span class="tabular-nums text-gray-700 dark:text-slate-300">{{ centro.conteos.activos }}</span>
            </span>
            <span v-for="columna in COLUMNAS" :key="columna.clave" class="xl:text-right">
              <span class="mr-1 text-xs text-gray-500 xl:hidden dark:text-slate-400">{{ columna.titulo }}</span>
              <RouterLink
                v-if="centro.conteos[columna.clave]"
                :to="enlaceTabla(centro.idCentro, columna.clave)"
                class="font-medium tabular-nums underline-offset-2 hover:underline"
                :class="columna.color"
                :title="`Ver en la tabla de trabajadores de ${centro.nombreCentro}`"
                :data-test="`centro-${columna.clave}`"
              >{{ centro.conteos[columna.clave] }}</RouterLink>
              <span v-else class="tabular-nums vigencias__cero text-gray-300 dark:text-slate-600">0</span>
            </span>
            <span class="tabular-nums text-gray-600 xl:text-center dark:text-slate-400" :title="tituloVencen(centro.conteos)">
              <span class="mr-1 text-xs text-gray-500 xl:hidden dark:text-slate-400">{{ TITULO_VENCEN }}</span>
              {{ centro.conteos.vencen30 }} · {{ centro.conteos.vencen60 }} · {{ centro.conteos.vencen90 }}
            </span>
            <span class="xl:text-right">
              <span class="mr-1 text-xs text-gray-500 xl:hidden dark:text-slate-400">Al día</span>
              <span class="tabular-nums" :class="colorAlDia(centro.conteos)">{{ textoAlDia(centro.conteos) }}</span>
            </span>
          </div>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.vigencias__empresa > div:first-child {
  position: relative;
}

.vigencias-aparecer-enter-active,
.vigencias-aparecer-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}

.vigencias-aparecer-enter-from,
.vigencias-aparecer-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .vigencias-aparecer-enter-active,
  .vigencias-aparecer-leave-active {
    transition: none;
  }
}
</style>
