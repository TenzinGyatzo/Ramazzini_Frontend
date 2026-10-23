<script setup lang="ts">
/**
 * Consulta de las fusiones en el expediente del registro conservado
 * (docs/fusion-trabajadores-especificacion.md, 5.4): una línea bajo el encabezado y el detalle.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import TrabajadoresAPI from '@/api/TrabajadoresAPI';
import type { FusionConsultada } from '@/interfaces/trabajador.interface';
import {
  cambiosConsultados,
  coleccionesTrasladadas,
  fechaComoDia,
  nombreRegistroEliminado,
  textoMotivos,
} from '@/helpers/fusionConsulta';

const props = defineProps<{
  empresaId: string;
  centroId: string;
  trabajadorId: string;
}>();

const fusiones = ref<FusionConsultada[]>([]);
const detalleAbierto = ref(false);
let seq = 0;

async function cargar() {
  const actual = ++seq;
  fusiones.value = [];
  detalleAbierto.value = false;
  if (!props.empresaId || !props.centroId || !props.trabajadorId) return;
  try {
    const { data } = await TrabajadoresAPI.getFusionesDeTrabajador(
      props.empresaId,
      props.centroId,
      props.trabajadorId,
    );
    if (actual === seq) fusiones.value = Array.isArray(data) ? data : [];
  } catch (error) {
    // Es información de consulta: si falla, el expediente se muestra igual
    console.error('Error al cargar las fusiones del trabajador:', error);
  }
}

watch(() => [props.empresaId, props.centroId, props.trabajadorId].join('/'), cargar);
onMounted(cargar);

const reciente = computed(() => fusiones.value[0] ?? null);

function porQuien(fusion: FusionConsultada): string {
  return fusion.actor?.nombre ? ` por ${fusion.actor.nombre}` : '';
}

function alCerrarConEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && detalleAbierto.value) detalleAbierto.value = false;
}
onMounted(() => document.addEventListener('keydown', alCerrarConEscape));
onBeforeUnmount(() => document.removeEventListener('keydown', alCerrarConEscape));
</script>

<template>
  <div v-if="reciente" class="fusiones-trabajador mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
    <i class="fa-solid fa-object-group" aria-hidden="true"></i>
    <span>
      Fusionado con {{ nombreRegistroEliminado(reciente) }}
      el {{ fechaComoDia(reciente.fecha) }}{{ porQuien(reciente) }}
    </span>
    <span v-if="fusiones.length > 1">· {{ fusiones.length }} fusiones en total</span>
    <button
      type="button"
      class="font-medium text-emerald-700 underline hover:text-emerald-800"
      @click="detalleAbierto = true"
    >
      Ver detalle
    </button>
  </div>

  <Teleport to="body">
    <div
      v-if="detalleAbierto"
      class="modal fixed inset-0 z-[60] grid grid-cols-1 place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fusiones-titulo"
    >
      <div class="absolute inset-0 bg-emerald-900/50 backdrop-blur-sm" aria-hidden="true" @click="detalleAbierto = false" />
      <div class="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-slate-800 dark:text-slate-100 dark:shadow-black/40">
        <div class="border-b border-gray-200 px-6 pt-5 pb-4 dark:border-slate-600">
          <h2 id="fusiones-titulo" class="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {{ fusiones.length === 1 ? 'Fusión de registros' : 'Fusiones de registros' }}
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Registros que se unieron a este expediente. La fusión no se puede deshacer.
          </p>
        </div>

        <div class="flex-1 divide-y divide-gray-200 overflow-y-auto dark:divide-slate-600">
          <section v-for="fusion in fusiones" :key="fusion._id" class="space-y-3 px-6 py-4 text-sm">
            <div>
              <p class="font-medium text-gray-900 dark:text-slate-100">
                Fusionado con {{ nombreRegistroEliminado(fusion) }}
              </p>
              <p class="text-gray-600 dark:text-slate-300">
                {{ fechaComoDia(fusion.fecha) }}{{ porQuien(fusion) }}<template v-if="fusion.actor?.email"> ({{ fusion.actor.email }})</template>
              </p>
              <p v-if="fusion.indirecta" class="text-gray-500 dark:text-slate-400">
                Llegó a este expediente con el registro folio {{ fusion.folioDestino || 'N/D' }}, que se fusionó después.
              </p>
              <p v-if="fusion.curpFuente" class="text-gray-500 dark:text-slate-400">
                CURP del registro eliminado: {{ fusion.curpFuente }}
              </p>
            </div>

            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Motivo</p>
              <p class="text-gray-800 dark:text-slate-200">
                {{ textoMotivos(fusion) || 'No se registró (fusión anterior al motivo obligatorio)' }}
              </p>
              <p v-if="fusion.comentario" class="mt-0.5 text-gray-600 dark:text-slate-300">«{{ fusion.comentario }}»</p>
            </div>

            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Datos que cambiaron</p>
              <ul v-if="cambiosConsultados(fusion).length" class="space-y-0.5">
                <li v-for="cambio in cambiosConsultados(fusion)" :key="cambio.clave" class="text-gray-800 dark:text-slate-200">
                  {{ cambio.etiqueta }}:
                  <span class="text-gray-500 line-through dark:text-slate-400">{{ cambio.anterior ?? 'Sin dato' }}</span>
                  → <strong>{{ cambio.nuevo ?? 'Sin dato' }}</strong>
                </li>
              </ul>
              <p v-else class="text-gray-600 dark:text-slate-300">Ninguno.</p>
            </div>

            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Registros trasladados</p>
              <ul v-if="coleccionesTrasladadas(fusion).length" class="space-y-1">
                <li v-for="coleccion in coleccionesTrasladadas(fusion)" :key="coleccion.modelName" class="text-gray-800 dark:text-slate-200">
                  {{ coleccion.etiqueta }}: {{ coleccion.cantidad }}
                  <span v-if="coleccion.detalle.length" class="block text-xs text-gray-500 dark:text-slate-400">
                    {{ coleccion.detalle.join(', ') }}
                  </span>
                </li>
              </ul>
              <p v-else class="text-gray-600 dark:text-slate-300">Ninguno.</p>
            </div>
          </section>
        </div>

        <div class="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-slate-600">
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            @click="detalleAbierto = false"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
