<script setup>
import { computed, ref, shallowRef, watch, onMounted } from 'vue';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
  CHIP_SIN_RIESGOS_CARDIOMETABOLICOS,
  CHIPS_RIESGOS_ACTUALES,
  RIESGOS_ACTUALES_CHARS_RECOMENDADOS_PARA_INFORME,
} from '@/helpers/cardiometabolico/riesgosActualesFacilidades';
import {
  generarParrafoRiesgosActuales,
  hayConflictoChipSinRiesgos,
} from '@/helpers/cardiometabolico/riesgosActualesParrafo';
import ModalConfirmarReemplazoRedaccionEsc from '@/components/ModalConfirmarReemplazoRedaccionEsc.vue';

const { formDataEventoSeguimientoCardiometabolico } = useFormDataStore();
const documentos = useDocumentosStore();

const textareaClass =
  'w-full min-h-[4.75rem] sm:min-h-[5.25rem] p-2 text-sm leading-snug border border-gray-300 rounded-md text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-colors duration-200';

const proximaRevisionSugerida = ref('');

/** @type {import('vue').ShallowRef<Set<string>>} */
const riesgosChipsOn = shallowRef(new Set());
const riesgosTextoLibre = ref('');

function chipsSeleccionadosEnOrden() {
  return CHIPS_RIESGOS_ACTUALES.filter((c) => riesgosChipsOn.value.has(c));
}

function construirTextoRiesgos() {
  const line = chipsSeleccionadosEnOrden().join('; ');
  const lib = riesgosTextoLibre.value.trim();
  if (line && lib) return `${line}\n\n${lib}`;
  if (line) return line;
  return lib;
}

function hydrateRiesgosDesdeCadena(raw) {
  riesgosTextoLibre.value = '';
  riesgosChipsOn.value = new Set();

  if (raw == null || raw === '') return;

  const str = String(raw);
  const parts = str.split(/\n\n+/);
  const head = parts[0] ?? '';
  const tail = parts.slice(1).join('\n\n').trim();

  const chipSet = new Set(CHIPS_RIESGOS_ACTUALES);
  const nextChips = new Set();
  const unknownTokens = [];

  for (const tok of head
    .split(';')
    .map((t) => t.trim())
    .filter(Boolean)) {
    if (chipSet.has(tok)) nextChips.add(tok);
    else unknownTokens.push(tok);
  }

  if (
    nextChips.has(CHIP_SIN_RIESGOS_CARDIOMETABOLICOS) &&
    [...nextChips].some((c) => c !== CHIP_SIN_RIESGOS_CARDIOMETABOLICOS)
  ) {
    nextChips.delete(CHIP_SIN_RIESGOS_CARDIOMETABOLICOS);
  }

  let libre = tail;
  if (unknownTokens.length) {
    const orphan = unknownTokens.join('; ');
    libre = libre ? `${orphan}\n\n${libre}` : orphan;
  }

  riesgosChipsOn.value = nextChips;
  riesgosTextoLibre.value = libre;
}

function toggleChipRiesgo(etiqueta) {
  const prev = riesgosChipsOn.value;
  const next = new Set(prev);
  const estaba = next.has(etiqueta);

  if (estaba) {
    next.delete(etiqueta);
    riesgosChipsOn.value = next;
    return;
  }

  if (etiqueta === CHIP_SIN_RIESGOS_CARDIOMETABOLICOS) {
    riesgosChipsOn.value = new Set([CHIP_SIN_RIESGOS_CARDIOMETABOLICOS]);
    return;
  }

  next.delete(CHIP_SIN_RIESGOS_CARDIOMETABOLICOS);
  next.add(etiqueta);
  riesgosChipsOn.value = next;
}

function solicitarRedaccionProfesional() {
  const texto = generarParrafoRiesgosActuales({
    formData: formDataEventoSeguimientoCardiometabolico,
    labelsSeleccionadas: chipsSeleccionadosEnOrden(),
  });
  if (texto == null) return;
  if (riesgosTextoLibre.value.trim() === '') {
    riesgosTextoLibre.value = texto;
    riesgosChipsOn.value = new Set();
    previewParrafoAbierto.value = false;
    return;
  }
  textoPreviewParrafo.value = texto;
  previewParrafoAbierto.value = true;
}

