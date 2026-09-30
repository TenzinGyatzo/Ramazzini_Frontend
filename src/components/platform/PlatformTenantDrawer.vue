<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AuthAPI from "@/api/AuthAPI";
import { usePagosStore } from "@/stores/pagosStore";
import { usePlatformContext } from "@/composables/usePlatformContext";
import TenantSettingsPanel from "@/components/TenantSettingsPanel.vue";
import type { TenantSettingsResponse } from "@/api/PlataformaAPI";
import { resolverFechaFinTrial } from "@/utils/periodoPrueba";
import {
  clasificarEstado,
  etiquetaMes,
  fechaRegistroDesdeId,
  motivosAtencion,
  resumenRoles,
  usoHistorias,
  type ConsolaProveedor,
} from "@/utils/platformConsole";

type DetalleProveedor = ConsolaProveedor & {
  colorInforme?: string;
  semaforizacionActivada?: boolean;
  suscripcion?: Record<string, any> | null;
  suscripcionActivaId?: string | null;
  logotipoEmpresa?: { data?: string } | null;
  todasLasHistoriasClinicas?: number;
  todasLasNotasMedicas?: number;
};

const props = defineProps<{ proveedor: DetalleProveedor }>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "ajustesActualizados", value: TenantSettingsResponse): void;
}>();

const cerrarRef = ref<HTMLButtonElement | null>(null);
const { activeTenant, enterTenant, exitTenant } = usePlatformContext();
const esTenantActivo = computed(() => activeTenant.value?.id === String(props.proveedor._id));
const cambiandoContexto = ref(false);

async function entrar() {
  if (cambiandoContexto.value) return;
  cambiandoContexto.value = true;
  try {
    await enterTenant(String(props.proveedor._id));
  } catch (error) {
    console.error("No se pudo entrar al espacio del proveedor:", error);
    cambiandoContexto.value = false;
  }
}

async function salir() {
  if (cambiandoContexto.value) return;
  cambiandoContexto.value = true;
  try {
    await exitTenant();
  } catch (error) {
    console.error("No se pudo salir del tenant:", error);
    cambiandoContexto.value = false;
  }
}

const formatoFecha = (fecha: Date | string | null | undefined) =>
  fecha ? format(new Date(fecha), "d 'de' MMM yyyy", { locale: es }) : "—";

const estado = computed(() => clasificarEstado(props.proveedor));
const motivos = computed(() => motivosAtencion(props.proveedor));
const uso = computed(() => usoHistorias(props.proveedor));
const roles = computed(() => resumenRoles(props.proveedor.usuariosPorRol));
const registro = computed(() => fechaRegistroDesdeId(props.proveedor._id));
const finTrial = computed(() => resolverFechaFinTrial(props.proveedor));
const finTrialOriginal = computed(() =>
  props.proveedor.fechaFinTrial && props.proveedor.fechaInicioTrial
    ? resolverFechaFinTrial({ fechaInicioTrial: props.proveedor.fechaInicioTrial })
    : null,
);

/** Mes en curso y dos anteriores, emparejando HC y notas por mes. */
const meses = computed(() => {
  const hc = props.proveedor.historiasPorMes ?? [];
  const notas = props.proveedor.notasPorMes ?? [];
  return hc.map((m, i) => ({ mes: m.mes, historias: m.count, notas: notas[i]?.count ?? 0 }));
});

const COLORES_INFORME: Record<string, string> = {
  "#343a40": "Gris oscuro (predeterminado)",
  "#6c757d": "Gris",
  "#004085": "Azul oscuro",
  "#007bff": "Azul profesional",
  "#138496": "Turquesa oscuro",
  "#17a2b8": "Turquesa",
  "#2bb9d9": "Azul claro",
  "#1e7e34": "Verde oscuro",
  "#28a745": "Verde médico",
  "#c82333": "Rojo oscuro",
  "#dc3545": "Rojo médico",
  "#e67e22": "Naranja",
  "#e0a800": "Oro",
};
const colorInforme = computed(() => {
  const hex = props.proveedor.colorInforme?.toLowerCase();
  return hex ? COLORES_INFORME[hex] ?? hex : "—";
});

