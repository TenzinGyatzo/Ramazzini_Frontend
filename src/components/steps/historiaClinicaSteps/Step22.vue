<script setup>
import { watch, ref, onMounted, onUnmounted, nextTick, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import AntecedenteSiNoChips from './AntecedenteSiNoChips.vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const { formDataHistoriaClinica } = useFormDataStore();
const documentos = useDocumentosStore();

// Valor local para la pregunta principal
const alcoholismo = ref('No');

// Referencia al input de texto
const inputEspecificar = ref(null);

onMounted(() => {
    if (documentos.currentDocument) {
        // Si se está editando un documento, usa los valores existentes
        alcoholismo.value = documentos.currentDocument.alcoholismo || 'No';

    } else {
        // Si es un documento nuevo, usa valores predeterminados o lo que ya exista en formData
        alcoholismo.value = formDataHistoriaClinica.alcoholismo || 'No';
    }
});

onUnmounted(() => {
    // Asegurar que formData tenga un valor inicial para alcoholismo
    if (!formDataHistoriaClinica.alcoholismo) {
        formDataHistoriaClinica.alcoholismo = alcoholismo.value;
    }

    if (!formDataHistoriaClinica.alcoholismoEspecificar) {
        formDataHistoriaClinica.alcoholismoEspecificar = 'Negado';
    }
});


// Sincronizar alcoholismo con formData
watch(alcoholismo, (newValue) => {
    formDataHistoriaClinica.alcoholismo = newValue;
});

// Watch para establecer 'Negado' cuando alcoholismo sea 'No' y enfocar input cuando sea 'Si'
watch(alcoholismo, async (newValue) => {
    if (newValue === 'No') {
        formDataHistoriaClinica.alcoholismoEspecificar = 'Negado';
    }
    if (newValue === 'Si') {
        // Esperar a que el DOM se actualice y luego enfocar el input
        await nextTick();
        if (inputEspecificar.value) {
            inputEspecificar.value.focus();
        }
    }
});
</script>

<template>
    <div>
        <template v-if="variant === 'compact'">
            <AntecedenteSiNoChips
                label="ALCOHOLISMO"
                question="¿El trabajador consume alcohol o cuenta con antecedentes de consumo de alcohol?"
                v-model="alcoholismo"
                v-model:especificar="formDataHistoriaClinica.alcoholismoEspecificar"
                placeholder="Especifique"
            />
        </template>
        <template v-else>
        <h1 class="text-2xl font-bold mb-4 text-gray-900">Antecedentes No Patológicos</h1>
        <h2 class="text-lg font-semibold mb-4 text-gray-700">ALCOHOLISMO</h2>
        <div class="mb-8">
            <p class="text-lg font-medium mb-4 text-gray-800">¿El trabajador consume alcohol o cuenta con antecedentes de consumo de alcohol?</p>
            <div class="grid grid-cols-2 gap-3">
                <label 
                    :class="[
                        'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        alcoholismo === 'No' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input type="radio" value="No" v-model="alcoholismo" class="sr-only" />
                    <div 
                        :class="[
                            'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
                            alcoholismo === 'No' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                        ]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200',
                            alcoholismo === 'No' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >No</span>
                    <div v-if="alcoholismo === 'No'" class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>
                <label 
                    :class="[
                        'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        alcoholismo === 'Si' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input type="radio" value="Si" v-model="alcoholismo" class="sr-only" />
                    <div 
                        :class="[
                            'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
                            alcoholismo === 'Si' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                        ]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200',
                            alcoholismo === 'Si' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >Sí</span>
                    <div v-if="alcoholismo === 'Si'" class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
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
            <div v-if="alcoholismo === 'Si'" class="mt-6">
                <p class="text-lg font-medium mb-3 text-gray-800">Especifique:</p>
                <div>
                    <input 
                        ref="inputEspecificar"
                        type="text"
                        class="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                        v-model="formDataHistoriaClinica.alcoholismoEspecificar"
                        placeholder="Especifique"
                        required
                    >
                </div>
            </div>
        </transition>
        </template>
    </div>
</template>
