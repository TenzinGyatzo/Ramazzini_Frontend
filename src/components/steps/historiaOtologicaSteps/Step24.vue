<script setup>
import { watch, ref, onMounted, onUnmounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const formDataStore = useFormDataStore();
const documentos = useDocumentosStore();

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const otoscopiaOidoDerecho = ref('PERMEABLE');
const otoscopiaOidoIzquierdo = ref('PERMEABLE');

function syncToStore(od, oi) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    otoscopiaOidoDerecho: od,
    otoscopiaOidoIzquierdo: oi,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    otoscopiaOidoDerecho.value =
      documentos.currentDocument.otoscopiaOidoDerecho || 'PERMEABLE';
    otoscopiaOidoIzquierdo.value =
      documentos.currentDocument.otoscopiaOidoIzquierdo || 'PERMEABLE';
  } else {
    otoscopiaOidoDerecho.value =
      formDataStore.formDataHistoriaOtologica.otoscopiaOidoDerecho || 'PERMEABLE';
    otoscopiaOidoIzquierdo.value =
      formDataStore.formDataHistoriaOtologica.otoscopiaOidoIzquierdo || 'PERMEABLE';
  }
  syncToStore(otoscopiaOidoDerecho.value, otoscopiaOidoIzquierdo.value);
});

onUnmounted(() => {
  const data = formDataStore.formDataHistoriaOtologica;
  if (!data.otoscopiaOidoDerecho || !data.otoscopiaOidoIzquierdo) {
    syncToStore(otoscopiaOidoDerecho.value, otoscopiaOidoIzquierdo.value);
  }
});

watch(otoscopiaOidoDerecho, (newValue) => {
  syncToStore(newValue, otoscopiaOidoIzquierdo.value);
});

watch(otoscopiaOidoIzquierdo, (newValue) => {
  syncToStore(otoscopiaOidoDerecho.value, newValue);
});

</script>

<template>
    <div>
        <!-- Jerarquía Visual Mejorada -->
        <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">OTOSCOPIA</h1>
        <p v-else class="text-sm font-semibold mb-2 text-gray-800">OTOSCOPIA</p>
        
        <!-- Sección Oído Derecho -->
        <div :class="variant === 'compact' ? 'mb-3' : 'mb-8'">
            <h2 :class="variant === 'compact' ? 'text-sm font-semibold mb-2 text-gray-800' : 'text-lg font-semibold mb-4 text-gray-700'">Oído Derecho</h2>
            
            <!-- Pregunta principal con mejor jerarquía -->
            <div class="mb-6">
                
                <!-- Diseño de Radio Buttons más Visual tipo Card sin iconos -->
                <div class="grid grid-cols-2 gap-3">
                    <!-- Opción Permeable -->
                    <label 
                        :class="[
                            'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                            otoscopiaOidoDerecho === 'PERMEABLE' 
                                ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                        ]"
                    >
                        <input 
                            type="radio" 
                            value="PERMEABLE" 
                            v-model="otoscopiaOidoDerecho" 
                            class="sr-only" 
                        />
                        <span 
                            :class="[
                                'text-sm transition-colors duration-200',
                                otoscopiaOidoDerecho === 'PERMEABLE' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                            ]"
                        >
                            PERMEABLE
                        </span>
                        <!-- Indicador de selección -->
                        <div 
                            v-if="otoscopiaOidoDerecho === 'PERMEABLE'"
                            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </label>

                    <!-- Opción No Permeable -->
                    <label 
                        :class="[
                            'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                            otoscopiaOidoDerecho === 'NO PERMEABLE' 
                                ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                        ]"
                    >
                        <input 
                            type="radio" 
                            value="NO PERMEABLE" 
                            v-model="otoscopiaOidoDerecho" 
                            class="sr-only" 
                        />
                        <span 
                            :class="[
                                'text-sm transition-colors duration-200',
                                otoscopiaOidoDerecho === 'NO PERMEABLE' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                            ]"
                        >
                            NO PERMEABLE
                        </span>
                        <!-- Indicador de selección -->
                        <div 
                            v-if="otoscopiaOidoDerecho === 'NO PERMEABLE'"
                            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </label>
                </div>
            </div>
        </div>

        <!-- Sección Oído Izquierdo -->
        <div class="mb-8">
            <h2 :class="variant === 'compact' ? 'text-sm font-semibold mb-2 text-gray-800' : 'text-lg font-semibold mb-4 text-gray-700'">Oído Izquierdo</h2>
            
            <!-- Pregunta principal con mejor jerarquía -->
            <div class="mb-6">
                
                <!-- Diseño de Radio Buttons más Visual tipo Card sin iconos -->
                <div class="grid grid-cols-2 gap-3">
                    <!-- Opción Permeable -->
                    <label 
                        :class="[
                            'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                            otoscopiaOidoIzquierdo === 'PERMEABLE' 
                                ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                        ]"
                    >
                        <input 
                            type="radio" 
                            value="PERMEABLE" 
                            v-model="otoscopiaOidoIzquierdo" 
                            class="sr-only" 
                        />
                        <span 
                            :class="[
                                'text-sm transition-colors duration-200',
                                otoscopiaOidoIzquierdo === 'PERMEABLE' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                            ]"
                        >
                            PERMEABLE
                        </span>
                        <!-- Indicador de selección -->
                        <div 
                            v-if="otoscopiaOidoIzquierdo === 'PERMEABLE'"
                            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </label>

                    <!-- Opción No Permeable -->
                    <label 
                        :class="[
                            'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                            otoscopiaOidoIzquierdo === 'NO PERMEABLE' 
                                ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                        ]"
                    >
                        <input 
                            type="radio" 
                            value="NO PERMEABLE" 
                            v-model="otoscopiaOidoIzquierdo" 
                            class="sr-only" 
                        />
                        <span 
                            :class="[
                                'text-sm transition-colors duration-200',
                                otoscopiaOidoIzquierdo === 'NO PERMEABLE' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                            ]"
                        >
                            NO PERMEABLE
                        </span>
                        <!-- Indicador de selección -->
                        <div 
                            v-if="otoscopiaOidoIzquierdo === 'NO PERMEABLE'"
                            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </label>
                </div>
            </div>
        </div>
    </div>
</template>