<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import IncapacidadesAPI from '@/api/IncapacidadesAPI';
import InformeBarras from '@/components/incapacidades/InformeBarras.vue';
import { useEmpresasStore } from '@/stores/empresas';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import {
  RAMOS,
  TIPOS_RIESGO,
  fechaCorta,
  hoyISO,
  mensajeDeError,
  ramoDe,
} from '@/helpers/incapacidades';
import {
  DIAS_DE_LA_SEMANA,
  INDICADORES,
  PERIODOS_DE_INFORME,
  TRAMOS_DE_DURACION,
  exportarInformeExcel,
  fechasDePeriodo,
  textoDeGrupo,
  textoDeIndicador,
  textoDeMes,
  textoDeNaturaleza,
  textoDePuesto,
  textoDeRegion,
  type Agrupado,
  type InformeIncapacidades,
  type PeriodoDeInforme,
} from '@/helpers/incapacidadesInforme';

const route = useRoute();
const empresas = useEmpresasStore();
const toast = inject<any>('toast', null);

const empresaId = String(route.params.idEmpresa);

// ---- Periodo y centro

const periodo = ref<PeriodoDeInforme>('esteAnio');
const inicial = fechasDePeriodo('esteAnio', hoyISO());
const desde = ref(inicial.desde);
const hasta = ref(inicial.hasta);
const centro = ref('');
/** Centros de la empresa: se conservan aunque el informe se limite a uno. */
const centros = ref<InformeIncapacidades['centros']>([]);

watch(periodo, (valor) => {
  if (valor === 'personalizado') return;
  const fechas = fechasDePeriodo(valor, hoyISO());
  desde.value = fechas.desde;
  hasta.value = fechas.hasta;
});

const errorDeFechas = computed(() => {
  if (!desde.value || !hasta.value) return 'Indica las dos fechas del periodo.';
  if (hasta.value < desde.value) return 'La fecha final no puede ser anterior a la inicial.';
  return '';
});

// ---- Consulta

const informe = ref<InformeIncapacidades | null>(null);
const cargando = ref(true);
const errorCarga = ref('');
let consulta = 0;

const cargar = async () => {
  if (errorDeFechas.value) return;
  const esta = ++consulta;
  cargando.value = true;
  errorCarga.value = '';
  try {
    const { data } = await IncapacidadesAPI.getInformeEmpresa(empresaId, {
      desde: desde.value,
      hasta: hasta.value,
      centro: centro.value || undefined,
    });
    // Si mientras tanto cambió el periodo o el centro, este resultado ya no aplica
    if (esta !== consulta) return;
    informe.value = data;
    if (!centro.value) centros.value = data.centros;
  } catch (e) {
    if (esta !== consulta) return;
    informe.value = null;
    errorCarga.value = mensajeDeError(e, 'No se pudo generar el informe.');
  } finally {
    if (esta === consulta) cargando.value = false;
  }
};

watch([desde, hasta, centro], cargar);

onMounted(() => {
  if (String(empresas.currentEmpresa?._id ?? '') !== empresaId) {
    empresas.fetchEmpresaById(empresaId);
  }
  cargar();
});

// ---- Lo que se muestra

const nombreDeCentro = computed(() => new Map(centros.value.map((c) => [c._id, c.nombreCentro])));
const trabajadoresPorId = computed(
  () => new Map((informe.value?.trabajadores ?? []).map((t) => [t._id, t])),
);

const sinDatos = computed(
  () => !!informe.value && !informe.value.totales.casosNuevos && !informe.value.totales.dias.total,
);

const barras = (filas: Agrupado[], texto: (clave: string) => string) =>
  filas.map((fila) => ({ ...fila, etiqueta: texto(fila.clave) }));

const porGrupo = computed(() => barras(informe.value?.tendencias.porGrupoDiagnostico ?? [], textoDeGrupo));
const porRegion = computed(() => barras(informe.value?.tendencias.porRegionAnatomica ?? [], textoDeRegion));
const porNaturaleza = computed(() =>
  barras(informe.value?.tendencias.porNaturalezaLesion ?? [], textoDeNaturaleza),
);
const porPuesto = computed(() => barras(informe.value?.tendencias.porPuesto ?? [], textoDePuesto));

