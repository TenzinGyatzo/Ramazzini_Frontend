<script setup>
import { watch, ref, onMounted, onUnmounted, toRefs } from 'vue';
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

const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();

const observaciones = ref('');

onMounted(() => {
    if (documentos.currentDocument && documentos.currentDocument.observaciones !== '') {
        observaciones.value = documentos.currentDocument.observaciones;
    }

    if (formDataNotaMedica.observaciones) {
        observaciones.value = formDataNotaMedica.observaciones;
    }
});

onUnmounted(() => {
    if (!formDataNotaMedica.observaciones) {
        formDataNotaMedica.observaciones = '';
    }
});

watch(observaciones, (newValue) => {
    formDataNotaMedica.observaciones = newValue;
});
</script>

<template>
    <div>
        <h2
            v-if="variant !== 'compact'"
            class="text-2xl font-bold text-gray-900 mb-4 uppercase"
        >
            Observaciones
        </h2>
        <p
            v-else
            class="text-sm font-semibold text-gray-800 mb-2"
        >
            Observaciones
        </p>
        <div :class="variant === 'compact' ? 'mt-2' : 'mt-4'">
            <div class="font-light">
                <textarea
                    :class="variant === 'compact'
                        ? 'w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-32'
                        : 'w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-48'"
                    v-model="observaciones"
                    required
                    data-skip-validation
                >
                </textarea>
            </div>
        </div>
    </div>
</template>
