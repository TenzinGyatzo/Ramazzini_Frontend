<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue';
import AgudezaOjos from './AgudezaOjos.vue';
import OpcionesSegmentadas from '../captura/OpcionesSegmentadas.vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

// En la sección (variant compact) el título lo pone la sección; solo en el asistente anterior
const { variant } = defineProps({ variant: { type: String, default: '' } });

const OPCIONES_NO_SI = [
  { valor: 'No', etiqueta: 'No' },
  { valor: 'Si', etiqueta: 'Sí' },
];

const formDataStore = useFormDataStore();
const formDataExamenVista = formDataStore.formDataExamenVista;
const documentos = useDocumentosStore();
const proveedorSaludStore = useProveedorSaludStore();

const ciegaOI = computed(() => formDataExamenVista.ojoIzquierdoCegueraTotal ?? formDataExamenVista.ojoIzquierdoLejanaCegueraTotal ?? formDataExamenVista.ojoIzquierdoCercanaCegueraTotal ?? false);
const ciegaOD = computed(() => formDataExamenVista.ojoDerechoCegueraTotal ?? formDataExamenVista.ojoDerechoLejanaCegueraTotal ?? formDataExamenVista.ojoDerechoCercanaCegueraTotal ?? false);

const usaLentes = ref(formDataExamenVista.conCorreccionCercanaInterpretacion ? 'Si' : 'No');
const ojoIzquierdoCercanaConCorreccion = ref(
  ciegaOI.value ? undefined : (formDataExamenVista.ojoIzquierdoCercanaConCorreccion ?? 20)
);
const ojoDerechoCercanaConCorreccion = ref(
  ciegaOD.value ? undefined : (formDataExamenVista.ojoDerechoCercanaConCorreccion ?? 20)
);
const conCorreccionCercanaInterpretacion = ref(formDataExamenVista.conCorreccionCercanaInterpretacion ?? 'Visión normal');

const mensajeErrorOjoIzquierdo = computed(() => {
  if (usaLentes.value === 'No' || ciegaOI.value) return '';
  const v = ojoIzquierdoCercanaConCorreccion.value;
  if (v == null || v === '') return 'Debe capturar el valor';
  const n = Number(v);
  if (n < 5) return 'Debe ser mínimo 5';
  if (n > 400) return 'Debe ser máximo 400';
  return '';
});

const mensajeErrorOjoDerecho = computed(() => {
  if (usaLentes.value === 'No' || ciegaOD.value) return '';
  const v = ojoDerechoCercanaConCorreccion.value;
  if (v == null || v === '') return 'Debe capturar el valor';
  const n = Number(v);
  if (n < 5) return 'Debe ser mínimo 5';
  if (n > 400) return 'Debe ser máximo 400';
  return '';
});

// Computed property para determinar el color de semaforización de la interpretación

// Punto 43: el paso no escribe al abrirse ni al cerrarse (en la captura rápida está abierto
// desde el principio); lo preseleccionado lo escribe examenVistaGuardado al revisar la sección.
let montado = false;