const baseURL = import.meta.env.VITE_API_URL || "https://ramazzini.app";
const logoSrc = computed(() =>
  props.proveedor.logotipoEmpresa?.data
    ? `${baseURL}/assets/providers-logos/${props.proveedor.logotipoEmpresa.data}`
    : null,
);
const iniciales = computed(() =>
  (props.proveedor.nombre ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join(""),
);

// Usuarios del tenant: se cargan al abrir el detalle (endpoint existente, permitido al Administrador)
type UsuarioTenant = { _id: string; username: string; email: string; role: string; cuentaActiva?: boolean };
const usuarios = ref<UsuarioTenant[] | null>(null);
const cargandoUsuarios = ref(false);
const errorUsuarios = ref(false);

async function cargarUsuarios() {
  cargandoUsuarios.value = true;
  errorUsuarios.value = false;
  try {
    const { data } = await AuthAPI.getUsersByProveedorId(String(props.proveedor._id), { scope: "permissions" });
    const lista = Array.isArray(data) ? (data as UsuarioTenant[]) : [];
    // El Administrador de plataforma no es usuario del tenant
    usuarios.value = lista
      .filter((u) => u.role !== "Administrador")
      .sort((a, b) => (a.role === "Principal" ? -1 : b.role === "Principal" ? 1 : a.username.localeCompare(b.username)));
  } catch (error) {
    console.error("No se pudieron cargar los usuarios del proveedor:", error);
    errorUsuarios.value = true;
  } finally {
    cargandoUsuarios.value = false;
  }
}

// Suscripción: la trae el panel; si no, se consulta al abrir
const pagosStore = usePagosStore();
const suscripcionLocal = ref<Record<string, any> | null>(null);
const suscripcion = computed(() => props.proveedor.suscripcion ?? suscripcionLocal.value);
async function cargarSuscripcion() {
  if (suscripcion.value || !props.proveedor.suscripcionActivaId) return;
  try {
    suscripcionLocal.value = await pagosStore.getSubscriptionFromDB(props.proveedor.suscripcionActivaId);
  } catch (error) {
    console.error("Error al cargar suscripción:", error);
  }
}

const formatoMonto = (monto: number | undefined) =>
  typeof monto === "number" ? monto.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) : "—";

function alTeclear(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

watch(
  () => props.proveedor._id,
  async () => {
    usuarios.value = null;
    suscripcionLocal.value = null;
    await Promise.all([cargarUsuarios(), cargarSuscripcion()]);
  },
  { immediate: true },
);

onMounted(async () => {
  document.addEventListener("keydown", alTeclear);
  await nextTick();
  cerrarRef.value?.focus();
});
onUnmounted(() => document.removeEventListener("keydown", alTeclear));

const tonos: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  danger: "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  accent: "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  neutral: "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300",
};
</script>

