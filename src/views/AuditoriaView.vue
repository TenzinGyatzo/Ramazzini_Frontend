<script setup lang="ts">
import { ref, computed } from "vue";
import { useUserStore } from "@/stores/user";
import { useProveedorSaludStore } from "@/stores/proveedorSalud";
import auditAPI from "@/api/auditAPI";
import type { AuditEventItem } from "@/api/auditAPI";

const userStore = useUserStore();
const proveedorSaludStore = useProveedorSaludStore();
const isPrincipal = computed(
  () => userStore.user?.role === "Principal"
);
const auditTrailEnabled = computed(
  () => proveedorSaludStore.auditTrailEnabled
);

const loading = ref(false);
const errorMessage = ref<string | null>(null);
const items = ref<AuditEventItem[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(25);

const from = ref("");
const to = ref("");
const actorId = ref("");
const resourceType = ref("");
const resourceId = ref("");
const actionType = ref("");

const exportLoading = ref(false);
const exportError = ref<string | null>(null);
const verifyLoading = ref(false);
const verifyResult = ref<{ valid: boolean; errors?: { index: number; expectedHash: string; actualHash: string }[] } | null>(null);
const exportFormat = ref<"json" | "csv">("json");

function formatDate(d: string | undefined): string {
  if (!d) return "—";
  try {
    const date = new Date(d);
    const dateStr = date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return `${dateStr}\n${timeStr}`;
  } catch {
    return String(d);
  }
}

async function search() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const params: Record<string, string | number> = {
      page: page.value,
      limit: limit.value,
    };
    if (from.value) params.from = new Date(from.value).toISOString();
    if (to.value) params.to = new Date(to.value).toISOString();
    const at = typeof actionType.value === "string" ? actionType.value.trim() : "";
    if (at) params.actionType = at;
    if (actorId.value?.trim()) params.actorId = actorId.value.trim();
    if (resourceType.value?.trim()) params.resourceType = resourceType.value.trim();
    if (resourceId.value?.trim()) params.resourceId = resourceId.value.trim();
    const data = await auditAPI.getEvents(params);
    items.value = data.items;
    total.value = data.total;
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    errorMessage.value =
      err.response?.data?.message ?? err.message ?? "Error al cargar eventos.";
  } finally {
    loading.value = false;
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));
const hasPrev = computed(() => page.value > 1);
const hasNext = computed(() => page.value < totalPages.value);

function prevPage() {
  if (hasPrev.value) {
    page.value--;
    search();
  }
}
function nextPage() {
  if (hasNext.value) {
    page.value++;
    search();
  }
}

async function exportAudit() {
  const fromVal = from.value ? new Date(from.value).toISOString() : "";
  const toVal = to.value ? new Date(to.value).toISOString() : "";
  if (!fromVal || !toVal) {
    exportError.value = "Indica Desde y Hasta para exportar.";
    return;
  }
  exportLoading.value = true;
  exportError.value = null;
  try {
    const blob = await auditAPI.exportBlob({ from: fromVal, to: toVal, format: exportFormat.value });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-export.${exportFormat.value}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    exportError.value = err.response?.data?.message ?? err.message ?? "Error al exportar.";
  } finally {
    exportLoading.value = false;
  }
}

async function verifyAudit() {
  const fromVal = from.value ? new Date(from.value).toISOString() : "";
  const toVal = to.value ? new Date(to.value).toISOString() : "";
  if (!fromVal || !toVal) {
    verifyResult.value = { valid: false, errors: [{ index: 0, expectedHash: "-", actualHash: "Indica Desde y Hasta para verificar." }] };
    return;
  }
  verifyLoading.value = true;
  verifyResult.value = null;
  try {
    verifyResult.value = await auditAPI.verifyExport({ from: fromVal, to: toVal });
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    verifyResult.value = { valid: false, errors: [{ index: 0, expectedHash: "-", actualHash: err.response?.data?.message ?? err.message ?? "Error" }] };
  } finally {
    verifyLoading.value = false;
  }
}
</script>