onMounted(() => {
  if (documentos.currentDocument?.conCorreccionCercanaInterpretacion) {
    const doc = documentos.currentDocument;
    usaLentes.value = 'Si';
    const ciegaOIDoc = doc.ojoIzquierdoCegueraTotal ?? doc.ojoIzquierdoLejanaCegueraTotal ?? doc.ojoIzquierdoCercanaCegueraTotal ?? false;
    const ciegaODDoc = doc.ojoDerechoCegueraTotal ?? doc.ojoDerechoLejanaCegueraTotal ?? doc.ojoDerechoCercanaCegueraTotal ?? false;
    ojoIzquierdoCercanaConCorreccion.value = ciegaOIDoc ? undefined : (doc.ojoIzquierdoCercanaConCorreccion ?? 20);
    ojoDerechoCercanaConCorreccion.value = ciegaODDoc ? undefined : (doc.ojoDerechoCercanaConCorreccion ?? 20);
    conCorreccionCercanaInterpretacion.value = doc.conCorreccionCercanaInterpretacion ?? 'Visión normal';
  } else {
    usaLentes.value = formDataExamenVista.conCorreccionCercanaInterpretacion ? 'Si' : 'No';
    ojoIzquierdoCercanaConCorreccion.value = ciegaOI.value ? undefined : (formDataExamenVista.ojoIzquierdoCercanaConCorreccion ?? 20);
    ojoDerechoCercanaConCorreccion.value = ciegaOD.value ? undefined : (formDataExamenVista.ojoDerechoCercanaConCorreccion ?? 20);
    conCorreccionCercanaInterpretacion.value = formDataExamenVista.conCorreccionCercanaInterpretacion ?? 'Visión normal';
  }
  // Guatemala: si utilizaAnteojos es Si, pre-cargar usaLentes automáticamente
  const paisProveedor = proveedorSaludStore.proveedorSalud?.pais;
  if (paisProveedor === 'GT' && formDataExamenVista.utilizaAnteojos === 'Si') {
    usaLentes.value = 'Si';
    ojoIzquierdoCercanaConCorreccion.value = ciegaOI.value ? undefined : (formDataExamenVista.ojoIzquierdoCercanaConCorreccion ?? 20);
    ojoDerechoCercanaConCorreccion.value = ciegaOD.value ? undefined : (formDataExamenVista.ojoDerechoCercanaConCorreccion ?? 20);
    conCorreccionCercanaInterpretacion.value = formDataExamenVista.conCorreccionCercanaInterpretacion || 'Visión normal';
    interpretarAgudezaVisualCercana(false);
  }
  // Lentes de contacto: AV sin corrección no evaluable → debe capturar con corrección
  if (
    formDataExamenVista.sinCorreccionNoEvaluablePorLentesContacto ||
    documentos.currentDocument?.sinCorreccionNoEvaluablePorLentesContacto
  ) {
    usaLentes.value = 'Si';
    ojoIzquierdoCercanaConCorreccion.value = ciegaOI.value ? undefined : (formDataExamenVista.ojoIzquierdoCercanaConCorreccion ?? 20);
    ojoDerechoCercanaConCorreccion.value = ciegaOD.value ? undefined : (formDataExamenVista.ojoDerechoCercanaConCorreccion ?? 20);
    conCorreccionCercanaInterpretacion.value = formDataExamenVista.conCorreccionCercanaInterpretacion || 'Visión normal';
    interpretarAgudezaVisualCercana(false);
  }
  if (usaLentes.value === 'Si') interpretarAgudezaVisualCercana(false);
  nextTick(() => {
    montado = true;
  });
});

// Observa el cambio de usaLentes
watch(usaLentes, (newVal) => {
  if (newVal === 'Si') {
    ojoIzquierdoCercanaConCorreccion.value = ciegaOI.value ? undefined : (formDataExamenVista.ojoIzquierdoCercanaConCorreccion ?? 20);
    ojoDerechoCercanaConCorreccion.value = ciegaOD.value ? undefined : (formDataExamenVista.ojoDerechoCercanaConCorreccion ?? 20);
    if (montado) formDataExamenVista.ojoIzquierdoCercanaConCorreccion = ciegaOI.value ? undefined : ojoIzquierdoCercanaConCorreccion.value;
    if (montado) formDataExamenVista.ojoDerechoCercanaConCorreccion = ciegaOD.value ? undefined : ojoDerechoCercanaConCorreccion.value;
    conCorreccionCercanaInterpretacion.value = formDataExamenVista.conCorreccionCercanaInterpretacion || 'Visión normal';
    interpretarAgudezaVisualCercana(montado);
  } else {
    // Limpia los valores si no usa lentes
    ojoIzquierdoCercanaConCorreccion.value = undefined;
    ojoDerechoCercanaConCorreccion.value = undefined;
    conCorreccionCercanaInterpretacion.value = undefined;
    if (montado) formDataExamenVista.ojoIzquierdoCercanaConCorreccion = undefined;
    if (montado) formDataExamenVista.ojoDerechoCercanaConCorreccion = undefined;
    if (montado) formDataExamenVista.conCorreccionCercanaInterpretacion = undefined;
  }
});

