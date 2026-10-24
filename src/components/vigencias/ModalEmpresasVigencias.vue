<script setup lang="ts">
/**
 * «Elegir empresas» de la vista Vigencias: a qué empresas se les da seguimiento de
 * vencimientos. La última aptitud y los trabajadores activos ayudan a ver cuáles siguen
 * siendo clientes. Al guardar se envían solo los cambios.
 */
import { computed, inject, onMounted, ref } from 'vue';
import VigenciasAptitudAPI, { type EmpresaParaElegir } from '@/api/VigenciasAptitudAPI';
import { extractApiErrorMessage } from '@/helpers/apiErrors';
import { convertirFechaISOaDDMMYYYY } from '@/helpers/dates';
import { cambiosDeSeleccion, filtrarParaElegir, type OrdenParaElegir } from '@/helpers/vigenciasGlobales';
import { useEscapeToClose } from '@/composables/useEscapeToClose';

const emit = defineEmits<{
  (e: 'cerrar'): void;
  (e: 'guardado'): void;
}>();

const toast: any = inject('toast', null);

const empresas = ref<EmpresaParaElegir[]>([]);
const marcadas = ref(new Set<string>());
const cargando = ref(true);
const errorCarga = ref('');
const guardando = ref(false);
const errorGuardar = ref('');
const busqueda = ref('');
const orden = ref<OrdenParaElegir>('nombre');

const cargar = async () => {
  cargando.value = true;
  errorCarga.value = '';
  try {
    const { data } = await VigenciasAptitudAPI.getEmpresas();
    empresas.value = data;
    marcadas.value = new Set(data.filter((e) => e.seleccionada).map((e) => e.idEmpresa));
  } catch (e) {
    errorCarga.value = extractApiErrorMessage(e, 'No se pudieron cargar las empresas.');
  } finally {
    cargando.value = false;
  }
};
onMounted(cargar);

const visibles = computed(() => filtrarParaElegir(empresas.value, busqueda.value, orden.value));
const cambios = computed(() => cambiosDeSeleccion(empresas.value, marcadas.value));

const alternar = (idEmpresa: string) => {
  const nuevas = new Set(marcadas.value);
  if (nuevas.has(idEmpresa)) nuevas.delete(idEmpresa);
  else nuevas.add(idEmpresa);
  marcadas.value = nuevas;
};

/** Actúan sobre las empresas que muestra el buscador. */
const marcarVisibles = (marcar: boolean) => {
  const nuevas = new Set(marcadas.value);
  for (const empresa of visibles.value) {
    if (marcar) nuevas.add(empresa.idEmpresa);
    else nuevas.delete(empresa.idEmpresa);
  }
  marcadas.value = nuevas;
};

const cerrar = () => {
  if (!guardando.value) emit('cerrar');
};
useEscapeToClose(cerrar);

const guardar = async () => {
  if (guardando.value) return;
  if (!cambios.value.length) {
    emit('cerrar');
    return;
  }
  guardando.value = true;
  errorGuardar.value = '';
  try {
    await VigenciasAptitudAPI.actualizarEmpresas(cambios.value);
    toast?.open?.({ message: 'Empresas en seguimiento actualizadas' });
    emit('guardado');
  } catch (e) {
    errorGuardar.value = extractApiErrorMessage(e, 'No se pudo guardar la selección.');
  } finally {
    guardando.value = false;
  }
};

const textoUltima = (empresa: EmpresaParaElegir) =>
  empresa.ultimaAptitud ? `Última aptitud: ${convertirFechaISOaDDMMYYYY(empresa.ultimaAptitud)}` : 'Sin aptitudes';

const campo =
  'rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
const enlace = 'text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50';
</script>

