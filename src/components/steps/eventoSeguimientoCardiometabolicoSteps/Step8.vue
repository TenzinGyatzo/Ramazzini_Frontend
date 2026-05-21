<script setup>
import { computed, onMounted, watch } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { ESTADO_CONTROL_CONDICION_OPTS } from '@/helpers/eventoSeguimientoCardiometabolicoOptions';
import {
  evaluarCoherenciaEsc,
  sincronizarEstadoControlAutomatico,
  ESTADOS_CONTROL_SELECCION_MANUAL,
  textoEstadoSugeridoCondicionEscVista,
  claseCssChipEstadoCalculadoEsc,
  marcarDiagnosticoActivoEsc,
  tieneAdvertenciaMarcarDiagnostico,
  labelDiagnosticoParaCondicion,
} from '@/helpers/cardiometabolico/coherenciaClinicaEsc';

/** HTA, DM2 y dislipidemia. Obesidad/grado IMC se determinan en el paso de somatometría. */
const FILAS_CONDICION_CON_BOTONES = [
  { key: 'hipertensionArterial', label: 'Hipertensión arterial' },
  { key: 'diabetesMellitusTipo2', label: 'Diabetes mellitus tipo 2' },
  { key: 'dislipidemia', label: 'Dislipidemia' },
];

const OPCIONES_SELECCION_MANUAL = ESTADO_CONTROL_CONDICION_OPTS.filter((opt) =>
  ESTADOS_CONTROL_SELECCION_MANUAL.includes(opt.value),
);

const { formDataEventoSeguimientoCardiometabolico } = useFormDataStore();
const documentos = useDocumentosStore();
const trabajadores = useTrabajadoresStore();

const ctxCoherencia = computed(() => {
  const sexo = trabajadores.currentTrabajador?.sexo;
  if (sexo === 'Femenino') return { sexoPaciente: 'Femenino' };
  if (sexo === 'Masculino') return { sexoPaciente: 'Masculino' };
  return {};
});

const coherencia = computed(() =>
  evaluarCoherenciaEsc(formDataEventoSeguimientoCardiometabolico, ctxCoherencia.value),
);

function resultadoFila(key) {
  return coherencia.value[key];
}

function seleccionActual(key) {
  const ec = formDataEventoSeguimientoCardiometabolico.estadoCondiciones;
  return ec?.[key]?.control ?? null;
}

function aplicar(key, valor) {
  const r = resultadoFila(key);
  if (!r.controlSeleccionableManualmente) return;
  if (!ESTADOS_CONTROL_SELECCION_MANUAL.includes(valor)) return;

  const fd = formDataEventoSeguimientoCardiometabolico;
  if (!fd.estadoCondiciones) fd.estadoCondiciones = {};

  if (!fd.estadoCondiciones[key]) fd.estadoCondiciones[key] = {};
  const o = fd.estadoCondiciones[key];
  if (o.control === valor) delete o.control;
  else o.control = valor;
  if (!o.control) delete fd.estadoCondiciones[key];

  if (Object.keys(fd.estadoCondiciones).length === 0) delete fd.estadoCondiciones;
}

function marcarDiagnostico(filaKey) {
  marcarDiagnosticoActivoEsc(
    formDataEventoSeguimientoCardiometabolico,
    filaKey,
    ctxCoherencia.value,
  );
}

function puedeMarcarDiagnostico(filaKey) {
  const r = resultadoFila(filaKey);
  return (
    !r.diagnosticoActivo &&
    (tieneAdvertenciaMarcarDiagnostico(r) || r.estadoCalculado === 'ALTERACION_DOCUMENTADA')
  );
}

const CODIGOS_ADV_DUPLICADOS_BOTON_MARCAR = [
  'DM2_GLUCOSA_DOCUMENTADA',
  'DM2_HBA1C_DOCUMENTADA',
  'DM2_AMBOS_CRITERIOS',
];

function textoPasoInferior(filaKey) {
  const r = resultadoFila(filaKey);
  if (
    r.diagnosticoActivo &&
    r.estadoCalculado === 'NO_VALORABLE'
  ) {
    return 'Existe diagnóstico activo, pero no hay datos suficientes en esta visita para valorar control.';
  }
  return '';
}

function advertenciasVisibles(advertencias, filaKey) {
  const mostrarBotonMarcar = puedeMarcarDiagnostico(filaKey);
  return advertencias.filter((adv) => {
    if (adv.codigo === 'VALORACION_ORIENTATIVA' || adv.codigo === 'META_LIPIDICA_CV') return false;
    if (!mostrarBotonMarcar) return true;
    if (adv.accionSugerida === 'MARCAR_DIAGNOSTICO_ACTIVO') return false;
    if (CODIGOS_ADV_DUPLICADOS_BOTON_MARCAR.includes(adv.codigo)) return false;
    return true;
  });
}

