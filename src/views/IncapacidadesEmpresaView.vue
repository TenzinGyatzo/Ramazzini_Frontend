<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import IncapacidadesAPI from '@/api/IncapacidadesAPI';
import ModalIncapacidades from '@/components/incapacidades/ModalIncapacidades.vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import {
  GRUPOS_DIAGNOSTICO,
  ORIGENES,
  RAMOS,
  TIPOS_RIESGO,
  fechaCorta,
  hoyISO,
  mensajeDeError,
  ramoDe,
  textoDe,
  textoDias,
  type EstadoCaso,
  type RamoIncapacidad,
} from '@/helpers/incapacidades';
import {
  FOCOS,
  PERIODOS,
  coincideTrabajador,
  filtrarCasos,
  textoDeFoco,
  type CasoDePanel,
  type PanelIncapacidades,
  type Periodo,
  type TrabajadorDePanel,
} from '@/helpers/incapacidadesPanel';

const route = useRoute();
const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();

const empresaId = String(route.params.idEmpresa);

const panel = ref<PanelIncapacidades | null>(null);
const cargando = ref(true);
const errorCarga = ref('');

const cargar = async (silencioso = false) => {
  if (!silencioso) cargando.value = true;
  errorCarga.value = '';
  try {
    const { data } = await IncapacidadesAPI.getPanelEmpresa(empresaId);
    panel.value = data;
  } catch (e) {
    // Al refrescar tras un cambio se conserva lo que ya se veía
    if (!silencioso || !panel.value) {
      errorCarga.value = mensajeDeError(e, 'No se pudieron cargar las incapacidades de la empresa.');
    }
  } finally {
    cargando.value = false;
  }
};

onMounted(() => {
  if (String(empresas.currentEmpresa?._id ?? '') !== empresaId) {
    empresas.fetchEmpresaById(empresaId);
  }
  cargar();
});

// ---- Filtros

const filtroCentro = ref('');
const filtroRamo = ref<RamoIncapacidad | ''>('');
const filtroEstado = ref<EstadoCaso | ''>('');
const periodo = ref<Periodo>('ultimos12Meses');
const busqueda = ref('');

const trabajadoresPorId = computed(
  () => new Map((panel.value?.trabajadores ?? []).map((t) => [t._id, t])),
);
const centrosPorId = computed(
  () => new Map((panel.value?.centros ?? []).map((c) => [c._id, c.nombreCentro])),
);
const variosCentros = computed(() => (panel.value?.centros.length ?? 0) > 1);

const delCentro = (idTrabajador: string) =>
  !filtroCentro.value ||
  trabajadoresPorId.value.get(idTrabajador)?.idCentroTrabajo === filtroCentro.value;

const incapacitadosHoy = computed(() =>
  (panel.value?.incapacitadosHoy ?? []).filter((item) => delCentro(item.idTrabajador)),
);
const focosRojos = computed(() =>
  (panel.value?.focosRojos ?? []).filter((item) => delCentro(item.idTrabajador)),
);

const casosFiltrados = computed<CasoDePanel[]>(() => {
  if (!panel.value) return [];
  const visibles =
    filtroCentro.value || busqueda.value.trim()
      ? new Set(
          panel.value.trabajadores
            .filter((t) => delCentro(t._id) && coincideTrabajador(t, busqueda.value))
            .map((t) => t._id),
        )
      : null;
  return filtrarCasos(
    panel.value.casos,
    { ramo: filtroRamo.value, estado: filtroEstado.value, periodo: periodo.value, trabajadores: visibles },
    hoyISO(),
  );
});

const hayFiltros = computed(
  () => !!(filtroRamo.value || filtroEstado.value || busqueda.value.trim() || periodo.value !== 'ultimos12Meses'),
);
const limpiarFiltros = () => {
  filtroRamo.value = '';
  filtroEstado.value = '';
  busqueda.value = '';
  periodo.value = 'ultimos12Meses';
};

