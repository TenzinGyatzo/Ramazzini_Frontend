<script setup lang="ts">
/**
 * «Vigencias» (docs/vigencias-globales-especificacion.md): vigencia de las aptitudes de todas
 * las empresas y centros que ve el usuario, para planear con tiempo los exámenes periódicos.
 * Las empresas sin actividad reciente y las pausadas van aparte y no suman a los totales.
 */
import { computed, inject, onMounted, ref, watch } from 'vue';
import VigenciasAptitudAPI, { type EmpresaVigencias, type ResumenVigencias } from '@/api/VigenciasAptitudAPI';
import FilaEmpresaVigencias from '@/components/vigencias/FilaEmpresaVigencias.vue';
import ModalSeguimientoVigencias from '@/components/vigencias/ModalSeguimientoVigencias.vue';
import { extractApiErrorMessage } from '@/helpers/apiErrors';
import { descargarFilasExcel } from '@/helpers/exportarExcel';
import {
  COLUMNAS_VIGENCIA,
  ORDENES,
  REJILLA_VIGENCIAS,
  filasExcelPendientes,
  nombreArchivoPendientes,
  ocultasPorPendientes,
  porcentajeAlDia,
  separarSecciones,
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
const soloPendientes = ref(true);
const orden = ref<OrdenVigencias>('urgencia');
const verSinActividad = ref(false);
const verPausadas = ref(false);

const secciones = computed(() =>
  separarSecciones(resumen.value?.empresas ?? [], {
    busqueda: busqueda.value,
    soloPendientes: soloPendientes.value,
    orden: orden.value,
  }),
);
const alDiaOcultas = computed(() =>
  soloPendientes.value ? ocultasPorPendientes(resumen.value?.empresas ?? [], busqueda.value) : 0,
);
const hayFiltros = computed(() => !!busqueda.value.trim() || !soloPendientes.value || orden.value !== 'urgencia');
const limpiarFiltros = () => {
  busqueda.value = '';
  soloPendientes.value = true;
  orden.value = 'urgencia';
};

/** La lista crece por tramos para no pintar cientos de empresas de golpe. */
const TRAMO = 50;
const limite = ref(TRAMO);
watch([busqueda, soloPendientes, orden], () => {
  limite.value = TRAMO;
});
const principalVisible = computed(() => secciones.value.principal.slice(0, limite.value));

const totales = computed(() => resumen.value?.totales);
const alDia = computed(() => (totales.value ? porcentajeAlDia(totales.value) : null));
const textoSecundario = computed(() => {
  const c = resumen.value?.conteosSecundarios;
  if (!c) return '';
  const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
  return [
    c.sinActividad ? plural(c.sinActividad, 'empresa sin actividad reciente', 'empresas sin actividad reciente') : '',
    c.pausadas ? plural(c.pausadas, 'pausada', 'pausadas') : '',
    c.sinTrabajadoresActivos
      ? plural(c.sinTrabajadoresActivos, 'sin trabajadores activos', 'sin trabajadores activos')
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
});

// ---- Empresas desplegadas

const expandidas = ref(new Set<string>());
const alternar = (idEmpresa: string) => {
  const nuevas = new Set(expandidas.value);
  if (nuevas.has(idEmpresa)) nuevas.delete(idEmpresa);
  else nuevas.add(idEmpresa);
  expandidas.value = nuevas;
};

// ---- Pausar y reanudar

const ventana = ref<{ empresa: EmpresaVigencias; modo: 'pausar' | 'reanudar' } | null>(null);
const terminarVentana = () => {
  ventana.value = null;
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
          <ModalSeguimientoVigencias
            v-if="ventana"
            :empresa="ventana.empresa"
            :modo="ventana.modo"
            @cerrar="ventana = null"
            @hecho="terminarVentana"
          />
        </Transition>
      </Teleport>

      <!-- Encabezado y filtros -->
      <div :class="[tarjeta, 'mb-3 flex flex-col gap-3 px-4 py-3 sm:px-5 xl:flex-row xl:items-center']">
        <div class="min-w-0 flex-1">
          <h1 class="vigencias__titulo text-lg font-semibold text-gray-900 sm:text-xl dark:text-slate-100">
            Vigencias de aptitud
          </h1>
          <p class="text-sm text-gray-600 dark:text-slate-400">Todas tus empresas, al día de hoy</p>
        </div>
        <div v-if="resumen" class="flex flex-wrap items-center gap-2">
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
          <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <input v-model="soloPendientes" type="checkbox" class="h-4 w-4 accent-emerald-600" data-test="solo-pendientes" />
            Solo con pendientes
          </label>
          <label
            v-if="resumen.conteosSecundarios.pausadas"
            class="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300"
          >
            <input v-model="verPausadas" type="checkbox" class="h-4 w-4 accent-emerald-600" data-test="ver-pausadas" />
            Ver pausadas ({{ resumen.conteosSecundarios.pausadas }})
          </label>
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

      <template v-else-if="resumen && totales">
        <!-- Totales: solo empresas en seguimiento -->
        <dl class="mb-1 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
        <p class="mb-3 px-1 text-xs text-gray-500 dark:text-slate-400" data-test="conteos-secundarios">
          Los totales cuentan solo las empresas en seguimiento.
          <template v-if="textoSecundario"> Además: {{ textoSecundario }}.</template>
        </p>

        <!-- Lista principal -->
        <section :class="[tarjeta, 'mb-3 overflow-hidden']" aria-labelledby="vigencias-empresas-titulo">
          <h2 id="vigencias-empresas-titulo" class="sr-only">Empresas en seguimiento</h2>
          <div
            :class="[
              REJILLA_VIGENCIAS,
              'vigencias__encabezados hidden border-b border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 dark:border-slate-700 dark:text-slate-400',
            ]"
          >
            <span class="pl-5">Empresa</span>
            <span class="text-right">Activos</span>
            <span v-for="columna in COLUMNAS_VIGENCIA" :key="columna.clave" class="text-right">{{ columna.titulo }}</span>
            <span class="text-center" title="Aptitudes que vencen en los próximos 30, 31 a 60 y 61 a 90 días">
              Vencen en 30 · 60 · 90 días
            </span>
            <span class="text-right">Al día</span>
            <span><span class="sr-only">Acciones</span></span>
          </div>

          <div v-if="!secciones.principal.length" class="px-4 py-12 text-center">
            <i class="fas fa-calendar-check mb-2 text-2xl text-gray-300 dark:text-slate-600" aria-hidden="true"></i>
            <p class="text-sm font-medium text-gray-700 dark:text-slate-300" data-test="sin-empresas">
              <template v-if="!resumen.empresas.length">Aún no hay trabajadores activos en tus empresas</template>
              <template v-else-if="alDiaOcultas && !busqueda.trim()">Todas tus empresas en seguimiento están al día</template>
              <template v-else>Ninguna empresa coincide con los filtros</template>
            </p>
            <button
              v-if="hayFiltros && resumen.empresas.length"
              type="button"
              class="mt-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              @click="alDiaOcultas && !busqueda.trim() ? (soloPendientes = false) : limpiarFiltros()"
            >
              {{ alDiaOcultas && !busqueda.trim() ? 'Mostrar todas' : 'Quitar filtros' }}
            </button>
          </div>

          <div v-else class="divide-y divide-gray-100 dark:divide-slate-700">
            <FilaEmpresaVigencias
              v-for="empresa in principalVisible"
              :key="empresa.idEmpresa"
              :empresa="empresa"
              :expandida="expandidas.has(empresa.idEmpresa)"
              :puede-pausar="resumen.puedePausar"
              :puede-exportar="resumen.puedeExportar"
              :exportando="exportando === empresa.idEmpresa"
              @alternar="alternar(empresa.idEmpresa)"
              @pausar="ventana = { empresa, modo: 'pausar' }"
              @reanudar="ventana = { empresa, modo: 'reanudar' }"
              @exportar="exportar(empresa)"
            />
          </div>

          <div
            v-if="secciones.principal.length > limite || (alDiaOcultas && secciones.principal.length)"
            class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-gray-100 px-4 py-3 text-sm dark:border-slate-700"
          >
            <button
              v-if="secciones.principal.length > limite"
              type="button"
              class="font-medium text-emerald-600 hover:text-emerald-700"
              data-test="ver-mas"
              @click="limite += TRAMO"
            >
              Ver más ({{ secciones.principal.length - limite }} restantes)
            </button>
            <span v-if="alDiaOcultas && secciones.principal.length" class="text-gray-500 dark:text-slate-400" data-test="al-dia-ocultas">
              {{ alDiaOcultas }} {{ alDiaOcultas === 1 ? 'empresa al día oculta' : 'empresas al día ocultas' }} ·
              <button type="button" class="font-medium text-emerald-600 hover:text-emerald-700" @click="soloPendientes = false">
                Mostrar todas
              </button>
            </span>
          </div>
        </section>

        <!-- Sin actividad reciente -->
        <section v-if="secciones.sinActividad.length" :class="[tarjeta, 'mb-3 overflow-hidden']" data-test="seccion-sin-actividad">
          <button
            type="button"
            class="vigencias__fila flex w-full items-center gap-2 px-4 py-3 text-left transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-slate-700/50"
            :aria-expanded="verSinActividad"
            @click="verSinActividad = !verSinActividad"
          >
            <i
              class="fas fa-chevron-right w-3 text-xs text-gray-400 transition-transform duration-150 motion-reduce:transition-none"
              :class="{ 'rotate-90': verSinActividad }"
              aria-hidden="true"
            ></i>
            <span class="vigencias__seccion text-sm font-semibold text-gray-900 dark:text-slate-100">
              Sin actividad reciente ({{ secciones.sinActividad.length }})
            </span>
            <span class="hidden text-xs text-gray-500 sm:inline dark:text-slate-400">
              Su aptitud más reciente tiene más de 18 meses. Si ya no son tus clientes, pausa su seguimiento.
            </span>
          </button>
          <div v-if="verSinActividad" class="divide-y divide-gray-100 border-t border-gray-100 dark:divide-slate-700 dark:border-slate-700">
            <FilaEmpresaVigencias
              v-for="empresa in secciones.sinActividad"
              :key="empresa.idEmpresa"
              :empresa="empresa"
              :expandida="expandidas.has(empresa.idEmpresa)"
              :puede-pausar="resumen.puedePausar"
              :puede-exportar="resumen.puedeExportar"
              :exportando="exportando === empresa.idEmpresa"
              @alternar="alternar(empresa.idEmpresa)"
              @pausar="ventana = { empresa, modo: 'pausar' }"
              @reanudar="ventana = { empresa, modo: 'reanudar' }"
              @exportar="exportar(empresa)"
            />
          </div>
        </section>

        <!-- Pausadas -->
        <section
          v-if="verPausadas && secciones.pausadas.length"
          :class="[tarjeta, 'overflow-hidden']"
          aria-labelledby="vigencias-pausadas-titulo"
          data-test="seccion-pausadas"
        >
          <h2
            id="vigencias-pausadas-titulo"
            class="vigencias__seccion border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-slate-700 dark:text-slate-100"
          >
            Pausadas ({{ secciones.pausadas.length }})
            <span class="ml-1 font-normal text-gray-500 dark:text-slate-400">
              No suman a los totales. Vuelven solas si registras una aptitud nueva.
            </span>
          </h2>
          <div class="divide-y divide-gray-100 dark:divide-slate-700">
            <FilaEmpresaVigencias
              v-for="empresa in secciones.pausadas"
              :key="empresa.idEmpresa"
              :empresa="empresa"
              :expandida="expandidas.has(empresa.idEmpresa)"
              :puede-pausar="resumen.puedePausar"
              :puede-exportar="resumen.puedeExportar"
              :exportando="exportando === empresa.idEmpresa"
              @alternar="alternar(empresa.idEmpresa)"
              @pausar="ventana = { empresa, modo: 'pausar' }"
              @reanudar="ventana = { empresa, modo: 'reanudar' }"
              @exportar="exportar(empresa)"
            />
          </div>
        </section>
      </template>
    </div>
  </Transition>
</template>
