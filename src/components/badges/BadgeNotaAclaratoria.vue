<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDocumentosStore } from '@/stores/documentos';
import { convertirFechaISOaDDMMYYYY } from '@/helpers/dates';

interface Props {
  documentoId: string;
  documentoTipo: string;
}

const props = defineProps<Props>();

const documentos = useDocumentosStore();
const showTooltip = ref(false);
const badgeRef = ref<HTMLElement | null>(null);
const tooltipPosition = ref({ top: 0, left: 0 });

// Mapeo de tipos singulares a plurales (igual que en DocumentoItem.vue)
const tipoSingularAPlural: Record<string, string> = {
  'antidoping': 'antidopings',
  'aptitud': 'aptitudes',
  'audiometria': 'audiometrias',
  'certificado': 'certificados',
  'certificadoExpedito': 'certificadosExpedito',
  'documentoExterno': 'documentosExternos',
  'examenVista': 'examenesVista',
  'exploracionFisica': 'exploracionesFisicas',
  'historiaClinica': 'historiasClinicas',
  'notaMedica': 'notasMedicas',
  'controlPrenatal': 'controlPrenatal',
  'historiaOtologica': 'historiaOtologica',
  'previoEspirometria': 'previoEspirometria',
  'receta': 'recetas',
  'constanciaAptitud': 'constanciasAptitud'
};

// Función para normalizar tipo de documento a plural
const normalizarTipoAPlural = (tipo: string): string => {
  if (!tipo) return tipo;
  
  // Normalizar: quitar espacios y convertir a formato consistente
  const normalizado = tipo.replace(/\s+/g, '');
  
  // Primero intentar directamente
  if (tipoSingularAPlural[tipo]) {
    return tipoSingularAPlural[tipo];
  }
  
  // Convertir primera letra a minúscula y quitar espacios: "Historia Clinica" -> "historiaClinica"
  const camelCase = normalizado.charAt(0).toLowerCase() + normalizado.slice(1);
  if (tipoSingularAPlural[camelCase]) {
    return tipoSingularAPlural[camelCase];
  }
  
  // Si ya está en camelCase pero con mayúscula inicial, convertirla
  if (tipoSingularAPlural[normalizado]) {
    return tipoSingularAPlural[normalizado];
  }
  
  // Buscar en el mapeo si hay alguna key que al normalizar coincida
  const tipoNormalizadoParaComparar = normalizado.toLowerCase();
  for (const [key, value] of Object.entries(tipoSingularAPlural)) {
    const keyNormalizada = key.replace(/\s+/g, '').toLowerCase();
    if (keyNormalizada === tipoNormalizadoParaComparar) {
      return value;
    }
  }
  
  return tipo;
};

// Computed para obtener las notas aclaratorias asociadas
const notasAclaratoriasAsociadas = computed(() => {
  if (!documentos.documentsByYear || !props.documentoId) return [];
  
  // Normalizar el tipo del documento actual (puede venir como 'historiaClinica', 'Historia Clinica', etc.)
  const tipoNormalizado = normalizarTipoAPlural(props.documentoTipo);
  const notas: any[] = [];
  
  for (const yearData of Object.values(documentos.documentsByYear)) {
    if (yearData.notasAclaratorias && Array.isArray(yearData.notasAclaratorias)) {
      yearData.notasAclaratorias.forEach(nota => {
        if (nota.documentoOrigenId !== props.documentoId) return;
        
        // Normalizar el tipo de la nota aclaratoria
        const notaTipoNormalizado = normalizarTipoAPlural(nota.documentoOrigenTipo);
        
        // Comparar ambos tipos normalizados
        if (notaTipoNormalizado === tipoNormalizado) {
          notas.push(nota);
        }
      });
    }
  }
  return notas;
});

// Computed para verificar si hay notas aclaratorias
const tieneNotasAclaratorias = computed(() => {
  return notasAclaratoriasAsociadas.value.length > 0;
});

// Texto para el badge
const badgeText = computed(() => {
  const cantidad = notasAclaratoriasAsociadas.value.length;
  if (cantidad === 1) return 'Nota';
  return `${cantidad} Notas`;
});

// Mapeo de alcances a texto legible
const alcanceTexto: Record<string, string> = {
  'ACLARA': 'Aclaración',
  'CORRIGE': 'Corrección',
  'COMPLEMENTA': 'Complemento',
  'INVALIDA': 'Invalidación'
};

// Texto para el tooltip
const tooltipText = computed(() => {
  const cantidad = notasAclaratoriasAsociadas.value.length;
  if (cantidad === 0) return '';
  
  const lineas: string[] = [`Tiene ${cantidad} nota${cantidad > 1 ? 's' : ''} aclaratoria${cantidad > 1 ? 's' : ''}:`];
  
  notasAclaratoriasAsociadas.value.forEach((nota, index) => {
    const fecha = convertirFechaISOaDDMMYYYY(nota.fechaNotaAclaratoria);
    const alcance = alcanceTexto[nota.alcanceAclaracion] || nota.alcanceAclaracion || 'Aclaración';
    const impacto = nota.impactoClinico ? ` - Impacto: ${nota.impactoClinico}` : '';
    lineas.push(`${index + 1}. ${alcance} (${fecha})${impacto}`);
  });
  
  return lineas.join('\n');
});

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
</script>

<template>
  <div v-if="tieneNotasAclaratorias" class="hidden sm:flex items-center relative ml-2">
    <span 
      ref="badgeRef"
      class="documento-badge inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 border border-amber-300 transition-colors duration-200 cursor-help"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <i class="fas fa-exclamation-triangle mr-1"></i>
      {{ badgeText }}
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
        <div class="documento-badge-tooltip px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg shadow-xl border border-gray-700 whitespace-pre-line max-w-xs">
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