<template>
  <div class="modal-work-overlay fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" @click.self="cerrar">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="elegir-empresas-titulo"
      class="modal-work-panel vigencias__tarjeta relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
      data-test="modal-elegir-empresas"
    >
      <div class="border-b border-gray-200 px-5 pb-3 pt-5 dark:border-slate-700">
        <h2 id="elegir-empresas-titulo" class="vigencias__titulo text-base font-semibold text-gray-900 dark:text-slate-100">
          Elegir empresas
        </h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-slate-400">
          Marca las empresas a las que les das seguimiento de vencimientos. Solo esas aparecen en la vista
          y suman a los totales. No cambia nada más de la empresa.
        </p>
        <div v-if="!cargando && !errorCarga && empresas.length" class="mt-3 flex flex-wrap items-center gap-2">
          <input
            v-model="busqueda"
            type="search"
            placeholder="Buscar empresa"
            aria-label="Buscar empresa"
            :class="[campo, 'w-full min-w-0 sm:w-auto sm:flex-1']"
            data-test="buscar-empresa"
          />
          <select v-model="orden" :class="[campo, 'w-full sm:w-auto']" aria-label="Orden" data-test="orden-elegir">
            <option value="nombre">Por nombre</option>
            <option value="ultimaAptitud">Aptitud más reciente primero</option>
          </select>
        </div>
        <div v-if="!cargando && !errorCarga && empresas.length" class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <button type="button" :class="enlace" :disabled="!visibles.length" data-test="marcar-todas" @click="marcarVisibles(true)">
            Marcar todas
          </button>
          <button type="button" :class="enlace" :disabled="!visibles.length" data-test="desmarcar-todas" @click="marcarVisibles(false)">
            Desmarcar todas
          </button>
          <span class="ml-auto text-sm text-gray-600 dark:text-slate-400" data-test="contador">
            {{ marcadas.size }} {{ marcadas.size === 1 ? 'seleccionada' : 'seleccionadas' }}
          </span>
        </div>
      </div>

      <div class="min-h-[8rem] flex-1 overflow-y-auto">
        <p v-if="cargando" class="py-12 text-center text-sm text-gray-500 dark:text-slate-400">
          <i class="fas fa-spinner fa-spin mr-1" aria-hidden="true"></i>
          Cargando empresas...
        </p>
        <div v-else-if="errorCarga" class="px-5 py-10 text-center">
          <p class="text-sm text-gray-600 dark:text-slate-400">{{ errorCarga }}</p>
          <button type="button" class="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700" @click="cargar">
            Reintentar
          </button>
        </div>
        <p v-else-if="!empresas.length" class="px-5 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
          Aún no hay empresas registradas.
        </p>
        <p v-else-if="!visibles.length" class="px-5 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
          Ninguna empresa coincide con la búsqueda.
        </p>
        <ul v-else class="divide-y divide-gray-100 dark:divide-slate-700">
          <li v-for="empresa in visibles" :key="empresa.idEmpresa">
            <label
              class="vigencias__fila flex cursor-pointer items-center gap-3 px-5 py-2.5 transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-slate-700/50"
              data-test="empresa-para-elegir"
            >
              <input
                type="checkbox"
                class="h-4 w-4 shrink-0 accent-emerald-600"
                :checked="marcadas.has(empresa.idEmpresa)"
                :data-test="`casilla-${empresa.idEmpresa}`"
                @change="alternar(empresa.idEmpresa)"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-gray-900 dark:text-slate-100" :title="empresa.nombreEmpresa">
                  {{ empresa.nombreEmpresa }}
                </span>
                <span class="block text-xs text-gray-500 dark:text-slate-400">
                  {{ textoUltima(empresa) }} · {{ empresa.activos }}
                  {{ empresa.activos === 1 ? 'trabajador activo' : 'trabajadores activos' }}
                </span>
              </span>
            </label>
          </li>
        </ul>
      </div>

      <div class="border-t border-gray-200 px-5 py-3 dark:border-slate-700">
        <p v-if="errorGuardar" class="mb-2 text-sm text-red-600 dark:text-red-400" role="alert">{{ errorGuardar }}</p>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            :disabled="guardando"
            @click="cerrar"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="cargando || !!errorCarga || guardando"
            data-test="guardar"
            @click="guardar"
          >
            <i v-if="guardando" class="fas fa-spinner fa-spin mr-1" aria-hidden="true"></i>
            Guardar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
