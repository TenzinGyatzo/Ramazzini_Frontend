<script setup lang="ts">
/**
 * «Vigencias» (docs/vigencias-globales-especificacion.md): vigencia de las aptitudes de las
 * empresas a las que el proveedor da seguimiento, por empresa y centro, para planear con
 * tiempo los exámenes periódicos. Las empresas se eligen en «Elegir empresas».
 */
import { computed, inject, onMounted, ref, watch } from 'vue';
import VigenciasAptitudAPI, { type EmpresaVigencias, type ResumenVigencias } from '@/api/VigenciasAptitudAPI';
import FilaEmpresaVigencias from '@/components/vigencias/FilaEmpresaVigencias.vue';
import ModalEmpresasVigencias from '@/components/vigencias/ModalEmpresasVigencias.vue';
import { extractApiErrorMessage } from '@/helpers/apiErrors';
import { descargarFilasExcel } from '@/helpers/exportarExcel';
import {
  COLUMNAS_VIGENCIA,
  ORDENES,
  REJILLA_VIGENCIAS,
  TITULO_VENCEN,
  filasExcelPendientes,
  filtrarEmpresas,
  nombreArchivoPendientes,
  porcentajeAlDia,
  type OrdenVigencias,
} from '@/helpers/vigenciasGlobales';

const toast: any = inject('toast', null);

const resumen = ref<ResumenVigencias | null>(null);
const cargando = ref(true);
const errorCarga = ref('');

const cargar = async (silencioso = false) => {
  if (!silencioso) cargando.value = true;
  errorCarga.value = '';
  try {
    const { data } = await VigenciasAptitudAPI.getResumen();
    resumen.value = data;
  } catch (e) {
    // Al refrescar tras un cambio se conserva lo que ya se veía
    if (!silencioso || !resumen.value) {
      errorCarga.value = extractApiErrorMessage(e, 'No se pudieron cargar las vigencias.');
    }
  } finally {
    cargando.value = false;
  }
};

onMounted(() => cargar());

// ---- Filtros

const busqueda = ref('');
const orden = ref<OrdenVigencias>('urgencia');

const empresasFiltradas = computed(() =>
  filtrarEmpresas(resumen.value?.empresas ?? [], {
    busqueda: busqueda.value,
    orden: orden.value,
  }),
);

/** La lista crece por tramos para no pintar cientos de empresas de golpe. */
const TRAMO = 50;
const limite = ref(TRAMO);
watch([busqueda, orden], () => {
  limite.value = TRAMO;
});
const empresasVisibles = computed(() => empresasFiltradas.value.slice(0, limite.value));

const totales = computed(() => resumen.value?.totales);
const alDia = computed(() => (totales.value ? porcentajeAlDia(totales.value) : null));
const sinSeleccion = computed(() => !resumen.value?.empresas.length);

// ---- Empresas desplegadas

const expandidas = ref(new Set<string>());
const alternar = (idEmpresa: string) => {
  const nuevas = new Set(expandidas.value);
  if (nuevas.has(idEmpresa)) nuevas.delete(idEmpresa);
  else nuevas.add(idEmpresa);
  expandidas.value = nuevas;
};

// ---- Elegir empresas

const eligiendo = ref(false);
const terminarEleccion = () => {
  eligiendo.value = false;
  cargar(true);
};

// ---- Exportar pendientes

const exportando = ref<string | null>(null);
const exportar = async (empresa: EmpresaVigencias) => {
  if (exportando.value) return;
  exportando.value = empresa.idEmpresa;
  try {
    const { data } = await VigenciasAptitudAPI.getPendientes(empresa.idEmpresa);
    if (!data.length) {
      toast?.open?.({ message: 'Esta empresa no tiene trabajadores pendientes.', type: 'info' });
      return;
    }
    descargarFilasExcel(filasExcelPendientes(data), nombreArchivoPendientes(empresa.nombreEmpresa), 'Pendientes');
  } catch (e) {
    toast?.open?.({ message: extractApiErrorMessage(e, 'No se pudieron exportar los pendientes.'), type: 'error' });
  } finally {
    exportando.value = null;
  }
};

