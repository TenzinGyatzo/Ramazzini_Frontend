<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import IncapacidadesAPI from '@/api/IncapacidadesAPI';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useUserPermissions } from '@/composables/useUserPermissions';
import { useEscapeToClose } from '@/composables/useEscapeToClose';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import IncapacidadFormulario from './IncapacidadFormulario.vue';
import CasoSeguimientoFormulario from './CasoSeguimientoFormulario.vue';
import {
  CALIFICACIONES,
  CARACTERES,
  GRUPOS_DIAGNOSTICO,
  NATURALEZAS_LESION,
  ORIGENES,
  REGIONES_ANATOMICAS,
  TIPOS_ALTA,
  TIPOS_RIESGO,
  fechaCorta,
  mensajeDeError,
  ramoDe,
  textoDe,
  textoDias,
  type CasoConIncapacidades,
  type Incapacidad,
} from '@/helpers/incapacidades';

const emit = defineEmits<{
  (e: 'closeModal'): void;
  /** Cambió algo: quien abrió la ventana puede refrescar sus contadores. */
  (e: 'cambio', casos: CasoConIncapacidades[]): void;
}>();

const toast = inject<any>('toast');
const trabajadores = useTrabajadoresStore();
const { canAccessRiesgosTrabajo: puedeGestionar } = useUserPermissions();

const trabajadorId = computed(() => String(trabajadores.currentTrabajador?._id ?? ''));

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'registrar'; casoBase: CasoConIncapacidades | null }
  | { tipo: 'seguimiento'; item: CasoConIncapacidades };

const vista = ref<Vista>({ tipo: 'lista' });
const casos = ref<CasoConIncapacidades[]>([]);
const cargando = ref(true);
const errorCarga = ref('');
/** Id del caso o de la incapacidad que espera confirmación para eliminarse. */
const porEliminar = ref('');
const eliminando = ref(false);

const cargar = async () => {
  if (!trabajadorId.value) return;
  cargando.value = true;
  errorCarga.value = '';
  try {
    const { data } = await IncapacidadesAPI.getCasos(trabajadorId.value);
    casos.value = data;
    emit('cambio', data);
  } catch (e) {
    errorCarga.value = mensajeDeError(e, 'No se pudieron cargar las incapacidades.');
  } finally {
    cargando.value = false;
  }
};

onMounted(cargar);

const cerrar = () => {
  if (vista.value.tipo !== 'lista') {
    vista.value = { tipo: 'lista' };
    return;
  }
  emit('closeModal');
};

useEscapeToClose(cerrar);

const alGuardar = async () => {
  vista.value = { tipo: 'lista' };
  await cargar();
};

const resumen = computed(() => ({
  casos: casos.value.length,
  dias: casos.value.reduce((suma, c) => suma + c.dias.total, 0),
  subsidiados: casos.value.reduce((suma, c) => suma + c.dias.subsidiados, 0),
  aCargoEmpresa: casos.value.reduce((suma, c) => suma + c.dias.aCargoEmpresa, 0),
  incapacitadoHoy: casos.value.some((c) => c.incapacitadoHoy),
  activos: casos.value.filter((c) => c.estado === 'activo').length,
}));

const titulo = computed(() => {
  if (vista.value.tipo === 'registrar') {
    return vista.value.casoBase ? 'Agregar incapacidad al caso' : 'Registrar incapacidad';
  }
  if (vista.value.tipo === 'seguimiento') return 'Seguimiento del caso';
  return 'Incapacidades';
});

const eliminar = async (accion: () => Promise<unknown>, mensaje: string) => {
  if (eliminando.value) return;
  eliminando.value = true;
  try {
    await accion();
    toast?.open?.({ message: mensaje, type: 'success' });
    porEliminar.value = '';
    await cargar();
  } catch (e) {
    toast?.open?.({ message: mensajeDeError(e, 'No se pudo eliminar.'), type: 'error' });
  } finally {
    eliminando.value = false;
  }
};

const eliminarIncapacidad = (incapacidad: Incapacidad) =>
  eliminar(
    () => IncapacidadesAPI.eliminarIncapacidad(trabajadorId.value, incapacidad._id),
    'Incapacidad eliminada',
  );

const eliminarCaso = (item: CasoConIncapacidades) =>
  eliminar(() => IncapacidadesAPI.eliminarCaso(trabajadorId.value, item.caso._id), 'Caso eliminado');

