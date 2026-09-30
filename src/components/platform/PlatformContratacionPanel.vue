<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { addMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import PlataformaAPI, {
  type Contratacion,
  type ContratoPayload,
  type PagoRegistrado,
} from "@/api/PlataformaAPI";
import { getToast } from "@/utils/toast";
import { aFechaYmd, finDeDiaIso } from "@/utils/periodoPrueba";
import { NOMBRES_PLAN, diasParaVencerContrato, nombrePlanContrato } from "@/utils/accesoComercial";

/**
 * Consola de plataforma: contrato manual (transferencia o enlace de Mercado Pago),
 * pagos registrados con su factura y, solo lectura, lo que llega de Mercado Pago en la app.
 */
const props = defineProps<{ proveedorId: string }>();
const emit = defineEmits<{ (e: "actualizado", value: Contratacion): void }>();

const HC_POR_PLAN: Record<string, number> = { basico: 50, profesional: 150, empresarial: 300 };

const datos = ref<Contratacion | null>(null);
const cargando = ref(false);
const errorCarga = ref(false);
const guardando = ref(false);
const modo = ref<"ver" | "contrato" | "pago" | "terminar">("ver");

async function cargar() {
  cargando.value = true;
  errorCarga.value = false;
  try {
    const { data } = await PlataformaAPI.getContratacion(props.proveedorId);
    datos.value = data;
  } catch (error) {
    console.error("No se pudo cargar la contratación:", error);
    errorCarga.value = true;
  } finally {
    cargando.value = false;
  }
}
watch(
  () => props.proveedorId,
  () => {
    modo.value = "ver";
    datos.value = null;
    cargar();
  },
  { immediate: true },
);

/** Ejecuta una acción del servidor y refleja la contratación actualizada (aquí y en la consola). */
async function ejecutar(accion: () => Promise<{ data: Contratacion }>, exito: string) {
  if (guardando.value) return false;
  guardando.value = true;
  try {
    const { data } = await accion();
    datos.value = data;
    emit("actualizado", data);
    getToast().open({ message: exito, type: "success" });
    modo.value = "ver";
    return true;
  } catch (error: any) {
    const mensaje = error?.response?.data?.message;
    getToast().open({
      message: Array.isArray(mensaje) ? mensaje.join(". ") : mensaje || "No se pudo guardar",
      type: "error",
    });
    return false;
  } finally {
    guardando.value = false;
  }
}

const contrato = computed(() => datos.value?.contrato ?? null);
const privado = computed(() => datos.value?.privado ?? null);

const fecha = (valor?: string | Date | null) =>
  valor ? format(new Date(valor), "d 'de' MMM yyyy", { locale: es }) : "—";
const dinero = (monto?: number | null) =>
  typeof monto === "number" ? monto.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) : "—";
const ymdAIso = (ymd: string, hora = 12) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, hora).toISOString();
};

const vigencia = computed(() => {
  const c = contrato.value;
  if (!c) return "";
  if (c.estado === "activo" && c.renovacionAutomatica) return "Renovación automática";
  if (!c.pagadoHasta) return "Sin vigencia: registra un pago";
  const texto = datos.value?.contratoVigente ? `Pagado hasta el ${fecha(c.pagadoHasta)}` : `Venció el ${fecha(c.pagadoHasta)}`;
  return c.estado === "terminado" ? `Terminado · ${texto.toLowerCase()}` : texto;
});
const diasAviso = computed(() => diasParaVencerContrato(contrato.value));

// ── Formulario del contrato ───────────────────────────────────────────────
const form = reactive({
  plan: "basico" as ContratoPayload["plan"],
  nombrePlan: "",
  historiasMes: "50",
  periodicidad: "mensual" as ContratoPayload["periodicidad"],
  formaPago: "transferencia" as ContratoPayload["formaPago"],
  requiereFactura: false,
  renovacionAutomatica: false,
  fechaInicio: "",
  pagadoHasta: "",
  montoPeriodo: "",
  notas: "",
  reactivar: false,
});