/** La tabla crece por tramos para no pintar cientos de filas de golpe. */
const TRAMO = 50;
const limite = ref(TRAMO);
watch([filtroCentro, filtroRamo, filtroEstado, periodo, busqueda], () => {
  limite.value = TRAMO;
});
const casosVisibles = computed(() => casosFiltrados.value.slice(0, limite.value));

const resumen = computed(() => ({
  incapacitados: incapacitadosHoy.value.length,
  focos: focosRojos.value.length,
  activos: (panel.value?.casos ?? []).filter(
    (item) => item.estado === 'activo' && delCentro(item.idTrabajador),
  ).length,
  dias: casosFiltrados.value.reduce((suma, item) => suma + item.dias.total, 0),
}));

// ---- Textos

const nombreDe = (idTrabajador: string) => {
  const trabajador = trabajadoresPorId.value.get(idTrabajador);
  return trabajador ? formatNombreCompleto(trabajador as any) : 'Trabajador';
};

/** Puesto y, si la empresa tiene varios centros, el centro. */
const contextoDe = (idTrabajador: string) => {
  const trabajador = trabajadoresPorId.value.get(idTrabajador);
  if (!trabajador) return '';
  return [
    trabajador.puesto,
    variosCentros.value && !filtroCentro.value ? centrosPorId.value.get(trabajador.idCentroTrabajo) : '',
  ]
    .filter(Boolean)
    .join(' · ');
};

const esBaja = (idTrabajador: string) =>
  trabajadoresPorId.value.get(idTrabajador)?.estadoLaboral === 'Inactivo';

const detalleDeCaso = (item: CasoDePanel) =>
  item.caso.ramo === 'riesgoTrabajo'
    ? textoDe(TIPOS_RIESGO, item.caso.tipoRiesgo)
    : textoDe(GRUPOS_DIAGNOSTICO, item.caso.grupoDiagnostico);

const tituloDeUmbrales = computed(() => {
  const u = panel.value?.umbrales;
  if (!u) return '';
  return `Se señala a quien tiene un caso activo de ${u.diasProlongada} días o más, ${u.casosFrecuentes} casos o más en 12 meses, una recaída reciente, secuelas o incapacidad permanente, o un riesgo de trabajo sin alta ni subsecuente por más de ${u.diasSinSeguimiento} días.`;
});

// ---- Ventana del trabajador

const showModal = ref(false);
/** La ventana avisa «cambio» al cargar y otra vez cada que algo se modifica. */
let avisosDeLaVentana = 0;

const abrirTrabajador = (idTrabajador: string) => {
  const trabajador = trabajadoresPorId.value.get(idTrabajador);
  if (!trabajador) return;
  trabajadores.hydrateCurrentTrabajadorFromListado(trabajador as TrabajadorDePanel & { _id: string });
  avisosDeLaVentana = 0;
  showModal.value = true;
};

const cerrarModal = () => {
  showModal.value = false;
  if (avisosDeLaVentana > 1) cargar(true);
};

const expedienteDe = (idTrabajador: string) => ({
  name: 'expediente-medico',
  params: {
    idEmpresa: empresaId,
    idCentroTrabajo: trabajadoresPorId.value.get(idTrabajador)?.idCentroTrabajo ?? '',
    idTrabajador,
  },
});

const selectClases =
  'rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
const tarjeta =
  'incapacidades-empresa__tarjeta rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800';
