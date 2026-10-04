<script setup lang="ts">
/**
 * Inasistencias a seguimientos cardiometabólicos: el trabajador tenía programado un
 * seguimiento y no acudió. Se registran para la línea de tiempo del informe
 * longitudinal cardiometabólico. No es una agenda: Ramazzini no gestiona citas.
 */
import { computed, inject, ref, watch, onUnmounted } from 'vue';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import SeguimientoProgramadoCardiometabolicoAPI from '@/api/SeguimientoProgramadoCardiometabolicoAPI';
import type { SeguimientoProgramadoCardiometabolico } from '@/interfaces/seguimientoProgramadoCardiometabolico.interface';
import type { EliminacionRequest } from '@/composables/useEliminacion';

const props = defineProps<{
  visible: boolean;
  trabajadorId: string | null;
}>();

const emit = defineEmits<{ close: [] }>();

const toast = inject('toast') as { open: (o: { message: string; type?: string }) => void } | undefined;
const requestEliminacion = inject<(request: EliminacionRequest) => void>('requestEliminacion');

const trabajadores = useTrabajadoresStore();
const { ensureUserLoaded } = useCurrentUser();

const list = ref<SeguimientoProgramadoCardiometabolico[]>([]);
const loading = ref(false);
const saving = ref(false);

/** Inasistencia en corrección; `null` cuando el formulario registra una nueva. */
const editingId = ref<string | null>(null);

const formFechaLocal = ref('');
const formObservaciones = ref('');

const tid = computed(() => props.trabajadorId || trabajadores.currentTrabajadorId || '');

function hoyYmd(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function fechaToDateInput(iso: string): string {
  try {
    const d = parseISO(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return '';
  }
}

/** Fecha local a mediodía para evitar desfases de zona al enviar solo día. */
function dateLocalInputToISO(ymd: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(y, mo - 1, d, 12, 0, 0, 0).toISOString();
}

function fechaDisplay(iso?: string): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: es });
  } catch {
    return iso;
  }
}

function resetForm() {
  formFechaLocal.value = hoyYmd();
  formObservaciones.value = '';
  editingId.value = null;
}

function closeModal() {
  emit('close');
}

function handleEscapeKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  closeModal();
}

watch(
  () => ({ open: props.visible, workerId: tid.value }),
  ({ open, workerId }) => {
    window.removeEventListener('keydown', handleEscapeKey);
    if (open && workerId) {
      window.addEventListener('keydown', handleEscapeKey);
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscapeKey);
});

