<script setup>
/**
 * Resumen de la exploración física. Punto 41: mismo diseño y misma lógica que el resumen de la
 * historia clínica (paso 46): en la captura rápida está abierto desde el principio, así que
 * sigue a los hallazgos en vivo mientras no se escriba uno propio; con «No» muestra el texto
 * que se guardará. Lo no revisado lo completa FormStepper (exploracionFisicaGuardado).
 */
import { watch, ref, onMounted, nextTick, computed, toRefs } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
    resumenAutomaticoExploracionFisica,
    textoResumenPorDefecto,
} from '@/helpers/exploracionFisicaGuardado';
import OpcionesSegmentadas from '@/components/steps/captura/OpcionesSegmentadas.vue';
import { CLASE_AYUDA, CLASE_ETIQUETA, CLASE_TEXTAREA } from '@/components/steps/captura/estiloCaptura';

const props = defineProps({
    variant: {
        type: String,
        default: 'fullscreen',
        validator: (v) => ['fullscreen', 'compact'].includes(v),
    },
});
const { variant } = toRefs(props);

const trabajadores = useTrabajadoresStore();
const { formDataExploracionFisica } = useFormDataStore();
const documentos = useDocumentosStore();

// Con «No» se guarda siempre este texto (prepararExploracionFisicaParaGuardar)
const textoPorDefecto = computed(() =>
    textoResumenPorDefecto(trabajadores.currentTrabajador?.sexo === 'Femenino'),
);

const resumenExploracionFisicaPregunta = ref('No');
const resumenExploracionFisica = ref('');
const textareaHallazgos = ref(null);

// Hallazgos de los pasos 4–30 (mismo cálculo que al guardar)
const resumenAutomatico = computed(() => resumenAutomaticoExploracionFisica(formDataExploracionFisica));

// Los cambios al abrir el paso no mueven el cursor (en la captura rápida competiría)
let montado = false;

onMounted(() => {
    const textoDefecto = textoPorDefecto.value;
    const tieneSesion =
        (formDataExploracionFisica.resumenExploracionFisicaPregunta ?? '') !== '' ||
        (formDataExploracionFisica.resumenExploracionFisica ?? '') !== '';

    // Preferir formData (sesión) para no perder cambios al cambiar de paso o de modo
    if (tieneSesion) {
        const valorPrevio = formDataExploracionFisica.resumenExploracionFisica || '';
        if (resumenAutomatico.value && (!valorPrevio || valorPrevio === textoDefecto)) {
            resumenExploracionFisicaPregunta.value = 'Si';
            resumenExploracionFisica.value = resumenAutomatico.value;
        } else if (!valorPrevio || valorPrevio === textoDefecto) {
            resumenExploracionFisicaPregunta.value = formDataExploracionFisica.resumenExploracionFisicaPregunta === 'Si' ? 'Si' : 'No';
            resumenExploracionFisica.value = resumenExploracionFisicaPregunta.value === 'No' ? textoDefecto : valorPrevio;
        } else {
            resumenExploracionFisicaPregunta.value = formDataExploracionFisica.resumenExploracionFisicaPregunta || 'Si';
            resumenExploracionFisica.value = valorPrevio;
        }
    } else if (documentos.currentDocument) {
        const resumenDoc = documentos.currentDocument.resumenExploracionFisica || '';
        resumenExploracionFisica.value = resumenDoc;
        resumenExploracionFisicaPregunta.value =
            resumenAutomatico.value || (resumenDoc && resumenDoc !== textoDefecto)
                ? 'Si'
                : documentos.currentDocument.resumenExploracionFisicaPregunta || 'No';
    } else if (resumenAutomatico.value) {
        resumenExploracionFisicaPregunta.value = 'Si';
        resumenExploracionFisica.value = resumenAutomatico.value;
    }
    ultimoAutomatico = resumenAutomatico.value;
    nextTick(() => {
        montado = true;
    });
});

