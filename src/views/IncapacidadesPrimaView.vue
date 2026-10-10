<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import IncapacidadesAPI from '@/api/IncapacidadesAPI';
import { useEmpresasStore } from '@/stores/empresas';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import { TIPOS_RIESGO, fechaCorta, hoyISO, mensajeDeError, textoDe } from '@/helpers/incapacidades';
import {
  CRITERIOS_PRIMA,
  FACTORES_DE_PRIMA,
  M,
  PRIMA_MAXIMA,
  PRIMA_MINIMA,
  V,
  VARIACION_MAXIMA,
  aniosDisponibles,
  calcularPrima,
  textoDePrima,
  type CriterioPrima,
  type Siniestralidad,
} from '@/helpers/incapacidadesPrima';

const route = useRoute();
const empresas = useEmpresasStore();

const empresaId = String(route.params.idEmpresa);
const anioActual = Number(hoyISO().slice(0, 4));

// ---- Qué se consulta

const anios = aniosDisponibles(anioActual);
/** Se declara la siniestralidad del año anterior. */
const anio = ref(anioActual - 1);
const criterio = ref<CriterioPrima>('terminados');
const centro = ref('');
const centros = ref<Siniestralidad['centros']>([]);

const datos = ref<Siniestralidad | null>(null);
const cargando = ref(true);
const errorCarga = ref('');
let consulta = 0;

// ---- Lo que captura el usuario

/** Promedio de trabajadores expuestos; se sugiere el número de trabajadores activos. */
const n = ref<number | ''>('');
/** Una vez que el usuario la escribe, ya no se reemplaza por la sugerencia. */
const nCapturada = ref(false);
const factor = ref<'2.3' | '2.2'>('2.3');
const primaAnterior = ref<number | ''>('');

const cargar = async () => {
  const esta = ++consulta;
  cargando.value = true;
  errorCarga.value = '';
  try {
    const { data } = await IncapacidadesAPI.getPrimaEmpresa(empresaId, {
      anio: anio.value,
      criterio: criterio.value,
      centro: centro.value || undefined,
    });
    // Si mientras tanto cambió la consulta, este resultado ya no aplica
    if (esta !== consulta) return;
    datos.value = data;
    if (!centro.value) centros.value = data.centros;
    if (!nCapturada.value) n.value = data.trabajadoresActivos || '';
  } catch (e) {
    if (esta !== consulta) return;
    datos.value = null;
    errorCarga.value = mensajeDeError(e, 'No se pudo calcular la siniestralidad.');
  } finally {
    if (esta === consulta) cargando.value = false;
  }
};

watch([anio, criterio, centro], cargar);

onMounted(() => {
  if (String(empresas.currentEmpresa?._id ?? '') !== empresaId) {
    empresas.fetchEmpresaById(empresaId);
  }
  cargar();
});

// ---- Resultado

const f = computed(() => FACTORES_DE_PRIMA.find((opcion) => opcion.valor === factor.value)?.numero ?? 2.3);

const resultado = computed(() =>
  datos.value
    ? calcularPrima({
        S: datos.value.S,
        I: datos.value.I,
        D: datos.value.D,
        N: Number(n.value),
        F: f.value,
        primaAnterior: primaAnterior.value === '' ? null : Number(primaAnterior.value),
      })
    : null,
);

const sustitucion = computed(() =>
  datos.value && resultado.value
    ? `[(${datos.value.S} ÷ 365) + ${V} × (${datos.value.I} + ${datos.value.D})] × (${f.value} ÷ ${Number(n.value)}) + ${M}`
    : '',
);

const criterioElegido = computed(
  () => CRITERIOS_PRIMA.find((opcion) => opcion.valor === criterio.value) ?? CRITERIOS_PRIMA[0],
);

const enCalificacion = computed(() => (datos.value?.casos ?? []).filter((c) => c.enCalificacion).length);

const trabajadoresPorId = computed(() => new Map((datos.value?.trabajadores ?? []).map((t) => [t._id, t])));
const nombreDe = (idTrabajador: string) => {
  const trabajador = trabajadoresPorId.value.get(idTrabajador);
  return trabajador ? formatNombreCompleto(trabajador as any) : 'Trabajador';
};

