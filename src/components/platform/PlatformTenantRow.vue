<script setup lang="ts">
import { computed } from "vue";
import {
  clasificarEstado,
  etiquetaContratacion,
  motivosAtencion,
  usoHistorias,
  type ConsolaProveedor,
} from "@/utils/platformConsole";

/** Fila de la consola de plataforma (tabla en escritorio, tarjeta en móvil). */
const props = defineProps<{
  proveedor: ConsolaProveedor & { logotipoEmpresa?: { data?: string } | null };
  seleccionado?: boolean;
  activo?: boolean;
  entrando?: boolean;
}>();
const emit = defineEmits<{
  (e: "abrir"): void;
  (e: "entrar"): void;
  (e: "ajustes"): void;
}>();

const estado = computed(() => clasificarEstado(props.proveedor));
const uso = computed(() => usoHistorias(props.proveedor));
const atencion = computed(() => motivosAtencion(props.proveedor).length > 0);
const detalleCargado = computed(() => props.proveedor._detalleCargado !== false);

const iniciales = computed(() =>
  (props.proveedor.nombre ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join(""),
);
const baseURL = import.meta.env.VITE_API_URL || "https://ramazzini.app";
const logoSrc = computed(() =>
  props.proveedor.logotipoEmpresa?.data
    ? `${baseURL}/assets/providers-logos/${props.proveedor.logotipoEmpresa.data}`
    : null,
);

const tonoEstado: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  danger: "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  accent: "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  neutral: "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300",
};
const colorBarra = computed(() =>
  uso.value.porcentaje >= 100 ? "bg-red-500" : uso.value.porcentaje >= 80 ? "bg-amber-500" : "bg-sky-500",
);
</script>

<template>
  <div
    role="row"
    tabindex="0"
    data-testid="platform-tenant-row"
    class="grid cursor-pointer grid-cols-1 gap-3 px-4 py-3 outline-none transition-colors hover:bg-gray-50 focus-visible:bg-sky-50 md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_minmax(0,0.8fr)_auto] md:items-center md:gap-4 dark:hover:bg-slate-800/60 dark:focus-visible:bg-slate-800"
    :class="seleccionado ? 'bg-sky-50/70 dark:bg-slate-800' : ''"
    @click="emit('abrir')"
    @keydown.enter.prevent="emit('abrir')"
  >
    <!-- Proveedor -->
    <div class="flex min-w-0 items-center gap-3" role="cell">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sky-50 text-xs font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
        <img v-if="logoSrc" :src="logoSrc" alt="" loading="lazy" class="h-full w-full object-contain" />
        <span v-else>{{ iniciales }}</span>
      </div>
      <div class="min-w-0">
        <p class="flex items-center gap-1.5 truncate font-medium text-gray-900 dark:text-slate-100">
          <span class="truncate">{{ proveedor.nombre || "Sin nombre" }}</span>
          <i v-if="atencion" class="fa-solid fa-circle-exclamation text-xs text-amber-500" title="Requiere atención" aria-label="Requiere atención"></i>
          <span v-if="activo" class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">ACTIVO</span>
        </p>
        <p class="truncate text-xs text-gray-500 dark:text-slate-400">
          {{ proveedor.pais || "—" }} · {{ proveedor.regimenRegulatorio === "SIRES_NOM024" ? "SIRES" : "Sin régimen" }}
          <template v-if="proveedor.principalUser?.username"> · {{ proveedor.principalUser.username }}</template>
        </p>
      </div>
    </div>

    <!-- Estado y contratación -->
    <div role="cell" class="flex flex-wrap items-center gap-1">
      <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="tonoEstado[estado.tono]" data-testid="row-estado">{{ estado.etiqueta }}</span>
      <span v-if="proveedor.restriccionManual" class="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
        <i class="fa-solid fa-lock text-[10px]" aria-hidden="true"></i> Restringido
      </span>
      <span
        v-if="(proveedor.facturasPendientes ?? 0) > 0"
        data-testid="row-facturas"
        class="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
      >
        <i class="fa-solid fa-file-invoice text-[10px]" aria-hidden="true"></i> {{ proveedor.facturasPendientes }}
      </span>
      <span class="w-full truncate text-[11px] text-gray-500 dark:text-slate-400" data-testid="row-contratacion">{{ etiquetaContratacion(proveedor) }}</span>
    </div>

    <!-- HC del mes -->
    <div role="cell" data-testid="row-uso">
      <template v-if="detalleCargado">
        <p class="flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300">
          <span class="tabular-nums">{{ uso.usadas }} / {{ uso.limite }}</span>
          <span class="tabular-nums text-gray-400 dark:text-slate-500">{{ uso.porcentaje }}%</span>
          <span v-if="uso.cortesia > 0" class="rounded bg-sky-50 px-1.5 text-[11px] text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">+{{ uso.cortesia }} cortesía</span>
        </p>
        <div class="mt-1 h-1.5 w-full rounded-full bg-gray-100 dark:bg-slate-800">
          <div class="h-1.5 rounded-full" :class="colorBarra" :style="{ width: `${Math.min(uso.porcentaje, 100)}%` }"></div>
        </div>
      </template>
      <div v-else class="h-6 w-full animate-pulse rounded bg-gray-100 dark:bg-slate-800" aria-label="Cargando uso"></div>
    </div>

    <!-- Usuarios / empresas -->
    <div role="cell" class="text-xs text-gray-500 dark:text-slate-400">
      <template v-if="detalleCargado">
        <span class="tabular-nums">{{ proveedor.usuariosTotal ?? 0 }}</span> usuarios ·
        <span class="tabular-nums">{{ proveedor.empresasCount ?? 0 }}</span> empresas
      </template>
      <div v-else class="h-4 w-20 animate-pulse rounded bg-gray-100 dark:bg-slate-800"></div>
    </div>

    <!-- Acciones -->
    <div role="cell" class="flex items-center gap-1 md:justify-end">
      <button
        type="button"
        data-testid="row-entrar"
        class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        :disabled="entrando || activo"
        @click.stop="emit('entrar')"
      >
        {{ activo ? "Activo" : entrando ? "Entrando…" : "Entrar" }}
      </button>
      <button
        type="button"
        data-testid="row-ajustes"
        aria-label="Ajustes de plataforma"
        title="Ajustes de plataforma"
        class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
        @click.stop="emit('ajustes')"
      >
        <i class="fa-solid fa-sliders" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>
