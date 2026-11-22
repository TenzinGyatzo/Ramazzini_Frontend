<script setup>
import { ref, watch, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useDocumentosStore } from '@/stores/documentos';

const mensajeCopiado = ref(false);

const trabajadores = useTrabajadoresStore();
const { formDataCertificadoExpedito } = useFormDataStore();
const documentos = useDocumentosStore();

const inicioSugerido = "Se encuentra con BUEN estado de salud, niega alergias, niega enfermedades crónicas, en la exploración física no se encuentran defectos ni anormalidades físicas; presentando integras su agudeza visual y auditiva. Su aparato cardio-respiratorio en óptimas condiciones, el examen neurológico revela buena coordinación y reflejos, sin alteraciones musculares y buen equilibrio."

// Valor local para la cuerpoCertificado principal, inicializado con el valor actual del store o el inicio sugerido
const cuerpoCertificado = ref(formDataCertificadoExpedito.cuerpoCertificado || inicioSugerido);

// Sincronizar el valor seleccionado con formDataCertificadoExpedito.cuerpoCertificado
watch(cuerpoCertificado, (newValue) => {
    formDataCertificadoExpedito.cuerpoCertificado = newValue;
});

onMounted(async () => {
    if (documentos.currentDocument) {
        cuerpoCertificado.value = documentos.currentDocument.cuerpoCertificado;
    } else {
        if (!formDataCertificadoExpedito.cuerpoCertificado) {
            formDataCertificadoExpedito.cuerpoCertificado = inicioSugerido;
        }
        cuerpoCertificado.value = formDataCertificadoExpedito.cuerpoCertificado;
    }
});

const openSections = ref({});

const toggle = (section) => {
    openSections.value[section] = !openSections.value[section];
};

const isOpen = (section) => {
    return !!openSections.value[section];
};

// Función para copiar el texto al portapapeles
const copiarTexto = (texto) => {
    navigator.clipboard.writeText(texto).then(() => {
        // Mostrar mensaje temporal de "Copiado"
        mensajeCopiado.value = true;
        setTimeout(() => {
          mensajeCopiado.value = false;
        }, 2000); // Mensaje se oculta después de 2 segundos
    }).catch((err) => {
        console.error('Error al copiar el texto: ', err);
    });
};

</script>

<template>
    <h1 class="font-bold mb-4 text-gray-800 leading-5">Certificado</h1>
    <div class="mb-4">
        <h2 class="text-lg font-semibold mb-4 text-gray-800">Cuerpo del Certificado</h2>
        <p class="text-sm font-medium mb-1 text-gray-800 leading-4">Ajustar descripción:</p>
        <div data-campo="cuerpoCertificado" class="font-light mb-4">
            <textarea
                class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 custom-height"
                v-model="formDataCertificadoExpedito.cuerpoCertificado" placeholder="Escriba el cuerpo del certificado..." required>
            </textarea>
        </div>
        <!-- <div class="mb-4">
            <p class="font-medium mb-1 text-gray-800 leading-5">Inicio de texto sugerido: </p>
            <p class="text-sm font-light mb-4 italic text-gray-700 hover:text-emerald-700 cursor-pointer leading-5 text-justify"
                @click="copiarTexto(inicioSugerido)">{{ inicioSugerido }}</p>
        </div> -->
    </div>
</template>

<style scoped>
textarea.custom-height {
    height: 280px !important;
}
</style>