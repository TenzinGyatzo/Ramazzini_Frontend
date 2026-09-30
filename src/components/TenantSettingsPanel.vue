<script setup lang="ts">
import { computed, ref, watch } from "vue";
import PlataformaAPI, {
  type TenantSettingsChanges,
  type TenantSettingsResponse,
} from "@/api/PlataformaAPI";
import { getToast } from "@/utils/toast";
import { aFechaYmd, finDeDiaIso, resolverFechaFinTrial } from "@/utils/periodoPrueba";

/**
 * Consola de plataforma: límite de HC al mes, fin del periodo gratuito, restricción
 * comercial y pago en línea de un tenant. Solo se envían los campos que cambiaron.
 */
const props = defineProps<{
  proveedorId: string;
  maxHistoriasPermitidasAlMes?: number | null;
  limiteHistoriasManual?: number | null;
  fechaInicioTrial?: string | null;
  fechaFinTrial?: string | null;
  fechaFinTrialEfectiva?: string | null;
  restriccionManual?: boolean;
  pagoEnLineaHabilitado?: boolean;
  estadoSuscripcion?: string | null;
}>();

const emit = defineEmits<{ (e: "actualizado", value: TenantSettingsResponse): void }>();

const abierto = ref(false);
const guardando = ref(false);

const limiteInicial = computed(() =>
  typeof props.limiteHistoriasManual === "number" ? String(props.limiteHistoriasManual) : "",
);
const finInicial = computed(() =>
  props.fechaFinTrial ? aFechaYmd(new Date(props.fechaFinTrial)) : "",
);
const finEfectivo = computed(() =>
  resolverFechaFinTrial({
    fechaInicioTrial: props.fechaInicioTrial,
    fechaFinTrial: props.fechaFinTrial,
    fechaFinTrialEfectiva: props.fechaFinTrialEfectiva,
  }),
);

const limite = ref("");
const fechaFin = ref("");
const restringido = ref(false);
const pagoEnLinea = ref(false);

function reiniciarFormulario() {
  limite.value = limiteInicial.value;
  fechaFin.value = finInicial.value;
  restringido.value = props.restriccionManual === true;
  pagoEnLinea.value = props.pagoEnLineaHabilitado === true;
}
watch(
  () => [props.limiteHistoriasManual, props.fechaFinTrial, props.restriccionManual, props.pagoEnLineaHabilitado],
  reiniciarFormulario,
  { immediate: true },
);

const limiteInvalido = computed(() => {
  if (limite.value.trim() === "") return false;
  const n = Number(limite.value);
  return !Number.isInteger(n) || n < 0 || n > 100000;
});

/** El límite asignado solo aumenta: si no supera lo contratado, no cambia nada. */
const limiteSinEfecto = computed(() => {
  if (limite.value.trim() === "" || limiteInvalido.value) return false;
  return Number(limite.value) <= (props.maxHistoriasPermitidasAlMes ?? 0);
});

const cambios = computed<TenantSettingsChanges>(() => {
  const c: TenantSettingsChanges = {};
  if (limite.value.trim() !== limiteInicial.value) {
    c.limiteHistoriasManual = limite.value.trim() === "" ? null : Number(limite.value);
  }
  if (fechaFin.value !== finInicial.value) {
    c.fechaFinTrial = fechaFin.value ? finDeDiaIso(fechaFin.value) : null;
  }
  if (restringido.value !== (props.restriccionManual === true)) {
    c.restriccionManual = restringido.value;
  }
  if (pagoEnLinea.value !== (props.pagoEnLineaHabilitado === true)) {
    c.pagoEnLineaHabilitado = pagoEnLinea.value;
  }
  return c;
});
const hayCambios = computed(() => Object.keys(cambios.value).length > 0);

/** Quitar el pago en línea no cancela una suscripción de Mercado Pago que siga cobrando. */
const avisoSuscripcionActiva = computed(
  () =>
    props.pagoEnLineaHabilitado === true &&
    !pagoEnLinea.value &&
    (props.estadoSuscripcion === "authorized" || props.estadoSuscripcion === "pending"),
);

/** Atajos: suman días al fin actual (o a hoy, si ya pasó). */
function extenderDias(dias: number) {
  const base = fechaFin.value
    ? new Date(finDeDiaIso(fechaFin.value))
    : finEfectivo.value ?? new Date();
  const desde = base.getTime() > Date.now() ? base : new Date();
  const nueva = new Date(desde);
  nueva.setDate(nueva.getDate() + dias);
  fechaFin.value = aFechaYmd(nueva);
}

async function guardar() {
  if (!hayCambios.value || limiteInvalido.value || guardando.value) return;
  guardando.value = true;
  try {
    const { data } = await PlataformaAPI.updateTenantSettings(props.proveedorId, cambios.value);
    emit("actualizado", data);
    getToast().open({ message: "Ajustes del proveedor guardados", type: "success" });
    abierto.value = false;
  } catch (error: any) {
    const mensaje = error?.response?.data?.message;
    getToast().open({
      message: Array.isArray(mensaje) ? mensaje.join(". ") : mensaje || "No se pudieron guardar los ajustes",
      type: "error",
    });
  } finally {
    guardando.value = false;
  }
}

