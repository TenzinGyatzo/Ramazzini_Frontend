<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import BusquedaTrabajadoresAPI, {
  BUSQUEDA_MIN_CARACTERES,
  esNumeroDeEmpleado,
  type ResultadoBusquedaTrabajador,
} from '@/api/BusquedaTrabajadoresAPI';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import { calcularEdad } from '@/helpers/dates';
import { useEscapeToClose } from '@/composables/useEscapeToClose';

/**
 * Búsqueda global de trabajadores (nombre, CURP, folio o número de empleado) en todas las
 * empresas y centros que el usuario puede ver. Se abre con el botón flotante o con Ctrl+K / ⌘K.
 */
defineProps<{ mostrarBoton: boolean }>();

const LIMITE_RESULTADOS = 20;
const ESPERA_AL_ESCRIBIR_MS = 250;

const router = useRouter();
const abierto = ref(false);
const consulta = ref('');
const resultados = ref<ResultadoBusquedaTrabajador[]>([]);
const estado = ref<'inicio' | 'buscando' | 'listo' | 'error'>('inicio');
const seleccionado = ref(0);
const campoRef = ref<HTMLInputElement | null>(null);
const listaRef = ref<HTMLElement | null>(null);

let temporizador: ReturnType<typeof setTimeout> | null = null;
let controlador: AbortController | null = null;

// Un número de empleado se busca desde 1 dígito; lo demás, desde 3 caracteres
const consultaSuficiente = computed(
  () =>
    esNumeroDeEmpleado(consulta.value) ||
    consulta.value.replace(/\s+/g, '').length >= BUSQUEDA_MIN_CARACTERES,
);

function cancelarBusqueda() {
  if (temporizador) clearTimeout(temporizador);
  temporizador = null;
  controlador?.abort();
  controlador = null;
}

async function buscar(texto: string) {
  controlador = new AbortController();
  try {
    const { data } = await BusquedaTrabajadoresAPI.buscar(texto, controlador.signal);
    if (texto !== consulta.value) return;
    resultados.value = Array.isArray(data) ? data : [];
    seleccionado.value = 0;
    estado.value = 'listo';
  } catch (error) {
    if (axios.isCancel(error)) return;
    estado.value = 'error';
  }
}

watch(consulta, (texto) => {
  cancelarBusqueda();
  if (!consultaSuficiente.value) {
    resultados.value = [];
    estado.value = 'inicio';
    return;
  }
  estado.value = 'buscando';
  temporizador = setTimeout(() => buscar(texto), ESPERA_AL_ESCRIBIR_MS);
});

function abrir() {
  abierto.value = true;
  nextTick(() => campoRef.value?.focus());
}

function cerrar() {
  cancelarBusqueda();
  abierto.value = false;
  consulta.value = '';
  resultados.value = [];
  estado.value = 'inicio';
}

function irAlExpediente(trabajador: ResultadoBusquedaTrabajador) {
  cerrar();
  router.push({
    name: 'expediente-medico',
    params: {
      idEmpresa: trabajador.idEmpresa,
      idCentroTrabajo: trabajador.idCentroTrabajo,
      idTrabajador: trabajador._id,
    },
  });
}

