<template>
  <div class="rich-text-editor">
    <div ref="editorRef" class="editor-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { sanitizeRichHtml } from '@/helpers/sanitizeRichHtml';

interface Props {
  modelValue?: string;
  placeholder?: string;
  readonly?: boolean;
  height?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Escribe aquí...',
  readonly: false,
  height: '200px'
});

const emit = defineEmits<Emits>();

const editorRef = ref<HTMLElement>();
let quillInstance: Quill | null = null;

const toolbarOptions = [
  [{ 'header': [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
  [{ 'indent': '-1'}, { 'indent': '+1' }],
  [{ 'align': [] }],
  ['link'],
  ['clean']
];

onMounted(async () => {
  await nextTick();
  
  if (editorRef.value) {
    quillInstance = new Quill(editorRef.value, {
      theme: 'snow',
      placeholder: props.placeholder,
      readOnly: props.readonly,
      modules: {
        toolbar: toolbarOptions
      }
    });

    // Establecer contenido inicial
    if (props.modelValue) {
      quillInstance.root.innerHTML = sanitizeRichHtml(props.modelValue);
    }

    // Escuchar cambios
    quillInstance.on('text-change', () => {
      if (quillInstance) {
        const html = sanitizeRichHtml(quillInstance.root.innerHTML);
        emit('update:modelValue', html);
      }
    });

    // Aplicar altura personalizada
    if (props.height) {
      editorRef.value.style.height = props.height;
    }
  }
});

watch(() => props.modelValue, (newValue) => {
  if (quillInstance) {
    const sanitized = sanitizeRichHtml(newValue);
    if (sanitized !== quillInstance.root.innerHTML) {
      quillInstance.root.innerHTML = sanitized;
    }
  }
});

watch(() => props.readonly, (newValue) => {
  if (quillInstance) {
    quillInstance.enable(!newValue);
  }
});

onUnmounted(() => {
  if (quillInstance) {
    quillInstance = null;
  }
});

// Métodos públicos
const getContent = () => {
  return sanitizeRichHtml(quillInstance?.root.innerHTML || '');
};

const setContent = (content: string) => {
  if (quillInstance) {
    quillInstance.root.innerHTML = sanitizeRichHtml(content);
  }
};

const clear = () => {
  if (quillInstance) {
    quillInstance.setText('');
  }
};

defineExpose({
  getContent,
  setContent,
  clear
});
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  overflow: hidden;
}

.editor-container {
  background: white;
}

:deep(.ql-editor) {
  min-height: 100px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
}

:deep(.ql-toolbar) {
  border-bottom: 1px solid #d1d5db;
  background: #f9fafb;
}

:deep(.ql-container) {
  border: none;
}

:deep(.ql-editor.ql-blank::before) {
  color: #9ca3af;
  font-style: normal;
}

/* Estilos para modo readonly */
:deep(.ql-toolbar) {
  display: v-bind('props.readonly ? "none" : "block"');
}
</style>
