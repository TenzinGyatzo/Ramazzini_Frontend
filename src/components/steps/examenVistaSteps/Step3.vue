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
const ojoIzquierdoCercanaSinCorreccion = ref(20);
const ojoDerechoCercanaSinCorreccion = ref(20);
const sinCorreccionCercanaInterpretacion = ref('Visión normal');
const requiereLentesParaLectura = ref('No');

function getCiegaOI(doc) {
  return doc?.ojoIzquierdoCegueraTotal ?? doc?.ojoIzquierdoLejanaCegueraTotal ?? doc?.ojoIzquierdoCercanaCegueraTotal ?? false;
}
function getCiegaOD(doc) {
  return doc?.ojoDerechoCegueraTotal ?? doc?.ojoDerechoLejanaCegueraTotal ?? doc?.ojoDerechoCercanaCegueraTotal ?? false;
}

onMounted(() => {
  if (documentos.currentDocument) {
    const doc = documentos.currentDocument;
    ojoIzquierdoCegueraTotal.value = getCiegaOI(doc);
    ojoDerechoCegueraTotal.value = getCiegaOD(doc);
    sinCorreccionNoEvaluablePorLentesContacto.value = doc.sinCorreccionNoEvaluablePorLentesContacto ?? false;
  } else {
    ojoIzquierdoCegueraTotal.value = formDataExamenVista.ojoIzquierdoCegueraTotal ?? false;
    ojoDerechoCegueraTotal.value = formDataExamenVista.ojoDerechoCegueraTotal ?? false;
    sinCorreccionNoEvaluablePorLentesContacto.value = formDataExamenVista.sinCorreccionNoEvaluablePorLentesContacto ?? false;
  }
  const noEvaluable = sinCorreccionNoEvaluablePorLentesContacto.value;
  ojoIzquierdoCercanaSinCorreccion.value = (ojoIzquierdoCegueraTotal.value || noEvaluable)
    ? null
    : (documentos.currentDocument?.ojoIzquierdoCercanaSinCorreccion ?? formDataExamenVista.ojoIzquierdoCercanaSinCorreccion ?? 20);
  ojoDerechoCercanaSinCorreccion.value = (ojoDerechoCegueraTotal.value || noEvaluable)
    ? null
    : (documentos.currentDocument?.ojoDerechoCercanaSinCorreccion ?? formDataExamenVista.ojoDerechoCercanaSinCorreccion ?? 20);
  sinCorreccionCercanaInterpretacion.value = documentos.currentDocument?.sinCorreccionCercanaInterpretacion ?? formDataExamenVista.sinCorreccionCercanaInterpretacion ?? 'Visión normal';
  requiereLentesParaLectura.value = documentos.currentDocument?.requiereLentesParaLectura ?? formDataExamenVista.requiereLentesParaLectura ?? 'No';
  // Solo lo que se muestra (sin escribir en el formulario)
  interpretarAgudezaVisualCercana(false);
});

watch([ojoIzquierdoCegueraTotal, ojoDerechoCegueraTotal], () => {
  formDataStore.setExamenVistaCeguera(ojoIzquierdoCegueraTotal.value, ojoDerechoCegueraTotal.value);
  if (ojoIzquierdoCegueraTotal.value) {
    ojoIzquierdoCercanaSinCorreccion.value = null;
    formDataExamenVista.ojoIzquierdoCercanaSinCorreccion = null;
  }
  if (ojoDerechoCegueraTotal.value) {
    ojoDerechoCercanaSinCorreccion.value = null;
    formDataExamenVista.ojoDerechoCercanaSinCorreccion = null;
  }
  interpretarAgudezaVisualCercana();
});