async function loadList(): Promise<void> {
  const id = tid.value;
  if (!id) return;
  loading.value = true;
  try {
    const { data } = await SeguimientoProgramadoCardiometabolicoAPI.list(id);
    list.value = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error(e);
    list.value = [];
    toast?.open({ message: 'No se pudieron cargar las inasistencias.', type: 'error' });
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.visible,
  (open) => {
    if (open) {
      resetForm();
      void loadList();
    }
  },
  { immediate: true },
);

function startEdit(item: SeguimientoProgramadoCardiometabolico) {
  editingId.value = item._id;
  formFechaLocal.value = fechaToDateInput(item.fechaProgramada);
  formObservaciones.value = item.observaciones ?? '';
}

async function saveRecord(): Promise<void> {
  const id = tid.value;
  if (!id) {
    toast?.open({ message: 'No hay trabajador seleccionado.', type: 'error' });
    return;
  }
  const fechaISO = formFechaLocal.value ? dateLocalInputToISO(formFechaLocal.value) : null;
  if (!fechaISO) {
    toast?.open({ message: 'Indica la fecha del seguimiento al que no asistió.', type: 'error' });
    return;
  }
  if (formFechaLocal.value > hoyYmd()) {
    toast?.open({ message: 'La fecha de la inasistencia no puede ser futura.', type: 'error' });
    return;
  }
  const userId = await ensureUserLoaded();
  if (!userId) {
    toast?.open({ message: 'No se pudo obtener el usuario actual.', type: 'error' });
    return;
  }

  saving.value = true;
  try {
    const observaciones = formObservaciones.value.trim();
    if (!editingId.value) {
      await SeguimientoProgramadoCardiometabolicoAPI.create(id, {
        fechaProgramada: fechaISO,
        ...(observaciones ? { observaciones } : {}),
        createdBy: userId,
        updatedBy: userId,
      });
      toast?.open({ message: 'Inasistencia registrada.', type: 'success' });
    } else {
      await SeguimientoProgramadoCardiometabolicoAPI.update(id, editingId.value, {
        fechaProgramada: fechaISO,
        observaciones,
        updatedBy: userId,
      });
      toast?.open({ message: 'Inasistencia actualizada.', type: 'success' });
    }
    resetForm();
    await loadList();
  } catch (e) {
    console.error(e);
    toast?.open({ message: 'Error al guardar. Revisa los datos e intenta de nuevo.', type: 'error' });
  } finally {
    saving.value = false;
  }
}

async function removeRecord(item: SeguimientoProgramadoCardiometabolico): Promise<void> {
  const id = tid.value;
  if (!id) return;

  requestEliminacion?.({
    entidad: 'seguimientoProgramado',
    identificacion: `Inasistencia del ${fechaDisplay(item.fechaProgramada)}`,
    onConfirm: async () => {
      try {
        await SeguimientoProgramadoCardiometabolicoAPI.remove(id, item._id);
        toast?.open({ message: 'Inasistencia eliminada.', type: 'success' });
        if (editingId.value === item._id) resetForm();
        await loadList();
      } catch (e) {
        console.error(e);
        toast?.open({ message: 'No se pudo eliminar la inasistencia.', type: 'error' });
        throw e;
      }
    },
  });
}
</script>

<template>
  <Teleport to="body">
    <Transition
      appear
      name="modal-work"
      :duration="{ enter: 230, leave: 150 }"
    >
      <div
        v-if="visible && tid"
        class="modal modal-seguimiento-programado fixed inset-0 z-[50] grid place-items-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-inasistencias-titulo"
      >
        <div
          class="modal-work-overlay absolute inset-0 bg-emerald-900/50 backdrop-blur-sm z-[40]"
          aria-hidden="true"
          @click="closeModal"
        />
        <div
          class="modal-seguimiento-programado-panel modal-work-panel relative bg-white rounded-lg shadow-xl shadow-slate-900/20 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col z-[50] text-gray-900"
        >
          <div class="modal-seguimiento-programado-header flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200">
            <div class="min-w-0">
              <h2 id="modal-inasistencias-titulo" class="text-xl font-medium text-gray-900">
                Inasistencias a seguimiento cardiometabólico
              </h2>
              <p v-if="trabajadores.currentTrabajador" class="mt-1 text-sm text-gray-600 truncate">
                <i class="fas fa-user text-emerald-600 text-xs mr-1" aria-hidden="true" />
                <span class="font-medium text-gray-800">{{ formatNombreCompleto(trabajadores.currentTrabajador) }}</span>
                <template v-if="trabajadores.currentTrabajador.puesto"> · {{ trabajadores.currentTrabajador.puesto }}</template>
              </p>
              <p class="mt-1 text-xs text-gray-500">
                Registra cuando el trabajador no acudió a un seguimiento que tenía programado. Aparecen en la línea de
                tiempo del informe longitudinal.
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 p-2 -mr-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Cerrar"
              @click="closeModal"
            >
              <i class="fas fa-times text-xl" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            <form
              class="modal-seguimiento-programado-form rounded-xl border p-4 space-y-3 transition-colors"
              :class="editingId ? 'border-amber-400 bg-amber-50/90' : 'border-gray-200 bg-gray-50/80'"
              data-formulario-inasistencia
              @submit.prevent="saveRecord"
            >
              <h3 class="text-sm font-semibold" :class="editingId ? 'text-amber-950' : 'text-emerald-800'">
                {{ editingId ? 'Corregir inasistencia' : 'Registrar inasistencia' }}
              </h3>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1.5" for="inasistencia-fecha">
                    Fecha del seguimiento
                  </label>
                  <input
                    id="inasistencia-fecha"
                    v-model="formFechaLocal"
                    type="date"
                    :max="hoyYmd()"
                    class="seguimiento-form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                </div>
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-gray-700 mb-1.5" for="inasistencia-observaciones">
                    Observaciones (opcional)
                  </label>
                  <input
                    id="inasistencia-observaciones"
                    v-model="formObservaciones"
                    type="text"
                    maxlength="300"
                    class="seguimiento-form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    placeholder="Avisó que estaba de viaje"
                  >
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="submit"
                  class="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                  :disabled="saving"
                >
                  {{ saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Registrar inasistencia' }}
                </button>
                <button
                  v-if="editingId"
                  type="button"
                  class="modal-seguimiento-programado-btn-secondary rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
                  :disabled="saving"
                  @click="resetForm"
                >
                  Cancelar
                </button>
              </div>
            </form>

            <section>
              <h3 class="text-sm font-semibold text-gray-800 mb-2">
                Inasistencias registradas<template v-if="list.length"> ({{ list.length }})</template>
              </h3>
              <div v-if="loading" class="text-center py-6 text-gray-500">
                <i class="fas fa-spinner fa-spin text-xl text-emerald-600 mr-2" />
                Cargando…
              </div>
              <p
                v-else-if="list.length === 0"
                class="modal-seguimiento-programado-empty rounded-lg border border-dashed border-gray-300 bg-gray-50 py-6 text-center text-sm text-gray-600"
              >
                Este trabajador no tiene inasistencias registradas.
              </p>
              <ul v-else class="modal-seguimiento-programado-list divide-y divide-gray-200 rounded-xl border border-gray-200 overflow-hidden bg-white">
                <li
                  v-for="item in list"
                  :key="item._id"
                  class="px-4 py-3 flex items-center justify-between gap-3 transition-colors"
                  :class="item._id === editingId ? 'bg-amber-50' : 'hover:bg-emerald-50/40'"
                  :data-inasistencia="item._id"
                >
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-900">
                      <i class="fas fa-calendar-xmark text-amber-600 mr-1.5" aria-hidden="true" />
                      {{ fechaDisplay(item.fechaProgramada) }}
                    </p>
                    <p v-if="item.observaciones" class="text-xs text-gray-600 whitespace-pre-wrap">
                      {{ item.observaciones }}
                    </p>
                  </div>
                  <div class="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      class="h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-emerald-700 disabled:opacity-40"
                      :disabled="item._id === editingId"
                      :aria-label="`Corregir la inasistencia del ${fechaDisplay(item.fechaProgramada)}`"
                      title="Corregir"
                      @click="startEdit(item)"
                    >
                      <i class="fas fa-pen text-sm" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      class="h-8 w-8 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-700"
                      :aria-label="`Eliminar la inasistencia del ${fechaDisplay(item.fechaProgramada)}`"
                      title="Eliminar"
                      @click="removeRecord(item)"
                    >
                      <i class="fas fa-trash text-sm" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