const duraciones = computed(() => {
  const lista = informe.value?.tendencias.porDuracion ?? [];
  const maximo = Math.max(1, ...lista.map((tramo) => tramo.casos));
  return lista.map((tramo) => ({
    ...tramo,
    texto: TRAMOS_DE_DURACION[tramo.clave]?.texto ?? tramo.clave,
    corto: TRAMOS_DE_DURACION[tramo.clave]?.corto ?? tramo.clave,
    alto: `${tramo.casos ? Math.max(6, (tramo.casos / maximo) * 100) : 0}%`,
  }));
});
const porCentro = computed(() =>
  barras(informe.value?.tendencias.porCentro ?? [], (clave) => nombreDeCentro.value.get(clave) ?? 'Centro'),
);

const meses = computed(() => {
  const lista = informe.value?.tendencias.porMes ?? [];
  const maximo = Math.max(1, ...lista.map((mes) => mes.dias));
  return lista.map((mes) => ({
    ...mes,
    texto: textoDeMes(mes.mes),
    alto: `${mes.dias ? Math.max(3, (mes.dias / maximo) * 100) : 0}%`,
  }));
});

const diasDeLaSemana = computed(() => {
  const conteo = informe.value?.tendencias.porDiaSemana ?? [];
  const maximo = Math.max(1, ...conteo);
  return DIAS_DE_LA_SEMANA.map((dia) => {
    const casos = conteo[dia.indice] ?? 0;
    return { ...dia, casos, alto: `${casos ? Math.max(6, (casos / maximo) * 100) : 0}%` };
  });
});

const TRAMO = 20;
const limite = ref(TRAMO);
watch(informe, () => {
  limite.value = TRAMO;
});
const filasDeTrabajadores = computed(() => (informe.value?.porTrabajador ?? []).slice(0, limite.value));

const nombreDe = (idTrabajador: string) => {
  const trabajador = trabajadoresPorId.value.get(idTrabajador);
  return trabajador ? formatNombreCompleto(trabajador as any) : 'Trabajador';
};
const contextoDe = (idTrabajador: string) => {
  const trabajador = trabajadoresPorId.value.get(idTrabajador);
  if (!trabajador) return '';
  return [
    trabajador.puesto,
    centros.value.length > 1 && !centro.value ? nombreDeCentro.value.get(trabajador.idCentroTrabajo) : '',
  ]
    .filter(Boolean)
    .join(' · ');
};
const expedienteDe = (idTrabajador: string) => ({
  name: 'expediente-medico',
  params: {
    idEmpresa: empresaId,
    idCentroTrabajo: trabajadoresPorId.value.get(idTrabajador)?.idCentroTrabajo ?? '',
    idTrabajador,
  },
});

const exportar = () => {
  if (!informe.value) return;
  try {
    exportarInformeExcel(informe.value, {
      empresa: empresas.currentEmpresa?.nombreComercial ?? '',
      centro: centro.value ? (nombreDeCentro.value.get(centro.value) ?? '') : 'Todos',
    });
  } catch {
    toast?.open({ message: 'No se pudo generar el archivo de Excel.', type: 'error' });
  }
};

const campo =
  'rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
const tarjeta =
  'incapacidades-empresa__tarjeta rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800';
const tituloDeSeccion =
  'incapacidades-empresa__seccion border-b border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:border-slate-700 dark:text-slate-100';
