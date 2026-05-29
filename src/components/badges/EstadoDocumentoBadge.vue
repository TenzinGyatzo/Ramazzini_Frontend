<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { formatDateDDMMYYYY } from '@/helpers/dates';
import MedicoFirmanteAPI from '@/api/MedicoFirmanteAPI';
import EnfermeraFirmanteAPI from '@/api/EnfermeraFirmanteAPI';
import TecnicoFirmanteAPI from '@/api/TecnicoFirmanteAPI';
import { formatearTituloYNombreFirmante } from '@/helpers/nombres';

interface FirmanteBase {
  nombre: string;
  primerApellido?: string;
  segundoApellido?: string;
  tituloProfesional?: string;
}

type Firmante = FirmanteBase;

interface Props {
  estado?: string;
  fechaFinalizacion?: string | Date;
  finalizadoPor?: string | { username: string };
  finalizadoPorFirmante?: Firmante;
  fechaAnulacion?: string | Date;
  anuladoPor?: string | { username: string };
  anuladoPorFirmante?: Firmante;
  razonAnulacion?: string;
  tipoDocumento?: string;
}

const props = defineProps<Props>();

// Refs para almacenar firmantes cargados dinámicamente
const finalizadoPorFirmanteLoaded = ref<Firmante | null>(null);
const anuladoPorFirmanteLoaded = ref<Firmante | null>(null);
const loadingFinalizadoPorFirmante = ref(false);
const loadingAnuladoPorFirmante = ref(false);

const showTooltip = ref(false);
const badgeRef = ref<HTMLElement | null>(null);
const tooltipPosition = ref({ top: 0, left: 0 });

const updateTooltipPosition = () => {
  if (!badgeRef.value) return;
  const rect = badgeRef.value.getBoundingClientRect();
  tooltipPosition.value = {
    top: rect.top - 8,
    left: rect.left + rect.width / 2
  };
};

const handleMouseEnter = () => {
  updateTooltipPosition();
  showTooltip.value = true;
};

const handleMouseLeave = () => {
  showTooltip.value = false;
};

const estadoDisplay = computed(() => {
  if (!props.estado) return 'BORRADOR';
  return props.estado.toUpperCase();
});

const formatFirmanteNombre = (firmante: Firmante | null | undefined): string | null => {
  if (!firmante?.nombre?.trim()) return null;
  return formatearTituloYNombreFirmante(firmante) || null;
};

// Función para obtener userId de finalizadoPor/anuladoPor
const extractUserId = (value: string | { username: string; _id?: string } | undefined): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return value._id;
  return null;
};

// Función para cargar firmante por userId
const loadFirmanteByUserId = async (userId: string): Promise<Firmante | null> => {
  if (!userId) return null;
  
  try {
    const results = await Promise.allSettled([
      MedicoFirmanteAPI.getMedicoFirmanteByUserId(userId),
      EnfermeraFirmanteAPI.getEnfermeraFirmanteByUserId(userId),
      TecnicoFirmanteAPI.getTecnicoFirmanteByUserId(userId)
    ]);

    // El primero que tenga datos será el firmante
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value?.data) {
        const responseData = result.value.data;
        // Verificar que tenga un _id (indica que es un firmante válido)
        if (responseData && responseData._id && responseData.nombre) {
          return {
            nombre: responseData.nombre,
            primerApellido: responseData.primerApellido,
            segundoApellido: responseData.segundoApellido,
            tituloProfesional: responseData.tituloProfesional,
          };
        }
      }
    }
  } catch (error) {
    console.error('Error al cargar firmante:', error);
  }
  
  return null;
};

// Cargar firmante finalizadoPor si no se proporciona como prop
const loadFinalizadoPorFirmante = async () => {
  if (props.finalizadoPorFirmante || loadingFinalizadoPorFirmante.value) return;
  
  const userId = extractUserId(props.finalizadoPor);
  if (!userId) return;
  
  loadingFinalizadoPorFirmante.value = true;
  try {
    finalizadoPorFirmanteLoaded.value = await loadFirmanteByUserId(userId);
  } finally {
    loadingFinalizadoPorFirmante.value = false;
  }
};

// Cargar firmante anuladoPor si no se proporciona como prop
const loadAnuladoPorFirmante = async () => {
  if (props.anuladoPorFirmante || loadingAnuladoPorFirmante.value) return;
  
  const userId = extractUserId(props.anuladoPor);
  if (!userId) return;
  
  loadingAnuladoPorFirmante.value = true;
  try {
    anuladoPorFirmanteLoaded.value = await loadFirmanteByUserId(userId);
  } finally {
    loadingAnuladoPorFirmante.value = false;
  }
};

// Computed para obtener el firmante finalizadoPor (prop o cargado)
const finalizadoPorFirmante = computed(() => {
  return props.finalizadoPorFirmante || finalizadoPorFirmanteLoaded.value;
});

// Computed para obtener el firmante anuladoPor (prop o cargado)
const anuladoPorFirmante = computed(() => {
  return props.anuladoPorFirmante || anuladoPorFirmanteLoaded.value;
});

// Watchers para cargar firmantes cuando cambien las props
watch(() => props.finalizadoPor, () => {
  if (!props.finalizadoPorFirmante) {
    loadFinalizadoPorFirmante();
  }
}, { immediate: true });

watch(() => props.anuladoPor, () => {
  if (!props.anuladoPorFirmante) {
    loadAnuladoPorFirmante();
  }
}, { immediate: true });

