<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import AgudezaOjos from './AgudezaOjos.vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

// En la sección (variant compact) el título lo pone la sección; solo en el asistente anterior
const { variant } = defineProps({ variant: { type: String, default: '' } });

// Punto 43: el paso no escribe al abrirse ni al cerrarse (en la captura rápida está abierto
// desde el principio); lo preseleccionado lo escribe examenVistaGuardado al revisar la sección.
const INTERPRETACION_LENTES_CONTACTO = 'No evaluable (lentes de contacto)';

const formDataStore = useFormDataStore();
const formDataExamenVista = formDataStore.formDataExamenVista;
const documentos = useDocumentosStore();

const ojoIzquierdoCegueraTotal = ref(formDataStore.formDataExamenVista.ojoIzquierdoCegueraTotal ?? false);
const ojoDerechoCegueraTotal = ref(formDataStore.formDataExamenVista.ojoDerechoCegueraTotal ?? false);
const sinCorreccionNoEvaluablePorLentesContacto = ref(false);
const ojoIzquierdoLejanaSinCorreccion = ref(20);
const ojoDerechoLejanaSinCorreccion = ref(20);
const sinCorreccionLejanaInterpretacion = ref('Visión normal');
const requiereLentesUsoGeneral = ref('No');

function getCiegaOI(doc) {
  return doc?.ojoIzquierdoCegueraTotal ?? doc?.ojoIzquierdoLejanaCegueraTotal ?? doc?.ojoIzquierdoCercanaCegueraTotal ?? false;
}
function getCiegaOD(doc) {
  return doc?.ojoDerechoCegueraTotal ?? doc?.ojoDerechoLejanaCegueraTotal ?? doc?.ojoDerechoCercanaCegueraTotal ?? false;
}

function aplicarNoEvaluableLentesContacto() {
  if (!ojoIzquierdoCegueraTotal.value) {
    ojoIzquierdoLejanaSinCorreccion.value = null;
    formDataExamenVista.ojoIzquierdoLejanaSinCorreccion = null;
  }
  if (!ojoDerechoCegueraTotal.value) {
    ojoDerechoLejanaSinCorreccion.value = null;
    formDataExamenVista.ojoDerechoLejanaSinCorreccion = null;
  }
  // Sincronizar también cercana: clínicamente no se puede medir sin corrección
  if (!ojoIzquierdoCegueraTotal.value) {
    formDataExamenVista.ojoIzquierdoCercanaSinCorreccion = null;
  }
  if (!ojoDerechoCegueraTotal.value) {
    formDataExamenVista.ojoDerechoCercanaSinCorreccion = null;
  }
  formDataExamenVista.sinCorreccionCercanaInterpretacion = INTERPRETACION_LENTES_CONTACTO;
  formDataExamenVista.requiereLentesParaLectura = 'No';
}

onMounted(() => {
  if (documentos.currentDocument) {
    const doc = documentos.currentDocument;
    ojoIzquierdoCegueraTotal.value = getCiegaOI(doc);
    ojoDerechoCegueraTotal.value = getCiegaOD(doc);
    sinCorreccionNoEvaluablePorLentesContacto.value = doc.sinCorreccionNoEvaluablePorLentesContacto ?? false;
    ojoIzquierdoLejanaSinCorreccion.value = (ojoIzquierdoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value)
      ? null
      : (doc.ojoIzquierdoLejanaSinCorreccion ?? 20);
    ojoDerechoLejanaSinCorreccion.value = (ojoDerechoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value)
      ? null
      : (doc.ojoDerechoLejanaSinCorreccion ?? 20);
    sinCorreccionLejanaInterpretacion.value = doc.sinCorreccionLejanaInterpretacion ?? 'Visión normal';
    requiereLentesUsoGeneral.value = doc.requiereLentesUsoGeneral ?? 'No';
  } else {
    ojoIzquierdoCegueraTotal.value = formDataExamenVista.ojoIzquierdoCegueraTotal ?? false;
    ojoDerechoCegueraTotal.value = formDataExamenVista.ojoDerechoCegueraTotal ?? false;
    sinCorreccionNoEvaluablePorLentesContacto.value = formDataExamenVista.sinCorreccionNoEvaluablePorLentesContacto ?? false;
    ojoIzquierdoLejanaSinCorreccion.value = (ojoIzquierdoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value)
      ? null
      : (formDataExamenVista.ojoIzquierdoLejanaSinCorreccion ?? 20);
    ojoDerechoLejanaSinCorreccion.value = (ojoDerechoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value)
      ? null
      : (formDataExamenVista.ojoDerechoLejanaSinCorreccion ?? 20);
    sinCorreccionLejanaInterpretacion.value = formDataExamenVista.sinCorreccionLejanaInterpretacion ?? 'Visión normal';
    requiereLentesUsoGeneral.value = formDataExamenVista.requiereLentesUsoGeneral ?? 'No';
  }
  // Solo lo que se muestra (sin escribir en el formulario)
  interpretarAgudezaVisualLejana(false);
});

