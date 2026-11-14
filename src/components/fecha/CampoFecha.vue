<script setup>
/**
 * Campo de fecha siempre en DD/MM/AAAA, sin depender del idioma del navegador (punto 31).
 * - El dato (v-model) sigue siendo AAAA-MM-DD, como el campo de fecha del navegador.
 * - Se teclea de corrido: las diagonales se ponen solas («05112026» → «05/11/2026»).
 * - La fecha solo se entrega completa; a medias o imposible (31/02) se marca, y al salir del
 *   campo se entrega vacía (como el campo del navegador). Así los filtros no recargan a cada tecla.
 * - Fuera de min/max se entrega igual que hoy y se marca; el calendario no deja elegirla.
 * - Calendario en español con el botón (no recibe Tab) o Alt + ↓.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import {
  MESES,
  ddmmaaaaAIso,
  dentroDeRango,
  diasDelMes,
  enmascararFecha,
  esFechaIsoValida,
  hoyIso,
  isoADDMMAAAA,
} from '@/helpers/fechaDDMMAAAA';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  modelValue: { type: String, default: '' },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  id: { type: String, default: undefined },
  name: { type: String, default: undefined },
  placeholder: { type: String, default: 'DD/MM/AAAA' },
  /** Clases del cuadro de texto (las que tenía el campo de fecha que reemplaza). */
  inputClass: { type: [String, Array, Object], default: '' },
});
const emit = defineEmits(['update:modelValue', 'change', 'blur', 'focus']);

const DIAS_SEMANA = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D'];

const campo = ref(null);
const raiz = ref(null);
const texto = ref(isoADDMMAAAA(props.modelValue));
const abierto = ref(false);

const isoDelModelo = (valor) => {
  const corto = String(valor ?? '').slice(0, 10);
  return esFechaIsoValida(corto) ? corto : '';
};

// Lo que llega desde fuera (código, otro formulario) se refleja; lo tecleado a medias no se pisa
watch(
  () => props.modelValue,
  (valor) => {
    const iso = isoDelModelo(valor);
    if (iso === ddmmaaaaAIso(texto.value)) return;
    if (!iso && texto.value && !ddmmaaaaAIso(texto.value)) return;
    texto.value = isoADDMMAAAA(iso);
  },
);

const isoActual = computed(() => ddmmaaaaAIso(texto.value));
const incompleta = computed(() => texto.value !== '' && !isoActual.value);
const fueraDeRango = computed(
  () => !!isoActual.value && !dentroDeRango(isoActual.value, props.min, props.max),
);

const entregar = (iso) => {
  if (iso === isoDelModelo(props.modelValue)) return;
  emit('update:modelValue', iso);
  emit('change', iso);
};

const alEscribir = (e) => {
  const enmascarado = enmascararFecha(e.target.value);
  // Solo se reescribe si cambió (así el cursor no se mueve sin necesidad)
  if (enmascarado !== e.target.value) e.target.value = enmascarado;
  texto.value = enmascarado;
  const iso = ddmmaaaaAIso(enmascarado);
  if (iso) entregar(iso);
};

const alSalir = (e) => {
  // Vacío o a medias al salir: se entrega vacío (el texto a medias se queda marcado)
  if (!isoActual.value) entregar('');
  emit('blur', e);
};

// ── Calendario ────────────────────────────────────────────────────────────────
const anioVista = ref(0);
const mesVista = ref(1);

const abrir = () => {
  if (props.disabled || props.readonly) return;
  let base = isoActual.value || hoyIso();
  if (!isoActual.value && esFechaIsoValida(props.max) && base > props.max) base = props.max;
  if (!isoActual.value && esFechaIsoValida(props.min) && base < props.min) base = props.min;
  anioVista.value = Number(base.slice(0, 4));
  mesVista.value = Number(base.slice(5, 7));
  abierto.value = true;
};
const cerrar = (devolverFoco = true) => {
  abierto.value = false;
  if (devolverFoco) nextTick(() => campo.value?.focus());
};

const anioMin = computed(() => (esFechaIsoValida(props.min) ? Number(props.min.slice(0, 4)) : 1900));
const anioMax = computed(() =>
  esFechaIsoValida(props.max) ? Number(props.max.slice(0, 4)) : Number(hoyIso().slice(0, 4)) + 10,
);
const anios = computed(() => {
  const desde = Math.min(anioMin.value, anioVista.value);
  const hasta = Math.max(anioMax.value, anioVista.value);
  const lista = [];
  for (let a = hasta; a >= desde; a -= 1) lista.push(a);
  return lista;
});

const p2 = (n) => String(n).padStart(2, '0');
const isoDe = (dia) => `${anioVista.value}-${p2(mesVista.value)}-${p2(dia)}`;
const hoy = computed(() => (abierto.value ? hoyIso() : ''));

/** Celdas del mes: semanas de lunes a domingo, con huecos al inicio. */
const celdas = computed(() => {
  const primero = new Date(anioVista.value, mesVista.value - 1, 1).getDay(); // 0 = domingo
  const huecos = (primero + 6) % 7;
  const lista = Array.from({ length: huecos }, () => null);
  for (let d = 1; d <= diasDelMes(anioVista.value, mesVista.value); d += 1) lista.push(d);
  return lista;
});