// Si se marcó en Step2 mientras este step está montado (poco común), o al entrar ya viene en store
watch(
  () => formDataExamenVista.sinCorreccionNoEvaluablePorLentesContacto,
  (noEvaluable) => {
    const valor = !!noEvaluable;
    sinCorreccionNoEvaluablePorLentesContacto.value = valor;
    if (valor) {
      ojoIzquierdoCegueraTotal.value = false;
      ojoDerechoCegueraTotal.value = false;
      formDataStore.setExamenVistaCeguera(false, false);
      ojoIzquierdoCercanaSinCorreccion.value = null;
      ojoDerechoCercanaSinCorreccion.value = null;
      formDataExamenVista.ojoIzquierdoCercanaSinCorreccion = null;
      formDataExamenVista.ojoDerechoCercanaSinCorreccion = null;
    } else if (!ojoIzquierdoCegueraTotal.value && !ojoDerechoCegueraTotal.value) {
      ojoIzquierdoCercanaSinCorreccion.value = formDataExamenVista.ojoIzquierdoCercanaSinCorreccion ?? 20;
      ojoDerechoCercanaSinCorreccion.value = formDataExamenVista.ojoDerechoCercanaSinCorreccion ?? 20;
      formDataExamenVista.ojoIzquierdoCercanaSinCorreccion = ojoIzquierdoCercanaSinCorreccion.value;
      formDataExamenVista.ojoDerechoCercanaSinCorreccion = ojoDerechoCercanaSinCorreccion.value;
    }
    interpretarAgudezaVisualCercana();
  }
);

watch([ojoIzquierdoCercanaSinCorreccion, ojoDerechoCercanaSinCorreccion], () => {
  if (!ojoIzquierdoCegueraTotal.value && !sinCorreccionNoEvaluablePorLentesContacto.value) {
    formDataExamenVista.ojoIzquierdoCercanaSinCorreccion = ojoIzquierdoCercanaSinCorreccion.value;
  }
  if (!ojoDerechoCegueraTotal.value && !sinCorreccionNoEvaluablePorLentesContacto.value) {
    formDataExamenVista.ojoDerechoCercanaSinCorreccion = ojoDerechoCercanaSinCorreccion.value;
  }
  interpretarAgudezaVisualCercana();
});

// La ceguera total es del ojo, no de la distancia: si se marca o se quita en la otra
// distancia (en la misma sección), aquí se refleja sin volver a marcarla
watch(
  () => [formDataExamenVista.ojoIzquierdoCegueraTotal, formDataExamenVista.ojoDerechoCegueraTotal],
  ([oi, od]) => {
    if (oi != null && !!oi !== ojoIzquierdoCegueraTotal.value) {
      ojoIzquierdoCegueraTotal.value = !!oi;
      ojoIzquierdoCercanaSinCorreccion.value = null;
    }
    if (od != null && !!od !== ojoDerechoCegueraTotal.value) {
      ojoDerechoCegueraTotal.value = !!od;
      ojoDerechoCercanaSinCorreccion.value = null;
    }
  },
);

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

function interpretarAgudezaVisualCercana(escribir = true) {
  const ciegaOI = ojoIzquierdoCegueraTotal.value;
  const ciegaOD = ojoDerechoCegueraTotal.value;

  if (ciegaOI && ciegaOD) {
    sinCorreccionCercanaInterpretacion.value = "Ceguera total";
  } else if (sinCorreccionNoEvaluablePorLentesContacto.value) {
    sinCorreccionCercanaInterpretacion.value = INTERPRETACION_LENTES_CONTACTO;
  } else if (ciegaOI) {
    const interpOD = obtenerInterpretacion(ojoDerechoCercanaSinCorreccion.value);
    sinCorreccionCercanaInterpretacion.value = interpOD ? `OD: ${interpOD}` : "OD: NA";
  } else if (ciegaOD) {
    const interpOI = obtenerInterpretacion(ojoIzquierdoCercanaSinCorreccion.value);
    sinCorreccionCercanaInterpretacion.value = interpOI ? `OI: ${interpOI}` : "OI: NA";
  } else {
    const interpOI = obtenerInterpretacion(ojoIzquierdoCercanaSinCorreccion.value);
    const interpOD = obtenerInterpretacion(ojoDerechoCercanaSinCorreccion.value);
    const valOI = ojoIzquierdoCercanaSinCorreccion.value != null ? Number(ojoIzquierdoCercanaSinCorreccion.value) : 0;
    const valOD = ojoDerechoCercanaSinCorreccion.value != null ? Number(ojoDerechoCercanaSinCorreccion.value) : 0;
    sinCorreccionCercanaInterpretacion.value = valOI > valOD ? (interpOI ?? 'Valor fuera de rango') : (interpOD ?? 'Valor fuera de rango');
  }

  if (escribir) formDataExamenVista.sinCorreccionCercanaInterpretacion = sinCorreccionCercanaInterpretacion.value;
  requiereLentesLectura(escribir);
}