watch([ojoIzquierdoCegueraTotal, ojoDerechoCegueraTotal], () => {
  formDataStore.setExamenVistaCeguera(ojoIzquierdoCegueraTotal.value, ojoDerechoCegueraTotal.value);
  if (ojoIzquierdoCegueraTotal.value) {
    ojoIzquierdoLejanaSinCorreccion.value = null;
    formDataExamenVista.ojoIzquierdoLejanaSinCorreccion = null;
  }
  if (ojoDerechoCegueraTotal.value) {
    ojoDerechoLejanaSinCorreccion.value = null;
    formDataExamenVista.ojoDerechoLejanaSinCorreccion = null;
  }
  interpretarAgudezaVisualLejana();
});

watch(sinCorreccionNoEvaluablePorLentesContacto, (noEvaluable) => {
  formDataExamenVista.sinCorreccionNoEvaluablePorLentesContacto = noEvaluable;
  if (noEvaluable) {
    // Excluyente con ceguera total
    ojoIzquierdoCegueraTotal.value = false;
    ojoDerechoCegueraTotal.value = false;
    formDataStore.setExamenVistaCeguera(false, false);
    aplicarNoEvaluableLentesContacto();
  } else {
    ojoIzquierdoLejanaSinCorreccion.value = 20;
    ojoDerechoLejanaSinCorreccion.value = 20;
    formDataExamenVista.ojoIzquierdoLejanaSinCorreccion = 20;
    formDataExamenVista.ojoDerechoLejanaSinCorreccion = 20;
    // Restaurar cercana a default para forzar recaptura coherente
    formDataExamenVista.ojoIzquierdoCercanaSinCorreccion = 20;
    formDataExamenVista.ojoDerechoCercanaSinCorreccion = 20;
    formDataExamenVista.sinCorreccionCercanaInterpretacion = 'Visión normal';
    formDataExamenVista.requiereLentesParaLectura = 'No';
  }
  interpretarAgudezaVisualLejana();
});

watch([ojoIzquierdoLejanaSinCorreccion, ojoDerechoLejanaSinCorreccion], () => {
  if (!ojoIzquierdoCegueraTotal.value && !sinCorreccionNoEvaluablePorLentesContacto.value) {
    formDataExamenVista.ojoIzquierdoLejanaSinCorreccion = ojoIzquierdoLejanaSinCorreccion.value;
  }
  if (!ojoDerechoCegueraTotal.value && !sinCorreccionNoEvaluablePorLentesContacto.value) {
    formDataExamenVista.ojoDerechoLejanaSinCorreccion = ojoDerechoLejanaSinCorreccion.value;
  }
  interpretarAgudezaVisualLejana();
});

function obtenerInterpretacion(valor) {
  if (valor == null || valor === '') return null;
  const v = Number(valor);
  if (v >= 5 && v <= 15) return "Visión excepcional";
  if (v >= 16 && v <= 25) return "Visión normal";
  if (v >= 26 && v <= 35) return "Visión ligeramente reducida";
  if (v >= 36 && v <= 45) return "Visión moderadamente reducida";
  if (v >= 46 && v <= 55) return "Visión significativamente reducida";
  if (v >= 56) return "Visión muy reducida";
  return "Valor fuera de rango";
}

function interpretarAgudezaVisualLejana(escribir = true) {
  const ciegaOI = ojoIzquierdoCegueraTotal.value;
  const ciegaOD = ojoDerechoCegueraTotal.value;

  if (ciegaOI && ciegaOD) {
    sinCorreccionLejanaInterpretacion.value = "Ceguera total";
  } else if (sinCorreccionNoEvaluablePorLentesContacto.value) {
    sinCorreccionLejanaInterpretacion.value = INTERPRETACION_LENTES_CONTACTO;
  } else if (ciegaOI) {
    const interpOD = obtenerInterpretacion(ojoDerechoLejanaSinCorreccion.value);
    sinCorreccionLejanaInterpretacion.value = interpOD ? `OD: ${interpOD}` : "OD: NA";
  } else if (ciegaOD) {
    const interpOI = obtenerInterpretacion(ojoIzquierdoLejanaSinCorreccion.value);
    sinCorreccionLejanaInterpretacion.value = interpOI ? `OI: ${interpOI}` : "OI: NA";
  } else {
    const interpOI = obtenerInterpretacion(ojoIzquierdoLejanaSinCorreccion.value);
    const interpOD = obtenerInterpretacion(ojoDerechoLejanaSinCorreccion.value);
    const valOI = ojoIzquierdoLejanaSinCorreccion.value != null ? Number(ojoIzquierdoLejanaSinCorreccion.value) : 0;
    const valOD = ojoDerechoLejanaSinCorreccion.value != null ? Number(ojoDerechoLejanaSinCorreccion.value) : 0;
    sinCorreccionLejanaInterpretacion.value = valOI > valOD ? (interpOI ?? 'Valor fuera de rango') : (interpOD ?? 'Valor fuera de rango');
  }

  if (escribir) formDataExamenVista.sinCorreccionLejanaInterpretacion = sinCorreccionLejanaInterpretacion.value;
  requiereLentes(escribir);
}