const mover = (delta) => {
  let m = mesVista.value + delta;
  let a = anioVista.value;
  if (m < 1) {
    m = 12;
    a -= 1;
  }
  if (m > 12) {
    m = 1;
    a += 1;
  }
  mesVista.value = m;
  anioVista.value = a;
};

const fijar = (iso) => {
  if (!dentroDeRango(iso, props.min, props.max)) return;
  texto.value = isoADDMMAAAA(iso);
  entregar(iso);
  cerrar();
};
const hoyPermitido = computed(() => dentroDeRango(hoyIso(), props.min, props.max));

const alTeclear = (e) => {
  if (e.altKey && e.key === 'ArrowDown') {
    e.preventDefault();
    abrir();
  } else if (e.key === 'Escape' && abierto.value) {
    e.preventDefault();
    e.stopPropagation();
    cerrar();
  }
};

// Clic fuera: se cierra sin robar el foco
const alClicFuera = (e) => {
  if (abierto.value && raiz.value && !raiz.value.contains(e.target)) cerrar(false);
};
watch(abierto, (v) => {
  if (v) document.addEventListener('mousedown', alClicFuera, true);
  else document.removeEventListener('mousedown', alClicFuera, true);
});
onBeforeUnmount(() => document.removeEventListener('mousedown', alClicFuera, true));

defineExpose({ focus: () => campo.value?.focus() });
</script>

<template>
  <div ref="raiz" class="campo-fecha relative">
    <input
      :id="id"
      ref="campo"
      :name="name"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      maxlength="10"
      :placeholder="placeholder"
      :value="texto"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :aria-invalid="incompleta || fueraDeRango ? 'true' : undefined"
      :data-fecha-incompleta="incompleta ? 'true' : undefined"
      data-fecha
      v-bind="$attrs"
      :class="[inputClass, 'campo-fecha-texto', (incompleta || fueraDeRango) && 'campo-fecha-invalida']"
      @input="alEscribir"
      @blur="alSalir"
      @focus="emit('focus', $event)"
      @keydown="alTeclear"
    />
    <button
      v-if="!disabled && !readonly"
      type="button"
      tabindex="-1"
      class="campo-fecha-boton absolute right-2 top-1/2 -translate-y-1/2 px-1 text-gray-400 hover:text-emerald-600"
      title="Abrir calendario (Alt + ↓)"
      aria-label="Abrir calendario"
      @mousedown.prevent
      @click="abierto ? cerrar() : abrir()"
    >
      <i class="far fa-calendar-alt" aria-hidden="true"></i>
    </button>

    <div
      v-if="abierto"
      class="campo-fecha-calendario absolute left-0 top-full z-50 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
      role="dialog"
      aria-label="Calendario"
      data-calendario-fecha
    >
      <div class="mb-2 flex items-center justify-between gap-1">
        <button type="button" tabindex="-1" class="rounded px-2 py-1 text-gray-600 hover:bg-gray-100" aria-label="Mes anterior" @mousedown.prevent @click="mover(-1)">‹</button>
        <div class="flex items-center gap-1 text-sm">
          <select v-model.number="mesVista" class="rounded border border-gray-200 py-0.5 pl-1 text-sm" aria-label="Mes" data-mes>
            <option v-for="(nombre, i) in MESES" :key="nombre" :value="i + 1">{{ nombre }}</option>
          </select>
          <select v-model.number="anioVista" class="rounded border border-gray-200 py-0.5 pl-1 text-sm" aria-label="Año" data-anio>
            <option v-for="a in anios" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <button type="button" tabindex="-1" class="rounded px-2 py-1 text-gray-600 hover:bg-gray-100" aria-label="Mes siguiente" @mousedown.prevent @click="mover(1)">›</button>
      </div>
      <div class="grid grid-cols-7 text-center text-[11px] font-medium text-gray-400">
        <span v-for="d in DIAS_SEMANA" :key="d">{{ d }}</span>
      </div>
      <div class="mt-1 grid grid-cols-7 gap-0.5 text-center text-sm">
        <template v-for="(dia, i) in celdas" :key="i">
          <span v-if="!dia"></span>
          <button
            v-else
            type="button"
            tabindex="-1"
            :disabled="!dentroDeRango(isoDe(dia), min, max)"
            :data-dia="dia"
            :class="[
              'rounded py-1 disabled:cursor-not-allowed disabled:text-gray-300',
              isoDe(dia) === isoActual ? 'bg-emerald-600 text-white' : 'text-gray-700 hover:bg-emerald-50',
              isoDe(dia) === hoy && isoDe(dia) !== isoActual ? 'font-semibold text-emerald-700' : '',
            ]"
            @mousedown.prevent
            @click="fijar(isoDe(dia))"
          >
            {{ dia }}
          </button>
        </template>
      </div>
      <div class="mt-2 flex justify-between text-xs">
        <button type="button" tabindex="-1" class="text-emerald-700 hover:underline disabled:text-gray-300" :disabled="!hoyPermitido" data-hoy @mousedown.prevent @click="fijar(hoyIso())">Hoy</button>
        <button type="button" tabindex="-1" class="text-gray-500 hover:underline" @mousedown.prevent @click="cerrar()">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.campo-fecha-texto {
  padding-right: 2.25rem;
}
.campo-fecha-invalida {
  border-color: #f87171 !important;
}
</style>