<template>
  <div class="fixed inset-0 z-[60] flex justify-end" data-testid="platform-tenant-drawer">
    <div class="absolute inset-0 bg-slate-900/30 dark:bg-black/50" aria-hidden="true" @click="emit('close')"></div>
    <aside
      role="dialog"
      aria-modal="true"
      :aria-label="`Detalle de ${proveedor.nombre}`"
      class="relative flex h-full w-full flex-col overflow-y-auto border-l border-gray-200 bg-white pt-9 shadow-xl sm:w-[30rem] dark:border-slate-700 dark:bg-slate-900"
    >
      <!-- Encabezado -->
      <div class="flex items-start gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-800">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sky-50 text-sm font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
          <img v-if="logoSrc" :src="logoSrc" :alt="`Logo de ${proveedor.nombre}`" class="h-full w-full object-contain" />
          <span v-else>{{ iniciales }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="truncate text-lg font-semibold text-gray-900 dark:text-slate-100">{{ proveedor.nombre || "Sin nombre" }}</h2>
          <p class="text-xs text-gray-500 dark:text-slate-400">
            Registrado el {{ formatoFecha(registro) }} · {{ proveedor.pais || "—" }} ·
            {{ proveedor.regimenRegulatorio === "SIRES_NOM024" ? "SIRES" : "Sin régimen" }}
          </p>
        </div>
        <button
          ref="cerrarRef"
          type="button"
          aria-label="Cerrar detalle"
          class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
          @click="emit('close')"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div class="space-y-6 px-5 py-5 text-sm text-gray-700 dark:text-slate-300">
        <!-- Acción principal -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-if="!esTenantActivo"
            type="button"
            data-testid="drawer-entrar"
            class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-amber-950 hover:bg-amber-400 disabled:opacity-60"
            :disabled="cambiandoContexto"
            @click="entrar"
          >
            <i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i>
            {{ cambiandoContexto ? "Entrando…" : "Entrar al espacio" }}
          </button>
          <template v-else>
            <span class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-100 px-4 py-2 font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Tenant activo
            </span>
            <button type="button" class="rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800" :disabled="cambiandoContexto" @click="salir">
              Salir
            </button>
          </template>
        </div>

        <ul v-if="motivos.length" class="space-y-1" data-testid="drawer-motivos">
          <li v-for="m in motivos" :key="m" class="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <i class="fa-solid fa-triangle-exclamation text-xs" aria-hidden="true"></i> {{ m }}
          </li>
        </ul>

        <!-- Contacto -->
        <section>
          <h3 class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Contacto principal</h3>
          <p class="font-medium text-gray-900 dark:text-slate-100">{{ proveedor.principalUser?.username || "No disponible" }}</p>
          <p v-if="proveedor.principalUser?.email">{{ proveedor.principalUser.email }}</p>
          <p v-if="proveedor.principalUser?.phone">{{ proveedor.principalUser.phone }}</p>
          <p v-if="proveedor.correoElectronico && proveedor.correoElectronico !== proveedor.principalUser?.email" class="text-gray-500 dark:text-slate-400">
            Proveedor: {{ proveedor.correoElectronico }}
          </p>
        </section>

        <!-- Plan y uso -->
        <section>
          <h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Plan y uso</h3>
          <span class="inline-block rounded-md px-2 py-0.5 text-xs font-medium" :class="tonos[estado.tono]">{{ estado.etiqueta }}</span>
          <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            <dt class="text-gray-500 dark:text-slate-400">Límite de HC al mes</dt>
            <dd class="text-right font-medium text-gray-900 dark:text-slate-100" data-testid="drawer-limite">
              {{ uso.limite }}
              <span v-if="uso.extraAsignado > 0" class="block text-xs font-normal text-gray-500 dark:text-slate-400">
                {{ uso.contratado }} contratadas + {{ uso.extraAsignado }} asignadas
              </span>
            </dd>
            <dt class="text-gray-500 dark:text-slate-400">Periodo gratuito</dt>
            <dd class="text-right">
              {{ finTrial ? `hasta el ${formatoFecha(finTrial)}` : "—" }}
              <span v-if="finTrialOriginal" class="block text-xs text-gray-500 dark:text-slate-400">
                ajustado · original {{ formatoFecha(finTrialOriginal) }}
              </span>
            </dd>
            <template v-if="proveedor.finDeSuscripcion">
              <dt class="text-gray-500 dark:text-slate-400">Fin de suscripción</dt>
              <dd class="text-right">{{ formatoFecha(proveedor.finDeSuscripcion) }}</dd>
            </template>
            <dt class="text-gray-500 dark:text-slate-400">Empresas</dt>
            <dd class="text-right">{{ proveedor.empresasCount ?? 0 }}</dd>
          </dl>

          <table class="mt-4 w-full text-left" data-testid="drawer-meses">
            <thead class="text-xs text-gray-500 dark:text-slate-400">
              <tr>
                <th class="py-1 font-medium">Mes</th>
                <th class="py-1 text-right font-medium">Historias clínicas</th>
                <th class="py-1 text-right font-medium">Notas médicas</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(m, i) in meses" :key="m.mes" class="border-t border-gray-100 dark:border-slate-800">
                <td class="py-1.5">{{ etiquetaMes(m.mes) }}<span v-if="i === 0" class="ml-1 text-xs text-gray-400">(en curso)</span></td>
                <td class="py-1.5 text-right tabular-nums">{{ m.historias }}</td>
                <td class="py-1.5 text-right tabular-nums">{{ m.notas }}</td>
              </tr>
              <tr class="border-t border-gray-200 text-gray-500 dark:border-slate-700 dark:text-slate-400">
                <td class="py-1.5">Total histórico</td>
                <td class="py-1.5 text-right tabular-nums">{{ proveedor.todasLasHistoriasClinicas ?? 0 }}</td>
                <td class="py-1.5 text-right tabular-nums">{{ proveedor.todasLasNotasMedicas ?? 0 }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Usuarios -->
        <section>
          <h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
            Usuarios <span class="normal-case">({{ roles.total }})</span>
          </h3>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="drawer-roles">
            <div class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-slate-800">
              <p class="text-xs text-gray-500 dark:text-slate-400">Médicos</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-slate-100">{{ roles.medicos }}</p>
            </div>
            <div class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-slate-800">
              <p class="text-xs text-gray-500 dark:text-slate-400">Enfermería</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-slate-100">{{ roles.enfermeros }}</p>
            </div>
            <div class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-slate-800">
              <p class="text-xs text-gray-500 dark:text-slate-400">Técnicos</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-slate-100">{{ roles.tecnicos }}</p>
            </div>
            <div class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-slate-800">
              <p class="text-xs text-gray-500 dark:text-slate-400">Administrativos</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-slate-100">{{ roles.administrativos }}</p>
            </div>
          </div>
          <p class="mt-1 text-xs text-gray-400 dark:text-slate-500">El Principal cuenta como médico.</p>

          <p v-if="cargandoUsuarios" class="mt-3 text-gray-500">Cargando usuarios…</p>
          <p v-else-if="errorUsuarios" class="mt-3 text-red-600 dark:text-red-400">
            No se pudieron cargar los usuarios.
            <button type="button" class="underline" @click="cargarUsuarios">Reintentar</button>
          </p>
          <ul v-else-if="usuarios" class="mt-3 divide-y divide-gray-100 dark:divide-slate-800" data-testid="drawer-usuarios">
            <li v-for="u in usuarios" :key="u._id" class="flex items-center justify-between gap-2 py-2">
              <div class="min-w-0">
                <p class="truncate font-medium text-gray-900 dark:text-slate-100">{{ u.username }}</p>
                <p class="truncate text-xs text-gray-500 dark:text-slate-400">{{ u.email }}</p>
              </div>
              <div class="flex shrink-0 items-center gap-1 text-xs">
                <span class="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-slate-800 dark:text-slate-300">{{ u.role }}</span>
                <span v-if="u.cuentaActiva === false" class="rounded-md bg-red-50 px-2 py-0.5 text-red-700 dark:bg-red-950/50 dark:text-red-300">Suspendida</span>
              </div>
            </li>
            <li v-if="usuarios.length === 0" class="py-2 text-gray-500">Sin usuarios.</li>
          </ul>
        </section>

        <!-- Suscripción -->
        <section v-if="suscripcion">
          <h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Suscripción</h3>
          <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <dt class="text-gray-500 dark:text-slate-400">Plan</dt>
            <dd class="text-right">{{ suscripcion.reason || "—" }}</dd>
            <dt class="text-gray-500 dark:text-slate-400">Monto mensual</dt>
            <dd class="text-right">{{ formatoMonto(suscripcion.auto_recurring?.transaction_amount) }}</dd>
            <dt class="text-gray-500 dark:text-slate-400">Método de pago</dt>
            <dd class="text-right">{{ suscripcion.payment_method_id || "—" }}</dd>
            <dt class="text-gray-500 dark:text-slate-400">Inició</dt>
            <dd class="text-right">{{ formatoFecha(suscripcion.date_created) }}</dd>
            <dt class="text-gray-500 dark:text-slate-400">Próximo cobro</dt>
            <dd class="text-right">{{ formatoFecha(suscripcion.next_payment_date) }}</dd>
            <dt class="text-gray-500 dark:text-slate-400">Pagador</dt>
            <dd class="truncate text-right">{{ suscripcion.payer_email || "—" }}</dd>
          </dl>
        </section>

        <!-- Configuración -->
        <section>
          <h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Configuración del proveedor</h3>
          <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <dt class="text-gray-500 dark:text-slate-400">Color de informe</dt>
            <dd class="flex items-center justify-end gap-2">
              <span v-if="proveedor.colorInforme" class="h-3 w-3 rounded-full border border-gray-200" :style="{ backgroundColor: proveedor.colorInforme }"></span>
              {{ colorInforme }}
            </dd>
            <dt class="text-gray-500 dark:text-slate-400">Semaforización</dt>
            <dd class="text-right">{{ proveedor.semaforizacionActivada ? "Activada" : "Desactivada" }}</dd>
          </dl>
        </section>

        <!-- Ajustes de plataforma -->
        <section id="drawer-ajustes">
          <TenantSettingsPanel
            :proveedor-id="String(proveedor._id)"
            :max-historias-permitidas-al-mes="proveedor.maxHistoriasPermitidasAlMes"
            :limite-historias-manual="proveedor.limiteHistoriasManual"
            :fecha-inicio-trial="proveedor.fechaInicioTrial"
            :fecha-fin-trial="proveedor.fechaFinTrial"
            :fecha-fin-trial-efectiva="proveedor.fechaFinTrialEfectiva"
            :restriccion-manual="proveedor.restriccionManual"
            @actualizado="(ajustes) => emit('ajustesActualizados', ajustes)"
          />
        </section>
      </div>
    </aside>
  </div>
</template>
