<script setup lang="ts">
/**
 * Orden por defecto de los tipos de documento en el expediente. Es una preferencia del
 * proveedor de salud: aplica a todos los expedientes y al PDF combinado.
 */
import { computed, inject, onUnmounted, ref, watch } from 'vue';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { TIPOS_DOCUMENTO_EXPEDIENTE, nombreTipoDocumento } from '@/helpers/documentosExpediente';
import { iconoTipoDocumento } from '@/helpers/iconoTipoDocumento';
import { extractApiErrorMessage } from '@/helpers/apiErrors';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const toast = inject('toast') as { open: (o: { message: string; type?: string }) => void } | undefined;
const proveedorSaludStore = useProveedorSaludStore();

const ORDEN_POR_DEFECTO = TIPOS_DOCUMENTO_EXPEDIENTE.map((definicion) => definicion.tipo);

/** Un tipo que el proveedor no usa no se muestra; al guardar vuelve a su lugar por defecto. */
const tiposVisibles = (orden: readonly string[]) =>
  orden.filter((tipo) => tipo !== 'controlPrenatal' || proveedorSaludStore.controlPrenatalEnabled);

const orden = ref<string[]>([]);
const guardando = ref(false);
const arrastrado = ref<string | null>(null);

const ordenGuardado = computed(() => tiposVisibles(proveedorSaludStore.ordenTiposDocumento));
const ordenDeFabrica = computed(() => tiposVisibles(ORDEN_POR_DEFECTO));
const mismoOrden = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((tipo, i) => tipo === b[i]);

const hayCambios = computed(() => !mismoOrden(orden.value, ordenGuardado.value));
const esElDeFabrica = computed(() => mismoOrden(orden.value, ordenDeFabrica.value));

function mover(tipo: string, destino: number) {
  const origen = orden.value.indexOf(tipo);
  if (origen < 0 || destino < 0 || destino >= orden.value.length || origen === destino) return;
  const siguiente = [...orden.value];
  siguiente.splice(origen, 1);
  siguiente.splice(destino, 0, tipo);
  orden.value = siguiente;
}

function alArrastrarSobre(tipo: string) {
  if (!arrastrado.value || arrastrado.value === tipo) return;
  mover(arrastrado.value, orden.value.indexOf(tipo));
}

function iniciarArrastre(evento: DragEvent, tipo: string) {
  arrastrado.value = tipo;
  if (evento.dataTransfer) {
    evento.dataTransfer.effectAllowed = 'move';
    evento.dataTransfer.setData('text/plain', tipo);
  }
}

function restablecer() {
  orden.value = [...ordenDeFabrica.value];
}

function cerrar() {
  if (guardando.value) return;
  emit('close');
}

async function guardar() {
  if (guardando.value || !hayCambios.value) return;
  guardando.value = true;
  try {
    // El orden de siempre no se guarda: así los tipos que se agreguen después caen en su lugar
    await proveedorSaludStore.guardarOrdenDocumentosExpediente(esElDeFabrica.value ? [] : orden.value);
    toast?.open({ message: 'Orden de los documentos actualizado', type: 'success' });
    emit('close');
  } catch (error) {
    toast?.open({
      message: extractApiErrorMessage(error, 'No se pudo guardar el orden de los documentos'),
      type: 'error',
    });
  } finally {
    guardando.value = false;
  }
}

function alPresionarTecla(evento: KeyboardEvent) {
  if (evento.key === 'Escape') cerrar();
}

watch(
  () => props.visible,
  (visible) => {
    window.removeEventListener('keydown', alPresionarTecla);
    if (visible) {
      orden.value = [...ordenGuardado.value];
      arrastrado.value = null;
      window.addEventListener('keydown', alPresionarTecla);
    }
  },
  { immediate: true },
);

onUnmounted(() => window.removeEventListener('keydown', alPresionarTecla));
</script>