/** Lo que distingue al caso, en una línea: tipo de riesgo, lesión, región, grupo. */
const detalleDeCaso = (item: CasoConIncapacidades): string =>
  [
    textoDe(TIPOS_RIESGO, item.caso.tipoRiesgo),
    textoDe(NATURALEZAS_LESION, item.caso.naturalezaLesion),
    textoDe(REGIONES_ANATOMICAS, item.caso.regionAnatomica),
    item.caso.ramo === 'maternidad' ? '' : textoDe(GRUPOS_DIAGNOSTICO, item.caso.grupoDiagnostico),
  ]
    .filter(Boolean)
    .join(' · ');

/** Calificación, alta y consecuencias de un riesgo de trabajo. */
const seguimientoDeCaso = (item: CasoConIncapacidades): string[] => {
  const { caso } = item;
  return [
    textoDe(CALIFICACIONES, caso.calificacion),
    caso.fechaAlta ? `${textoDe(TIPOS_ALTA, caso.tipoAlta) || 'Alta'} el ${fechaCorta(caso.fechaAlta)}` : '',
    caso.tieneSecuelas ? 'Con secuelas' : '',
    (caso.porcentajeIPP ?? 0) > 0 ? `Incapacidad permanente ${caso.porcentajeIPP} %` : '',
    caso.defuncion ? 'Defunción' : '',
    caso.idCasoOrigen ? 'Recaída' : '',
  ].filter(Boolean);
};

const desgloseDeDias = (item: CasoConIncapacidades): string =>
  [
    item.dias.subsidiados ? `${item.dias.subsidiados} subsidiados por el IMSS` : '',
    item.dias.sinSubsidio ? `${item.dias.sinSubsidio} sin subsidio` : '',
    item.dias.aCargoEmpresa ? `${item.dias.aCargoEmpresa} a cargo de la empresa` : '',
  ]
    .filter(Boolean)
    .join(' · ');

const botonSecundario =
  'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors duration-150 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300';
const botonPeligro =
  'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors duration-150 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-300';
</script>

