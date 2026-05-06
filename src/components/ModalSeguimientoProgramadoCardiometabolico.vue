<script setup lang="ts">
import { computed, inject, ref, watch, onUnmounted } from 'vue';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { calcularEdad } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import SeguimientoProgramadoCardiometabolicoAPI from '@/api/SeguimientoProgramadoCardiometabolicoAPI';
import type { SeguimientoProgramadoCardiometabolico } from '@/interfaces/seguimientoProgramadoCardiometabolico.interface';
import {
  ESTADO_SEGUIMIENTO_PROGRAMADO_OPTS,
  MOTIVO_SEGUIMIENTO_PROGRAMADO_OPTS,
} from '@/constants/seguimientoProgramadoCardiometabolicoOpts';

const props = defineProps<{
  visible: boolean;
  trabajadorId: string | null;
}>();

const emit = defineEmits<{ close: [] }>();

const toast = inject('toast') as { open: (o: { message: string; type?: string }) => void } | undefined;

const trabajadores = useTrabajadoresStore();
const { ensureUserLoaded } = useCurrentUser();

const list = ref<SeguimientoProgramadoCardiometabolico[]>([]);
const loading = ref(false);
const saving = ref(false);

const editingId = ref<string | null>(null);
/** Formulario de alta visible solo tras pulsar «Crear nuevo registro». */
const showNewForm = ref(false);

const isFormVisible = computed(() => editingId.value !== null || showNewForm.value);

const formFechaLocal = ref('');
const formEstado = ref<string>('Programada');
const formMotivo = ref('');
const formObservaciones = ref('');

const tid = computed(() => props.trabajadorId || trabajadores.currentTrabajadorId || '');

/** Respaldo cuando `currentTrabajador` no está en memoria. */
const tidCorto = computed(() => {
  const id = tid.value;
  if (!id) return '—';
  return id.length > 12 ? `…${id.slice(-8)}` : id;
});

const fechaFormularioLegible = computed(() => formatDateInputLegible(formFechaLocal.value));

