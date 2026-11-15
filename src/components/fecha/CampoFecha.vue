<script setup>
/**
 * Campo de fecha siempre en DD/MM/AAAA, sin depender del idioma del navegador (punto 31).
 * Al teclear se comporta como el campo de fecha del navegador (helpers/segmentosFecha.ts):
 * plantilla fija «dd/mm/aaaa», cada número reemplaza la letra de su lugar, las diagonales no
 * se mueven, se trabaja por partes (día, mes, año: clic, ← →, Tab, «/»), borrar regresa la
 * parte a sus letras y ↑/↓ suben o bajan la parte.
 * - El dato (v-model) sigue siendo AAAA-MM-DD; solo se entrega completo y existente. Si se sale
 *   del campo con la fecha a medias, se entrega vacía y queda marcada.
 * - Fuera de min/max se entrega igual que antes y se marca; el calendario no deja elegirla.
 * - Calendario en español con el botón (no recibe Tab) o Alt + ↓.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { MESES, dentroDeRango, diasDelMes, esFechaIsoValida, hoyIso } from '@/helpers/fechaDDMMAAAA';
import {
  RANGO_TEXTO,
  borrar,
  borrarTodo,
  cambiarConFlecha,
  escribirDigito,
  estaVacia,
  estadoDesdeIso,
  estadoDesdeTextoPegado,
  irA,
  isoDe,
  segmentoEnPosicion,
  separador,
  textoDe,
} from '@/helpers/segmentosFecha';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  /** AAAA-MM-DD (algunos formularios declaran Date; como el campo del navegador, solo se muestra el texto ISO). */
  modelValue: { type: [String, Date], default: '' },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  id: { type: String, default: undefined },
  name: { type: String, default: undefined },
  /** No se usa: la plantilla «dd/mm/aaaa» siempre está a la vista (como el campo del navegador). */
  placeholder: { type: String, default: '' },
  /** Clases del cuadro de texto (las que tenía el campo de fecha que reemplaza). */
  inputClass: { type: [String, Array, Object], default: '' },
});
const emit = defineEmits(['update:modelValue', 'change', 'blur', 'focus']);

const DIAS_SEMANA = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D'];

const campo = ref(null);
const raiz = ref(null);
const abierto = ref(false);
/** Ya se salió del campo: desde entonces una fecha a medias se marca. */
const salio = ref(false);

const isoDelModelo = (valor) => {
  const corto = String(valor ?? '').slice(0, 10);
  return esFechaIsoValida(corto) ? corto : '';
};

const estado = ref(estadoDesdeIso(isoDelModelo(props.modelValue)));
const texto = computed(() => textoDe(estado.value));
const isoActual = computed(() => isoDe(estado.value));
const vacia = computed(() => estaVacia(estado.value));
const incompleta = computed(() => !vacia.value && !isoActual.value);
const fueraDeRango = computed(
  () => !!isoActual.value && !dentroDeRango(isoActual.value, props.min, props.max),
);
const marcada = computed(() => fueraDeRango.value || (incompleta.value && salio.value));

// Lo que llega desde fuera (código, otro formulario) se refleja; lo tecleado a medias no se pisa
watch(
  () => props.modelValue,
  (valor) => {
    const iso = isoDelModelo(valor);
    if (iso === isoActual.value) return;
    if (!iso && incompleta.value) return;
    estado.value = { ...estadoDesdeIso(iso), segmento: estado.value.segmento };
  },
);

const entregar = (iso) => {
  if (iso === isoDelModelo(props.modelValue)) return;
  emit('update:modelValue', iso);
  emit('change', iso);
};

/** Selecciona en el texto la parte actual (día, mes o año), como el campo del navegador. */
const seleccionarParte = () => {
  nextTick(() => {
    const el = campo.value;
    if (!el || document.activeElement !== el) return;
    const [ini, fin] = RANGO_TEXTO[estado.value.segmento];
    try {
      el.setSelectionRange(ini, fin);
    } catch {
      // Algunos navegadores no permiten seleccionar en este momento
    }
  });
};

const aplicar = (nuevo) => {
  estado.value = nuevo;
  if (isoActual.value) entregar(isoActual.value);
  seleccionarParte();
};

const DIGITO = /\d/;
const SEPARADOR = /[/.\-\s]/;

/** Todo lo que se escribe o borra pasa por aquí (teclado físico, de celular y pegar). */
const alAntesDeEscribir = (e) => {
  e.preventDefault();
  if (props.readonly || props.disabled) return;
  const el = campo.value;
  const todoSeleccionado =
    !!el && el.selectionStart === 0 && el.selectionEnd === el.value.length && !vacia.value;
  switch (e.inputType) {
    case 'insertText':
    case 'insertCompositionText': {
      let nuevo = todoSeleccionado ? borrarTodo() : estado.value;
      for (const c of String(e.data ?? '')) {
        if (DIGITO.test(c)) nuevo = escribirDigito(nuevo, Number(c));
        else if (SEPARADOR.test(c)) nuevo = separador(nuevo);
      }
      aplicar(nuevo);
      break;
    }
    case 'insertFromPaste':
    case 'insertFromDrop':
    case 'insertReplacementText': {
      const pegado = estadoDesdeTextoPegado(String(e.data ?? e.dataTransfer?.getData('text') ?? ''));
      if (pegado) aplicar(pegado);
      break;
    }
    case 'deleteContentBackward':
    case 'deleteContentForward':
    case 'deleteWordBackward':
    case 'deleteWordForward':
    case 'deleteByCut':
      // Todo seleccionado (Ctrl + A): se vacía; si no, la parte actual vuelve a sus letras
      if (todoSeleccionado) aplicar(borrarTodo());
      else aplicar(borrar(estado.value, e.inputType !== 'deleteContentForward'));
      break;
    default:
      break;
  }
};