function hidratar() {
  const src = documentos.currentDocument || {};
  const ec = src.estadoCondiciones;
  const fd = formDataEventoSeguimientoCardiometabolico;

  if (ec && typeof ec === 'object') {
    if (!fd.estadoCondiciones) fd.estadoCondiciones = {};
    for (const k of ['hipertensionArterial', 'diabetesMellitusTipo2', 'dislipidemia']) {
      const yaEnFd =
        fd.estadoCondiciones[k]?.control != null && fd.estadoCondiciones[k].control !== '';
      if (!yaEnFd && ec[k]?.control) fd.estadoCondiciones[k] = { control: ec[k].control };
    }
    const gradoFd = fd.estadoCondiciones.obesidad?.grado;
    const yaGrado = gradoFd != null && String(gradoFd).trim() !== '';
    if (!yaGrado && ec.obesidad?.grado) {
      if (!fd.estadoCondiciones.obesidad) fd.estadoCondiciones.obesidad = {};
      fd.estadoCondiciones.obesidad.grado = ec.obesidad.grado;
    }
  }

  const ob = fd.estadoCondiciones?.obesidad;
  if (ob) {
    delete ob.control;
    if (Object.keys(ob).length === 0 && fd.estadoCondiciones) {
      delete fd.estadoCondiciones.obesidad;
    }
  }

  sincronizarEstadoControlAutomatico(fd, ctxCoherencia.value);
}

function claseBannerAdvertencia(adv) {
  if (adv.accionSugerida === 'MARCAR_DIAGNOSTICO_ACTIVO') {
    return 'bg-amber-100 border-amber-400 text-amber-950';
  }
  if (adv.severidad === 'error') return 'bg-red-50 border-red-300 text-red-900';
  if (adv.severidad === 'warning') return 'bg-amber-50 border-amber-300 text-amber-900';
  return 'bg-sky-50 border-sky-200 text-sky-900';
}

onMounted(() => {
  hidratar();
});

watch(
  () => formDataEventoSeguimientoCardiometabolico,
  () => {
    sincronizarEstadoControlAutomatico(
      formDataEventoSeguimientoCardiometabolico,
      ctxCoherencia.value,
    );
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Estado por condición</h1>
    <p class="text-sm text-gray-600 mb-1">En esta visita</p>
    <div class="space-y-8">
      <div
        v-for="fila in FILAS_CONDICION_CON_BOTONES"
        :key="fila.key"
        class="rounded-lg border border-gray-200 bg-gray-50/60 p-3 sm:p-4 space-y-3"
      >
        <div>
          <h2 class="text-sm font-semibold text-gray-800">{{ fila.label }}</h2>
          <p
            v-if="resultadoFila(fila.key).detalleObjetivo"
            class="text-xs text-gray-600 mt-0.5 whitespace-pre-line leading-relaxed"
          >
            {{ resultadoFila(fila.key).detalleObjetivo }}
          </p>
        </div>

        <p class="text-xs text-gray-600 leading-relaxed">
          {{ resultadoFila(fila.key).razon }}
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-medium text-gray-600">
            {{
              resultadoFila(fila.key).controlSeleccionableManualmente
                ? 'Estado sugerido:'
                : 'Estado:'
            }}
          </span>
          <span
            class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
            :class="claseCssChipEstadoCalculadoEsc(resultadoFila(fila.key).estadoCalculado)"
          >
            {{
              textoEstadoSugeridoCondicionEscVista(
                formDataEventoSeguimientoCardiometabolico,
                fila.key,
                ctxCoherencia,
              )
            }}
          </span>
        </div>

        <template v-if="resultadoFila(fila.key).controlSeleccionableManualmente">
          <p class="text-xs font-medium text-gray-700">
            Selecciona el estado de la condición:
          </p>
          <div
            class="flex w-full items-stretch gap-2"
            role="group"
            :aria-label="`Estado: ${fila.label}`"
          >
            <button
              v-for="opt in OPCIONES_SELECCION_MANUAL"
              :key="`${fila.key}-${opt.value}`"
              type="button"
              class="flex-1 min-h-9 rounded-md border px-2 py-1.5 text-xs font-medium leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              :class="
                seleccionActual(fila.key) === opt.value
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
              "
              :aria-pressed="seleccionActual(fila.key) === opt.value"
              @click="aplicar(fila.key, opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </template>

        <p
          v-if="textoPasoInferior(fila.key)"
          class="text-xs text-gray-600 leading-relaxed border-t border-gray-200/80 pt-2"
        >
          {{ textoPasoInferior(fila.key) }}
        </p>

        <button
          v-if="puedeMarcarDiagnostico(fila.key)"
          type="button"
          class="w-full min-h-10 rounded-md border border-amber-400 bg-amber-50 px-3 py-2.5 text-sm font-medium leading-snug text-amber-950 hover:bg-amber-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          @click="marcarDiagnostico(fila.key)"
        >
          Marcar {{ labelDiagnosticoParaCondicion(fila.key) }} como diagnóstico activo
        </button>

        <div
          v-for="(adv, ai) in advertenciasVisibles(resultadoFila(fila.key).advertencias, fila.key)"
          :key="`${fila.key}-adv-${ai}`"
          class="text-xs rounded-md border px-2 py-2 leading-relaxed"
          :class="claseBannerAdvertencia(adv)"
          role="status"
        >
          {{ adv.mensaje }}
        </div>
      </div>
    </div>
  </div>
</template>