<template>
  <div class="auditoria-view">
    <h1 class="title">Trail de auditoría</h1>
    <p class="subtitle">Consulta de eventos por expediente, actor y fecha.</p>

    <div
      v-if="!isPrincipal"
      class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800"
    >
      <p class="font-medium">Sin permiso</p>
      <p class="text-sm mt-1">
        Solo usuarios con rol Principal pueden usar Auditoria.
      </p>
    </div>
    <div
      v-else-if="!auditTrailEnabled"
      class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800"
    >
      <p class="font-medium">Auditoría no disponible</p>
      <p class="text-sm mt-1">El trail de auditoría no está habilitado para su proveedor.</p>
    </div>

    <template v-else>
      <div class="filters card">
        <div class="filter-row">
          <label>Desde</label>
          <input v-model="from" type="datetime-local" />
        </div>
        <div class="filter-row">
          <label>Hasta</label>
          <input v-model="to" type="datetime-local" />
        </div>
        <div class="filter-row">
          <label>Tipo de evento</label>
          <select v-model="actionType" class="filter-select">
            <option value="">Todos</option>
            <optgroup label="Documentos">
              <option value="DOC_CREATE_DRAFT">Doc. borrador creado</option>
              <option value="DOC_UPDATE_DRAFT">Doc. borrador actualizado</option>
              <option value="DOC_FINALIZE">Doc. finalizado</option>
              <option value="DOC_ANULATE">Doc. anulado</option>
            </optgroup>
            <optgroup label="Accesos">
              <option value="LOGIN_SUCCESS">Login exitoso</option>
              <option value="LOGIN_FAIL">Login fallido</option>
              <option value="SESSION_UNLOCK_SUCCESS">Sesión desbloqueada</option>
              <option value="SESSION_UNLOCK_FAIL">Sesión desbloqueo fallido</option>
              <option value="ACUERDO_CONFIDENCIALIDAD_ACEPTADO">Acuerdo de confidencialidad aceptado</option>
            </optgroup>
            <optgroup label="Admin / asignaciones">
              <option value="ADMIN_ROLES_PERMISSIONS">Roles/permisos</option>
              <option value="ADMIN_USER_ASSIGNMENTS">Asignaciones usuario</option>
              <!-- <option value="ADMIN_CONFIG_SIRES">Config SIRES</option> -->
            </optgroup>
            <optgroup label="Exportaciones">
              <option value="WORKERS_EXPORT_EXCEL">Export Excel trabajadores</option>
              <option value="DASHBOARD_REPORT_EXPORTED">Informe dashboard exportado</option>
            </optgroup>
            <optgroup label="GIIS / sistema">
              <option value="GIIS_EXPORT_FILE_GENERATED">GIIS archivo generado</option>
              <option value="GIIS_EXPORT_DOWNLOADED">GIIS descargado</option>
              <option value="AUDIT_EXPORT_DOWNLOAD">Export auditoría descargado</option>
            </optgroup>
            <optgroup label="Gestión de usuarios">
              <option value="USER_INVITATION_SENT">Invitación enviada</option>
              <option value="USER_ACTIVATED">Usuario activado</option>
              <option value="USER_SUSPENDED">Cuenta suspendida</option>
              <option value="USER_REACTIVATED">Cuenta reactivada</option>
              <option value="USER_DELETED">Usuario eliminado</option>
              <option value="USER_PASSWORD_CHANGED">Contraseña cambiada</option>
            </optgroup>
            <optgroup label="Perfiles de firmantes">
              <option value="SIGNER_PROFILE_CREATED">Perfil firmante creado</option>
              <option value="SIGNER_PROFILE_UPDATED">Perfil firmante actualizado</option>
            </optgroup>
          </select>
        </div>
        <div class="filter-actions">
          <button type="button" class="btn primary" :disabled="loading" @click="search">
            {{ loading ? "Cargando…" : "Buscar" }}
          </button>
          <select v-model="exportFormat" class="export-format">
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
          <button type="button" class="btn secondary" :disabled="exportLoading" @click="exportAudit">
            {{ exportLoading ? "Exportando…" : "Exportar auditoría" }}
          </button>
          <button type="button" class="btn secondary" :disabled="verifyLoading" @click="verifyAudit">
            {{ verifyLoading ? "Verificando…" : "Verificar cadena" }}
          </button>
        </div>
      </div>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-if="exportError" class="error">{{ exportError }}</p>
      <div v-if="verifyResult" class="verify-result card">
        <strong>Verificación:</strong>
        <span :class="verifyResult.valid ? 'valid' : 'invalid'">{{
          verifyResult.valid ? "Cadena válida" : "Errores encontrados"
        }}</span>
        <ul v-if="verifyResult.errors?.length">
          <li v-for="(err, i) in verifyResult.errors" :key="i">
            Índice {{ err.index }}: esperado {{ err.expectedHash }}, actual {{ err.actualHash }}
          </li>
        </ul>
      </div>

      <div class="table-wrap card">
        <table class="audit-table">
          <thead>
            <tr>
              <th>Fecha / Hora</th>
              <th>Actor</th>
              <th>Régimen</th>
              <th>Acción</th>
              <th>Recurso (tipo)</th>
              <th>Recurso (ID)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ev in items" :key="ev._id ?? ev.timestamp + ev.actorId">
              <td class="cell-date">{{ formatDate(ev.timestamp) }}</td>
              <td class="cell-actor" :title="ev.actorSnapshot?.email ?? ev.actorId">
                {{ ev.actorSnapshot?.email ?? ev.actorId }}
              </td>
              <td class="cell-long" :title="ev.regime ?? undefined">
                {{ ev.regime ?? "—" }}
              </td>
              <td class="cell-long" :title="ev.actionType">{{ ev.actionType }}</td>
              <td class="cell-long" :title="ev.resourceType ?? undefined">
                {{ ev.resourceType ?? "—" }}
              </td>
              <td class="cell-id" :title="ev.resourceId ?? undefined">
                {{ ev.resourceId ?? "—" }}
              </td>
            </tr>
            <tr v-if="items.length === 0 && !loading">
              <td colspan="6">Sin resultados. Ajuste filtros y pulse Buscar.</td>
            </tr>
          </tbody>
        </table>
        <div v-if="total > 0" class="pagination">
          <span>Total: {{ total }}</span>
          <button type="button" :disabled="!hasPrev" @click="prevPage">Anterior</button>
          <span>Página {{ page }} de {{ totalPages }}</span>
          <button type="button" :disabled="!hasNext" @click="nextPage">Siguiente</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.auditoria-view {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}
