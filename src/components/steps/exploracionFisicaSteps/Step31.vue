<script setup>
import { watch, ref, onMounted, onUnmounted, nextTick, computed, toRefs } from 'vue';
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
const { formDataExploracionFisica } = useFormDataStore();
const documentos = useDocumentosStore();

const textoClinicamenteSano = computed(() =>
  trabajadores.currentTrabajador?.sexo === 'Femenino'
    ? 'Se encuentra clínicamente sana'
    : 'Se encuentra clínicamente sano',
);

// Valor local para la pregunta principal
const resumenExploracionFisicaPregunta = ref('No');
const resumenExploracionFisica = ref('');

// Referencia al textarea
const textareaHallazgos = ref(null);

// Lista de todos los campos de hallazgos desde Step4 hasta Step30
const camposHallazgos = [
    'craneoCara',
    'ojos',
    'oidos',
    'nariz',
    'boca',
    'cuello',
    'hombros',
    'codos',
    'manos',
    'reflejosOsteoTendinososSuperiores',
    'vascularESuperiores',
    'torax',
    'abdomen',
    'cadera',
    'rodillas',
    'tobillosPies',
    'reflejosOsteoTendinososInferiores',
    'vascularEInferiores',
    'inspeccionColumna',
    'movimientosColumna',
    'lesionesPiel',
    'cicatrices',
    'nevos',
    'coordinacion',
    'sensibilidad',
    'equilibrio',
    'marcha'
];

// Computed para generar el resumen automáticamente
const resumenAutomatico = computed(() => {
    const hallazgosSignificativos = camposHallazgos
        .filter(campo => {
            const valor = formDataExploracionFisica[campo];
            return valor && valor !== 'Sin hallazgos' && valor.trim() !== '';
        })
        .map(campo => formDataExploracionFisica[campo]);
    
    if (hallazgosSignificativos.length > 0) {
        return hallazgosSignificativos.join('. ') + '.';
    }
    
    return '';
});

onMounted(() => {
    const textoDefecto = textoClinicamenteSano.value;
    const tieneSesion =
        (formDataExploracionFisica.resumenExploracionFisicaPregunta !== undefined &&
            formDataExploracionFisica.resumenExploracionFisicaPregunta !== null &&
            formDataExploracionFisica.resumenExploracionFisicaPregunta !== '') ||
        (formDataExploracionFisica.resumenExploracionFisica !== undefined &&
            formDataExploracionFisica.resumenExploracionFisica !== null &&
            formDataExploracionFisica.resumenExploracionFisica !== '');

    // Preferir formData (sesión) para no perder cambios al remontar la sección V2.
    if (tieneSesion) {
        if (resumenAutomatico.value) {
            resumenExploracionFisicaPregunta.value = 'Si';
            const valorSesion = formDataExploracionFisica.resumenExploracionFisica || '';
            resumenExploracionFisica.value =
                !valorSesion || valorSesion === textoDefecto
                    ? resumenAutomatico.value
                    : valorSesion;
            formDataExploracionFisica.resumenExploracionFisicaPregunta = 'Si';
            formDataExploracionFisica.resumenExploracionFisica = resumenExploracionFisica.value;
        } else {
            const valorPrevio = formDataExploracionFisica.resumenExploracionFisica;
            if (!valorPrevio || valorPrevio === textoDefecto) {
                resumenExploracionFisicaPregunta.value = 'No';
                resumenExploracionFisica.value = textoDefecto;
            } else {
                resumenExploracionFisicaPregunta.value =
                    formDataExploracionFisica.resumenExploracionFisicaPregunta || 'Si';
                resumenExploracionFisica.value = valorPrevio;
            }
        }
    } else if (documentos.currentDocument) {
        const resumenDoc = documentos.currentDocument.resumenExploracionFisica || '';
        resumenExploracionFisica.value = resumenDoc;
        if (resumenAutomatico.value || (resumenDoc && resumenDoc !== textoDefecto)) {
            resumenExploracionFisicaPregunta.value = 'Si';
        } else {
            resumenExploracionFisicaPregunta.value =
                documentos.currentDocument.resumenExploracionFisicaPregunta || 'No';
        }
    } else if (resumenAutomatico.value) {
        resumenExploracionFisicaPregunta.value = 'Si';
        resumenExploracionFisica.value = resumenAutomatico.value;
        formDataExploracionFisica.resumenExploracionFisicaPregunta = 'Si';
        formDataExploracionFisica.resumenExploracionFisica = resumenAutomatico.value;
    } else {
        resumenExploracionFisicaPregunta.value = 'No';
    }
});