function abrirContrato() {
  const c = contrato.value;
  const p = privado.value;
  Object.assign(form, {
    plan: c?.plan ?? "basico",
    nombrePlan: c?.nombrePlan ?? "",
    historiasMes: String(c?.historiasMes ?? 50),
    periodicidad: c?.periodicidad ?? "mensual",
    formaPago: p?.formaPago ?? "transferencia",
    requiereFactura: p?.requiereFactura ?? false,
    renovacionAutomatica: c?.renovacionAutomatica ?? false,
    fechaInicio: aFechaYmd(c?.fechaInicio ? new Date(c.fechaInicio) : new Date()),
    pagadoHasta: c?.pagadoHasta ? aFechaYmd(new Date(c.pagadoHasta)) : "",
    montoPeriodo: typeof p?.montoPeriodo === "number" ? String(p.montoPeriodo) : "",
    notas: p?.notas ?? "",
    reactivar: false,
  });
  modo.value = "contrato";
}

/** El plan sugiere sus HC; «personalizado» deja escribirlas. */
function alCambiarPlan() {
  const sugeridas = HC_POR_PLAN[form.plan];
  if (sugeridas) form.historiasMes = String(sugeridas);
}
/** El enlace de Mercado Pago cobra solo cada periodo: por defecto, renovación automática. */
function alCambiarFormaPago() {
  form.renovacionAutomatica = form.formaPago === "mercadopago_enlace";
}

const historiasInvalidas = computed(() => {
  const n = Number(form.historiasMes);
  return form.historiasMes.trim() === "" || !Number.isInteger(n) || n < 0 || n > 100000;
});
const montoInvalido = computed(() => form.montoPeriodo.trim() !== "" && !(Number(form.montoPeriodo) >= 0));
const contratoValido = computed(() => !historiasInvalidas.value && !montoInvalido.value && !!form.fechaInicio);

function guardarContrato() {
  if (!contratoValido.value) return;
  const payload: ContratoPayload = {
    plan: form.plan,
    nombrePlan: form.plan === "personalizado" ? form.nombrePlan.trim() || null : null,
    historiasMes: Number(form.historiasMes),
    periodicidad: form.periodicidad,
    formaPago: form.formaPago,
    requiereFactura: form.requiereFactura,
    renovacionAutomatica: form.renovacionAutomatica,
    fechaInicio: ymdAIso(form.fechaInicio, 0),
    pagadoHasta: form.renovacionAutomatica ? undefined : form.pagadoHasta ? finDeDiaIso(form.pagadoHasta) : null,
    montoPeriodo: form.montoPeriodo.trim() === "" ? null : Number(form.montoPeriodo),
    notas: form.notas.trim() || null,
    ...(contrato.value?.estado === "terminado" && form.reactivar ? { reactivar: true } : {}),
  };
  return ejecutar(() => PlataformaAPI.guardarContrato(props.proveedorId, payload), "Contrato guardado");
}

// ── Terminar ──────────────────────────────────────────────────────────────
const accesoHasta = ref("");
function abrirTerminar() {
  const pagado = contrato.value?.pagadoHasta ? new Date(contrato.value.pagadoHasta) : null;
  accesoHasta.value = aFechaYmd(pagado && pagado.getTime() > Date.now() ? pagado : new Date());
  modo.value = "terminar";
}
function terminar() {
  return ejecutar(
    () => PlataformaAPI.terminarContrato(props.proveedorId, accesoHasta.value ? finDeDiaIso(accesoHasta.value) : null),
    "Contrato terminado",
  );
}

// ── Registrar pago ────────────────────────────────────────────────────────
const pago = reactive({ fechaPago: "", monto: "", desde: "", hasta: "", notas: "", periodoEditado: false });