function cancelar() {
  reiniciarFormulario();
  abierto.value = false;
}
</script>

<template>
  <div class="mt-3" data-testid="tenant-settings-panel">
    <button
      type="button"
      data-testid="tenant-settings-toggle"
      class="flex items-center gap-2 rounded-lg p-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
      @click="abierto ? cancelar() : (abierto = true)"
    >
      <i class="fa-solid fa-sliders" aria-hidden="true"></i>
      Ajustes de plataforma
      <span v-if="restriccionManual" class="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Restringido</span>
      <span v-if="pagoEnLineaHabilitado" class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Pago en línea</span>
    </button>

    <form v-if="abierto" class="mt-2 space-y-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4" @submit.prevent="guardar">
      <div>
        <label class="block text-sm font-semibold text-gray-700" :for="`limite-${proveedorId}`">
          Límite de historias clínicas al mes
        </label>
        <div class="mt-1 flex flex-wrap items-center gap-2">
          <input
            :id="`limite-${proveedorId}`"
            v-model="limite"
            data-testid="tenant-settings-limite"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            class="w-32 rounded-lg border px-2 py-1"
            :placeholder="`Plan: ${maxHistoriasPermitidasAlMes ?? '—'}`"
          />
          <button
            v-if="limite !== ''"
            type="button"
            class="rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-white"
            @click="limite = ''"
          >
            Usar el del plan ({{ maxHistoriasPermitidasAlMes ?? "—" }})
          </button>
        </div>
        <p v-if="limiteInvalido" class="mt-1 text-xs text-red-600">Escribe un número entero entre 0 y 100000.</p>
        <p v-else-if="limiteSinEfecto" class="mt-1 text-xs text-amber-700">
          Es menor o igual a lo contratado ({{ maxHistoriasPermitidasAlMes }}): no tendrá efecto. El límite asignado solo aumenta.
        </p>
        <p v-else class="mt-1 text-xs text-gray-500">
          Vacío = lo contratado. Se aplica el mayor entre lo contratado y este límite (solo aumenta; para limitar usa la restricción).
        </p>
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-700" :for="`fin-${proveedorId}`">
          Fin del periodo gratuito
        </label>
        <div class="mt-1 flex flex-wrap items-center gap-2">
          <input
            :id="`fin-${proveedorId}`"
            v-model="fechaFin"
            data-testid="tenant-settings-fin"
            type="date"
            class="rounded-lg border px-2 py-1"
          />
          <button
            v-for="dias in [7, 15, 30]"
            :key="dias"
            type="button"
            :data-testid="`tenant-settings-extender-${dias}`"
            class="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-amber-800 shadow-sm hover:bg-amber-100"
            @click="extenderDias(dias)"
          >
            +{{ dias }} días
          </button>
          <button
            v-if="fechaFin !== ''"
            type="button"
            class="rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-white"
            @click="fechaFin = ''"
          >
            Restablecer (inicio + 15 días)
          </button>
        </div>
        <p class="mt-1 text-xs text-gray-500">
          Vacío = 15 días desde el registro. Una fecha futura reabre el periodo gratuito.
        </p>
      </div>

      <div>
        <label class="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input v-model="restringido" data-testid="tenant-settings-restriccion" type="checkbox" class="h-4 w-4" />
          Restringir acceso (como suscripción vencida)
        </label>
        <p class="mt-1 text-xs text-gray-500">
          El proveedor sigue entrando a su espacio, pero no puede registrar trabajadores ni crear documentos.
          No detiene cobros en Mercado Pago.
        </p>
      </div>

      <div>
        <label class="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input v-model="pagoEnLinea" data-testid="tenant-settings-pago-en-linea" type="checkbox" class="h-4 w-4" />
          Permitir contratar en línea (Mercado Pago)
        </label>
        <p class="mt-1 text-xs text-gray-500">
          Muestra «Ver planes» para que el proveedor se suscriba o cambie su plan con tarjeta. Desactivado: su plan se
          gestiona directamente con Ramazzini y verá los datos de contacto.
        </p>
        <p v-if="avisoSuscripcionActiva" data-testid="tenant-settings-aviso-mp" class="mt-1 text-xs text-amber-700">
          Tiene una suscripción de Mercado Pago vigente: seguirá cobrándose. Puede cancelarla desde «Mi Suscripción».
        </p>
      </div>

      <div class="flex gap-2">
        <button
          type="submit"
          data-testid="tenant-settings-guardar"
          class="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-400 disabled:opacity-50"
          :disabled="!hayCambios || limiteInvalido || guardando"
        >
          {{ guardando ? "Guardando…" : "Guardar" }}
        </button>
        <button type="button" class="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-white" @click="cancelar">
          Cancelar
        </button>
      </div>
    </form>
  </div>
</template>