<template>
  <div class="modal modal-incapacidades fixed top-0 left-0 z-50 flex h-screen w-full items-center justify-center p-4 sm:p-8">
    <div
      class="modal-work-overlay absolute top-0 left-0 h-full w-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
      @click="cerrar"
    ></div>

    <div
      class="modal-work-panel modal-inner relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white text-gray-800 shadow-md shadow-slate-900 dark:bg-slate-800 dark:text-slate-100"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-incapacidades-titulo"
    >
      <!-- Encabezado -->
      <div class="flex items-start gap-3 border-b border-gray-200 px-5 py-4 dark:border-slate-700">
        <button
          v-if="vista.tipo !== 'lista'"
          type="button"
          class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-slate-700"
          title="Volver a la lista"
          aria-label="Volver a la lista"
          @click="vista = { tipo: 'lista' }"
        >
          <i class="fa-solid fa-arrow-left text-sm"></i>
        </button>
        <div class="min-w-0 flex-1">
          <h1 id="modal-incapacidades-titulo" class="modal-incapacidades__titulo text-lg font-semibold text-gray-900 dark:text-slate-100">
            {{ titulo }}
          </h1>
          <p class="truncate text-sm font-medium text-gray-700 dark:text-slate-300">
            {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
            <span v-if="trabajadores.currentTrabajador?.puesto" class="font-normal text-gray-500 dark:text-slate-400">
              · {{ trabajadores.currentTrabajador.puesto }}
            </span>
          </p>
        </div>
        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700"
          title="Cerrar"
          aria-label="Cerrar"
          @click="emit('closeModal')"
        >
          <i class="fa-solid fa-xmark text-base"></i>
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <!-- Registrar -->
        <IncapacidadFormulario
          v-if="vista.tipo === 'registrar'"
          :trabajador-id="trabajadorId"
          :casos="casos"
          :caso-base="vista.casoBase"
          @guardado="alGuardar"
          @cancelar="vista = { tipo: 'lista' }"
        />

        <!-- Seguimiento -->
        <CasoSeguimientoFormulario
          v-else-if="vista.tipo === 'seguimiento'"
          :trabajador-id="trabajadorId"
          :item="vista.item"
          @guardado="alGuardar"
          @cancelar="vista = { tipo: 'lista' }"
        />

        <!-- Lista -->
        <template v-else>
          <p v-if="cargando" class="py-10 text-center text-sm text-gray-500 dark:text-slate-400">
            <i class="fas fa-spinner fa-spin mr-1"></i>
            Cargando incapacidades...
          </p>

          <div v-else-if="errorCarga" class="py-10 text-center">
            <p class="text-sm text-gray-600 dark:text-slate-400">{{ errorCarga }}</p>
            <button type="button" class="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700" @click="cargar">
              Reintentar
            </button>
          </div>

          <template v-else>
            <!-- Resumen del trabajador -->
            <div class="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <span
                v-if="resumen.incapacitadoHoy"
                class="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 dark:bg-red-950/50 dark:text-red-300"
              >
                <i class="fas fa-bed text-[10px]" aria-hidden="true"></i>
                Incapacitado hoy
              </span>
              <p class="text-sm text-gray-600 dark:text-slate-400">
                <span class="font-semibold text-gray-900 dark:text-slate-100">{{ resumen.casos }}</span>
                {{ resumen.casos === 1 ? 'caso' : 'casos' }}
                <template v-if="resumen.activos">({{ resumen.activos }} {{ resumen.activos === 1 ? 'activo' : 'activos' }})</template>
              </p>
              <p class="text-sm text-gray-600 dark:text-slate-400">
                <span class="font-semibold text-gray-900 dark:text-slate-100">{{ resumen.dias }}</span>
                {{ resumen.dias === 1 ? 'día' : 'días' }} de incapacidad
              </p>
              <p v-if="resumen.subsidiados" class="text-sm text-gray-600 dark:text-slate-400">
                <span class="font-semibold text-gray-900 dark:text-slate-100">{{ resumen.subsidiados }}</span>
                subsidiados por el IMSS
              </p>
              <span class="flex-1"></span>
              <button
                v-if="puedeGestionar"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-emerald-700"
                @click="vista = { tipo: 'registrar', casoBase: null }"
              >
                <i class="fas fa-plus text-xs"></i>
                Registrar incapacidad
              </button>
            </div>

            <!-- Sin casos -->
            <div v-if="!casos.length" class="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center dark:border-slate-600">
              <i class="fas fa-clipboard-check mb-2 text-2xl text-gray-300 dark:text-slate-600" aria-hidden="true"></i>
              <p class="text-sm font-medium text-gray-700 dark:text-slate-300">Sin incapacidades registradas</p>
              <p class="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Registra los certificados del IMSS y los descansos que otorga la empresa.
              </p>
            </div>

            <!-- Casos -->
            <ul v-else class="space-y-3">
              <li
                v-for="item in casos"
                :key="item.caso._id"
                class="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-600"
              >
                <!-- Encabezado del caso -->
                <div class="flex flex-wrap items-start gap-x-3 gap-y-2 bg-gray-50 px-3 py-2.5 dark:bg-slate-900/60">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span
                        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        :class="ramoDe(item.caso.ramo).clases"
                      >
                        <i :class="ramoDe(item.caso.ramo).icono" class="text-[10px]" aria-hidden="true"></i>
                        {{ ramoDe(item.caso.ramo).texto }}
                      </span>
                      <span
                        class="rounded-full px-2 py-0.5 text-xs font-medium"
                        :class="item.estado === 'activo'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300'"
                      >
                        {{ item.estado === 'activo' ? 'Activo' : 'Terminado' }}
                      </span>
                      <span class="text-xs text-gray-500 dark:text-slate-400">
                        Desde el {{ fechaCorta(item.caso.fechaInicio) }}
                      </span>
                    </div>
                    <p v-if="detalleDeCaso(item)" class="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">
                      {{ detalleDeCaso(item) }}
                    </p>
                    <p v-if="item.caso.diagnostico" class="text-sm text-gray-700 dark:text-slate-300">
                      {{ item.caso.diagnostico }}
                    </p>
                    <p v-if="seguimientoDeCaso(item).length" class="mt-0.5 text-xs text-gray-600 dark:text-slate-400">
                      {{ seguimientoDeCaso(item).join(' · ') }}
                    </p>
                    <p v-if="item.caso.notas" class="mt-0.5 text-xs italic text-gray-500 dark:text-slate-400">
                      {{ item.caso.notas }}
                    </p>
                  </div>
                  <div class="shrink-0 text-right">
                    <p class="text-sm font-semibold text-gray-900 dark:text-slate-100">{{ textoDias(item.dias.total) }}</p>
                    <p v-if="desgloseDeDias(item)" class="text-xs text-gray-500 dark:text-slate-400">
                      {{ desgloseDeDias(item) }}
                    </p>
                  </div>
                </div>

                <!-- Incapacidades del caso -->
                <ul v-if="item.incapacidades.length" class="divide-y divide-gray-100 dark:divide-slate-700">
                  <li
                    v-for="incapacidad in item.incapacidades"
                    :key="incapacidad._id"
                    class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
                  >
                    <span class="w-24 shrink-0 font-medium text-gray-900 dark:text-slate-100">
                      {{ textoDe(CARACTERES, incapacidad.caracter) }}
                    </span>
                    <span class="min-w-0 flex-1 text-gray-700 dark:text-slate-300">
                      {{ fechaCorta(incapacidad.fechaInicio) }} al {{ fechaCorta(incapacidad.fechaTermino) }}
                      <span class="text-gray-500 dark:text-slate-400">
                        · {{ textoDe(ORIGENES, incapacidad.origen) }}<template v-if="incapacidad.folio"> · folio {{ incapacidad.folio }}</template><template v-if="incapacidad.origen === 'empresa'"> · {{ incapacidad.conGoceDeSueldo ? 'con' : 'sin' }} goce de sueldo</template>
                      </span>
                      <span
                        v-if="incapacidad.historico"
                        class="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600 dark:bg-slate-700 dark:text-slate-300"
                        title="Total de días del registro anterior de riesgos de trabajo; no corresponde a un certificado"
                      >
                        Registro anterior
                      </span>
                    </span>
                    <span class="shrink-0 font-medium text-gray-900 dark:text-slate-100">{{ textoDias(incapacidad.dias) }}</span>
                    <template v-if="puedeGestionar">
                      <span v-if="porEliminar === incapacidad._id" class="flex shrink-0 items-center gap-1.5 text-xs">
                        ¿Eliminar?
                        <button type="button" class="font-semibold text-red-600 hover:underline" :disabled="eliminando" @click="eliminarIncapacidad(incapacidad)">Sí</button>
                        <button type="button" class="font-medium text-gray-600 hover:underline dark:text-slate-300" @click="porEliminar = ''">No</button>
                      </span>
                      <button
                        v-else
                        type="button"
                        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        title="Eliminar incapacidad"
                        aria-label="Eliminar incapacidad"
                        @click="porEliminar = incapacidad._id"
                      >
                        <i class="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </template>
                  </li>
                </ul>
                <p v-else class="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">
                  Sin incapacidades: el trabajador siguió laborando.
                </p>

                <!-- Acciones del caso -->
                <div v-if="puedeGestionar" class="flex flex-wrap items-center gap-2 border-t border-gray-100 px-3 py-2 dark:border-slate-700">
                  <button
                    v-if="item.estado === 'activo' || item.caso.ramo === 'maternidad'"
                    type="button"
                    :class="botonSecundario"
                    @click="vista = { tipo: 'registrar', casoBase: item }"
                  >
                    <i class="fas fa-plus text-[10px]"></i>
                    Agregar {{ item.caso.ramo === 'maternidad' ? 'incapacidad' : 'subsecuente' }}
                  </button>
                  <button type="button" :class="botonSecundario" @click="vista = { tipo: 'seguimiento', item }">
                    <i class="fas fa-pen text-[10px]"></i>
                    {{ item.caso.ramo === 'riesgoTrabajo' ? 'Calificación, alta y secuelas' : 'Editar padecimiento' }}
                  </button>
                  <span class="flex-1"></span>
                  <span v-if="porEliminar === item.caso._id" class="flex items-center gap-1.5 text-xs">
                    ¿Eliminar el caso y sus incapacidades?
                    <button type="button" class="font-semibold text-red-600 hover:underline" :disabled="eliminando" @click="eliminarCaso(item)">Sí</button>
                    <button type="button" class="font-medium text-gray-600 hover:underline dark:text-slate-300" @click="porEliminar = ''">No</button>
                  </span>
                  <button v-else type="button" :class="botonPeligro" @click="porEliminar = item.caso._id">
                    <i class="fa-solid fa-trash-can text-[10px]"></i>
                    Eliminar caso
                  </button>
                </div>
              </li>
            </ul>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>