/** Mismo cálculo que el servidor: desde lo ya pagado (o la fecha de pago) + 1 o 12 meses. */
function periodoSugerido(fechaPagoYmd: string) {
  const c = contrato.value;
  const fechaPago = fechaPagoYmd ? new Date(ymdAIso(fechaPagoYmd)) : new Date();
  const pagado = c?.pagadoHasta ? new Date(c.pagadoHasta) : null;
  const desde = pagado && pagado.getTime() > fechaPago.getTime() ? pagado : fechaPago;
  return { desde, hasta: addMonths(desde, c?.periodicidad === "anual" ? 12 : 1) };
}
function abrirPago() {
  const hoy = aFechaYmd(new Date());
  const sugerido = periodoSugerido(hoy);
  Object.assign(pago, {
    fechaPago: hoy,
    monto: typeof privado.value?.montoPeriodo === "number" ? String(privado.value.montoPeriodo) : "",
    desde: aFechaYmd(sugerido.desde),
    hasta: aFechaYmd(sugerido.hasta),
    notas: "",
    periodoEditado: false,
  });
  modo.value = "pago";
}
watch(
  () => pago.fechaPago,
  (valor) => {
    if (modo.value !== "pago" || pago.periodoEditado || !valor) return;
    const sugerido = periodoSugerido(valor);
    pago.desde = aFechaYmd(sugerido.desde);
    pago.hasta = aFechaYmd(sugerido.hasta);
  },
);
const pagoValido = computed(
  () => !!pago.fechaPago && pago.monto.trim() !== "" && Number(pago.monto) >= 0 && (!pago.periodoEditado || pago.hasta > pago.desde),
);
function registrarPago() {
  if (!pagoValido.value) return;
  return ejecutar(
    () =>
      PlataformaAPI.registrarPago(props.proveedorId, {
        fechaPago: ymdAIso(pago.fechaPago),
        monto: Number(pago.monto),
        // Sin editar, el servidor calcula el periodo (misma regla)
        ...(pago.periodoEditado ? { periodoDesde: ymdAIso(pago.desde, 0), periodoHasta: finDeDiaIso(pago.hasta) } : {}),
        notas: pago.notas.trim() || null,
      }),
    "Pago registrado",
  );
}

// ── Facturas y anulación ──────────────────────────────────────────────────
const edicionPago = reactive<{ id: string | null; accion: "factura" | "anular" | null; texto: string }>({
  id: null,
  accion: null,
  texto: "",
});
function editarPago(p: PagoRegistrado, accion: "factura" | "anular") {
  Object.assign(edicionPago, { id: p._id, accion, texto: "" });
}
async function confirmarEdicionPago() {
  const { id, accion, texto } = edicionPago;
  if (!id || !accion || !texto.trim()) return;
  const ok = await ejecutar(
    () =>
      accion === "factura"
        ? PlataformaAPI.emitirFactura(props.proveedorId, id, texto.trim())
        : PlataformaAPI.anularPago(props.proveedorId, id, texto.trim()),
    accion === "factura" ? "Factura marcada como emitida" : "Pago anulado",
  );
  if (ok) Object.assign(edicionPago, { id: null, accion: null, texto: "" });
}

const ETIQUETA_FACTURA: Record<string, string> = {
  no_requiere: "Sin factura",
  pendiente: "Factura pendiente",
  emitida: "Factura emitida",
};
const TONO_FACTURA: Record<string, string> = {
  no_requiere: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400",
  pendiente: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  emitida: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
};

const mp = computed(() => datos.value?.mercadoPago ?? null);
const hayMercadoPago = computed(() => !!mp.value && (!!mp.value.suscripcionActiva || mp.value.pagos.length > 0 || !!mp.value.estadoSuscripcion));

const campo =
  "w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";
const etiqueta = "block text-xs font-medium text-gray-500 dark:text-slate-400";
</script>