function moverSeleccion(paso: number) {
  const total = resultados.value.length;
  if (!total) return;
  seleccionado.value = (seleccionado.value + paso + total) % total;
  nextTick(() => {
    listaRef.value
      ?.querySelector<HTMLElement>(`[data-indice="${seleccionado.value}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  });
}

function alTeclearEnCampo(evento: KeyboardEvent) {
  if (evento.key === 'ArrowDown') {
    evento.preventDefault();
    moverSeleccion(1);
  } else if (evento.key === 'ArrowUp') {
    evento.preventDefault();
    moverSeleccion(-1);
  } else if (evento.key === 'Enter') {
    const trabajador = resultados.value[seleccionado.value];
    if (trabajador) {
      evento.preventDefault();
      irAlExpediente(trabajador);
    }
  }
}

function alTeclearGlobal(evento: KeyboardEvent) {
  if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
    evento.preventDefault();
    if (abierto.value) cerrar();
    else abrir();
  }
}

useEscapeToClose(cerrar, abierto);

onMounted(() => window.addEventListener('keydown', alTeclearGlobal));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', alTeclearGlobal);
  cancelarBusqueda();
});

function detalle(trabajador: ResultadoBusquedaTrabajador): string {
  const partes = [`${trabajador.nombreEmpresa} › ${trabajador.nombreCentro}`];
  if (trabajador.puesto) partes.push(trabajador.puesto);
  if (trabajador.fechaNacimiento) partes.push(`${calcularEdad(trabajador.fechaNacimiento)} años`);
  return partes.join(' · ');
}
</script>

<template>
  <button
    v-if="mostrarBoton"
    type="button"
    class="fixed top-6 right-24 z-50 p-4 bg-white text-gray-700 rounded-full border border-gray-200 shadow-lg hover:bg-gray-50 hover:shadow-xl transform hover:scale-110 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-200"
    title="Buscar trabajador (Ctrl+K)"
    aria-label="Buscar trabajador"
    @click="abrir"
  >
    <i class="fa-solid fa-magnifying-glass flex h-6 w-6 items-center justify-center text-lg"></i>
  </button>

  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="abierto"
        class="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cerrar"></div>

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Buscar trabajador"
          class="buscador-trabajadores relative w-full max-w-xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
        >
          <div class="flex items-center gap-3 border-b border-gray-200 px-4">
            <i class="fa-solid fa-magnifying-glass text-gray-400" aria-hidden="true"></i>
            <input
              ref="campoRef"
              v-model="consulta"
              type="search"
              autocomplete="off"
              spellcheck="false"
              placeholder="Buscar por nombre, CURP, folio o número de empleado…"
              class="w-full bg-transparent py-3 text-base text-gray-800 placeholder-gray-500 focus:outline-none"
              role="combobox"
              aria-controls="buscador-trabajadores-resultados"
              :aria-expanded="resultados.length > 0"
              :aria-activedescendant="resultados.length ? `buscador-trabajador-${seleccionado}` : undefined"
              @keydown="alTeclearEnCampo"
            />
            <kbd class="hidden rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500 sm:inline">Esc</kbd>
          </div>

          <div class="max-h-[60vh] overflow-y-auto">
            <p v-if="estado === 'inicio'" class="px-4 py-6 text-center text-sm text-gray-500">
              Escribe al menos {{ BUSQUEDA_MIN_CARACTERES }} letras del nombre, la CURP o el folio,
              o el número de empleado.
            </p>
            <p
              v-else-if="estado === 'buscando' && !resultados.length"
              class="px-4 py-6 text-center text-sm text-gray-500"
            >
              Buscando…
            </p>
            <p v-else-if="estado === 'error'" class="px-4 py-6 text-center text-sm text-red-700">
              No se pudo buscar. Intenta de nuevo.
            </p>
            <p
              v-else-if="estado === 'listo' && !resultados.length"
              class="px-4 py-6 text-center text-sm text-gray-500"
            >
              Sin resultados para «{{ consulta.trim() }}».
              <span class="mt-1 block text-xs">Solo aparecen trabajadores de los centros que tienes asignados.</span>
            </p>

            <ul
              v-if="resultados.length"
              id="buscador-trabajadores-resultados"
              ref="listaRef"
              role="listbox"
              class="py-1"
            >
              <li
                v-for="(trabajador, indice) in resultados"
                :id="`buscador-trabajador-${indice}`"
                :key="trabajador._id"
                :data-indice="indice"
                role="option"
                :aria-selected="indice === seleccionado"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                  :class="indice === seleccionado ? 'bg-emerald-50' : 'hover:bg-gray-50'"
                  @mousemove="seleccionado = indice"
                  @click="irAlExpediente(trabajador)"
                >
                  <span class="min-w-0 flex-1">
                    <span class="flex flex-wrap items-baseline gap-x-2">
                      <span class="font-medium text-gray-800">{{ formatNombreCompleto(trabajador) || 'Sin nombre' }}</span>
                      <span v-if="trabajador.folio" class="font-mono text-xs text-gray-500">{{ trabajador.folio }}</span>
                      <span
                        v-if="trabajador.numeroEmpleado"
                        class="inline-flex items-center gap-1 text-xs text-gray-500"
                        title="Número de empleado"
                      >
                        <i class="fas fa-id-badge text-purple-500" aria-hidden="true"></i>No. {{ trabajador.numeroEmpleado }}
                      </span>
                      <span
                        v-if="trabajador.estadoLaboral === 'Inactivo'"
                        class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                      >Dado de baja</span>
                    </span>
                    <span class="block truncate text-xs text-gray-500">{{ detalle(trabajador) }}</span>
                  </span>
                  <i
                    class="fa-solid fa-arrow-right text-sm text-emerald-600"
                    :class="indice === seleccionado ? 'visible' : 'invisible'"
                    aria-hidden="true"
                  ></i>
                </button>
              </li>
            </ul>

            <p
              v-if="resultados.length >= LIMITE_RESULTADOS"
              class="border-t border-gray-200 px-4 py-2 text-xs text-gray-500"
            >
              Se muestran los primeros {{ LIMITE_RESULTADOS }}. Escribe más para afinar la búsqueda.
            </p>
          </div>

          <div class="hidden items-center gap-4 border-t border-gray-200 px-4 py-2 text-xs text-gray-500 sm:flex">
            <span><kbd class="font-sans">↑</kbd> <kbd class="font-sans">↓</kbd> para moverte</span>
            <span><kbd class="font-sans">Enter</kbd> abre el expediente</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