/**
 * Un valor puesto directamente en el cuadro (autollenado del navegador, herramientas o
 * pruebas): si es una fecha (AAAA-MM-DD o DD/MM/AAAA) se toma; si no, se regresa la plantilla.
 * Al teclear esto no ocurre: todo pasa antes por alAntesDeEscribir.
 */
const alCambiarDirecto = (e) => {
  const el = e.target;
  if (el.value === texto.value) return;
  const directo = estadoDesdeTextoPegado(el.value);
  if (directo) aplicar(directo);
  else el.value = texto.value;
};

// Pegar en navegadores que no avisan el pegado antes de escribir
const alPegar = (e) => {
  e.preventDefault();
  const pegado = estadoDesdeTextoPegado(e.clipboardData?.getData('text') ?? '');
  if (pegado) aplicar(pegado);
};

/** Clic: se trabaja la parte donde se hizo clic. */
const alSoltarClic = () => {
  const el = campo.value;
  if (!el) return;
  estado.value = irA(estado.value, segmentoEnPosicion(el.selectionStart ?? 0));
  seleccionarParte();
};

const alEnfocar = (e) => {
  seleccionarParte();
  emit('focus', e);
};

const alSalir = (e) => {
  salio.value = true;
  estado.value = irA(estado.value, 0);
  // Vacío o a medias al salir: se entrega vacío (lo escrito se queda a la vista, marcado)
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
const isoDelDia = (dia) => `${anioVista.value}-${p2(mesVista.value)}-${p2(dia)}`;
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
  estado.value = estadoDesdeIso(iso);
  entregar(iso);
  cerrar();
};
const hoyPermitido = computed(() => dentroDeRango(hoyIso(), props.min, props.max));

const alTeclear = (e) => {
  if (e.altKey && e.key === 'ArrowDown') {
    e.preventDefault();
    abrir();
    return;
  }
  if (e.key === 'Escape' && abierto.value) {
    e.preventDefault();
    e.stopPropagation();
    cerrar();
    return;
  }
  // Alt + ← / → son de cambiar de paso; Ctrl o Cmd, del navegador
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const s = estado.value.segmento;
  const ir = (destino) => {
    e.preventDefault();
    estado.value = irA(estado.value, destino);
    seleccionarParte();
  };
  if (e.key === 'ArrowLeft') ir(s - 1);
  else if (e.key === 'ArrowRight') ir(s + 1);
  // Tab recorre día, mes y año antes de pasar al siguiente campo (como el del navegador)
  else if (e.key === 'Tab' && !e.shiftKey && s < 2) ir(s + 1);
  else if (e.key === 'Tab' && e.shiftKey && s > 0) ir(s - 1);
  else if (e.key === 'Home') ir(0);
  else if (e.key === 'End') ir(2);
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    if (props.readonly || props.disabled) return;
    aplicar(cambiarConFlecha(estado.value, e.key === 'ArrowUp' ? 1 : -1));
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
      spellcheck="false"
      :value="texto"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :aria-invalid="marcada ? 'true' : undefined"
      :data-fecha-incompleta="incompleta ? 'true' : undefined"
      :data-fecha-iso="isoActual"
      data-fecha
      v-bind="$attrs"
      :class="[inputClass, 'campo-fecha-texto', marcada && 'campo-fecha-invalida']"
      @beforeinput="alAntesDeEscribir"
      @input="alCambiarDirecto"
      @paste="alPegar"
      @mouseup="alSoltarClic"
      @blur="alSalir"
      @focus="alEnfocar"
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
            :disabled="!dentroDeRango(isoDelDia(dia), min, max)"
            :data-dia="dia"
            :class="[
              'rounded py-1 disabled:cursor-not-allowed disabled:text-gray-300',
              isoDelDia(dia) === isoActual ? 'bg-emerald-600 text-white' : 'text-gray-700 hover:bg-emerald-50',
              isoDelDia(dia) === hoy && isoDelDia(dia) !== isoActual ? 'font-semibold text-emerald-700' : '',
            ]"
            @mousedown.prevent
            @click="fijar(isoDelDia(dia))"
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
.campo-fecha {
  /* Como el campo de fecha que reemplaza: en línea, salvo que ocupe todo el ancho */
  display: inline-block;
  max-width: 100%;
  vertical-align: middle;
}
.campo-fecha:has(> input.w-full) {
  display: block;
  width: 100%;
}
.campo-fecha-texto {
  padding-right: 2.25rem;
  font-variant-numeric: tabular-nums;
}
.campo-fecha-invalida {
  border-color: #f87171 !important;
}
</style>
