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

const usoProteccionAuditiva = ref('SIEMPRE');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    usoProteccionAuditiva: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    usoProteccionAuditiva.value =
      documentos.currentDocument.usoProteccionAuditiva || 'SIEMPRE';
  } else {
    usoProteccionAuditiva.value =
      formDataStore.formDataHistoriaOtologica.usoProteccionAuditiva || 'SIEMPRE';
  }
  syncToStore(usoProteccionAuditiva.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.usoProteccionAuditiva) {
    syncToStore(usoProteccionAuditiva.value);
  }
});

watch(usoProteccionAuditiva, (newValue) => {
  syncToStore(newValue);
});

</script>

<template>
    <div>
        <!-- Jerarquía Visual Mejorada -->
        <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">USO DE PROTECCIÓN AUDITIVA</h1>
        <p v-else class="text-sm font-semibold mb-2 text-gray-800">USO DE PROTECCIÓN AUDITIVA</p>
        <h2 v-if="variant !== 'compact'" class="text-lg font-semibold mb-4 text-gray-700">Exposición a Ruido</h2>
        
        <!-- Pregunta principal con mejor jerarquía -->
        <div :class="variant === 'compact' ? 'mb-3' : 'mb-8'">
            <p :class="variant === 'compact' ? 'text-sm font-semibold mb-2 text-gray-800' : 'text-lg font-medium mb-4 text-gray-800'">¿Con que frecuencia usa protección auditiva?</p>
            
            <!-- Diseño de Radio Buttons más Visual tipo Card sin iconos -->
            <div class="grid grid-cols-2 gap-3">
                <!-- Opción No Aplica -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        usoProteccionAuditiva === 'NA' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="NA" 
                        v-model="usoProteccionAuditiva" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            usoProteccionAuditiva === 'NA' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        NA
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="usoProteccionAuditiva === 'NA'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción Siempre -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        usoProteccionAuditiva === 'SIEMPRE' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="SIEMPRE" 
                        v-model="usoProteccionAuditiva" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            usoProteccionAuditiva === 'SIEMPRE' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        SIEMPRE
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="usoProteccionAuditiva === 'SIEMPRE'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción A veces -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        usoProteccionAuditiva === 'A VECES' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="A VECES" 
                        v-model="usoProteccionAuditiva" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            usoProteccionAuditiva === 'A VECES' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        A VECES
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="usoProteccionAuditiva === 'A VECES'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción Nunca -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        usoProteccionAuditiva === 'NUNCA' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="NUNCA" 
                        v-model="usoProteccionAuditiva" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            usoProteccionAuditiva === 'NUNCA' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        NUNCA
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="usoProteccionAuditiva === 'NUNCA'"
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
</template>