function cerrarPreviewParrafo() {
  previewParrafoAbierto.value = false;
}

function ejecutarReemplazoRedaccionFinalDesdePreview() {
  const propuesto = textoPreviewParrafo.value.trim();
  if (!propuesto) return;
  riesgosTextoLibre.value = propuesto;
  riesgosChipsOn.value = new Set();
  previewParrafoAbierto.value = false;
  modalConfirmarReemplazoAbierto.value = false;
}

function aplicarParrafoProfesionalDesdePreview() {
  const propuesto = textoPreviewParrafo.value.trim();
  if (!propuesto) return;
  const actual = riesgosTextoLibre.value.trim();
  if (actual !== '') {
    modalConfirmarReemplazoAbierto.value = true;
    return;
  }
  ejecutarReemplazoRedaccionFinalDesdePreview();
}

function cerrarModalConfirmarReemplazo() {
  modalConfirmarReemplazoAbierto.value = false;
}

function chipRiesgoActivoClase(etiqueta) {
  return riesgosChipsOn.value.has(etiqueta)
    ? 'border-2 border-emerald-600 bg-emerald-600 text-white'
    : 'border-2 border-gray-300 bg-white text-gray-800 hover:border-emerald-400';
}

const longitudRiesgos = computed(() => construirTextoRiesgos().length);
const muestraAvisoLargoInforme = computed(
  () => longitudRiesgos.value > RIESGOS_ACTUALES_CHARS_RECOMENDADOS_PARA_INFORME,
);

/** Solo quita chips activos (no borra la redacción libre del textarea). */
function limpiarSeleccionChips() {
  riesgosChipsOn.value = new Set();
}

const chipsFrasesAbierto = ref(true);
const previewParrafoAbierto = ref(false);
const textoPreviewParrafo = ref('');
const modalConfirmarReemplazoAbierto = ref(false);

const conflictoSinRiesgos = computed(() =>
  hayConflictoChipSinRiesgos(chipsSeleccionadosEnOrden()),
);

const puedeRedactarParrafoProfesional = computed(
  () =>
    chipsSeleccionadosEnOrden().length > 0 &&
    !conflictoSinRiesgos.value &&
    generarParrafoRiesgosActuales({
      formData: formDataEventoSeguimientoCardiometabolico,
      labelsSeleccionadas: chipsSeleccionadosEnOrden(),
    }) != null,
);

function pushAlFormulario() {
  const fd = formDataEventoSeguimientoCardiometabolico;
  fd.riesgosActuales = construirTextoRiesgos().trim() || undefined;
  fd.proximaRevisionSugerida = proximaRevisionSugerida.value || undefined;
}

function hydrateFrom(source) {
  if (!source) return;
  if (source.riesgosActuales != null) hydrateRiesgosDesdeCadena(source.riesgosActuales);
  if (source.proximaRevisionSugerida) {
    proximaRevisionSugerida.value = formatDateYYYYMMDD(source.proximaRevisionSugerida);
  }
}

onMounted(() => {
  hydrateFrom(formDataEventoSeguimientoCardiometabolico);
  hydrateFrom(documentos.currentDocument);
  pushAlFormulario();
});

watch([riesgosTextoLibre, riesgosChipsOn, proximaRevisionSugerida], () => pushAlFormulario(), {
  deep: true,
});
</script>