.title {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}
.subtitle {
  color: #666;
  margin-bottom: 1rem;
}
.card {
  background: #fff;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.filters .filter-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.filters label {
  min-width: 120px;
}
.filters input,
.filters .filter-select {
  padding: 0.35rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.filters .filter-select {
  min-width: 220px;
}
.filter-actions {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.export-format {
  padding: 0.35rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.btn.primary,
.btn.secondary {
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn.secondary {
  background: #64748b;
}
.btn.primary:disabled,
.btn.secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.verify-result { margin-top: 0.5rem; }
.verify-result .valid { color: #15803d; margin-left: 0.5rem; }
.verify-result .invalid { color: #b91c1c; margin-left: 0.5rem; }
.verify-result ul { margin: 0.5rem 0 0 1.25rem; }
.error {
  color: #b91c1c;
  margin-bottom: 1rem;
}
.table-wrap {
  overflow-x: auto;
  max-width: 100%;
  -webkit-overflow-scrolling: touch;
}
.audit-table {
  table-layout: fixed;
  width: 100%;
  border-collapse: collapse;
}
.audit-table th,
.audit-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eee;
  vertical-align: top;
}
.audit-table th:nth-child(1),
.audit-table td:nth-child(1) {
  width: 12%;
}
.audit-table th:nth-child(2),
.audit-table td:nth-child(2) {
  width: 20%;
}
.audit-table th:nth-child(3),
.audit-table td:nth-child(3) {
  width: 14%;
}
.audit-table th:nth-child(4),
.audit-table td:nth-child(4) {
  width: 18%;
}
.audit-table th:nth-child(5),
.audit-table td:nth-child(5) {
  width: 18%;
}
.audit-table th:nth-child(6),
.audit-table td:nth-child(6) {
  width: 18%;
}
.audit-table th {
  background: #f5f5f5;
  font-weight: 600;
}
.cell-date {
  white-space: pre-line;
  font-size: 0.875rem;
  line-height: 1.4;
}
.cell-actor,
.cell-id {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 0;
}
.cell-long {
  overflow-wrap: anywhere;
  word-break: break-word;
  hyphens: auto;
}
.cell-id {
  font-size: 0.8125rem;
  color: #555;
  font-family: ui-monospace, monospace;
}
.pagination {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}
.pagination button {
  padding: 0.35rem 0.75rem;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
@media (max-width: 640px) {
  .auditoria-view {
    padding: 0.75rem;
  }
  .filters .filter-row {
    flex-wrap: wrap;
  }
  .audit-table th,
  .audit-table td {
    padding: 0.35rem 0.5rem;
  }
  .cell-date {
    font-size: 0.8125rem;
  }
  .pagination {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}
</style>
