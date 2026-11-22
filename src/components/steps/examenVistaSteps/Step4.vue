<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue';
import AgudezaOjos from './AgudezaOjos.vue';
import OpcionesSegmentadas from '../captura/OpcionesSegmentadas.vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { fuenteAlMontar } from '@/helpers/fuenteAlMontar';
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

const usaLentes = ref(formDataExamenVista.conCorreccionLejanaInterpretacion ? 'Si' : 'No');
const ojoIzquierdoLejanaConCorreccion = ref(
  ciegaOI.value ? undefined : (formDataExamenVista.ojoIzquierdoLejanaConCorreccion ?? 20)
);
const ojoDerechoLejanaConCorreccion = ref(
  ciegaOD.value ? undefined : (formDataExamenVista.ojoDerechoLejanaConCorreccion ?? 20)
);
const conCorreccionLejanaInterpretacion = ref(formDataExamenVista.conCorreccionLejanaInterpretacion ?? 'Visión normal');

// Punto 43: el paso no escribe al abrirse ni al cerrarse (en la captura rápida está abierto
// desde el principio); lo preseleccionado lo escribe examenVistaGuardado al revisar la sección.
let montado = false;

onMounted(() => {
  // Lo de la sesión (también al cambiar de modo; al editar, con lo ya cambiado) o, si aún no
  // llega al formulario, lo guardado
  const doc = fuenteAlMontar(formDataExamenVista, documentos.currentDocument);
  usaLentes.value = doc.conCorreccionLejanaInterpretacion ? 'Si' : 'No';
  const ciegaOIDoc = doc.ojoIzquierdoCegueraTotal ?? doc.ojoIzquierdoLejanaCegueraTotal ?? doc.ojoIzquierdoCercanaCegueraTotal ?? false;
  const ciegaODDoc = doc.ojoDerechoCegueraTotal ?? doc.ojoDerechoLejanaCegueraTotal ?? doc.ojoDerechoCercanaCegueraTotal ?? false;
  ojoIzquierdoLejanaConCorreccion.value = ciegaOIDoc ? undefined : (doc.ojoIzquierdoLejanaConCorreccion ?? 20);
  ojoDerechoLejanaConCorreccion.value = ciegaODDoc ? undefined : (doc.ojoDerechoLejanaConCorreccion ?? 20);
  conCorreccionLejanaInterpretacion.value = doc.conCorreccionLejanaInterpretacion ?? 'Visión normal';
  // Guatemala: si utilizaAnteojos es Si, pre-cargar usaLentes automáticamente
  const paisProveedor = proveedorSaludStore.proveedorSalud?.pais;
  if (paisProveedor === 'GT' && formDataExamenVista.utilizaAnteojos === 'Si') {
    usaLentes.value = 'Si';
    ojoIzquierdoLejanaConCorreccion.value = ciegaOI.value ? undefined : (formDataExamenVista.ojoIzquierdoLejanaConCorreccion ?? 20);
    ojoDerechoLejanaConCorreccion.value = ciegaOD.value ? undefined : (formDataExamenVista.ojoDerechoLejanaConCorreccion ?? 20);
    conCorreccionLejanaInterpretacion.value = formDataExamenVista.conCorreccionLejanaInterpretacion || 'Visión normal';
    interpretarAgudezaVisualLejana(false);
  }
  // Lentes de contacto: AV sin corrección no evaluable → debe capturar con corrección
  if (
    doc.sinCorreccionNoEvaluablePorLentesContacto
  ) {
    usaLentes.value = 'Si';
    ojoIzquierdoLejanaConCorreccion.value = ciegaOI.value ? undefined : (formDataExamenVista.ojoIzquierdoLejanaConCorreccion ?? 20);
    ojoDerechoLejanaConCorreccion.value = ciegaOD.value ? undefined : (formDataExamenVista.ojoDerechoLejanaConCorreccion ?? 20);
    conCorreccionLejanaInterpretacion.value = formDataExamenVista.conCorreccionLejanaInterpretacion || 'Visión normal';
    interpretarAgudezaVisualLejana(false);
  }
  if (usaLentes.value === 'Si') interpretarAgudezaVisualLejana(false);
  nextTick(() => {
    montado = true;
  });
});

// Observa el cambio de usaLentes
watch(usaLentes, (newVal) => {
  if (newVal === 'Si') {
    ojoIzquierdoLejanaConCorreccion.value = ciegaOI.value ? undefined : (formDataExamenVista.ojoIzquierdoLejanaConCorreccion ?? 20);
    ojoDerechoLejanaConCorreccion.value = ciegaOD.value ? undefined : (formDataExamenVista.ojoDerechoLejanaConCorreccion ?? 20);
    if (montado) formDataExamenVista.ojoIzquierdoLejanaConCorreccion = ciegaOI.value ? undefined : ojoIzquierdoLejanaConCorreccion.value;
    if (montado) formDataExamenVista.ojoDerechoLejanaConCorreccion = ciegaOD.value ? undefined : ojoDerechoLejanaConCorreccion.value;
    conCorreccionLejanaInterpretacion.value = formDataExamenVista.conCorreccionLejanaInterpretacion || 'Visión normal';
    interpretarAgudezaVisualLejana(montado);
  } else {
    // Limpia los valores si no usa lentes
    ojoIzquierdoLejanaConCorreccion.value = undefined;
    ojoDerechoLejanaConCorreccion.value = undefined;
    conCorreccionLejanaInterpretacion.value = undefined;
    if (montado) formDataExamenVista.ojoIzquierdoLejanaConCorreccion = undefined;
    if (montado) formDataExamenVista.ojoDerechoLejanaConCorreccion = undefined;
    if (montado) formDataExamenVista.conCorreccionLejanaInterpretacion = undefined;
  }
});