<template>
  <ModalConfirmarReemplazoRedaccionEsc
    v-if="modalConfirmarReemplazoAbierto"
    @close="cerrarModalConfirmarReemplazo"
    @confirm="ejecutarReemplazoRedaccionFinalDesdePreview"
  />
  <div class="max-w-6xl">
    <h1 class="text-xl font-bold sm:text-2xl text-gray-900 mb-1 leading-tight">
      Riesgos actuales y seguimiento
    </h1>
    <p
      id="ayuda-riesgos-esc"
      class="text-xs sm:text-sm text-gray-600 mb-3 max-w-3xl leading-snug"
    >
      Redacte una síntesis de los riesgos cardiometabólicos actuales detectados según esta evaluación.
    </p>
    <section class="rounded-lg border border-gray-200 bg-gray-50/70 overflow-hidden">
      <p
        v-if="conflictoSinRiesgos"
        class="border-b border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] sm:text-xs text-amber-950"
        role="status"
      >
        Quite «Sin riesgos cardiometabólicos relevantes…» u otras frases: no pueden combinarse.
      </p>
      <div
        class="flex flex-wrap items-stretch gap-2 border-b border-gray-200 bg-white/90 px-2 py-1.5"
      >
        <h2 class="contents">
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-0.5 py-0.5 text-left text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
            aria-controls="panel-chips-frases-riesgos-esc"
            :aria-expanded="chipsFrasesAbierto"
            @click="chipsFrasesAbierto = !chipsFrasesAbierto"
          >
            <span class="shrink-0 font-normal text-gray-600 select-none">
              {{ chipsFrasesAbierto ? '▾' : '▸' }}
            </span>
            <span>Síntesis de riesgos</span>
          </button>
        </h2>
        <button
          type="button"
          class="shrink-0 self-center rounded-md border border-emerald-600 bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300 disabled:text-gray-600"
          :disabled="!puedeRedactarParrafoProfesional"
          @click.stop="solicitarRedaccionProfesional"
        >
          Redactar párrafo profesional
        </button>
      </div>

      <div
        v-show="chipsFrasesAbierto"
        id="panel-chips-frases-riesgos-esc"
        role="region"
        aria-label="Frases habituales para la síntesis"
        class="border-b border-gray-200 px-2 py-1.5 sm:py-2"
      >
        <p class="text-[11px] sm:text-xs text-gray-600 leading-snug mb-1.5">
          Marca las frases que apliquen.
        </p>
        <div class="flex max-w-3xl flex-col gap-1 sm:gap-1.5">
          <button
            v-for="lbl in CHIPS_RIESGOS_ACTUALES"
            :key="lbl"
            type="button"
            class="w-full rounded-md px-2 py-1.5 text-left text-[11px] sm:text-xs leading-snug transition-colors duration-150"
            :class="chipRiesgoActivoClase(lbl)"
            @click="toggleChipRiesgo(lbl)"
          >
            {{ lbl }}
          </button>
        </div>
        <button
          type="button"
          class="shrink-0 self-center px-1 py-0.5 text-xs text-gray-500 hover:text-gray-800 underline-offset-2 hover:underline"
          aria-label="Quitar todas las frases habituales seleccionadas"
          @click.stop="limpiarSeleccionChips"
        >
          limpiar selección
        </button>
      </div>

      <div class="space-y-3 p-2 sm:p-3">
        <div v-if="previewParrafoAbierto" class="rounded-md border border-emerald-200 bg-emerald-50/90 p-2 sm:p-3">
          <p class="text-xs font-semibold text-emerald-950 mb-1">Vista previa del párrafo</p>
          <p class="text-sm text-gray-900 leading-snug whitespace-pre-wrap">{{ textoPreviewParrafo }}</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              @click="aplicarParrafoProfesionalDesdePreview"
            >
              Insertar en redacción final
            </button>
            <button
              type="button"
              class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-50"
              @click="cerrarPreviewParrafo"
            >
              Cancelar
            </button>
          </div>
        </div>

        <div>
          <div class="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <label class="mb-0 block text-sm font-semibold text-gray-800" for="riesgos-actuales-esc">
              Redacción final
            </label>
            <span class="tabular-nums text-xs text-gray-500" aria-live="polite">
              {{ longitudRiesgos }}
              caracteres
              <span v-if="muestraAvisoLargoInforme" class="font-medium text-amber-700">
                — texto largo: conviene sintetizar para el informe PDF (~{{
                  RIESGOS_ACTUALES_CHARS_RECOMENDADOS_PARA_INFORME
                }}
                caracteres orientativos).
              </span>
            </span>
          </div>
          <textarea
            id="riesgos-actuales-esc"
            v-model="riesgosTextoLibre"
            :class="textareaClass"
            aria-describedby="ayuda-riesgos-esc"
            placeholder="Redacta observaciones adicionales o matiza las frases seleccionadas..."
          />
        </div>

        <div>
          <h3 class="mb-1.5 text-sm font-semibold text-gray-800">Próxima revisión sugerida</h3>
          <FormKit
            type="date"
            name="proximaRevisionSugerida"
            placeholder="Opcional"
            outer-class="$reset"
            v-model="proximaRevisionSugerida"
          />
        </div>
      </div>
    </section>
  </div>
</template>


