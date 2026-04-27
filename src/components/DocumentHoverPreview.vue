<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  type: { type: String, default: 'pdf' }, // 'pdf' | 'image'
  src: { type: String, default: '' },
  title: { type: String, default: '' },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  size: {
    type: Object,
    default: () => ({ width: 320, height: 240 })
  },
  pdfAvailable: { type: Boolean, default: true },
  isRegenerable: { type: Boolean, default: false }
});

const emit = defineEmits(['enter', 'leave', 'regenerate', 'open']);

const status = ref('loading'); // loading | ready | error | unavailable

watch(
  () => [props.src, props.pdfAvailable, props.isRegenerable],
  ([nextSrc, nextPdfAvailable, nextIsRegenerable]) => {
    // Si el PDF no está disponible pero es regenerable, mostrar estado especial
    if (props.type === 'pdf' && !nextPdfAvailable && nextIsRegenerable) {
      status.value = 'unavailable';
      return;
    }
    
    if (!nextSrc) {
      status.value = 'error';
      return;
    }
    
    // Si el PDF no está disponible y no es regenerable, mostrar error
    if (props.type === 'pdf' && !nextPdfAvailable) {
      status.value = 'error';
      return;
    }
    
    status.value = 'loading';
  },
  { immediate: true }
);

const pdfSrc = computed(() => {
  if (!props.src) return '';
  const joiner = props.src.includes('#') ? '&' : '#';
  return `${props.src}${joiner}page=1&zoom=page-width&toolbar=0&navpanes=0&scrollbar=0`;
});

const popoverStyle = computed(() => ({
  top: `${props.position.y}px`,
  left: `${props.position.x}px`,
  width: `${props.size.width}px`,
  height: `${props.size.height}px`
}));

const handleLoad = () => {
  // Verificar si el contenido cargado es realmente un PDF válido
  // Si el iframe carga una página de error (404), detectarlo
  if (props.type === 'pdf' && !props.pdfAvailable) {
    status.value = 'unavailable';
    return;
  }
  status.value = 'ready';
};

const handleError = () => {
  // Si es un PDF regenerable que falló, mostrar estado unavailable
  if (props.type === 'pdf' && props.isRegenerable) {
    status.value = 'unavailable';
  } else {
    status.value = 'error';
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="hover-preview-fade">
      <div
        v-if="visible"
        class="hover-preview"
        :style="popoverStyle"
        @mouseenter="emit('enter')"
        @mouseleave="emit('leave')"
      >
        <div class="hover-preview__header" v-if="title">
          <span class="hover-preview__title">{{ title }}</span>
        </div>
        <div class="hover-preview__body" @click="status === 'ready' ? emit('open') : null">
          <!-- Estado: PDF no disponible pero regenerable -->
          <div 
            v-if="status === 'unavailable'" 
            class="hover-preview__status hover-preview__status--unavailable cursor-pointer transition-colors duration-200"
            @click.stop="emit('regenerate')"
          >
            <div class="hover-preview__unavailable-content">
              <div class="hover-preview__unavailable-icon">
                <i class="fa-solid fa-file-pdf"></i>
              </div>
              <div class="hover-preview__unavailable-title">PDF No Disponible</div>
              <div class="hover-preview__unavailable-hint">
                Haz clic aquí para regenerarlo
              </div>
            </div>
          </div>
          
          <!-- Estado: Error -->
          <div v-else-if="status === 'error'" class="hover-preview__status hover-preview__status--error">
            Vista previa no disponible
          </div>
          
          <!-- Contenido: Imagen -->
          <template v-else-if="src && type === 'image'">
            <img
              :src="src"
              alt="Vista previa"
              class="hover-preview__image"
              @load="handleLoad"
              @error="handleError"
            />
            <!-- Overlay de carga para imágenes -->
            <div v-if="status === 'loading'" class="hover-preview__status">
              Cargando vista previa...
            </div>
          </template>
          
          <!-- Contenido: PDF disponible -->
          <template v-else-if="src && type === 'pdf' && pdfAvailable">
            <div class="hover-preview__pdf-container">
              <iframe
                class="hover-preview__pdf"
                :src="pdfSrc"
                title="Vista previa PDF"
                @load="handleLoad"
                @error="handleError"
                scrolling="no"
              ></iframe>
            </div>
            <!-- Overlay de carga para PDFs -->
            <div v-if="status === 'loading'" class="hover-preview__status">
              Cargando vista previa...
            </div>
          </template>
          
          <!-- Estado: Cargando (fallback cuando no hay src) -->
          <div v-else-if="status === 'loading'" class="hover-preview__status">
            Cargando vista previa...
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.hover-preview-fade-enter-active,
.hover-preview-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.hover-preview-fade-enter-from,
.hover-preview-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.hover-preview {
  position: fixed;
  z-index: 40;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 0px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  transition: top 0.2s ease, left 0.2s ease;
}

.hover-preview__header {
  padding: 10px 14px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hover-preview__title {
  font-size: 11px;
  color: #475569;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hover-preview__body {
  position: relative;
  flex: 1;
  background: #f1f5f9;
  overflow: hidden;
  cursor: pointer;
}

.hover-preview__pdf-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.hover-preview__status {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #6b7280;
  background: #f1f5f9;
  z-index: 1;
}

.hover-preview__status--error {
  color: #b91c1c;
  background: #fef2f2;
}

.hover-preview__status--unavailable {
  color: #92400e;
  background: #fffbeb;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hover-preview__status--unavailable:hover {
  background-color: #fef3c7;
}

.hover-preview__unavailable-content {
  text-align: center;
  max-width: 100%;
}

.hover-preview__unavailable-icon {
  position: relative;
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hover-preview__unavailable-icon .fa-file-pdf {
  font-size: 32px;
  color: #d97706;
  position: absolute;
}

.hover-preview__unavailable-icon .fa-arrow-rotate-right {
  font-size: 16px;
  color: #f59e0b;
  position: absolute;
  bottom: 0;
  right: 0;
  background: #fffbeb;
  border-radius: 50%;
  padding: 2px;
  animation: rotate-hint 2s ease-in-out infinite;
}

@keyframes rotate-hint {
  0%, 100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(180deg);
  }
}

.hover-preview__unavailable-title {
  font-size: 13px;
  font-weight: 700;
  color: #92400e;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hover-preview__unavailable-message {
  font-size: 11px;
  color: #78350f;
  margin-bottom: 6px;
  line-height: 1.4;
}

.hover-preview__unavailable-hint {
  font-size: 13px;
  color: #a16207;
  font-weight: 500;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(217, 119, 6, 0.2);
}

.hover-preview__image {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
  object-fit: contain;
  background: #fff;
}

.hover-preview__pdf {
  /* Recorte asimétrico: menos en top/left para no perder contenido útil, 
     más en right/bottom para ocultar scrollbars nativas */
  width: calc(100% + 5px);
  height: calc(100% + 13px);
  margin-top:  -0.5px;
  margin-left: -2px;
  border: none;
  display: block;
  background: #f1f5f9;
  pointer-events: none;
}
</style>