<template>
  <section data-testid="contratacion-panel">
    <h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Contratación</h3>

    <p v-if="cargando && !datos" class="text-gray-500">Cargando contratación…</p>
    <p v-else-if="errorCarga" class="text-red-600 dark:text-red-400">
      No se pudo cargar la contratación. <button type="button" class="underline" @click="cargar">Reintentar</button>
    </p>

    <template v-else-if="datos">
      <p
        v-if="datos.manualHeredado"
        data-testid="contratacion-heredado"
        class="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
      >
        Acceso manual heredado (sin Mercado Pago y sin fecha de fin). Registra su contrato para darle vigencia; el acceso
        manual se sustituye al guardar.
      </p>

      <!-- Contrato actual -->
      <div v-if="contrato && modo === 'ver'" data-testid="contratacion-contrato" class="rounded-lg border border-gray-100 p-3 dark:border-slate-800">
        <div class="flex items-start justify-between gap-2">
          <p class="font-medium text-gray-900 dark:text-slate-100">
            {{ nombrePlanContrato(contrato) }} · {{ contrato.historiasMes }} HC al mes
          </p>
          <span
            class="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium"
            :class="datos.contratoVigente ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'"
          >
            {{ datos.contratoVigente ? "Vigente" : "No vigente" }}
          </span>
        </div>
        <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          <dt class="text-gray-500 dark:text-slate-400">Forma de pago</dt>
          <dd class="text-right">{{ privado?.formaPago === "mercadopago_enlace" ? "Enlace de Mercado Pago" : "Transferencia" }}</dd>
          <dt class="text-gray-500 dark:text-slate-400">Periodo</dt>
          <dd class="text-right">{{ contrato.periodicidad === "anual" ? "Anual" : "Mensual" }}</dd>
          <dt class="text-gray-500 dark:text-slate-400">Factura</dt>
          <dd class="text-right">{{ privado?.requiereFactura ? "Sí" : "No" }}</dd>
          <dt class="text-gray-500 dark:text-slate-400">Monto por periodo</dt>
          <dd class="text-right">{{ dinero(privado?.montoPeriodo) }}</dd>
          <dt class="text-gray-500 dark:text-slate-400">Inicio</dt>
          <dd class="text-right">{{ fecha(contrato.fechaInicio) }}</dd>
          <dt class="text-gray-500 dark:text-slate-400">Vigencia</dt>
          <dd class="text-right" data-testid="contratacion-vigencia">{{ vigencia }}</dd>
        </dl>
        <p v-if="diasAviso !== null" class="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Vence en {{ diasAviso }} d: el cliente ya ve el aviso de renovación.
        </p>
        <p v-if="privado?.notas" class="mt-2 whitespace-pre-line text-xs text-gray-500 dark:text-slate-400">{{ privado.notas }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" data-testid="contratacion-registrar-pago" class="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-400" @click="abrirPago">
            Registrar pago
          </button>
          <button type="button" data-testid="contratacion-editar" class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800" @click="abrirContrato">
            Editar contrato
          </button>
          <button
            v-if="contrato.estado === 'activo'"
            type="button"
            data-testid="contratacion-terminar"
            class="rounded-lg px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            @click="abrirTerminar"
          >
            Terminar contrato
          </button>
        </div>
      </div>

      <button
        v-else-if="!contrato && modo === 'ver'"
        type="button"
        data-testid="contratacion-nuevo"
        class="rounded-lg border border-dashed border-amber-300 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
        @click="abrirContrato"
      >
        + Registrar contrato (transferencia o enlace de Mercado Pago)
      </button>

      <!-- Formulario del contrato -->
      <form
        v-if="modo === 'contrato'"
        data-testid="contratacion-form"
        class="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20"
        @submit.prevent="guardarContrato"
      >
        <div class="grid grid-cols-2 gap-2">
          <label class="col-span-2 sm:col-span-1">
            <span :class="etiqueta">Plan</span>
            <select v-model="form.plan" data-testid="contrato-plan" :class="campo" @change="alCambiarPlan">
              <option v-for="(nombre, clave) in NOMBRES_PLAN" :key="clave" :value="clave">{{ nombre }}</option>
            </select>
          </label>
          <label class="col-span-2 sm:col-span-1">
            <span :class="etiqueta">HC al mes</span>
            <input v-model="form.historiasMes" data-testid="contrato-historias" type="text" inputmode="numeric" :class="campo" />
          </label>
          <label v-if="form.plan === 'personalizado'" class="col-span-2">
            <span :class="etiqueta">Nombre del plan (lo ve el cliente)</span>
            <input v-model="form.nombrePlan" type="text" maxlength="100" :class="campo" placeholder="Plan personalizado" />
          </label>
          <label>
            <span :class="etiqueta">Forma de pago</span>
            <select v-model="form.formaPago" data-testid="contrato-forma-pago" :class="campo" @change="alCambiarFormaPago">
              <option value="transferencia">Transferencia</option>
              <option value="mercadopago_enlace">Enlace de Mercado Pago</option>
            </select>
          </label>
          <label>
            <span :class="etiqueta">Periodo</span>
            <select v-model="form.periodicidad" data-testid="contrato-periodicidad" :class="campo">
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
          </label>
          <label>
            <span :class="etiqueta">Monto por periodo (MXN)</span>
            <input v-model="form.montoPeriodo" data-testid="contrato-monto" type="text" inputmode="decimal" :class="campo" />
          </label>
          <label>
            <span :class="etiqueta">Inicio</span>
            <input v-model="form.fechaInicio" type="date" :class="campo" />
          </label>
          <label class="col-span-2 flex items-center gap-2 text-sm">
            <input v-model="form.requiereFactura" data-testid="contrato-factura" type="checkbox" class="h-4 w-4" />
            El cliente requiere factura
          </label>
          <label class="col-span-2 flex items-center gap-2 text-sm">
            <input v-model="form.renovacionAutomatica" data-testid="contrato-renovacion" type="checkbox" class="h-4 w-4" />
            Renovación automática (vigente hasta que lo termines)
          </label>
          <label v-if="!form.renovacionAutomatica" class="col-span-2">
            <span :class="etiqueta">Pagado hasta</span>
            <input v-model="form.pagadoHasta" data-testid="contrato-pagado-hasta" type="date" :class="campo" />
            <span class="mt-0.5 block text-xs text-gray-500 dark:text-slate-400">Al registrar pagos se extiende sola.</span>
          </label>
          <label class="col-span-2">
            <span :class="etiqueta">Notas internas (el cliente no las ve)</span>
            <textarea v-model="form.notas" rows="2" maxlength="2000" :class="campo"></textarea>
          </label>
          <label v-if="contrato?.estado === 'terminado'" class="col-span-2 flex items-center gap-2 text-sm">
            <input v-model="form.reactivar" type="checkbox" class="h-4 w-4" />
            Reactivar el contrato
          </label>
        </div>
        <p v-if="historiasInvalidas" class="text-xs text-red-600">Escribe un número entero de HC entre 0 y 100000.</p>
        <p v-if="montoInvalido" class="text-xs text-red-600">El monto debe ser un número.</p>
        <p v-if="datos.manualHeredado" class="text-xs text-sky-800 dark:text-sky-300">
          Al guardar se quita el acceso manual heredado; desde ese momento manda la vigencia del contrato.
        </p>
        <div class="flex gap-2">
          <button type="submit" data-testid="contrato-guardar" class="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-400 disabled:opacity-50" :disabled="!contratoValido || guardando">
            {{ guardando ? "Guardando…" : "Guardar contrato" }}
          </button>
          <button type="button" class="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800" @click="modo = 'ver'">Cancelar</button>
        </div>
      </form>

      <!-- Terminar -->
      <form
        v-if="modo === 'terminar'"
        data-testid="contratacion-terminar-form"
        class="space-y-2 rounded-xl border border-red-200 bg-red-50/60 p-3 dark:border-red-900 dark:bg-red-950/20"
        @submit.prevent="terminar"
      >
        <label>
          <span :class="etiqueta">Conserva el acceso hasta</span>
          <input v-model="accesoHasta" type="date" :class="campo" />
        </label>
        <p class="text-xs text-gray-600 dark:text-slate-400">
          Por defecto, hasta lo ya pagado. Para bloquear de inmediato usa la restricción en «Ajustes de plataforma».
        </p>
        <div class="flex gap-2">
          <button type="submit" class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" :disabled="guardando">
            Terminar contrato
          </button>
          <button type="button" class="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800" @click="modo = 'ver'">Cancelar</button>
        </div>
      </form>

      <!-- Registrar pago -->
      <form
        v-if="modo === 'pago'"
        data-testid="contratacion-pago-form"
        class="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20"
        @submit.prevent="registrarPago"
      >
        <div class="grid grid-cols-2 gap-2">
          <label>
            <span :class="etiqueta">Fecha de pago</span>
            <input v-model="pago.fechaPago" data-testid="pago-fecha" type="date" :class="campo" />
          </label>
          <label>
            <span :class="etiqueta">Monto (MXN)</span>
            <input v-model="pago.monto" data-testid="pago-monto" type="text" inputmode="decimal" :class="campo" />
          </label>
          <label>
            <span :class="etiqueta">Cubre desde</span>
            <input v-model="pago.desde" type="date" :class="campo" @input="pago.periodoEditado = true" />
          </label>
          <label>
            <span :class="etiqueta">Hasta</span>
            <input v-model="pago.hasta" data-testid="pago-hasta" type="date" :class="campo" @input="pago.periodoEditado = true" />
          </label>
          <label class="col-span-2">
            <span :class="etiqueta">Notas</span>
            <input v-model="pago.notas" type="text" maxlength="2000" :class="campo" placeholder="Referencia de la transferencia, etc." />
          </label>
        </div>
        <p class="text-xs text-gray-600 dark:text-slate-400">
          <template v-if="contrato?.renovacionAutomatica">Renovación automática: el pago no cambia la vigencia.</template>
          <template v-else>La vigencia se extiende hasta el fin del periodo.</template>
          <template v-if="privado?.requiereFactura"> Quedará con «Factura pendiente».</template>
        </p>
        <div class="flex gap-2">
          <button type="submit" data-testid="pago-guardar" class="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-400 disabled:opacity-50" :disabled="!pagoValido || guardando">
            {{ guardando ? "Guardando…" : "Registrar pago" }}
          </button>
          <button type="button" class="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800" @click="modo = 'ver'">Cancelar</button>
        </div>
      </form>

      <!-- Historial de pagos registrados -->
      <div v-if="datos.pagos.length" class="mt-4">
        <p class="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">Pagos registrados</p>
        <ul class="divide-y divide-gray-100 dark:divide-slate-800" data-testid="contratacion-pagos">
          <li v-for="p in datos.pagos" :key="p._id" class="py-2" :class="{ 'opacity-60': p.anulado }">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p :class="{ 'line-through': p.anulado }" class="font-medium text-gray-900 dark:text-slate-100">
                  {{ dinero(p.monto) }} · {{ fecha(p.fechaPago) }}
                </p>
                <p class="text-xs text-gray-500 dark:text-slate-400">Cubre {{ fecha(p.periodoDesde) }} – {{ fecha(p.periodoHasta) }}</p>
                <p v-if="p.anulado" class="text-xs text-red-600 dark:text-red-400">Anulado: {{ p.anulado.motivo }}</p>
                <p v-else-if="p.factura.folio" class="text-xs text-gray-500 dark:text-slate-400">Folio {{ p.factura.folio }}</p>
              </div>
              <span v-if="!p.anulado" class="shrink-0 rounded-md px-2 py-0.5 text-xs" :class="TONO_FACTURA[p.factura.estado]">
                {{ ETIQUETA_FACTURA[p.factura.estado] }}
              </span>
            </div>
            <div v-if="!p.anulado && edicionPago.id !== p._id" class="mt-1 flex gap-2 text-xs">
              <button v-if="p.factura.estado !== 'emitida'" type="button" data-testid="pago-emitir" class="text-emerald-700 underline dark:text-emerald-400" @click="editarPago(p, 'factura')">
                Marcar factura emitida
              </button>
              <button type="button" data-testid="pago-anular" class="text-red-700 underline dark:text-red-400" @click="editarPago(p, 'anular')">Anular</button>
            </div>
            <form v-if="edicionPago.id === p._id" class="mt-1 flex gap-2" @submit.prevent="confirmarEdicionPago">
              <input
                v-model="edicionPago.texto"
                data-testid="pago-edicion-texto"
                type="text"
                :maxlength="edicionPago.accion === 'factura' ? 100 : 500"
                :placeholder="edicionPago.accion === 'factura' ? 'Folio de la factura' : 'Motivo de la anulación'"
                :class="campo"
              />
              <button type="submit" data-testid="pago-edicion-confirmar" class="shrink-0 rounded-lg bg-gray-800 px-2 py-1 text-xs text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900" :disabled="!edicionPago.texto.trim() || guardando">
                {{ edicionPago.accion === "factura" ? "Guardar" : "Anular" }}
              </button>
              <button type="button" class="shrink-0 text-xs text-gray-500" @click="edicionPago.id = null">Cancelar</button>
            </form>
          </li>
        </ul>
      </div>

      <!-- Mercado Pago en la app (solo lectura) -->
      <div v-if="hayMercadoPago && mp" class="mt-4" data-testid="contratacion-mercadopago">
        <p class="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">Mercado Pago en la app (automático)</p>
        <p class="text-sm">
          Estado: <strong>{{ mp.estadoSuscripcion || "—" }}</strong>
          <template v-if="mp.suscripcion?.reason"> · {{ mp.suscripcion.reason }}</template>
          <template v-if="mp.suscripcion?.auto_recurring?.transaction_amount"> · {{ dinero(mp.suscripcion.auto_recurring.transaction_amount) }}/mes</template>
        </p>
        <ul v-if="mp.pagos.length" class="mt-1 space-y-0.5 text-xs text-gray-500 dark:text-slate-400">
          <li v-for="p in mp.pagos" :key="p._id">
            {{ fecha(p.date_created) }} · {{ dinero(p.transaction_amount) }} · {{ p.payment?.status || p.status || "—" }}
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