</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
    <div class="incapacidades-empresa">
      <Teleport to="body">
        <Transition appear name="modal-work" :duration="{ enter: 230, leave: 150 }">
          <ModalIncapacidades
            v-if="showModal"
            @closeModal="cerrarModal"
            @cambio="avisosDeLaVentana++"
          />
        </Transition>
      </Teleport>

      <!-- Encabezado -->
      <div :class="[tarjeta, 'mb-3 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5']">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <RouterLink
            :to="{ name: 'centros-trabajo', params: { idEmpresa: empresaId } }"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors duration-150 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
            title="Volver a los centros de trabajo"
            aria-label="Volver a los centros de trabajo"
          >
            <i class="fa-solid fa-arrow-left text-sm"></i>
          </RouterLink>
          <div class="min-w-0">
            <h1 class="incapacidades-empresa__titulo text-lg font-semibold text-gray-900 sm:text-xl dark:text-slate-100">
              Incapacidades
            </h1>
            <p class="truncate text-sm text-gray-600 dark:text-slate-400">
              {{ empresas.currentEmpresa?.nombreComercial || 'Empresa' }}
            </p>
          </div>
        </div>
        <label v-if="variosCentros" class="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
          <span class="shrink-0">Centro de trabajo</span>
          <select v-model="filtroCentro" :class="[selectClases, 'min-w-0 max-w-[16rem]']" data-test="filtro-centro">
            <option value="">Todos</option>
            <option v-for="centro in panel?.centros" :key="centro._id" :value="centro._id">
              {{ centro.nombreCentro }}
            </option>
          </select>
        </label>
      </div>

      <p v-if="cargando" class="py-16 text-center text-sm text-gray-500 dark:text-slate-400">
        <i class="fas fa-spinner fa-spin mr-1"></i>
        Cargando incapacidades...
      </p>

      <div v-else-if="errorCarga" :class="[tarjeta, 'px-4 py-12 text-center']">
        <p class="text-sm text-gray-600 dark:text-slate-400">{{ errorCarga }}</p>
        <button type="button" class="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700" @click="cargar()">
          Reintentar
        </button>
      </div>

      <template v-else-if="panel">
        <!-- Resumen -->
        <dl class="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div :class="[tarjeta, 'px-4 py-3']">
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-400">Incapacitados hoy</dt>
            <dd
              class="mt-0.5 text-2xl font-semibold"
              :class="resumen.incapacitados ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-slate-100'"
              data-test="resumen-incapacitados"
            >{{ resumen.incapacitados }}</dd>
          </div>
          <div :class="[tarjeta, 'px-4 py-3']">
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-400">Trabajadores con focos rojos</dt>
            <dd
              class="mt-0.5 text-2xl font-semibold"
              :class="resumen.focos ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-slate-100'"
              data-test="resumen-focos"
            >{{ resumen.focos }}</dd>
          </div>
          <div :class="[tarjeta, 'px-4 py-3']">
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-400">Casos activos</dt>
            <dd class="mt-0.5 text-2xl font-semibold text-gray-900 dark:text-slate-100">{{ resumen.activos }}</dd>
          </div>
          <div :class="[tarjeta, 'px-4 py-3']">
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-400">Días de incapacidad en la tabla</dt>
            <dd class="mt-0.5 text-2xl font-semibold text-gray-900 dark:text-slate-100">{{ resumen.dias }}</dd>
          </div>
        </dl>

        <div class="mb-3 grid gap-3 lg:grid-cols-2">
          <!-- Incapacitados hoy -->
          <section :class="tarjeta" aria-labelledby="incapacitados-hoy-titulo">
            <h2
              id="incapacitados-hoy-titulo"
              class="incapacidades-empresa__seccion flex items-center gap-2 border-b border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:border-slate-700 dark:text-slate-100"
            >
              <i class="fas fa-bed text-red-500" aria-hidden="true"></i>
              Incapacitados hoy
            </h2>
            <p v-if="!incapacitadosHoy.length" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
              Nadie está incapacitado hoy.
            </p>
            <ul v-else class="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-slate-700">
              <li v-for="item in incapacitadosHoy" :key="item.idCaso">
                <button
                  type="button"
                  class="incapacidades-empresa__fila flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                  data-test="incapacitado-hoy"
                  @click="abrirTrabajador(item.idTrabajador)"
                >
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium text-gray-900 dark:text-slate-100">
                      {{ nombreDe(item.idTrabajador) }}
                    </span>
                    <span class="block truncate text-xs text-gray-500 dark:text-slate-400">
                      {{ contextoDe(item.idTrabajador) }}
                    </span>
                  </span>
                  <span class="shrink-0 text-right">
                    <span
                      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="ramoDe(item.ramo).clases"
                    >
                      <i :class="[ramoDe(item.ramo).icono, 'text-[10px]']" aria-hidden="true"></i>
                      {{ ramoDe(item.ramo).texto }}
                    </span>
                    <span class="mt-0.5 block text-xs text-gray-600 dark:text-slate-400">
                      Lleva {{ textoDias(item.diasQueLleva) }}
                      <template v-if="item.fechaTermino"> · hasta el {{ fechaCorta(item.fechaTermino) }}</template>
                      <template v-if="item.origen && item.origen !== 'imss'"> · {{ textoDe(ORIGENES, item.origen) }}</template>
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          </section>

          <!-- Focos rojos -->
          <section :class="tarjeta" aria-labelledby="focos-rojos-titulo">
            <h2
              id="focos-rojos-titulo"
              class="incapacidades-empresa__seccion flex items-center gap-2 border-b border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:border-slate-700 dark:text-slate-100"
            >
              <i class="fas fa-triangle-exclamation text-amber-500" aria-hidden="true"></i>
              Focos rojos
              <i
                class="fas fa-circle-info ml-auto text-xs font-normal text-gray-400"
                :title="tituloDeUmbrales"
                aria-hidden="true"
              ></i>
            </h2>
            <p v-if="!focosRojos.length" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
              Ningún trabajador requiere seguimiento especial.
            </p>
            <ul v-else class="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-slate-700">
              <li v-for="item in focosRojos" :key="item.idTrabajador">
                <button
                  type="button"
                  class="incapacidades-empresa__fila block w-full px-4 py-2.5 text-left transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                  data-test="foco-rojo"
                  @click="abrirTrabajador(item.idTrabajador)"
                >
                  <span class="flex items-baseline gap-2">
                    <span class="truncate text-sm font-medium text-gray-900 dark:text-slate-100">
                      {{ nombreDe(item.idTrabajador) }}
                    </span>
                    <span class="truncate text-xs text-gray-500 dark:text-slate-400">
                      {{ contextoDe(item.idTrabajador) }}
                    </span>
                  </span>
                  <span class="mt-1.5 flex flex-wrap gap-1.5">
                    <span
                      v-for="foco in item.focos"
                      :key="foco.tipo"
                      class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                      :title="foco.detalle"
                    >
                      <i :class="[FOCOS[foco.tipo]?.icono, 'text-[10px]']" aria-hidden="true"></i>
                      {{ textoDeFoco(foco) }}
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          </section>
        </div>

        <!-- Casos -->
        <section :class="tarjeta" aria-labelledby="casos-titulo">
          <div class="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 dark:border-slate-700 xl:flex-row xl:items-center">
            <h2 id="casos-titulo" class="incapacidades-empresa__seccion flex-1 text-sm font-semibold text-gray-900 dark:text-slate-100">
              Casos
              <span class="ml-1 font-normal text-gray-500 dark:text-slate-400" data-test="total-casos">
                ({{ casosFiltrados.length }})
              </span>
            </h2>
            <div class="flex flex-wrap items-center gap-2">
              <input
                v-model="busqueda"
                type="search"
                placeholder="Buscar trabajador"
                aria-label="Buscar trabajador"
                :class="[selectClases, 'w-full sm:w-48']"
                data-test="buscar"
              />
              <select v-model="filtroRamo" :class="selectClases" aria-label="Ramo" data-test="filtro-ramo">
                <option value="">Todos los ramos</option>
                <option v-for="ramo in RAMOS" :key="ramo.valor" :value="ramo.valor">{{ ramo.texto }}</option>
              </select>
              <select v-model="filtroEstado" :class="selectClases" aria-label="Estado" data-test="filtro-estado">
                <option value="">Activos y terminados</option>
                <option value="activo">Activos</option>
                <option value="terminado">Terminados</option>
              </select>
              <select v-model="periodo" :class="selectClases" aria-label="Periodo" data-test="filtro-periodo">
                <option v-for="opcion in PERIODOS" :key="opcion.valor" :value="opcion.valor">{{ opcion.texto }}</option>
              </select>
            </div>
          </div>

          <div v-if="!casosFiltrados.length" class="px-4 py-12 text-center">
            <i class="fas fa-clipboard-check mb-2 text-2xl text-gray-300 dark:text-slate-600" aria-hidden="true"></i>
            <p class="text-sm font-medium text-gray-700 dark:text-slate-300">
              {{ panel.casos.length ? 'Ningún caso coincide con los filtros' : 'Sin incapacidades registradas' }}
            </p>
            <p v-if="!panel.casos.length" class="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Las incapacidades se registran desde el expediente de cada trabajador.
            </p>
            <button
              v-else-if="hayFiltros"
              type="button"
              class="mt-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              @click="limpiarFiltros"
            >
              Quitar filtros
            </button>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr class="incapacidades-empresa__encabezados border-b border-gray-200 text-xs font-medium text-gray-500 dark:border-slate-700 dark:text-slate-400">
                  <th scope="col" class="px-4 py-2 font-medium">Trabajador</th>
                  <th scope="col" class="px-3 py-2 font-medium">Ramo</th>
                  <th scope="col" class="px-3 py-2 font-medium">Inicio</th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">Días</th>
                  <th scope="col" class="px-3 py-2 font-medium">Estado</th>
                  <th scope="col" class="px-3 py-2"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
                <tr
                  v-for="item in casosVisibles"
                  :key="item.caso._id"
                  class="incapacidades-empresa__fila transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                  data-test="caso"
                >
                  <td class="px-4 py-2">
                    <button type="button" class="block max-w-[18rem] text-left" @click="abrirTrabajador(item.idTrabajador)">
                      <span class="block truncate font-medium text-gray-900 hover:text-emerald-700 dark:text-slate-100 dark:hover:text-emerald-300">
                        {{ nombreDe(item.idTrabajador) }}
                        <span
                          v-if="esBaja(item.idTrabajador)"
                          class="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-normal text-gray-600 dark:bg-slate-700 dark:text-slate-300"
                        >Baja</span>
                      </span>
                      <span class="block truncate text-xs text-gray-500 dark:text-slate-400">
                        {{ contextoDe(item.idTrabajador) }}
                      </span>
                    </button>
                  </td>
                  <td class="px-3 py-2">
                    <span
                      class="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="ramoDe(item.caso.ramo).clases"
                    >
                      <i :class="[ramoDe(item.caso.ramo).icono, 'text-[10px]']" aria-hidden="true"></i>
                      {{ ramoDe(item.caso.ramo).texto }}
                    </span>
                    <span v-if="detalleDeCaso(item)" class="mt-0.5 block text-xs text-gray-500 dark:text-slate-400">
                      {{ detalleDeCaso(item) }}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-gray-700 dark:text-slate-300">
                    {{ fechaCorta(item.caso.fechaInicio) }}
                  </td>
                  <td class="px-3 py-2 text-right font-medium tabular-nums text-gray-900 dark:text-slate-100">
                    {{ item.dias.total }}
                  </td>
                  <td class="px-3 py-2">
                    <span
                      v-if="item.incapacitadoHoy"
                      class="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300"
                    >Incapacitado hoy</span>
                    <span
                      v-else-if="item.estado === 'activo'"
                      class="inline-flex whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    >Activo</span>
                    <span v-else class="text-xs text-gray-500 dark:text-slate-400">Terminado</span>
                  </td>
                  <td class="px-3 py-2 text-right">
                    <RouterLink
                      :to="expedienteDe(item.idTrabajador)"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-emerald-600 dark:hover:bg-slate-700"
                      title="Abrir expediente"
                      aria-label="Abrir expediente"
                    >
                      <i class="fas fa-folder-open text-sm"></i>
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="casosFiltrados.length > limite" class="border-t border-gray-100 px-4 py-3 text-center dark:border-slate-700">
              <button
                type="button"
                class="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                data-test="ver-mas"
                @click="limite += TRAMO"
              >
                Ver más ({{ casosFiltrados.length - limite }} restantes)
              </button>
            </div>
          </div>
        </section>
      </template>
    </div>
  </Transition>
</template>