// Cargar firmantes al montar si no se proporcionan
onMounted(() => {
  loadFinalizadoPorFirmante();
  loadAnuladoPorFirmante();
});

const badgeConfig = computed(() => {
  const estado = estadoDisplay.value;
  
  if (estado === 'FINALIZADO') {
    return {
      classes: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: 'fas fa-check-circle',
      label: 'Finalizado'
    };
  } else if (estado === 'ANULADO') {
    return {
      classes: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: 'fas fa-times-circle',
      label: 'Anulado'
    };
  } else {
    // Lógica para determinar el label del borrador según el tipo
    let label = 'Borrador';
    if (props.tipoDocumento) {
      const tipoSinEspacios = props.tipoDocumento.toLowerCase().replace(/\s+/g, '');
      if (tipoSinEspacios === 'documentoexterno') {
        label = 'En revisión';
      }
    }
    
    return {
      classes: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: 'fas fa-edit',
      label: label
    };
  }
});

const metadata = computed(() => {
  if (estadoDisplay.value !== 'FINALIZADO') return null;
  
  const parts: string[] = [];
  if (props.fechaFinalizacion) {
    parts.push(`el ${formatDateDDMMYYYY(props.fechaFinalizacion)}`);
  }
  
  // Priorizar usar el firmante si está disponible
  const nombreFirmante = formatFirmanteNombre(finalizadoPorFirmante.value);
  if (nombreFirmante) {
    if (parts.length > 0) {
      return `Finalizado ${parts.join(' ')} por:\n${nombreFirmante}`;
    } else {
      return `Finalizado por:\n${nombreFirmante}`;
    }
  } else if (props.finalizadoPor) {
    // Fallback al username si no hay firmante
    const nombreUsuario = typeof props.finalizadoPor === 'object' 
      ? props.finalizadoPor.username 
      : props.finalizadoPor;
    
    if (nombreUsuario) {
      if (parts.length > 0) {
        return `Finalizado ${parts.join(' ')} por:\n${nombreUsuario}`;
      } else {
        return `Finalizado por:\n${nombreUsuario}`;
      }
    }
  }
  
  if (parts.length === 0) return null;
  return `Finalizado ${parts.join(' ')}`;
});

const tooltipText = computed(() => {
  const estado = estadoDisplay.value;
  
  if (estado === 'FINALIZADO') {
    return metadata.value;
  } else if (estado === 'ANULADO') {
    const parts: string[] = [];
    if (props.fechaAnulacion) {
      parts.push(`el ${formatDateDDMMYYYY(props.fechaAnulacion)}`);
    }
    
    // Priorizar usar el firmante si está disponible
    const nombreFirmante = formatFirmanteNombre(anuladoPorFirmante.value);
    if (nombreFirmante) {
      let tooltip = '';
      if (parts.length > 0) {
        tooltip = `Anulado ${parts.join(' ')} por:\n${nombreFirmante}`;
      } else {
        tooltip = `Anulado por:\n${nombreFirmante}`;
      }
      if (props.razonAnulacion) {
        tooltip += `\nMotivo: ${props.razonAnulacion}`;
      }
      return tooltip;
    } else if (props.anuladoPor) {
      // Fallback al username si no hay firmante
      const nombreUsuario = typeof props.anuladoPor === 'object' 
        ? props.anuladoPor.username 
        : props.anuladoPor;
      
      if (nombreUsuario) {
        let tooltip = '';
        if (parts.length > 0) {
          tooltip = `Anulado ${parts.join(' ')} por:\n${nombreUsuario}`;
        } else {
          tooltip = `Anulado por:\n${nombreUsuario}`;
        }
        if (props.razonAnulacion) {
          tooltip += `\nMotivo: ${props.razonAnulacion}`;
        }
        return tooltip;
      }
    }
    
    if (parts.length > 0) {
      let tooltip = `Anulado ${parts.join(' ')}`;
      if (props.razonAnulacion) {
        tooltip += `\nMotivo: ${props.razonAnulacion}`;
      }
      return tooltip;
    }
    if (props.razonAnulacion) {
      return `Anulado\nMotivo: ${props.razonAnulacion}`;
    }
    return 'Documento anulado';
  } else if (estado === 'BORRADOR') {
    // Personalizar el tooltip según el tipo
    if (props.tipoDocumento) {
      const tipoSinEspacios = props.tipoDocumento.toLowerCase().replace(/\s+/g, '');
      if (tipoSinEspacios === 'documentoexterno') {
        return 'Documento en revisión - Puede ser editado';
      }
    }
    return 'Documento en borrador - Puede ser editado';
  }
  
  return null;
});
</script>

<template>
  <div class="hidden sm:flex items-center relative" :aria-label="`Estado del documento: ${badgeConfig.label}`">
    <span 
      ref="badgeRef"
      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-200 cursor-help"
      :class="badgeConfig.classes"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <i v-if="badgeConfig.icon" :class="[badgeConfig.icon, 'mr-1']"></i>
      {{ badgeConfig.label }}
    </span>
  </div>

  <!-- Tooltip con metadata usando Teleport -->
  <Teleport to="body">
    <Transition name="tooltip-fade">
      <div 
        v-if="tooltipText && showTooltip"
        class="fixed z-[9999] pointer-events-none"
        :style="{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          transform: 'translate(-50%, -100%)',
          marginBottom: '8px'
        }">
        <div class="px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg shadow-xl border border-gray-700 whitespace-pre-line max-w-xs">
          {{ tooltipText }}
          <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.2s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>