<template>
  <Teleport to="body">
    <Transition appear name="modal-work" :duration="{ enter: 230, leave: 150 }">
      <div
        v-if="visible"
        class="modal modal-orden-documentos fixed inset-0 z-[50] grid place-items-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-orden-documentos-titulo"
      >
        <div
          class="modal-work-overlay absolute inset-0 bg-emerald-900/50 backdrop-blur-sm z-[40]"
          aria-hidden="true"
          @click="cerrar"
        />
        <div
          class="modal-orden-documentos-panel modal-work-panel relative bg-white rounded-lg shadow-xl shadow-slate-900/20 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col z-[50] text-gray-900"
        >
          <div class="modal-orden-documentos-header flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200">
            <div class="min-w-0">
              <h2 id="modal-orden-documentos-titulo" class="text-xl font-medium text-gray-900">
                Orden de los documentos
              </h2>
              <p class="mt-1 text-xs text-gray-500">
                Aplica a <span class="font-semibold text-gray-700">todos los expedientes</span> y al PDF que se obtiene al
                combinar documentos. Dentro de cada tipo, los documentos siguen ordenados por fecha.
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 p-2 -mr-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Cerrar"
              @click="cerrar"
            >
              <i class="fas fa-times text-xl" />
            </button>
          </div>

          <ol class="flex-1 overflow-y-auto px-3 sm:px-4 py-3" @dragover.prevent>
            <li
              v-for="(tipo, indice) in orden"
              :key="tipo"
              class="modal-orden-documentos-fila flex items-center gap-2 sm:gap-3 rounded-lg px-2 py-1.5 border border-transparent hover:bg-gray-50"
              :class="{ 'modal-orden-documentos-fila--arrastrada': arrastrado === tipo }"
              :data-tipo="tipo"
              draggable="true"
              @dragstart="iniciarArrastre($event, tipo)"
              @dragenter.prevent="alArrastrarSobre(tipo)"
              @dragover.prevent
              @dragend="arrastrado = null"
              @drop.prevent="arrastrado = null"
            >
              <i class="fas fa-grip-vertical text-gray-400 cursor-grab" aria-hidden="true" />
              <span class="w-6 text-right text-xs tabular-nums text-gray-500">{{ indice + 1 }}</span>
              <span
                class="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-sm"
                :class="iconoTipoDocumento(tipo).clases"
                aria-hidden="true"
              >
                <i :class="iconoTipoDocumento(tipo).icono" />
              </span>
              <span class="flex-1 min-w-0 text-sm leading-snug text-gray-800">{{ nombreTipoDocumento(tipo) }}</span>
              <button
                type="button"
                class="h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-emerald-700 disabled:opacity-30 disabled:hover:bg-transparent"
                :disabled="indice === 0"
                :aria-label="`Subir ${nombreTipoDocumento(tipo)}`"
                title="Subir"
                @click="mover(tipo, indice - 1)"
              >
                <i class="fas fa-arrow-up text-sm" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-emerald-700 disabled:opacity-30 disabled:hover:bg-transparent"
                :disabled="indice === orden.length - 1"
                :aria-label="`Bajar ${nombreTipoDocumento(tipo)}`"
                title="Bajar"
                @click="mover(tipo, indice + 1)"
              >
                <i class="fas fa-arrow-down text-sm" aria-hidden="true" />
              </button>
            </li>
          </ol>

          <div class="modal-orden-documentos-footer flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-t border-gray-200">
            <button
              type="button"
              class="text-sm font-medium text-gray-600 hover:text-emerald-700 hover:underline disabled:opacity-40 disabled:no-underline"
              :disabled="esElDeFabrica || guardando"
              @click="restablecer"
            >
              <i class="fas fa-rotate-left mr-1" aria-hidden="true" />
              Restablecer el orden original
            </button>
            <div class="flex gap-2 ml-auto">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
                :disabled="guardando"
                @click="cerrar"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                :disabled="!hayCambios || guardando"
                @click="guardar"
              >
                {{ guardando ? 'Guardando…' : 'Guardar orden' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-orden-documentos-fila--arrastrada {
  border-color: #6ee7b7;
  background-color: #ecfdf5;
}
</style>
