<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useFormDataStore } from '@/stores/formDataStore';
import ModalConfirmarReemplazoRedaccionEsc from '@/components/ModalConfirmarReemplazoRedaccionEsc.vue';
import {
  MAX_CHARS_CONCLUSIONES_ILA,
  OPCIONES_CONFIRMACION_HALLAZGOS_ILA,
  OPCIONES_DISTRIBUCION_HALLAZGOS_ILA,
  OPCIONES_EVOLUCION_SEGUIMIENTO_ILA,
  OPCIONES_RELACION_LABORAL_ILA,
  VERSION_CONSTRUCTOR_CONCLUSIONES_ILA,
  advertenciasDecisionesConclusionIla,
  claveDecisionesConclusionIla,
} from '@/helpers/ilaConclusionDecisiones';
import {
  aplicarBorradorConclusionSiNoEditada,
  construirBorradorConclusionIla,
  mostrarRestaurarBorradorConclusionIla,
} from '@/helpers/ilaConclusionBorrador';

const store = useFormDataStore();
const { formDataInformeLongitudinalAudiometrico: fm } = storeToRefs(store);

const mostrarModalRestaurar = ref(false);

if (!fm.value.decisionesConclusionIla) {
  fm.value.decisionesConclusionIla = {};
}

const decisiones = computed(() => fm.value.decisionesConclusionIla || {});
const scrollRoot = ref(null);
const seccionConclusiones = ref(null);

function decisionesCompletas(d) {
  return Boolean(
    String(d?.evolucion || '').trim() &&
      String(d?.distribucionHallazgos || '').trim() &&
      String(d?.relacionLaboral || '').trim() &&
      String(d?.confirmacion || '').trim(),
  );
}

function scrollAConclusiones() {
  const container = scrollRoot.value;
  const target = seccionConclusiones.value;
  if (!container || !target) return;
  const offset = target.getBoundingClientRect().top - container.getBoundingClientRect().top;
  container.scrollTo({
    top: container.scrollTop + offset,
    behavior: 'smooth',
  });
}

function toggleDecision(campo, valor) {
  if (!fm.value.decisionesConclusionIla) fm.value.decisionesConclusionIla = {};
  const estabaCompleto = decisionesCompletas(fm.value.decisionesConclusionIla);
  const actual = fm.value.decisionesConclusionIla[campo];
  if (actual === valor) {
    delete fm.value.decisionesConclusionIla[campo];
    return;
  }
  fm.value.decisionesConclusionIla[campo] = valor;
  if (!estabaCompleto && decisionesCompletas(fm.value.decisionesConclusionIla)) {
    nextTick(() => scrollAConclusiones());
  }
}

const advertencias = computed(() => advertenciasDecisionesConclusionIla(decisiones.value));

const caracteres = computed(() => String(fm.value.conclusionesSeguimientoAudiometrico || '').length);
const topeAlcanzado = computed(() => caracteres.value >= MAX_CHARS_CONCLUSIONES_ILA);

const claveDecisiones = computed(() => claveDecisionesConclusionIla(decisiones.value));

const borradorVigente = computed(() => construirBorradorConclusionIla(decisiones.value));

const mostrarRestaurarBorrador = computed(() =>
  mostrarRestaurarBorradorConclusionIla(
    fm.value.conclusionesSeguimientoAudiometrico,
    borradorVigente.value,
  ),
);

watch(
  claveDecisiones,
  () => {
    const nuevo = construirBorradorConclusionIla(decisiones.value);
    const anterior = fm.value.borradorConclusionesSeguimientoAudiometrico;
    const actual = fm.value.conclusionesSeguimientoAudiometrico;
    fm.value.conclusionesSeguimientoAudiometrico = aplicarBorradorConclusionSiNoEditada(
      actual,
      anterior,
      nuevo,
    );
    fm.value.borradorConclusionesSeguimientoAudiometrico = nuevo;
    if (nuevo) {
      fm.value.versionConstructorConclusionesIla = VERSION_CONSTRUCTOR_CONCLUSIONES_ILA;
    }
  },
);

function restaurarBorrador() {
  const vigente = construirBorradorConclusionIla(decisiones.value);
  if (!vigente) return;
  const actual = String(fm.value.conclusionesSeguimientoAudiometrico || '').trim();
  if (actual) {
    mostrarModalRestaurar.value = true;
    return;
  }
  aplicarRestaurar();
}