watch([ojoIzquierdoLejanaConCorreccion, ojoDerechoLejanaConCorreccion], () => {
  // Al abrir (precarga de Guatemala o lentes de contacto) solo se muestra
  if (!montado) {
    interpretarAgudezaVisualLejana(false);
    return;
  }
  formDataExamenVista.ojoIzquierdoLejanaConCorreccion = ciegaOI.value ? undefined : ojoIzquierdoLejanaConCorreccion.value;
  formDataExamenVista.ojoDerechoLejanaConCorreccion = ciegaOD.value ? undefined : ojoDerechoLejanaConCorreccion.value;
  interpretarAgudezaVisualLejana();
});

function interpretarAgudezaVisualLejana(escribir = true) {
  const oiCiega = ciegaOI.value;
  const odCiega = ciegaOD.value;
  if (oiCiega && odCiega) {
    conCorreccionLejanaInterpretacion.value = "Ceguera total";
  } else if (oiCiega) {
    const interpOD = obtenerInterpretacion(ojoDerechoLejanaConCorreccion.value);
    conCorreccionLejanaInterpretacion.value = interpOD ? `OD: ${interpOD}` : "OD: NA";
  } else if (odCiega) {
    const interpOI = obtenerInterpretacion(ojoIzquierdoLejanaConCorreccion.value);
    conCorreccionLejanaInterpretacion.value = interpOI ? `OI: ${interpOI}` : "OI: NA";
  } else {
    const interpOI = obtenerInterpretacion(ojoIzquierdoLejanaConCorreccion.value);
    const interpOD = obtenerInterpretacion(ojoDerechoLejanaConCorreccion.value);
    const valOI = ojoIzquierdoLejanaConCorreccion.value != null ? Number(ojoIzquierdoLejanaConCorreccion.value) : 0;
    const valOD = ojoDerechoLejanaConCorreccion.value != null ? Number(ojoDerechoLejanaConCorreccion.value) : 0;
    conCorreccionLejanaInterpretacion.value = valOI > valOD ? (interpOI ?? 'NA') : (interpOD ?? 'NA');
  }
  if (escribir) formDataExamenVista.conCorreccionLejanaInterpretacion = conCorreccionLejanaInterpretacion.value;
}

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

const mensajeErrorOjoIzquierdo = computed(() => {
  if (usaLentes.value === 'No' || ciegaOI.value) return '';
  const v = ojoIzquierdoLejanaConCorreccion.value;
  if (v == null || v === '') return 'Debe capturar el valor';
  const n = Number(v);
  if (n < 5) return 'Debe ser mínimo 5';
  if (n > 400) return 'Debe ser máximo 400';
  return '';
});

const mensajeErrorOjoDerecho = computed(() => {
  if (usaLentes.value === 'No' || ciegaOD.value) return '';
  const v = ojoDerechoLejanaConCorreccion.value;
  if (v == null || v === '') return 'Debe capturar el valor';
  const n = Number(v);
  if (n < 5) return 'Debe ser mínimo 5';
  if (n > 400) return 'Debe ser máximo 400';
  return '';
});

// Computed property para determinar el color de semaforización de la interpretación

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
      <p class="text-sm font-semibold text-gray-800">¿La persona usa lentes?</p>
      <OpcionesSegmentadas
        v-model="usaLentes"
        name="usaLentesLejana"
        etiqueta="¿La persona usa lentes?"
        compacto
        :opciones="OPCIONES_NO_SI"
      />
    </div>

    <AgudezaOjos
      v-if="usaLentes === 'Si'"
      v-model:oi="ojoIzquierdoLejanaConCorreccion"
      v-model:od="ojoDerechoLejanaConCorreccion"
      class="mt-3"
      titulo="Lejana · carta de Snellen"
      campo="conCorreccionLejanaInterpretacion"
      id-o-i="ojoIzquierdoLejanaConCorreccion"
      id-o-d="ojoDerechoLejanaConCorreccion"
      :ciega-o-i="ciegaOI"
      :ciega-o-d="ciegaOD"
      :error-o-i="mensajeErrorOjoIzquierdo"
      :error-o-d="mensajeErrorOjoDerecho"
      :interpretacion="conCorreccionLejanaInterpretacion"
    />
  </div>
</template>