const etiqueta = 'text-xs font-medium text-gray-500 dark:text-slate-400';
const cifra = 'mt-0.5 text-2xl font-semibold tabular-nums text-gray-900 dark:text-slate-100';
</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
    <div class="incapacidades-informe">
      <!-- Encabezado -->
      <div :class="[tarjeta, 'mb-3 flex flex-col gap-3 px-4 py-3 sm:px-5 xl:flex-row xl:items-center']">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <RouterLink
            :to="{ name: 'incapacidades-empresa', params: { idEmpresa: empresaId } }"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors duration-150 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
            title="Volver al seguimiento de incapacidades"
            aria-label="Volver al seguimiento de incapacidades"
          >
            <i class="fa-solid fa-arrow-left text-sm"></i>
          </RouterLink>
          <div class="min-w-0">
            <h1 class="incapacidades-empresa__titulo text-lg font-semibold text-gray-900 sm:text-xl dark:text-slate-100">
              Informe de incapacidades
            </h1>
            <p class="truncate text-sm text-gray-600 dark:text-slate-400">
              {{ empresas.currentEmpresa?.nombreComercial || 'Empresa' }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <select
            v-if="centros.length > 1"
            v-model="centro"
            :class="[campo, 'max-w-[14rem]']"
            aria-label="Centro de trabajo"
            data-test="filtro-centro"
          >
            <option value="">Todos los centros</option>
            <option v-for="c in centros" :key="c._id" :value="c._id">{{ c.nombreCentro }}</option>
          </select>
          <select v-model="periodo" :class="campo" aria-label="Periodo" data-test="filtro-periodo">
            <option v-for="opcion in PERIODOS_DE_INFORME" :key="opcion.valor" :value="opcion.valor">
              {{ opcion.texto }}
            </option>
          </select>
          <template v-if="periodo === 'personalizado'">
            <input v-model="desde" type="date" :class="campo" aria-label="Desde" data-test="desde" />
            <span class="text-sm text-gray-500 dark:text-slate-400">al</span>
            <input v-model="hasta" type="date" :class="campo" aria-label="Hasta" data-test="hasta" />
          </template>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!informe || cargando || sinDatos"
            title="Descarga totales, indicadores y tendencias, sin diagnósticos"
            data-test="exportar"
            @click="exportar"
          >
            <i class="fas fa-file-excel text-xs"></i>
            Exportar a Excel
          </button>
        </div>
      </div>

      <p v-if="errorDeFechas" class="mb-3 text-sm text-red-600 dark:text-red-400" data-test="error-fechas">
        {{ errorDeFechas }}
      </p>

      <p v-if="cargando && !informe" class="py-16 text-center text-sm text-gray-500 dark:text-slate-400">
        <i class="fas fa-spinner fa-spin mr-1"></i>
        Generando informe...
      </p>

      <div v-else-if="errorCarga" :class="[tarjeta, 'px-4 py-12 text-center']">
        <p class="text-sm text-gray-600 dark:text-slate-400">{{ errorCarga }}</p>
        <button type="button" class="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700" @click="cargar">
          Reintentar
        </button>
      </div>

      <div v-else-if="informe" :class="{ 'opacity-60': cargando }" :aria-busy="cargando">
        <p class="mb-3 text-sm text-gray-600 dark:text-slate-400" data-test="periodo">
          Del {{ fechaCorta(informe.periodo.desde) }} al {{ fechaCorta(informe.periodo.hasta) }}
          ({{ informe.periodo.dias }} días) ·
          {{ informe.trabajadoresActivos }}
          {{ informe.trabajadoresActivos === 1 ? 'trabajador activo' : 'trabajadores activos' }}
        </p>

        <div v-if="sinDatos" :class="[tarjeta, 'px-4 py-12 text-center']">
          <i class="fas fa-clipboard-check mb-2 text-2xl text-gray-300 dark:text-slate-600" aria-hidden="true"></i>
          <p class="text-sm font-medium text-gray-700 dark:text-slate-300">Sin incapacidades en el periodo</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-slate-400">Elige otro periodo u otro centro de trabajo.</p>
        </div>

        <template v-else>
          <!-- Totales -->
          <div class="mb-3 grid gap-3 lg:grid-cols-2">
            <section :class="tarjeta" aria-labelledby="informe-casos">
              <h2 id="informe-casos" :class="tituloDeSeccion">Casos nuevos</h2>
              <div class="px-4 py-3">
                <p :class="cifra" data-test="casos-nuevos">{{ informe.totales.casosNuevos }}</p>
                <dl class="mt-3 grid grid-cols-3 gap-3">
                  <div v-for="ramo in RAMOS" :key="ramo.valor">
                    <dt :class="etiqueta">
                      <i :class="[ramo.icono, 'mr-1']" aria-hidden="true"></i>{{ ramo.texto }}
                    </dt>
                    <dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-slate-100">
                      {{ informe.totales.casosPorRamo[ramo.valor] ?? 0 }}
                    </dd>
                  </div>
                </dl>
                <dl class="mt-3 grid grid-cols-3 gap-3 border-t border-gray-100 pt-3 dark:border-slate-700">
                  <div v-for="tipo in TIPOS_RIESGO" :key="tipo.valor">
                    <dt :class="etiqueta">{{ tipo.texto }}</dt>
                    <dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-slate-100" :data-test="'riesgo-' + tipo.valor">
                      {{ informe.totales.riesgosPorTipo[tipo.valor] ?? 0 }}
                    </dd>
                  </div>
                  <div>
                    <dt :class="etiqueta">Recaídas</dt>
                    <dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-slate-100">{{ informe.totales.recaidas }}</dd>
                  </div>
                  <div>
                    <dt :class="etiqueta">Incapacidades permanentes</dt>
                    <dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-slate-100">{{ informe.totales.incapacidadesPermanentes }}</dd>
                  </div>
                  <div>
                    <dt :class="etiqueta" title="Casos con secuelas registradas, contados por la fecha de su alta">Casos con secuelas</dt>
                    <dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-slate-100" data-test="casos-con-secuelas">{{ informe.totales.casosConSecuelas ?? 0 }}</dd>
                  </div>
                  <div>
                    <dt :class="etiqueta">Defunciones</dt>
                    <dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-slate-100">{{ informe.totales.defunciones }}</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section :class="tarjeta" aria-labelledby="informe-dias">
              <h2 id="informe-dias" :class="tituloDeSeccion">Días de incapacidad</h2>
              <div class="px-4 py-3">
                <p :class="cifra" data-test="dias-total">{{ informe.totales.dias.total }}</p>
                <dl class="mt-3 grid grid-cols-3 gap-3">
                  <div v-for="ramo in RAMOS" :key="ramo.valor">
                    <dt :class="etiqueta">
                      <i :class="[ramo.icono, 'mr-1']" aria-hidden="true"></i>{{ ramo.texto }}
                    </dt>
                    <dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-slate-100">
                      {{ informe.totales.diasPorRamo[ramo.valor] ?? 0 }}
                    </dd>
                  </div>
                </dl>
                <dl class="mt-3 grid grid-cols-3 gap-3 border-t border-gray-100 pt-3 dark:border-slate-700">
                  <div>
                    <dt :class="etiqueta">Subsidiados por el IMSS</dt>
                    <dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-slate-100" data-test="dias-subsidiados">{{ informe.totales.dias.subsidiados }}</dd>
                  </div>
                  <div>
                    <dt :class="etiqueta" title="Primeros tres días de cada caso de enfermedad general con certificado del IMSS">Sin subsidio</dt>
                    <dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-slate-100">{{ informe.totales.dias.sinSubsidio }}</dd>
                  </div>
                  <div>
                    <dt :class="etiqueta" title="Descansos otorgados por la empresa con goce de sueldo">A cargo de la empresa</dt>
                    <dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-slate-100">{{ informe.totales.dias.aCargoEmpresa }}</dd>
                  </div>
                  <div class="col-span-3">
                    <dt :class="etiqueta">Trabajadores con incapacidad en el periodo</dt>
                    <dd class="text-lg font-semibold tabular-nums text-gray-900 dark:text-slate-100">{{ informe.totales.trabajadoresConIncapacidad }}</dd>
                  </div>
                </dl>
              </div>
            </section>
          </div>

          <!-- Indicadores -->
          <dl class="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div v-for="indicador in INDICADORES" :key="indicador.clave" :class="[tarjeta, 'px-4 py-3']" data-test="indicador">
              <dt :class="etiqueta">{{ indicador.texto }}</dt>
              <dd>
                <span :class="cifra">{{ textoDeIndicador(informe.indicadores[indicador.clave]) }}</span>
                <span class="ml-1 text-xs text-gray-500 dark:text-slate-400">{{ indicador.unidad }}</span>
                <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">{{ indicador.formula }}</p>
              </dd>
            </div>
          </dl>
          <p class="mb-3 text-xs text-gray-500 dark:text-slate-400">
            Los indicadores usan días naturales y los trabajadores activos de hoy, no los que había en cada momento del periodo.
          </p>

          <!-- Por mes -->
          <section :class="[tarjeta, 'mb-3']" aria-labelledby="informe-mes">
            <h2 id="informe-mes" :class="tituloDeSeccion">Días de incapacidad por mes</h2>
            <div class="overflow-x-auto px-4 py-3">
              <ol class="flex h-40 items-end gap-2" :style="{ minWidth: meses.length * 2.75 + 'rem' }">
                <li
                  v-for="mes in meses"
                  :key="mes.mes"
                  class="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  :title="`${mes.texto}: ${mes.dias} días, ${mes.casos} casos nuevos`"
                  data-test="mes"
                >
                  <span class="mb-1 text-xs tabular-nums text-gray-700 dark:text-slate-300">{{ mes.dias || '' }}</span>
                  <span class="informe-barras__barra w-full max-w-[3rem] rounded-t bg-emerald-500" :style="{ height: mes.alto }"></span>
                </li>
              </ol>
              <ol class="mt-1 flex gap-2 border-t border-gray-200 pt-1 dark:border-slate-700" :style="{ minWidth: meses.length * 2.75 + 'rem' }" aria-hidden="true">
                <li v-for="mes in meses" :key="mes.mes" class="min-w-0 flex-1 truncate text-center text-[11px] text-gray-500 dark:text-slate-400">
                  {{ mes.texto }}
                </li>
              </ol>
            </div>
          </section>

          <!-- Tendencias -->
          <div class="mb-3 grid gap-3 lg:grid-cols-2">
            <section v-if="informe.conDiagnosticos" :class="tarjeta" aria-labelledby="informe-grupo">
              <h2 id="informe-grupo" :class="tituloDeSeccion">¿De qué se enferman? Grupo de diagnóstico</h2>
              <div class="px-4 py-3" data-test="por-grupo">
                <InformeBarras :filas="porGrupo" />
              </div>
            </section>

            <section :class="tarjeta" aria-labelledby="informe-region">
              <h2 id="informe-region" :class="tituloDeSeccion">¿Dónde se lastiman? Región anatómica</h2>
              <div class="px-4 py-3" data-test="por-region">
                <InformeBarras :filas="porRegion" vacio="Ningún caso del periodo tiene región anatómica." />
              </div>
            </section>

            <section v-if="porNaturaleza.length" :class="tarjeta" aria-labelledby="informe-naturaleza">
              <h2 id="informe-naturaleza" :class="tituloDeSeccion">Naturaleza de la lesión en riesgos de trabajo</h2>
              <div class="px-4 py-3" data-test="por-naturaleza">
                <InformeBarras :filas="porNaturaleza" />
              </div>
            </section>

            <section :class="tarjeta" aria-labelledby="informe-duracion">
              <h2 id="informe-duracion" :class="tituloDeSeccion">Casos por duración</h2>
              <div class="px-4 py-3">
                <ol class="flex h-28 items-end gap-2">
                  <li
                    v-for="tramo in duraciones"
                    :key="tramo.clave"
                    class="flex h-full flex-1 flex-col items-center justify-end"
                    :title="`${tramo.texto}: ${tramo.casos} ${tramo.casos === 1 ? 'caso' : 'casos'}`"
                    data-test="duracion"
                  >
                    <span class="mb-1 text-xs tabular-nums text-gray-700 dark:text-slate-300">{{ tramo.casos || '' }}</span>
                    <span class="informe-barras__barra w-full max-w-[3rem] rounded-t bg-emerald-500" :style="{ height: tramo.alto }"></span>
                  </li>
                </ol>
                <ol class="mt-1 flex gap-2 border-t border-gray-200 pt-1 dark:border-slate-700" aria-hidden="true">
                  <li v-for="tramo in duraciones" :key="tramo.clave" class="flex-1 text-center text-[11px] text-gray-500 dark:text-slate-400">
                    {{ tramo.corto }}
                  </li>
                </ol>
                <p class="mt-2 text-xs text-gray-500 dark:text-slate-400">
                  Días de incapacidad que acumula cada caso completo, aunque parte haya ocurrido fuera del periodo.
                </p>
              </div>
            </section>

            <section :class="tarjeta" aria-labelledby="informe-puesto">
              <h2 id="informe-puesto" :class="tituloDeSeccion">Por puesto</h2>
              <div class="px-4 py-3" data-test="por-puesto">
                <InformeBarras :filas="porPuesto" />
              </div>
            </section>

            <section v-if="!centro && centros.length > 1" :class="tarjeta" aria-labelledby="informe-centro">
              <h2 id="informe-centro" :class="tituloDeSeccion">Por centro de trabajo</h2>
              <div class="px-4 py-3" data-test="por-centro">
                <InformeBarras :filas="porCentro" />
              </div>
            </section>

            <section :class="tarjeta" aria-labelledby="informe-semana">
              <h2 id="informe-semana" :class="tituloDeSeccion">Día de la semana en que inician los casos</h2>
              <div class="px-4 py-3">
                <ol class="flex h-28 items-end gap-2">
                  <li
                    v-for="dia in diasDeLaSemana"
                    :key="dia.indice"
                    class="flex h-full flex-1 flex-col items-center justify-end"
                    :title="`${dia.texto}: ${dia.casos} casos nuevos`"
                    data-test="dia-semana"
                  >
                    <span class="mb-1 text-xs tabular-nums text-gray-700 dark:text-slate-300">{{ dia.casos || '' }}</span>
                    <span class="informe-barras__barra w-full max-w-[3rem] rounded-t bg-emerald-500" :style="{ height: dia.alto }"></span>
                  </li>
                </ol>
                <ol class="mt-1 flex gap-2 border-t border-gray-200 pt-1 dark:border-slate-700" aria-hidden="true">
                  <li v-for="dia in diasDeLaSemana" :key="dia.indice" class="flex-1 text-center text-[11px] text-gray-500 dark:text-slate-400">
                    {{ dia.corto }}
                  </li>
                </ol>
              </div>
            </section>

            <section v-if="informe.tendencias.regionPorPuesto.length" :class="tarjeta" aria-labelledby="informe-cruce">
              <h2 id="informe-cruce" :class="tituloDeSeccion">Región anatómica por puesto</h2>
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="text-xs text-gray-500 dark:text-slate-400">
                    <th scope="col" class="px-4 py-2 font-medium">Región</th>
                    <th scope="col" class="px-3 py-2 font-medium">Puesto</th>
                    <th scope="col" class="px-4 py-2 text-right font-medium">Casos nuevos</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
                  <tr v-for="celda in informe.tendencias.regionPorPuesto.slice(0, 8)" :key="celda.region + celda.puesto" data-test="cruce">
                    <td class="px-4 py-1.5 text-gray-800 dark:text-slate-200">{{ textoDeRegion(celda.region) }}</td>
                    <td class="px-3 py-1.5 text-gray-600 dark:text-slate-300">{{ textoDePuesto(celda.puesto) }}</td>
                    <td class="px-4 py-1.5 text-right font-medium tabular-nums text-gray-900 dark:text-slate-100">{{ celda.casos }}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>

          <!-- Por trabajador -->
          <section :class="tarjeta" aria-labelledby="informe-trabajadores">
            <h2 id="informe-trabajadores" :class="tituloDeSeccion">
              Por trabajador
              <span class="ml-1 font-normal text-gray-500 dark:text-slate-400">({{ informe.porTrabajador.length }})</span>
            </h2>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr class="border-b border-gray-200 text-xs text-gray-500 dark:border-slate-700 dark:text-slate-400">
                    <th scope="col" class="px-4 py-2 font-medium">Trabajador</th>
                    <th scope="col" class="px-3 py-2 text-right font-medium">Casos</th>
                    <th scope="col" class="px-3 py-2 text-right font-medium">Días</th>
                    <th scope="col" class="px-3 py-2 font-medium">Días por ramo</th>
                    <th scope="col" class="px-4 py-2 font-medium">Última incapacidad</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
                  <tr
                    v-for="fila in filasDeTrabajadores"
                    :key="fila.idTrabajador"
                    class="incapacidades-empresa__fila transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                    data-test="trabajador"
                  >
                    <td class="px-4 py-2">
                      <RouterLink :to="expedienteDe(fila.idTrabajador)" class="block max-w-[20rem]" title="Abrir expediente">
                        <span class="block truncate font-medium text-gray-900 hover:text-emerald-700 dark:text-slate-100 dark:hover:text-emerald-300">
                          {{ nombreDe(fila.idTrabajador) }}
                        </span>
                        <span class="block truncate text-xs text-gray-500 dark:text-slate-400">{{ contextoDe(fila.idTrabajador) }}</span>
                      </RouterLink>
                    </td>
                    <td class="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-slate-300">{{ fila.casos }}</td>
                    <td class="px-3 py-2 text-right font-medium tabular-nums text-gray-900 dark:text-slate-100">{{ fila.dias }}</td>
                    <td class="px-3 py-2">
                      <span class="flex flex-wrap gap-1.5">
                        <template v-for="ramo in RAMOS" :key="ramo.valor">
                          <span
                            v-if="fila.diasPorRamo[ramo.valor]"
                            class="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
                            :class="ramoDe(ramo.valor).clases"
                            :title="ramo.texto"
                          >
                            <i :class="[ramo.icono, 'text-[10px]']" aria-hidden="true"></i>
                            {{ fila.diasPorRamo[ramo.valor] }}
                          </span>
                        </template>
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-slate-300">
                      {{ fechaCorta(fila.ultimaIncapacidad) || '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="informe.porTrabajador.length > limite" class="border-t border-gray-100 px-4 py-3 text-center dark:border-slate-700">
              <button type="button" class="text-sm font-medium text-emerald-600 hover:text-emerald-700" @click="limite += TRAMO">
                Ver más ({{ informe.porTrabajador.length - limite }} restantes)
              </button>
            </div>
          </section>
        </template>
      </div>
    </div>
  </Transition>
</template>