const tarjeta = 'vigencias__tarjeta rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800';
const campo =
  'rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
const botonElegir =
  'vigencias__enlace inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition duration-150 hover:scale-105 hover:border-emerald-400 hover:text-emerald-700 motion-reduce:transform-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
const TARJETAS_TOTALES = [
  { clave: 'activos', titulo: 'Trabajadores activos', color: 'text-gray-900 dark:text-slate-100' },
  { clave: 'vigentes', titulo: 'Vigentes', color: 'text-emerald-700 dark:text-emerald-400' },
  { clave: 'porVencer', titulo: 'Por vencer', color: 'text-amber-600 dark:text-amber-400' },
  { clave: 'vencidasRecientes', titulo: 'Vencidas', color: 'text-red-600 dark:text-red-400' },
  { clave: 'sinAptitud', titulo: 'Sin aptitud', color: 'text-gray-700 dark:text-slate-300' },
] as const;
</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
    <div class="vigencias">
      <Teleport to="body">
        <Transition appear name="modal-work" :duration="{ enter: 230, leave: 150 }">
          <ModalEmpresasVigencias v-if="eligiendo" @cerrar="eligiendo = false" @guardado="terminarEleccion" />
        </Transition>
      </Teleport>

      <!-- Encabezado y filtros -->
      <div :class="[tarjeta, 'mb-3 flex flex-col gap-3 px-4 py-3 sm:px-5 xl:flex-row xl:items-center']">
        <div class="flex min-w-0 flex-1 items-start justify-between gap-3">
          <div class="min-w-0">
            <h1 class="vigencias__titulo text-lg font-semibold text-gray-900 sm:text-xl dark:text-slate-100">
              Vigencias de aptitud
            </h1>
            <p class="text-sm text-gray-600 dark:text-slate-400">Empresas en seguimiento, al día de hoy</p>
          </div>
          <button
            v-if="resumen?.puedeElegir"
            type="button"
            :class="botonElegir"
            data-test="elegir-empresas"
            @click="eligiendo = true"
          >
            <i class="fas fa-list-check text-xs" aria-hidden="true"></i>
            Elegir empresas ({{ resumen.empresasSeleccionadas }})
          </button>
        </div>
        <div v-if="resumen && !sinSeleccion" class="flex flex-wrap items-center gap-2">
          <input
            v-model="busqueda"
            type="search"
            placeholder="Buscar empresa"
            aria-label="Buscar empresa"
            :class="[campo, 'w-full sm:w-52']"
            data-test="buscar"
          />
          <select v-model="orden" :class="campo" aria-label="Orden" data-test="orden">
            <option v-for="opcion in ORDENES" :key="opcion.valor" :value="opcion.valor">{{ opcion.texto }}</option>
          </select>
        </div>
      </div>

      <p v-if="cargando" class="py-16 text-center text-sm text-gray-500 dark:text-slate-400">
        <i class="fas fa-spinner fa-spin mr-1"></i>
        Cargando vigencias...
      </p>

      <div v-else-if="errorCarga" :class="[tarjeta, 'px-4 py-12 text-center']">
        <p class="text-sm text-gray-600 dark:text-slate-400">{{ errorCarga }}</p>
        <button type="button" class="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700" @click="cargar()">
          Reintentar
        </button>
      </div>

      <!-- Sin empresas en seguimiento -->
      <div v-else-if="resumen && sinSeleccion" :class="[tarjeta, 'px-4 py-14 text-center']" data-test="sin-seleccion">
        <i class="fas fa-calendar-check mb-3 text-3xl text-gray-300 dark:text-slate-600" aria-hidden="true"></i>
        <template v-if="resumen.puedeElegir">
          <p class="vigencias__seccion text-base font-semibold text-gray-900 dark:text-slate-100">
            Aún no eliges empresas para dar seguimiento
          </p>
          <p class="mx-auto mt-1 max-w-md text-sm text-gray-600 dark:text-slate-400">
            Elige las empresas que atiendes y aquí verás cuántos de sus trabajadores tienen su aptitud vigente,
            por vencer o vencida, para organizar con tiempo sus exámenes periódicos.
          </p>
          <button
            type="button"
            class="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition duration-150 hover:scale-105 hover:bg-emerald-700 motion-reduce:transform-none"
            data-test="elegir-empresas-vacio"
            @click="eligiendo = true"
          >
            <i class="fas fa-list-check text-xs" aria-hidden="true"></i>
            Elegir empresas
          </button>
        </template>
        <template v-else>
          <p class="vigencias__seccion text-base font-semibold text-gray-900 dark:text-slate-100">
            Todavía no hay empresas en seguimiento
          </p>
          <p class="mx-auto mt-1 max-w-md text-sm text-gray-600 dark:text-slate-400">
            El usuario Principal o quien gestiona empresas las elige.
          </p>
        </template>
      </div>

      <template v-else-if="resumen && totales">
        <!-- Totales de las empresas en seguimiento -->
        <dl class="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div v-for="item in TARJETAS_TOTALES" :key="item.clave" :class="[tarjeta, 'px-4 py-3']">
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-400">{{ item.titulo }}</dt>
            <dd
              class="vigencias__numero mt-0.5 text-2xl font-semibold tabular-nums"
              :class="totales[item.clave] || item.clave === 'activos' ? item.color : 'text-gray-900 dark:text-slate-100'"
              :data-test="`total-${item.clave}`"
            >{{ totales[item.clave] }}</dd>
          </div>
          <div :class="[tarjeta, 'px-4 py-3']">
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-400">Al día</dt>
            <dd class="vigencias__numero mt-0.5 text-2xl font-semibold tabular-nums text-gray-900 dark:text-slate-100" data-test="total-al-dia">
              {{ alDia === null ? '—' : `${alDia}%` }}
            </dd>
          </div>
        </dl>

        <!-- Lista de empresas -->
        <section :class="[tarjeta, 'overflow-hidden']" aria-labelledby="vigencias-empresas-titulo">
          <h2 id="vigencias-empresas-titulo" class="sr-only">Empresas en seguimiento</h2>
          <div
            :class="[
              REJILLA_VIGENCIAS,
              'vigencias__encabezados hidden whitespace-nowrap border-b border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 dark:border-slate-700 dark:text-slate-400',
            ]"
          >
            <span class="pl-5">Empresa</span>
            <span class="text-right">Activos</span>
            <span v-for="columna in COLUMNAS_VIGENCIA" :key="columna.clave" class="text-right">{{ columna.titulo }}</span>
            <span class="text-center" title="Aptitudes que vencen en los próximos 30, 31 a 60 y 61 a 90 días">
              {{ TITULO_VENCEN }}
            </span>
            <span class="text-right">Al día</span>
            <span><span class="sr-only">Acciones</span></span>
          </div>

          <p v-if="!empresasFiltradas.length" class="px-4 py-12 text-center text-sm text-gray-600 dark:text-slate-400" data-test="sin-empresas">
            Ninguna empresa coincide con la búsqueda.
          </p>

          <div v-else class="divide-y divide-gray-100 dark:divide-slate-700">
            <FilaEmpresaVigencias
              v-for="empresa in empresasVisibles"
              :key="empresa.idEmpresa"
              :empresa="empresa"
              :expandida="expandidas.has(empresa.idEmpresa)"
              :puede-exportar="resumen.puedeExportar"
              :exportando="exportando === empresa.idEmpresa"
              @alternar="alternar(empresa.idEmpresa)"
              @exportar="exportar(empresa)"
            />
          </div>

          <div v-if="empresasFiltradas.length > limite" class="border-t border-gray-100 px-4 py-3 text-center dark:border-slate-700">
            <button
              type="button"
              class="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              data-test="ver-mas"
              @click="limite += TRAMO"
            >
              Ver más ({{ empresasFiltradas.length - limite }} restantes)
            </button>
          </div>
        </section>
      </template>
    </div>
  </Transition>
</template>