function fechaToDateInput(iso: string): string {
  try {
    const d = parseISO(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return '';
  }
}

function formatDateInputLegible(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  return `${m[3]}/${m[2]}/${m[1]}`;
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

function clearFormFields() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  formFechaLocal.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  formEstado.value = 'Programada';
  formMotivo.value = '';
  formObservaciones.value = '';
  editingId.value = null;
}

function discardForm() {
  clearFormFields();
  showNewForm.value = false;
}

function openNewRecord() {
  clearFormFields();
  showNewForm.value = true;
}

type EstadoFormValue = (typeof ESTADO_SEGUIMIENTO_PROGRAMADO_OPTS)[number]['value'];
type MotivoFormValue = (typeof MOTIVO_SEGUIMIENTO_PROGRAMADO_OPTS)[number]['value'];

function normalizeEstado(estado: string): EstadoFormValue {
  for (const opt of ESTADO_SEGUIMIENTO_PROGRAMADO_OPTS) {
    if (opt.value === estado) return opt.value;
  }
  return 'Programada';
}

function normalizeMotivo(motivo: string | undefined): MotivoFormValue | '' {
  if (!motivo) return '';
  for (const opt of MOTIVO_SEGUIMIENTO_PROGRAMADO_OPTS) {
    if (opt.value === motivo) return opt.value;
  }
  return '';
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
    toast?.open({ message: 'No se pudo cargar la lista de seguimientos programados.', type: 'error' });
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.visible,
  (open) => {
    if (open) {
      discardForm();
      void loadList();
    }
  },
);

function startEdit(item: SeguimientoProgramadoCardiometabolico) {
  showNewForm.value = false;
  editingId.value = item._id;
  formFechaLocal.value = fechaToDateInput(item.fechaProgramada);
  formEstado.value = normalizeEstado(item.estado ?? 'Programada');
  formMotivo.value = normalizeMotivo(item.motivo);
  formObservaciones.value = item.observaciones ?? '';
}

function cancelEdit() {
  discardForm();
}

async function saveRecord(): Promise<void> {
  const id = tid.value;
  if (!id) {
    toast?.open({ message: 'No hay trabajador seleccionado.', type: 'error' });
    return;
  }
  const userId = await ensureUserLoaded();
  if (!userId) {
    toast?.open({ message: 'No se pudo obtener el usuario actual.', type: 'error' });
    return;
  }
  const fechaISO = formFechaLocal.value ? dateLocalInputToISO(formFechaLocal.value) : null;
  if (!fechaISO) {
    toast?.open({ message: 'Indica la fecha programada.', type: 'error' });
    return;
  }

  saving.value = true;
  try {
    if (!editingId.value) {
      const body = {
        fechaProgramada: fechaISO,
        estado: formEstado.value,
        ...(formMotivo.value ? { motivo: formMotivo.value } : {}),
        ...(formObservaciones.value.trim() ? { observaciones: formObservaciones.value.trim() } : {}),
        createdBy: userId,
        updatedBy: userId,
      };
      await SeguimientoProgramadoCardiometabolicoAPI.create(id, body);
      toast?.open({ message: 'Seguimiento programado registrado.', type: 'success' });
    } else {
      const body = {
        fechaProgramada: fechaISO,
        estado: formEstado.value,
        motivo: formMotivo.value ? formMotivo.value : null,
        observaciones: formObservaciones.value.trim(),
        updatedBy: userId,
      };
      await SeguimientoProgramadoCardiometabolicoAPI.update(id, editingId.value, body);
      toast?.open({ message: 'Registro actualizado.', type: 'success' });
    }
    cancelEdit();
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
  const ok = window.confirm('¿Eliminar este seguimiento programado? Esta acción no se puede deshacer.');
  if (!ok) return;
  try {
    await SeguimientoProgramadoCardiometabolicoAPI.remove(id, item._id);
    toast?.open({ message: 'Registro eliminado.', type: 'success' });
    if (editingId.value === item._id) cancelEdit();
    await loadList();
  } catch (e) {
    console.error(e);
    toast?.open({ message: 'No se pudo eliminar el registro.', type: 'error' });
  }
}

function estadoBadgeClass(estado: string): string {
  const map: Record<string, string> = {
    Programada: 'bg-amber-100 text-amber-900 border border-amber-200',
    Realizada: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
    'No asistió': 'bg-orange-100 text-orange-900 border border-orange-200',
    Cancelada: 'bg-gray-200 text-gray-800 border border-gray-300',
  };
  return map[estado] ?? 'bg-slate-100 text-slate-800 border border-slate-200';
}

/** Sin selección: aspecto plano neutro. Seleccionado: outline con color propio del estado. */
function estadoRadioSpanClass(value: EstadoFormValue, selected: boolean): string {
  const palettes: Record<
    EstadoFormValue,
    { active: string }
  > = {
    Programada: {
      active:
        'border-amber-500 bg-amber-50/90 text-amber-950 ring-1 ring-amber-200/80 shadow-sm',
    },
    Realizada: {
      active:
        'border-emerald-500 bg-emerald-50/90 text-emerald-950 ring-1 ring-emerald-200/80 shadow-sm',
    },
    'No asistió': {
      active:
        'border-orange-500 bg-orange-50/90 text-orange-950 ring-1 ring-orange-200/80 shadow-sm',
    },
    Cancelada: {
      active:
        'border-slate-500 bg-slate-50 text-slate-900 ring-1 ring-slate-200/90 shadow-sm',
    },
  };
  const flatIdle =
    'border border-gray-200 bg-gray-50/80 text-gray-600 hover:border-gray-300 hover:bg-gray-100/80';
  const p = palettes[value];
  const base =
    'flex min-h-[2.75rem] w-full items-center justify-center rounded-xl px-2 py-2 text-center text-xs font-medium leading-snug transition-all sm:text-sm';
  return `${base} ${selected ? `border-2 ${p.active}` : flatIdle}`;
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible && tid"
      class="fixed inset-0 z-[50] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="absolute inset-0 bg-emerald-900/50 backdrop-blur-sm z-[40]"
        aria-hidden="true"
        @click="closeModal"
      />
      <div
        class="relative bg-white rounded-lg shadow-xl shadow-slate-900/20 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col z-[50] text-gray-900"
      >
        <div class="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-green-50">
          <div>
            <h2 class="text-xl font-semibold text-gray-800">Seguimientos e inasistencias</h2>
            <p class="text-sm text-gray-600 mt-1">
              Registra los seguimientos e inasistencias del trabajador.
            </p>
            <div
              class="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] leading-snug text-gray-500"
              role="note"
              :aria-label="trabajadores.currentTrabajador
                ? `Trabajador: ${formatNombreCompleto(trabajadores.currentTrabajador)}`
                : `Identificador trabajador ${tidCorto}`"
            >
              <template v-if="trabajadores.currentTrabajador">
                <span class="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  <i class="fas fa-user shrink-0 text-[11px] text-emerald-600/75" aria-hidden="true" />
                  <span class="truncate font-medium text-gray-700">{{
                    formatNombreCompleto(trabajadores.currentTrabajador)
                  }}</span>
                </span>
                <span v-if="trabajadores.currentTrabajador.sexo" class="inline-flex shrink-0 items-center gap-0.5 text-gray-500">
                  <span class="text-gray-300" aria-hidden="true">·</span>
                  <i
                    v-if="trabajadores.currentTrabajador.sexo === 'Masculino'"
                    class="fas fa-mars text-sky-600/90 text-[10px]"
                    aria-hidden="true"
                  />
                  <i v-else class="fas fa-venus text-rose-600/90 text-[10px]" aria-hidden="true" />
                  <span>{{ trabajadores.currentTrabajador.sexo === 'Masculino' ? 'M' : 'F' }}</span>
                </span>
                <span
                  v-if="trabajadores.currentTrabajador.fechaNacimiento"
                  class="inline-flex shrink-0 items-center gap-1 text-gray-500"
                >
                  <span class="text-gray-300" aria-hidden="true">·</span>
                  <i class="fas fa-birthday-cake text-emerald-500/65 text-[10px]" aria-hidden="true" />
                  {{ calcularEdad(String(trabajadores.currentTrabajador.fechaNacimiento)) }} años
                </span>
                <span
                  v-if="trabajadores.currentTrabajador.puesto"
                  class="inline-flex min-w-0 max-w-[14rem] items-center gap-1 sm:max-w-xs"
                >
                  <span class="text-gray-300" aria-hidden="true">·</span>
                  <i class="fas fa-briefcase shrink-0 text-blue-500/65 text-[10px]" aria-hidden="true" />
                  <span class="truncate text-gray-600">{{ trabajadores.currentTrabajador.puesto }}</span>
                </span>
                <span
                  v-if="trabajadores.currentTrabajador.numeroEmpleado"
                  class="inline-flex shrink-0 items-center gap-1 text-gray-500"
                >
                  <span class="text-gray-300" aria-hidden="true">·</span>
                  <i class="fas fa-id-badge text-purple-500/65 text-[10px]" aria-hidden="true" />
                  No. {{ trabajadores.currentTrabajador.numeroEmpleado }}
                </span>
              </template>
              <span v-else class="inline-flex items-center gap-1.5 text-gray-500">
                <i class="fas fa-user text-gray-400 text-[11px]" aria-hidden="true" />
                <span>Trabajador</span>
                <span class="text-gray-400">·</span>
                <span class="font-mono text-[10px] text-gray-500">{{ tidCorto }}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            class="shrink-0 p-2 rounded-full hover:bg-white/70 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Cerrar"
            @click="closeModal"
          >
            <i class="fas fa-times text-xl" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <div
            v-if="!isFormVisible"
            class="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-6 text-center"
          >
            <p class="text-sm text-gray-600 mb-4">
              Para agregar una cita o inasistencia nueva, usa el botón siguiente.
            </p>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              @click="openNewRecord"
            >
              <i class="fas fa-plus-circle" aria-hidden="true" />
              Crear nuevo registro
            </button>
          </div>

          <section
            v-if="isFormVisible"
            class="rounded-xl border p-4 space-y-3 transition-colors"
            :class="
              editingId
                ? 'border-amber-400 ring-2 ring-amber-300/80 bg-amber-50/90 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35)]'
                : 'border-gray-200 bg-gray-50/80'
            "
          >
            <div
              v-if="editingId"
              class="flex items-center gap-2 rounded-lg bg-amber-100 border border-amber-300 px-3 py-2 text-sm text-amber-950"
              role="status"
            >
              <i class="fas fa-pen-to-square text-amber-700 shrink-0" aria-hidden="true" />
              <span class="font-semibold">Editando cita del {{ fechaFormularioLegible }}</span>
            </div>
            <h3 class="text-sm font-semibold uppercase tracking-wide" :class="editingId ? 'text-amber-950' : 'text-emerald-800'">
              {{ editingId ? 'Ajustar y guardar cambios' : 'Nuevo registro' }}
            </h3>

            <div class="space-y-5">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 sm:items-start">
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-gray-700 mb-1.5" for="scm-fecha-programada">Fecha programada</label>
                  <input
                    id="scm-fecha-programada"
                    v-model="formFechaLocal"
                    type="date"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                </div>
                <div class="min-w-0 sm:text-right">
                  <label class="block text-xs font-medium text-gray-700 mb-1.5 sm:text-right" for="scm-motivo">Motivo (opcional)</label>
                  <select
                    id="scm-motivo"
                    v-model="formMotivo"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-left focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="">—</option>
                    <option
                      v-for="opt in MOTIVO_SEGUIMIENTO_PROGRAMADO_OPTS"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
              </div>

              <fieldset class="min-w-0">
                <legend class="block text-xs font-medium text-gray-700 mb-2">Estado</legend>
                <div
                  class="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
                  role="radiogroup"
                  aria-label="Estado del seguimiento"
                >
                  <label
                    v-for="opt in ESTADO_SEGUIMIENTO_PROGRAMADO_OPTS"
                    :key="opt.value"
                    class="relative flex cursor-pointer rounded-xl"
                  >
                    <input
                      v-model="formEstado"
                      type="radio"
                      class="sr-only focus:outline-none"
                      :value="opt.value"
                    >
                    <span :class="estadoRadioSpanClass(opt.value, formEstado === opt.value)">
                      {{ opt.label }}
                    </span>
                  </label>
                </div>
              </fieldset>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1.5" for="scm-observaciones">Observaciones</label>
                <textarea
                  id="scm-observaciones"
                  v-model="formObservaciones"
                  rows="3"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y min-h-[4rem]"
                  placeholder="Contexto breve..."
                />
              </div>
            </div>
            <div class="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                class="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                :disabled="saving"
                @click="saveRecord"
              >
                {{ saving ? 'Guardando…' : editingId ? 'Actualizar' : 'Registrar' }}
              </button>
              <button
                v-if="editingId"
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
                :disabled="saving"
                @click="cancelEdit"
              >
                Cancelar edición
              </button>
              <button
                v-else-if="showNewForm"
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
                :disabled="saving"
                @click="cancelEdit"
              >
                Cerrar formulario
              </button>
            </div>
          </section>

          <section>
            <h3 class="text-sm font-semibold text-gray-800 mb-2">Lista (más recientes primero)</h3>
            <div v-if="loading" class="text-center py-8 text-gray-500">
              <i class="fas fa-spinner fa-spin text-xl text-emerald-600 mr-2" />
              Cargando…
            </div>
            <ul v-else-if="list.length === 0" class="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-sm text-gray-600">
              No hay seguimientos programados para este trabajador.
            </ul>
            <ul v-else class="divide-y divide-gray-200 rounded-xl border border-gray-200 overflow-hidden bg-white">
              <li
                v-for="item in list"
                :key="item._id"
                :class="[
                  'p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors',
                  item._id === editingId
                    ? 'bg-amber-50 ring-2 ring-inset ring-amber-400 border-l-4 border-l-amber-500'
                    : 'hover:bg-emerald-50/40',
                ]"
              >
                <div class="min-w-0 space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">{{ fechaDisplay(item.fechaProgramada) }}</span>
                    <span
                      v-if="item._id === editingId"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-950 border border-amber-400"
                    >
                      <i class="fas fa-pen text-[10px]" aria-hidden="true" />
                      Editando
                    </span>
                    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" :class="estadoBadgeClass(item.estado)">
                      {{ item.estado }}
                    </span>
                  </div>
                  <div v-if="item.motivo" class="text-xs text-gray-600">
                    <span class="font-medium text-gray-700">Motivo:</span> {{ item.motivo }}
                  </div>
                  <p v-if="item.observaciones" class="text-sm text-gray-700 whitespace-pre-wrap border-l-2 border-emerald-200 pl-3">
                    {{ item.observaciones }}
                  </p>
                </div>
                <div class="flex shrink-0 flex-row items-center gap-2">
                  <button
                    type="button"
                    class="text-sm px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                    :disabled="item._id === editingId"
                    @click="startEdit(item)"
                  >
                    {{ item._id === editingId ? 'En edición' : 'Editar' }}
                  </button>
                  <button
                    type="button"
                    class="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                    @click="removeRecord(item)"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <div class="border-t border-gray-200 px-6 py-3 bg-gray-50 flex justify-end">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            @click="closeModal"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