onUnmounted(() => {
    // Guardar el estado actual de la pregunta
    formDataExploracionFisica.resumenExploracionFisicaPregunta = resumenExploracionFisicaPregunta.value;

    // Guardar el resumen según el estado de la pregunta
    if (resumenExploracionFisicaPregunta.value === 'No') {
        formDataExploracionFisica.resumenExploracionFisica = trabajadores.currentTrabajador.sexo === 'Femenino'
            ? 'Se encuentra clínicamente sana'
            : 'Se encuentra clínicamente sano';
    } else {
        // Si es "Si", guardar el resumen actual (ya sea automático o editado por el usuario)
        formDataExploracionFisica.resumenExploracionFisica = resumenExploracionFisica.value || resumenAutomatico.value || '';
    }
});

// Sincronizar resumenExploracionFisicaPregunta con formData
watch(resumenExploracionFisicaPregunta, (newValue) => {
    formDataExploracionFisica.resumenExploracionFisicaPregunta = newValue;
});

// Sincronizar el contenido del textarea con formData
watch(resumenExploracionFisica, (newValue) => {
    formDataExploracionFisica.resumenExploracionFisica = newValue;
});

// Watch para establecer 'Se encuentra clínicamente sano/a' cuando resumenExploracionFisicaPregunta sea 'No' y enfocar textarea cuando sea 'Si'
watch(resumenExploracionFisicaPregunta, async (newValue, oldValue) => {
    if (oldValue === undefined || oldValue === newValue) return;
    if (newValue === 'No') {
        formDataExploracionFisica.resumenExploracionFisica = textoClinicamenteSano.value;
        resumenExploracionFisica.value = formDataExploracionFisica.resumenExploracionFisica;
    }
    if (newValue === 'Si') {
        const textoDefecto = textoClinicamenteSano.value;
        
        // Si el resumen actual es el texto por defecto o está vacío, cargar hallazgos automáticos
        if (resumenAutomatico.value && (!resumenExploracionFisica.value || resumenExploracionFisica.value === textoDefecto)) {
            resumenExploracionFisica.value = resumenAutomatico.value;
            formDataExploracionFisica.resumenExploracionFisica = resumenAutomatico.value;
        } else if (!resumenExploracionFisica.value || resumenExploracionFisica.value === textoDefecto) {
            // Si no hay hallazgos automáticos, limpiar el campo
            resumenExploracionFisica.value = '';
            formDataExploracionFisica.resumenExploracionFisica = '';
        }
        
        // Esperar a que el DOM se actualice y luego enfocar el textarea
        await nextTick();
        if (textareaHallazgos.value) {
            textareaHallazgos.value.focus();
        }
    }
});
</script>

<template>
    <div>
        <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Evaluación Exploración Física</h1>
        <h2 v-if="variant !== 'compact'" class="text-lg font-semibold mb-4 text-gray-700">RESUMEN</h2>
        
        <div :class="variant === 'compact' ? 'mb-3' : 'mb-8'">
            <p :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-4 text-gray-800'">
                ¿Hay hallazgos significativos por resumir?
            </p>
            
            <!-- Botones grandes tipo card (igual que resumen HC) -->
            <div class="grid grid-cols-2 gap-3">
                <label 
                    :class="[
                        'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        resumenExploracionFisicaPregunta === 'No' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="No" 
                        v-model="resumenExploracionFisicaPregunta" 
                        class="sr-only" 
                    />
                    <div 
                        :class="[
                            'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
                            resumenExploracionFisicaPregunta === 'No' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                        ]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200',
                            resumenExploracionFisicaPregunta === 'No' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >
                        No
                    </span>
                    <div 
                        v-if="resumenExploracionFisicaPregunta === 'No'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <label 
                    :class="[
                        'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        resumenExploracionFisicaPregunta === 'Si' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="Si" 
                        v-model="resumenExploracionFisicaPregunta" 
                        class="sr-only" 
                    />
                    <div 
                        :class="[
                            'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
                            resumenExploracionFisicaPregunta === 'Si' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                        ]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200',
                            resumenExploracionFisicaPregunta === 'Si' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >
                        Sí
                    </span>
                    <div 
                        v-if="resumenExploracionFisicaPregunta === 'Si'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>
            </div>
        </div>

        <transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 transform -translate-y-2"
            enter-to-class="opacity-100 transform translate-y-0"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 transform translate-y-0"
            leave-to-class="opacity-0 transform -translate-y-2"
        >
            <div v-if="resumenExploracionFisicaPregunta === 'Si'" :class="variant === 'compact' ? 'mt-3' : 'mt-6'">
                <p :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-3 text-gray-800'">
                    Resumen de hallazgos:
                </p>
                
                <div v-if="resumenAutomatico" class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p class="text-sm text-blue-800">
                        Se han detectado hallazgos en los pasos anteriores. El resumen se ha cargado automáticamente, puede editarlo si lo desea.
                    </p>
                </div>
                
                <div>
                    <textarea
                        ref="textareaHallazgos"
                        class="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200 min-h-[120px] resize-y"
                        v-model="resumenExploracionFisica"
                        placeholder="Describa los hallazgos relevantes..."
                        required
                    ></textarea>
                </div>
            </div>
        </transition>
    </div>
</template>