// En la captura rápida esta sección está abierta desde el principio, antes de capturar los
// hallazgos: el resumen los sigue mientras no se escriba uno propio.
let usuarioEligioNo = false;
let cambioPorHallazgos = false;
let ultimoAutomatico = '';
const cambiarPregunta = (valor) => {
    cambioPorHallazgos = true;
    resumenExploracionFisicaPregunta.value = valor;
    nextTick(() => {
        cambioPorHallazgos = false;
    });
};
// Pregunta y texto se fijan aquí juntos (no en dos reacciones encadenadas: la pantalla se
// quedaba atrasada en la historia clínica)
watch(resumenAutomatico, (nuevo) => {
    const resumenEsAutomatico =
        !resumenExploracionFisica.value ||
        resumenExploracionFisica.value === ultimoAutomatico ||
        resumenExploracionFisica.value === textoPorDefecto.value;
    if (resumenExploracionFisicaPregunta.value === 'No') {
        if (nuevo && !usuarioEligioNo) {
            cambiarPregunta('Si');
            resumenExploracionFisica.value = nuevo;
        }
    } else if (resumenEsAutomatico) {
        if (nuevo) {
            resumenExploracionFisica.value = nuevo;
        } else {
            cambiarPregunta('No');
            resumenExploracionFisica.value = textoPorDefecto.value;
        }
    }
    ultimoAutomatico = nuevo;
});

watch(resumenExploracionFisicaPregunta, (newValue) => {
    formDataExploracionFisica.resumenExploracionFisicaPregunta = newValue;
});
watch(resumenExploracionFisica, (newValue) => {
    formDataExploracionFisica.resumenExploracionFisica = newValue;
});

watch(resumenExploracionFisicaPregunta, async (newValue) => {
    // Si el cambio lo hizo el sistema (siguiendo los hallazgos), no se mueve el cursor
    const porHallazgos = cambioPorHallazgos;
    if (newValue === 'No') {
        if (montado) usuarioEligioNo = !porHallazgos;
        resumenExploracionFisica.value = textoPorDefecto.value;
    }
    if (newValue === 'Si') {
        const actual = resumenExploracionFisica.value;
        if (!actual || actual === textoPorDefecto.value) {
            resumenExploracionFisica.value = resumenAutomatico.value || '';
        }
        await nextTick();
        if (montado && !porHallazgos) textareaHallazgos.value?.focus();
    }
});

const OPCIONES_NO_SI = [
    { valor: 'No', etiqueta: 'No' },
    { valor: 'Si', etiqueta: 'Sí' },
];
</script>

<template>
    <div>
        <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Resumen de la exploración física</h1>
        <div data-campo="resumenExploracionFisica">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <p :class="[CLASE_ETIQUETA, 'leading-tight']">Hallazgos significativos</p>
                    <p :class="[CLASE_AYUDA, 'mt-0.5']">¿Hay hallazgos significativos por resumir?</p>
                </div>
                <OpcionesSegmentadas
                    v-model="resumenExploracionFisicaPregunta"
                    compacto
                    class="shrink-0"
                    name="resumenExploracionFisicaPregunta"
                    etiqueta="Hallazgos significativos"
                    :opciones="OPCIONES_NO_SI"
                />
            </div>
            <p v-if="resumenExploracionFisicaPregunta === 'No'" :class="[CLASE_AYUDA, 'mt-2']">
                Se registrará: «{{ textoPorDefecto }}».
            </p>
            <div v-else class="mt-3">
                <label for="resumenExploracionFisica" :class="[CLASE_ETIQUETA, 'mb-1']">
                    Resumen de hallazgos <span class="text-red-500">*</span>
                </label>
                <p v-if="resumenAutomatico" :class="[CLASE_AYUDA, 'mb-1 flex items-start gap-1.5']">
                    <i class="fas fa-info-circle text-emerald-600 mt-0.5" aria-hidden="true"></i>
                    Se llenó con los hallazgos de la exploración; puede editarlo.
                </p>
                <textarea
                    id="resumenExploracionFisica"
                    ref="textareaHallazgos"
                    v-model="resumenExploracionFisica"
                    rows="4"
                    :class="CLASE_TEXTAREA"
                    placeholder="Describa los hallazgos relevantes..."
                ></textarea>
            </div>
        </div>
    </div>
</template>