function requiereLentes(escribir = true) {
  if (sinCorreccionNoEvaluablePorLentesContacto.value) {
    // Ya usa corrección óptica (lentes de contacto); no inventar a partir de Snellen
    requiereLentesUsoGeneral.value = "Si";
    if (escribir) formDataExamenVista.requiereLentesUsoGeneral = requiereLentesUsoGeneral.value;
    return;
  }
  const valOI = ojoIzquierdoCegueraTotal.value ? null : (ojoIzquierdoLejanaSinCorreccion.value != null ? Number(ojoIzquierdoLejanaSinCorreccion.value) : null);
  const valOD = ojoDerechoCegueraTotal.value ? null : (ojoDerechoLejanaSinCorreccion.value != null ? Number(ojoDerechoLejanaSinCorreccion.value) : null);
  const ojosConValor = [valOI, valOD].filter(v => v != null);
  if (ojosConValor.length === 0) {
    requiereLentesUsoGeneral.value = "No";
  } else if (ojosConValor.every(v => v <= 25)) {
    requiereLentesUsoGeneral.value = "No";
  } else {
    requiereLentesUsoGeneral.value = "Si";
  }
  if (escribir) formDataExamenVista.requiereLentesUsoGeneral = requiereLentesUsoGeneral.value;
}

function toggleCegueraOjoIzquierdo() {
  if (sinCorreccionNoEvaluablePorLentesContacto.value) return;
  ojoIzquierdoCegueraTotal.value = !ojoIzquierdoCegueraTotal.value;
  ojoIzquierdoLejanaSinCorreccion.value = null;
}

function toggleCegueraOjoDerecho() {
  if (sinCorreccionNoEvaluablePorLentesContacto.value) return;
  ojoDerechoCegueraTotal.value = !ojoDerechoCegueraTotal.value;
  ojoDerechoLejanaSinCorreccion.value = null;
}

function toggleLentesContacto() {
  sinCorreccionNoEvaluablePorLentesContacto.value = !sinCorreccionNoEvaluablePorLentesContacto.value;
}

const inputDeshabilitadoOI = computed(() => ojoIzquierdoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value);
const inputDeshabilitadoOD = computed(() => ojoDerechoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value);

const mensajeErrorOjoIzquierdo = computed(() => {
  if (inputDeshabilitadoOI.value) return '';
  const v = ojoIzquierdoLejanaSinCorreccion.value;
  if (v == null || v === '') return 'Debe capturar el valor';
  const n = Number(v);
  if (n < 5) return 'Debe ser mínimo 5';
  if (n > 400) return 'Debe ser máximo 400';
  return '';
});

const mensajeErrorOjoDerecho = computed(() => {
  if (inputDeshabilitadoOD.value) return '';
  const v = ojoDerechoLejanaSinCorreccion.value;
  if (v == null || v === '') return 'Debe capturar el valor';
  const n = Number(v);
  if (n < 5) return 'Debe ser mínimo 5';
  if (n > 400) return 'Debe ser máximo 400';
  return '';
});

</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Agudeza visual sin corrección</h1>
    <AgudezaOjos
      v-model:oi="ojoIzquierdoLejanaSinCorreccion"
      v-model:od="ojoDerechoLejanaSinCorreccion"
      titulo="Lejana · carta de Snellen"
      campo="sinCorreccionLejanaInterpretacion"
      id-o-i="ojoIzquierdoLejanaSinCorreccion"
      id-o-d="ojoDerechoLejanaSinCorreccion"
      :ciega-o-i="ojoIzquierdoCegueraTotal"
      :ciega-o-d="ojoDerechoCegueraTotal"
      con-casilla-ceguera
      :ceguera-bloqueada="sinCorreccionNoEvaluablePorLentesContacto"
      :deshabilitado-o-i="inputDeshabilitadoOI"
      :deshabilitado-o-d="inputDeshabilitadoOD"
      :placeholder="sinCorreccionNoEvaluablePorLentesContacto ? 'NA' : ''"
      :error-o-i="mensajeErrorOjoIzquierdo"
      :error-o-d="mensajeErrorOjoDerecho"
      :interpretacion="sinCorreccionLejanaInterpretacion"
      @ceguera-o-i="toggleCegueraOjoIzquierdo"
      @ceguera-o-d="toggleCegueraOjoDerecho"
    >
      <template #lateral>
        <label
          class="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none"
          title="Si la persona asiste con lentes de contacto y no es posible retirarlos, la agudeza sin corrección no es evaluable."
        >
          <input
            type="checkbox"
            class="rounded"
            :checked="sinCorreccionNoEvaluablePorLentesContacto"
            @change="toggleLentesContacto"
          />
          Lentes de contacto (no evaluable)
        </label>
      </template>
    </AgudezaOjos>
  </div>
</template>