watch([ojoIzquierdoCercanaConCorreccion, ojoDerechoCercanaConCorreccion], () => {
  // Al abrir (precarga de Guatemala o lentes de contacto) solo se muestra
  if (!montado) {
    interpretarAgudezaVisualCercana(false);
    return;
  }
  formDataExamenVista.ojoIzquierdoCercanaConCorreccion = ciegaOI.value ? undefined : ojoIzquierdoCercanaConCorreccion.value;
  formDataExamenVista.ojoDerechoCercanaConCorreccion = ciegaOD.value ? undefined : ojoDerechoCercanaConCorreccion.value;
  interpretarAgudezaVisualCercana();
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
  return "NA";
}

function interpretarAgudezaVisualCercana(escribir = true) {
  const oiCiega = ciegaOI.value;
  const odCiega = ciegaOD.value;
  if (oiCiega && odCiega) {
    conCorreccionCercanaInterpretacion.value = "Ceguera total";
  } else if (oiCiega) {
    const interpOD = obtenerInterpretacion(ojoDerechoCercanaConCorreccion.value);
    conCorreccionCercanaInterpretacion.value = interpOD ? `OD: ${interpOD}` : "OD: NA";
  } else if (odCiega) {
    const interpOI = obtenerInterpretacion(ojoIzquierdoCercanaConCorreccion.value);
    conCorreccionCercanaInterpretacion.value = interpOI ? `OI: ${interpOI}` : "OI: NA";
  } else {
    const interpOI = obtenerInterpretacion(ojoIzquierdoCercanaConCorreccion.value);
    const interpOD = obtenerInterpretacion(ojoDerechoCercanaConCorreccion.value);
    const valOI = ojoIzquierdoCercanaConCorreccion.value != null ? Number(ojoIzquierdoCercanaConCorreccion.value) : 0;
    const valOD = ojoDerechoCercanaConCorreccion.value != null ? Number(ojoDerechoCercanaConCorreccion.value) : 0;
    conCorreccionCercanaInterpretacion.value = valOI > valOD ? (interpOI ?? 'NA') : (interpOD ?? 'NA');
  }
  if (escribir) formDataExamenVista.conCorreccionCercanaInterpretacion = conCorreccionCercanaInterpretacion.value;
}

// En la captura rápida las otras secciones están abiertas a la vez: si se marcan lentes de
// contacto o (Guatemala) «Utiliza anteojos: Sí», aquí se pasa a «usa lentes» en el momento
watch(
  () => [formDataExamenVista.sinCorreccionNoEvaluablePorLentesContacto, formDataExamenVista.utilizaAnteojos],
  ([noEvaluable, utiliza]) => {
    if (!montado || usaLentes.value === 'Si') return;
    const esGuatemala = proveedorSaludStore.proveedorSalud?.pais === 'GT';
    if (noEvaluable || (esGuatemala && utiliza === 'Si')) usaLentes.value = 'Si';
  },
);
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Agudeza visual con corrección</h1>
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p class="text-sm font-semibold text-gray-800">¿La persona usa lentes para leer?</p>
      <OpcionesSegmentadas
        v-model="usaLentes"
        name="usaLentesCercana"
        etiqueta="¿La persona usa lentes para leer?"
        compacto
        :opciones="OPCIONES_NO_SI"
      />
    </div>

    <AgudezaOjos
      v-if="usaLentes === 'Si'"
      v-model:oi="ojoIzquierdoCercanaConCorreccion"
      v-model:od="ojoDerechoCercanaConCorreccion"
      class="mt-3"
      titulo="Cercana · carta de Jaeger"
      campo="conCorreccionCercanaInterpretacion"
      id-o-i="ojoIzquierdoCercanaConCorreccion"
      id-o-d="ojoDerechoCercanaConCorreccion"
      :ciega-o-i="ciegaOI"
      :ciega-o-d="ciegaOD"
      :error-o-i="mensajeErrorOjoIzquierdo"
      :error-o-d="mensajeErrorOjoDerecho"
      :interpretacion="conCorreccionCercanaInterpretacion"
    />
  </div>
</template>