const textoDeDiferencia = (diferencia: number) =>
  diferencia === 0
    ? 'Igual que la prima anterior'
    : `${diferencia > 0 ? 'Sube' : 'Baja'} ${Math.abs(diferencia).toLocaleString('es-MX', { maximumFractionDigits: 5 })} puntos respecto a la prima anterior`;

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
    <div class="incapacidades-prima">
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
              Prima de riesgo de trabajo
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
          <select v-model.number="anio" :class="campo" aria-label="Año" data-test="filtro-anio">
            <option v-for="opcion in anios" :key="opcion" :value="opcion">Siniestralidad de {{ opcion }}</option>
          </select>
          <select v-model="criterio" :class="campo" aria-label="Criterio de imputación" data-test="filtro-criterio">
            <option v-for="opcion in CRITERIOS_PRIMA" :key="opcion.valor" :value="opcion.valor">{{ opcion.texto }}</option>
          </select>
        </div>
      </div>

      <!-- Advertencia -->
      <div
        class="incapacidades-prima__aviso mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-600/70 dark:bg-amber-950/40 dark:text-amber-200"
        role="note"
        data-test="aviso"
      >
        <p class="font-semibold">
          <i class="fas fa-triangle-exclamation mr-1" aria-hidden="true"></i>
          Estimación para revisar con el contador. No es la declaración oficial.
        </p>
        <ul class="mt-1.5 list-disc space-y-0.5 pl-5">
          <li>
            <strong>Año al que se carga un caso:</strong> regla sin confirmar.
            Con «{{ criterioElegido.texto }}»: {{ criterioElegido.descripcion }}
          </li>
          <li>
            <strong>Topes:</strong> se supone que la prima no varía más de {{ VARIACION_MAXIMA }} punto porcentual por año
            y que va de {{ PRIMA_MINIMA }} % a {{ PRIMA_MAXIMA }} %. Sin confirmar.
          </li>
          <li>Solo cuenta lo registrado en el sistema. Los casos que el IMSS aún no califica se incluyen y se señalan.</li>
          <li>El dato oficial de trabajadores expuestos (N) es el del IMSS; aquí solo se sugiere el número de trabajadores activos de hoy.</li>
        </ul>
      </div>

      <p v-if="cargando && !datos" class="py-16 text-center text-sm text-gray-500 dark:text-slate-400">
        <i class="fas fa-spinner fa-spin mr-1"></i>
        Calculando siniestralidad...
      </p>

      <div v-else-if="errorCarga" :class="[tarjeta, 'px-4 py-12 text-center']">
        <p class="text-sm text-gray-600 dark:text-slate-400">{{ errorCarga }}</p>
        <button type="button" class="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700" @click="cargar">
          Reintentar
        </button>
      </div>

      <div v-else-if="datos" :class="{ 'opacity-60': cargando }" :aria-busy="cargando">
        <div class="mb-3 grid gap-3 lg:grid-cols-2">
          <!-- Siniestralidad -->
          <section :class="tarjeta" aria-labelledby="prima-siniestralidad">
            <h2 id="prima-siniestralidad" :class="tituloDeSeccion">Siniestralidad de {{ datos.anio }}, según lo registrado</h2>
            <dl class="grid grid-cols-3 gap-3 px-4 py-3">
              <div>
                <dt :class="etiqueta">S · Días subsidiados</dt>
                <dd :class="cifra" data-test="valor-s">{{ datos.S }}</dd>
              </div>
              <div>
                <dt :class="etiqueta" title="Suma de los porcentajes de incapacidad permanente, entre 100">I · Incapacidad permanente</dt>
                <dd :class="cifra" data-test="valor-i">{{ datos.I }}</dd>
              </div>
              <div>
                <dt :class="etiqueta">D · Defunciones</dt>
                <dd :class="cifra" data-test="valor-d">{{ datos.D }}</dd>
              </div>
            </dl>
            <ul class="space-y-1 border-t border-gray-100 px-4 py-3 text-xs text-gray-600 dark:border-slate-700 dark:text-slate-400" data-test="notas">
              <li>{{ datos.casos.length }} {{ datos.casos.length === 1 ? 'caso entra' : 'casos entran' }} al cálculo.</li>
              <li v-if="datos.excluidos.trayecto">
                {{ datos.excluidos.trayecto }}
                {{ datos.excluidos.trayecto === 1 ? 'accidente en trayecto no entra' : 'accidentes en trayecto no entran' }}.
              </li>
              <li v-if="datos.excluidos.enCurso">
                {{ datos.excluidos.enCurso }}
                {{ datos.excluidos.enCurso === 1 ? 'caso sigue en curso y no entra' : 'casos siguen en curso y no entran' }}
                hasta que termine.
              </li>
              <li v-if="enCalificacion" class="text-amber-700 dark:text-amber-300">
                {{ enCalificacion }}
                {{ enCalificacion === 1 ? 'caso aún no está calificado' : 'casos aún no están calificados' }}
                por el IMSS como riesgo de trabajo.
              </li>
            </ul>
          </section>

          <!-- Datos de la empresa -->
          <section :class="tarjeta" aria-labelledby="prima-datos">
            <h2 id="prima-datos" :class="tituloDeSeccion">Datos de la empresa</h2>
            <div class="space-y-3 px-4 py-3">
              <label class="block">
                <span :class="etiqueta">N · Promedio de trabajadores expuestos al riesgo</span>
                <input
                  v-model.number="n"
                  type="number"
                  min="1"
                  step="any"
                  :class="[campo, 'mt-1 block w-40']"
                  data-test="campo-n"
                  @input="nCapturada = true"
                />
                <span class="mt-1 block text-xs text-gray-500 dark:text-slate-400">
                  Trabajadores activos hoy: {{ datos.trabajadoresActivos }}. Usa el promedio que reporta el IMSS.
                </span>
              </label>
              <label class="block">
                <span :class="etiqueta">F · Factor de prima</span>
                <select v-model="factor" :class="[campo, 'mt-1 block w-full max-w-sm']" data-test="campo-f">
                  <option v-for="opcion in FACTORES_DE_PRIMA" :key="opcion.valor" :value="opcion.valor">{{ opcion.texto }}</option>
                </select>
              </label>
              <label class="block">
                <span :class="etiqueta">Prima anterior, en % (opcional)</span>
                <input
                  v-model.number="primaAnterior"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Ej. 2.59840"
                  :class="[campo, 'mt-1 block w-40']"
                  data-test="campo-anterior"
                />
                <span class="mt-1 block text-xs text-gray-500 dark:text-slate-400">
                  Estos tres datos no se guardan; se capturan cada vez.
                </span>
              </label>
            </div>
          </section>
        </div>

        <!-- Resultado -->
        <section :class="[tarjeta, 'mb-3']" aria-labelledby="prima-resultado">
          <h2 id="prima-resultado" :class="tituloDeSeccion">Prima estimada</h2>
          <p v-if="!resultado" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400" data-test="sin-resultado">
            Indica el promedio de trabajadores expuestos (N) para estimar la prima.
          </p>
          <div v-else class="px-4 py-3">
            <div class="flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <p :class="etiqueta">Prima estimada</p>
                <p class="mt-0.5 text-3xl font-semibold tabular-nums text-gray-900 dark:text-slate-100" data-test="prima-aplicable">
                  {{ textoDePrima(resultado.aplicable) }}
                </p>
              </div>
              <div v-if="resultado.ajustes.length">
                <p :class="etiqueta">Resultado de la fórmula, antes de topes</p>
                <p class="mt-0.5 text-lg font-semibold tabular-nums text-gray-700 dark:text-slate-300" data-test="prima-calculada">
                  {{ textoDePrima(resultado.calculada) }}
                </p>
              </div>
              <p
                v-if="resultado.diferencia !== null"
                class="text-sm font-medium"
                :class="resultado.diferencia > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'"
                data-test="diferencia"
              >
                {{ textoDeDiferencia(resultado.diferencia) }}
              </p>
            </div>
            <ul v-if="resultado.ajustes.length" class="mt-2 list-disc pl-5 text-sm text-amber-700 dark:text-amber-300" data-test="ajustes">
              <li v-for="ajuste in resultado.ajustes" :key="ajuste">{{ ajuste }} (supuesto sin confirmar)</li>
            </ul>
            <div class="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-600 dark:border-slate-700 dark:text-slate-400">
              <p>Prima = [(S ÷ 365) + V × (I + D)] × (F ÷ N) + M, con V = {{ V }} y M = {{ M }}</p>
              <p class="mt-1 font-mono tabular-nums" data-test="sustitucion">
                {{ sustitucion }} = {{ textoDePrima(resultado.calculada) }}
              </p>
            </div>
          </div>
        </section>

        <!-- Casos -->
        <section :class="tarjeta" aria-labelledby="prima-casos">
          <h2 id="prima-casos" :class="tituloDeSeccion">
            Casos que entran al cálculo
            <span class="ml-1 font-normal text-gray-500 dark:text-slate-400">({{ datos.casos.length }})</span>
          </h2>
          <p v-if="!datos.casos.length" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
            Ningún riesgo de trabajo registrado entra al cálculo de {{ datos.anio }}.
          </p>
          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr class="border-b border-gray-200 text-xs text-gray-500 dark:border-slate-700 dark:text-slate-400">
                  <th scope="col" class="px-4 py-2 font-medium">Trabajador</th>
                  <th scope="col" class="px-3 py-2 font-medium">Tipo</th>
                  <th scope="col" class="px-3 py-2 font-medium">Inicio</th>
                  <th scope="col" class="px-3 py-2 font-medium">Término</th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">Días (S)</th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">Incapacidad permanente</th>
                  <th scope="col" class="px-4 py-2 font-medium">Defunción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
                <tr v-for="caso in datos.casos" :key="caso.idCaso" data-test="caso">
                  <td class="px-4 py-2">
                    <span class="font-medium text-gray-900 dark:text-slate-100">{{ nombreDe(caso.idTrabajador) }}</span>
                    <span
                      v-if="caso.enCalificacion"
                      class="ml-1.5 whitespace-nowrap rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                    >Sin calificar</span>
                  </td>
                  <td class="px-3 py-2 text-gray-700 dark:text-slate-300">{{ textoDe(TIPOS_RIESGO, caso.tipoRiesgo) || '—' }}</td>
                  <td class="whitespace-nowrap px-3 py-2 text-gray-700 dark:text-slate-300">{{ fechaCorta(caso.fechaInicio) }}</td>
                  <td class="whitespace-nowrap px-3 py-2 text-gray-700 dark:text-slate-300">{{ fechaCorta(caso.fechaTermino) || 'En curso' }}</td>
                  <td class="px-3 py-2 text-right font-medium tabular-nums text-gray-900 dark:text-slate-100">{{ caso.dias }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-slate-300">{{ caso.porcentajeIPP ? caso.porcentajeIPP + ' %' : '—' }}</td>
                  <td class="px-4 py-2 text-gray-700 dark:text-slate-300">{{ caso.defuncion ? 'Sí' : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </Transition>
</template>
