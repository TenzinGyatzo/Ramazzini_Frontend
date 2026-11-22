<script setup>
/**
 * Resumen de la exploración física. Punto 55, igual que el de la historia clínica (paso 46):
 * - En un documento nuevo la pregunta empieza sin respuesta y el sistema no la cambia solo.
 * - Mientras no se conteste, una nota dice qué hallazgos hay capturados.
 * - Al elegir «Sí», el texto se llena con esos hallazgos como borrador editable.
 * - Al guardar no se genera nada: sin contestar (o «Sí» sin texto) lo pide el aviso.
 * Al editar, la respuesta se deduce del texto guardado (el servidor no la guarda).
 */
import { ref, onMounted, nextTick, computed, toRefs, watch } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
    preguntaResumenExploracionFisica,
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

const esMujer = () => trabajadores.currentTrabajador?.sexo === 'Femenino';
// Con «No» se guarda este texto (prepararExploracionFisicaParaGuardar)
const textoPorDefecto = computed(() => textoResumenPorDefecto(esMujer()));

const pregunta = ref('');
const resumen = ref('');
const textarea = ref(null);

// Hallazgos de los pasos 4–30 (mismo cálculo que el borrador)
const resumenAutomatico = computed(() => resumenAutomaticoExploracionFisica(formDataExploracionFisica));

onMounted(() => {
    // Lo de la sesión (al volver al paso o cambiar de modo) o, al editar, lo guardado
    const enSesion =
        formDataExploracionFisica.resumenExploracionFisicaPregunta ||
        formDataExploracionFisica.resumenExploracionFisica;
    const origen = enSesion || !documentos.currentDocument ? formDataExploracionFisica : documentos.currentDocument;
    pregunta.value = preguntaResumenExploracionFisica(origen, esMujer());
    resumen.value = origen.resumenExploracionFisica || '';
});

watch(pregunta, (valor) => {
    formDataExploracionFisica.resumenExploracionFisicaPregunta = valor;
});
watch(resumen, (valor) => {
    formDataExploracionFisica.resumenExploracionFisica = valor;
});

/** Solo la elección del usuario cambia el texto. */
async function alElegir(valor) {
    if (valor === 'No') {
        resumen.value = textoPorDefecto.value;
        return;
    }
    if (!resumen.value || resumen.value === textoPorDefecto.value) resumen.value = resumenAutomatico.value || '';
    await nextTick();
    textarea.value?.focus();
}

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
                    <p :class="[CLASE_ETIQUETA, 'leading-tight']">
                        Hallazgos significativos <span class="text-red-500">*</span>
                    </p>
                    <p :class="[CLASE_AYUDA, 'mt-0.5']">¿Hay hallazgos significativos por resumir?</p>
                </div>
                <OpcionesSegmentadas
                    v-model="pregunta"
                    @update:model-value="alElegir"
                    compacto
                    class="shrink-0"
                    name="resumenExploracionFisicaPregunta"
                    etiqueta="Hallazgos significativos"
                    :opciones="OPCIONES_NO_SI"
                />
            </div>
            <p v-if="!pregunta" :class="[CLASE_AYUDA, 'mt-2']" data-hallazgos-capturados>
                {{ resumenAutomatico ? `Hallazgos capturados: ${resumenAutomatico}` : 'Sin hallazgos capturados en la exploración.' }}
            </p>
            <p v-else-if="pregunta === 'No'" :class="[CLASE_AYUDA, 'mt-2']">
                Se registrará: «{{ textoPorDefecto }}».
            </p>
            <div v-else class="mt-3">
                <label for="resumenExploracionFisica" :class="[CLASE_ETIQUETA, 'mb-1']">
                    Resumen de hallazgos <span class="text-red-500">*</span>
                </label>
                <p v-if="resumenAutomatico && resumen === resumenAutomatico" :class="[CLASE_AYUDA, 'mb-1 flex items-start gap-1.5']">
                    <i class="fas fa-info-circle text-emerald-600 mt-0.5" aria-hidden="true"></i>
                    Se llenó con los hallazgos de la exploración; puede editarlo.
                </p>
                <textarea
                    id="resumenExploracionFisica"
                    ref="textarea"
                    v-model="resumen"
                    rows="4"
                    :class="CLASE_TEXTAREA"
                    placeholder="Describa los hallazgos relevantes..."
                ></textarea>
            </div>
        </div>
    </div>
</template>
