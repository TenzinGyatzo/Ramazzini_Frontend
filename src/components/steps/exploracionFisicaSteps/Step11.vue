<script setup>
import { watch, ref, onMounted, onUnmounted, nextTick, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import HallazgoSiNoChips from './HallazgoSiNoChips.vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const { formDataExploracionFisica } = useFormDataStore();
const documentos = useDocumentosStore();

const codosPregunta = ref('No');
const codos = ref('');
const textareaHallazgos = ref(null);

onMounted(() => {
    // Preferir formData (sesión) para no perder cambios al remontar la sección V2.
    if (formDataExploracionFisica.codosPregunta !== undefined && formDataExploracionFisica.codosPregunta !== null && formDataExploracionFisica.codosPregunta !== '') {
        codosPregunta.value = formDataExploracionFisica.codosPregunta;
        codos.value = formDataExploracionFisica.codos || '';
    } else if (formDataExploracionFisica.codos !== undefined && formDataExploracionFisica.codos !== null && formDataExploracionFisica.codos !== '') {
        codos.value = formDataExploracionFisica.codos;
        codosPregunta.value = formDataExploracionFisica.codosPregunta || (formDataExploracionFisica.codos !== 'Sin hallazgos' ? 'Si' : 'No');
    } else if (documentos.currentDocument) {
        codosPregunta.value = documentos.currentDocument.codosPregunta || 'No';
        codos.value = documentos.currentDocument.codos || '';
    } else {
        codosPregunta.value = formDataExploracionFisica.codosPregunta || 'No';
        codos.value = formDataExploracionFisica.codos || '';
    }
});

onUnmounted(() => {
    if (!formDataExploracionFisica.codosPregunta) {
        formDataExploracionFisica.codosPregunta = codosPregunta.value;
    }
    if (!formDataExploracionFisica.codos) {
        formDataExploracionFisica.codos = 'Sin hallazgos';
    }
});

watch(codosPregunta, (newValue) => {
    formDataExploracionFisica.codosPregunta = newValue;
});

watch(codos, (newValue) => {
    formDataExploracionFisica.codos = newValue;
});

watch(codosPregunta, async (newValue, oldValue) => {
    // Solo cambios del usuario (no montaje / remount).
    if (oldValue === undefined || oldValue === newValue) return;
    if (newValue === 'No') {
        formDataExploracionFisica.codos = 'Sin hallazgos';
        codos.value = 'Sin hallazgos';
    }
    if (newValue === 'Si') {
        const cur = (codos.value || formDataExploracionFisica.codos || '').trim();
        if (cur === 'Sin hallazgos') {
            codos.value = '';
            formDataExploracionFisica.codos = '';
        } else {
            formDataExploracionFisica.codos = codos.value || formDataExploracionFisica.codos;
        }
        await nextTick();
        if (textareaHallazgos.value) {
            textareaHallazgos.value.focus();
        }
    }
});
</script>

<template>
    <div>
        <template v-if="variant === 'compact'">
            <HallazgoSiNoChips
                label="CODOS"
                question="¿Presencia de hallazgos significativos?"
                v-model="codosPregunta"
                v-model:especificar="formDataExploracionFisica.codos"
                placeholder="Describa los hallazgos encontrados..."
            />
        </template>
        <template v-else>
        <h1 class="text-2xl font-bold mb-4 text-gray-900">Extremidades Superiores</h1>
        <h2 class="text-lg font-semibold mb-4 text-gray-700">CODOS</h2>
        
        <div class="mb-8">
            <p class="text-lg font-medium mb-4 text-gray-800">¿Presencia de hallazgos significativos?</p>
            
            <div class="grid grid-cols-2 gap-3">
                <label 
                    :class="[
                        'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        codosPregunta === 'No' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="No" 
                        v-model="codosPregunta" 
                        class="sr-only" 
                    />
                    <div 
                        :class="[
                            'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
                            codosPregunta === 'No' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                        ]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200',
                            codosPregunta === 'No' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >
                        No
                    </span>
                    <div 
                        v-if="codosPregunta === 'No'"
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
                        codosPregunta === 'Si' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="Si" 
                        v-model="codosPregunta" 
                        class="sr-only" 
                    />
                    <div 
                        :class="[
                            'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
                            codosPregunta === 'Si' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                        ]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200',
                            codosPregunta === 'Si' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >
                        Sí
                    </span>
                    <div 
                        v-if="codosPregunta === 'Si'"
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
            <div v-if="codosPregunta === 'Si'" class="mt-6">
                <p class="text-lg font-medium mb-3 text-gray-800">Hallazgos:</p>
                <div>
                    <textarea
                        ref="textareaHallazgos"
                        class="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200 min-h-[120px] resize-y"
                        v-model="formDataExploracionFisica.codos"
                        placeholder="Describa los hallazgos encontrados..."
                        required
                    ></textarea>
                </div>
            </div>
        </transition>
        </template>
    </div>
</template>