function aplicarRestaurar() {
  const vigente = construirBorradorConclusionIla(decisiones.value);
  fm.value.conclusionesSeguimientoAudiometrico = vigente;
  fm.value.borradorConclusionesSeguimientoAudiometrico = vigente;
  if (vigente) {
    fm.value.versionConstructorConclusionesIla = VERSION_CONSTRUCTOR_CONCLUSIONES_ILA;
  }
  mostrarModalRestaurar.value = false;
}

const grupos = [
  { campo: 'evolucion', label: 'Evolución del seguimiento', opciones: OPCIONES_EVOLUCION_SEGUIMIENTO_ILA },
  { campo: 'distribucionHallazgos', label: 'Distribución de los hallazgos', opciones: OPCIONES_DISTRIBUCION_HALLAZGOS_ILA },
  { campo: 'relacionLaboral', label: 'Relación con el trabajo', opciones: OPCIONES_RELACION_LABORAL_ILA },
  { campo: 'confirmacion', label: 'Confirmación de los hallazgos', opciones: OPCIONES_CONFIRMACION_HALLAZGOS_ILA },
];
</script>

<template>
  <div class="ila-section-step flex flex-col min-h-0 w-full">
    <h1 class="text-2xl font-bold mb-0.5 text-gray-900 shrink-0">Conclusiones</h1>
    <p class="text-sm text-gray-600 mb-3 shrink-0">
      Síntesis clínica según su criterio.
    </p>

    <div
      ref="scrollRoot"
      class="ila-section-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden max-h-[min(50vh,440px)] sm:max-h-[min(52vh,470px)] xl:max-h-[min(56vh,500px)] pr-0.5 space-y-3 border border-gray-100 rounded-lg bg-gray-50/40 p-2 sm:p-3"
    >
      <div
        v-for="grupo in grupos"
        :key="grupo.campo"
      >
        <p class="text-sm font-semibold text-gray-800 mb-1.5">{{ grupo.label }}</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="opcion in grupo.opciones"
            :key="opcion"
            type="button"
            class="px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors"
            :class="decisiones[grupo.campo] === opcion
              ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
              : 'border-gray-300 bg-white text-gray-600 hover:border-emerald-400'"
            @click="toggleDecision(grupo.campo, opcion)"
          >
            {{ opcion }}
          </button>
        </div>
      </div>

      <div
        v-if="advertencias.length"
        class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1"
      >
        <p v-for="(adv, i) in advertencias" :key="i">{{ adv }}</p>
      </div>

      <div ref="seccionConclusiones">
        <FormKit
          type="textarea"
          name="conclusionesSeguimientoAudiometrico"
          label="Conclusiones"
          rows="7"
          input-class="min-h-[9rem]"
          :maxlength="MAX_CHARS_CONCLUSIONES_ILA"
          v-model="fm.conclusionesSeguimientoAudiometrico"
        />
        <div class="mt-1 flex flex-col gap-1">
          <div class="flex items-center justify-between gap-2">
            <button
              v-if="mostrarRestaurarBorrador"
              type="button"
              class="text-xs text-gray-500 underline decoration-gray-300 hover:text-gray-700 hover:decoration-gray-500"
              @click="restaurarBorrador"
            >
              Restaurar borrador sugerido
            </button>
            <span v-else />
            <span
              class="ml-auto text-xs tabular-nums"
              :class="topeAlcanzado ? 'text-red-600' : 'text-gray-500'"
            >
              {{ caracteres }} / {{ MAX_CHARS_CONCLUSIONES_ILA }}
            </span>
          </div>
          <p class="text-xs text-gray-400">
            Se sugiere una conclusión breve, en torno a 800 caracteres.
          </p>
        </div>
      </div>
    </div>

    <ModalConfirmarReemplazoRedaccionEsc
      v-if="mostrarModalRestaurar"
      @close="mostrarModalRestaurar = false"
      @confirm="aplicarRestaurar"
    />
  </div>
</template>

<style scoped>
.ila-section-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(148 163 184 / 0.65) transparent;
}
.ila-section-scroll::-webkit-scrollbar {
  width: 3px;
}
.ila-section-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.ila-section-scroll::-webkit-scrollbar-thumb {
  background-color: rgb(148 163 184 / 0.65);
  border-radius: 9999px;
}
</style>