function requiereLentesLectura(escribir = true) {
  if (sinCorreccionNoEvaluablePorLentesContacto.value) {
    requiereLentesParaLectura.value = "No";
    if (escribir) formDataExamenVista.requiereLentesParaLectura = requiereLentesParaLectura.value;
    return;
  }
  const valOI = ojoIzquierdoCegueraTotal.value ? null : (ojoIzquierdoCercanaSinCorreccion.value != null ? Number(ojoIzquierdoCercanaSinCorreccion.value) : null);
  const valOD = ojoDerechoCegueraTotal.value ? null : (ojoDerechoCercanaSinCorreccion.value != null ? Number(ojoDerechoCercanaSinCorreccion.value) : null);
  const ojosConValor = [valOI, valOD].filter(v => v != null);
  if (ojosConValor.length === 0) {
    requiereLentesParaLectura.value = "No";
  } else if (ojosConValor.every(v => v <= 20)) {
    requiereLentesParaLectura.value = "No";
  } else {
    requiereLentesParaLectura.value = "Si";
  }
  if (escribir) formDataExamenVista.requiereLentesParaLectura = requiereLentesParaLectura.value;
}

function toggleCegueraOjoIzquierdo() {
  if (sinCorreccionNoEvaluablePorLentesContacto.value) return;
  ojoIzquierdoCegueraTotal.value = !ojoIzquierdoCegueraTotal.value;
  ojoIzquierdoCercanaSinCorreccion.value = null;
}

function toggleCegueraOjoDerecho() {
  if (sinCorreccionNoEvaluablePorLentesContacto.value) return;
  ojoDerechoCegueraTotal.value = !ojoDerechoCegueraTotal.value;
  ojoDerechoCercanaSinCorreccion.value = null;
}

const inputDeshabilitadoOI = computed(() => ojoIzquierdoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value);
const inputDeshabilitadoOD = computed(() => ojoDerechoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value);

const mensajeErrorOjoIzquierdo = computed(() => {
  if (inputDeshabilitadoOI.value) return '';
  const v = ojoIzquierdoCercanaSinCorreccion.value;
  if (v == null || v === '') return 'Debe capturar el valor';
  const n = Number(v);
  if (n < 5) return 'Debe ser mínimo 5';
  if (n > 400) return 'Debe ser máximo 400';
  return '';
});

const mensajeErrorOjoDerecho = computed(() => {
  if (inputDeshabilitadoOD.value) return '';
  const v = ojoDerechoCercanaSinCorreccion.value;
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
      v-model:oi="ojoIzquierdoCercanaSinCorreccion"
      v-model:od="ojoDerechoCercanaSinCorreccion"
      titulo="Cercana · carta de Jaeger"
      campo="sinCorreccionCercanaInterpretacion"
      id-o-i="ojoIzquierdoCercanaSinCorreccion"
      id-o-d="ojoDerechoCercanaSinCorreccion"
      :ciega-o-i="ojoIzquierdoCegueraTotal"
      :ciega-o-d="ojoDerechoCegueraTotal"
      con-casilla-ceguera
      :ceguera-bloqueada="sinCorreccionNoEvaluablePorLentesContacto"
      :deshabilitado-o-i="inputDeshabilitadoOI"
      :deshabilitado-o-d="inputDeshabilitadoOD"
      :placeholder="sinCorreccionNoEvaluablePorLentesContacto ? 'NA' : ''"
      :error-o-i="mensajeErrorOjoIzquierdo"
      :error-o-d="mensajeErrorOjoDerecho"
      :interpretacion="sinCorreccionCercanaInterpretacion"
      @ceguera-o-i="toggleCegueraOjoIzquierdo"
      @ceguera-o-d="toggleCegueraOjoDerecho"
    >
      <template #aviso>
        <p v-if="sinCorreccionNoEvaluablePorLentesContacto" class="mb-2 text-xs text-gray-500">
          Con lentes de contacto (marcado en lejana) la cercana sin corrección queda como NA.
        </p>
      </template>
    </AgudezaOjos>
  </div>
</template>
