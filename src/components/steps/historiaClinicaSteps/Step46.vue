<script setup>
/**
 * Resumen de la historia clínica (puntos 55 y siguientes, decisiones del usuario):
 * - Sin respuesta se elige según los hallazgos: «Sí» con el borrador si hay, «No» si no.
 *   Con vista previa, al llegar a este paso (guardar sin haber llegado lleva aquí); en la
 *   captura rápida desde el principio, y luego sigue a los hallazgos mientras el usuario no
 *   elija «No» a mano ni escriba su propio texto.
 * - Al guardar no se genera nada: sin contestar (o «Sí» sin texto) lo pide el aviso.
 * Al editar, la respuesta se deduce del texto guardado (el servidor no la guarda).
 */
import { ref, onMounted, nextTick, computed, toRefs, watch } from 'vue';
import {
    preguntaResumenHistoriaClinica,
    resumenAutomaticoHistoriaClinica,
    textoResumenPorDefecto,
} from '@/helpers/historiaClinicaGuardado';
import OpcionesSegmentadas from '@/components/steps/captura/OpcionesSegmentadas.vue';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { CLASE_AYUDA, CLASE_ETIQUETA, CLASE_TEXTAREA } from '@/components/steps/captura/estiloCaptura';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const props = defineProps({
    variant: {
        type: String,
        default: 'fullscreen',
        validator: (v) => ['fullscreen', 'compact'].includes(v),
    },
});
const { variant } = toRefs(props);

const trabajadores = useTrabajadoresStore();
const { formDataHistoriaClinica } = useFormDataStore();
const documentos = useDocumentosStore();

const esMujer = () => trabajadores.currentTrabajador?.sexo === 'Femenino';
// Con «No» se guarda este texto (prepararHistoriaClinicaParaGuardar)
const textoPorDefecto = computed(() => textoResumenPorDefecto(esMujer()));

const capturaRapida = enCapturaRapida();
const pregunta = ref('');
const resumen = ref('');
const textarea = ref(null);

// Hallazgos de los antecedentes personales y del accidente laboral (mismo cálculo que el borrador)
const resumenAutomatico = computed(() => resumenAutomaticoHistoriaClinica(formDataHistoriaClinica));

onMounted(() => {
    // Lo de la sesión (al volver al paso o cambiar de modo) o, al editar, lo guardado
    const enSesion =
        formDataHistoriaClinica.resumenHistoriaClinicaPregunta ||
        formDataHistoriaClinica.resumenHistoriaClinica;
    const origen = enSesion || !documentos.currentDocument ? formDataHistoriaClinica : documentos.currentDocument;
    pregunta.value = preguntaResumenHistoriaClinica(origen, esMujer());
    resumen.value = origen.resumenHistoriaClinica || '';
    // Sin respuesta se elige según los hallazgos (decisión del usuario): con vista previa al
    // llegar a este paso; en la captura rápida desde el principio («No») y luego los sigue
    if (!pregunta.value) seguirHallazgos(resumenAutomatico.value);
    ultimoAutomatico = resumenAutomatico.value;
});

// Captura rápida: la sección está abierta mientras se capturan los hallazgos. La respuesta los
// sigue («Sí» con el borrador si aparecen, «No» si se quitan) mientras el usuario no elija «No»
// a mano ni escriba su propio texto.
let ultimoAutomatico = '';
let usuarioEligioNo = false;
function seguirHallazgos(automatico) {
    if (automatico) {
        pregunta.value = 'Si';
        resumen.value = automatico;
    } else {
        pregunta.value = 'No';
        resumen.value = textoPorDefecto.value;
    }
}
watch(resumenAutomatico, (nuevo) => {
    if (!capturaRapida) return;
    const textoAutomatico = !resumen.value || resumen.value === ultimoAutomatico || resumen.value === textoPorDefecto.value;
    if (pregunta.value === 'No' ? !usuarioEligioNo : textoAutomatico) seguirHallazgos(nuevo);
    ultimoAutomatico = nuevo;
});

// La vista vacía el formulario al montarse (captura rápida: este paso ya está montado): se repone.
// Solo en ese momento: después, vaciarlo es intencional («Empezar en blanco», punto 54)
let recienMontado = true;
onMounted(() => setTimeout(() => (recienMontado = false), 0));
watch(
    () => [formDataHistoriaClinica.resumenHistoriaClinicaPregunta, formDataHistoriaClinica.resumenHistoriaClinica],
    ([p, r]) => {
        if (!recienMontado) return;
        if (!p && pregunta.value) formDataHistoriaClinica.resumenHistoriaClinicaPregunta = pregunta.value;
        if (!r && resumen.value) formDataHistoriaClinica.resumenHistoriaClinica = resumen.value;
    },
);

watch(pregunta, (valor) => {
    formDataHistoriaClinica.resumenHistoriaClinicaPregunta = valor;
});
watch(resumen, (valor) => {
    formDataHistoriaClinica.resumenHistoriaClinica = valor;
});

/** Solo la elección del usuario cambia el texto. */
async function alElegir(valor) {
    usuarioEligioNo = valor === 'No';
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
        <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Resumen Historia Clínica</h1>
        <div data-campo="resumenHistoriaClinica">
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
                    name="resumenHistoriaClinicaPregunta"
                    etiqueta="Hallazgos significativos"
                    :opciones="OPCIONES_NO_SI"
                />
            </div>
            <p v-if="!pregunta" :class="[CLASE_AYUDA, 'mt-2']" data-hallazgos-capturados>
                {{ resumenAutomatico ? `Hallazgos capturados: ${resumenAutomatico}` : 'Sin hallazgos capturados en los antecedentes personales.' }}
            </p>
            <p v-else-if="pregunta === 'No'" :class="[CLASE_AYUDA, 'mt-2']">
                Se registrará: «{{ textoPorDefecto }}».
            </p>
            <div v-else class="mt-3">
                <label for="resumenHistoriaClinica" :class="[CLASE_ETIQUETA, 'mb-1']">
                    Resumen de hallazgos <span class="text-red-500">*</span>
                </label>
                <p v-if="resumenAutomatico && resumen === resumenAutomatico" :class="[CLASE_AYUDA, 'mb-1 flex items-start gap-1.5']">
                    <i class="fas fa-info-circle text-emerald-600 mt-0.5" aria-hidden="true"></i>
                    Se llenó con los hallazgos de los antecedentes personales; puede editarlo.
                </p>
                <textarea
                    id="resumenHistoriaClinica"
                    ref="textarea"
                    v-model="resumen"
                    rows="4"
                    :class="CLASE_TEXTAREA"
                    placeholder="Hallazgos relevantes de los antecedentes"
                ></textarea>
            </div>
        </div>
    </div>
</template>
