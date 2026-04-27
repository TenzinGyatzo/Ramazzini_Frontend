<template>
  <div class="assignments-summary bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 sm:p-4">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div class="flex items-center">
        <i class="fas fa-chart-pie text-blue-600 mr-2 sm:mr-3 text-base sm:text-lg"></i>
        <div>
          <h4 class="font-semibold text-gray-800 text-sm sm:text-base">Resumen de Asignaciones</h4>
          <p class="text-xs sm:text-sm text-gray-600">Distribución de acceso por tipo de usuario</p>
        </div>
      </div>
      
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <!-- Usuarios con acceso total -->
        <div class="text-center">
          <div class="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">{{ usuariosConAccesoTotal }}</div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Acceso Total</div>
        </div>
        
        <!-- Usuarios con acceso granular -->
        <div class="text-center">
          <div class="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{{ usuariosConAccesoGranular }}</div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Acceso Granular</div>
        </div>
        
        <!-- Total empresas asignadas granularmente -->
        <div class="text-center">
          <div class="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">{{ totalEmpresasAsignadas }}</div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Empresas Asignadas</div>
        </div>
        
        <!-- Total centros asignados granularmente -->
        <div class="text-center">
          <div class="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">{{ totalCentrosAsignados }}</div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Centros Asignados</div>
        </div>
      </div>
    </div>
    
    <!-- Barra de progreso -->
    <div class="mt-3 sm:mt-4">
      <div class="flex justify-between text-xs text-gray-600 mb-1">
        <span class="truncate mr-2">Usuarios con acceso funcional (total + granular)</span>
        <span class="flex-shrink-0">{{ porcentajeCompletado }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
        <div 
          class="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 sm:h-2 rounded-full transition-all duration-500"
          :style="{ width: `${porcentajeCompletado}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  usuarios: any[];
}

const props = defineProps<Props>();

const usuariosConAccesoTotal = computed(() => {
  return props.usuarios.filter(usuario => 
    usuario.permisos?.accesoCompletoEmpresasCentros
  ).length;
});

const usuariosConAccesoGranular = computed(() => {
  return props.usuarios.filter(usuario => {
    // No tiene acceso completo pero tiene centros asignados
    return !usuario.permisos?.accesoCompletoEmpresasCentros && 
           usuario.centrosTrabajoAsignados && 
           usuario.centrosTrabajoAsignados.length > 0;
  }).length;
});

const totalEmpresasAsignadas = computed(() => {
  const todasLasEmpresas = new Set();
  props.usuarios.forEach(usuario => {
    // Solo contar empresas de usuarios con acceso granular
    if (!usuario.permisos?.accesoCompletoEmpresasCentros) {
      (usuario.empresasAsignadas || []).forEach(empresaId => {
        todasLasEmpresas.add(empresaId);
      });
    }
  });
  return todasLasEmpresas.size;
});

const totalCentrosAsignados = computed(() => {
  const todosLosCentros = new Set();
  props.usuarios.forEach(usuario => {
    // Solo contar centros de usuarios con acceso granular
    if (!usuario.permisos?.accesoCompletoEmpresasCentros) {
      (usuario.centrosTrabajoAsignados || []).forEach(centroId => {
        todosLosCentros.add(centroId);
      });
    }
  });
  return todosLosCentros.size;
});

const usuariosConAsignaciones = computed(() => {
  return props.usuarios.filter(usuario => {
    // Si tiene acceso completo, cuenta como asignado
    if (usuario.permisos?.accesoCompletoEmpresasCentros) {
      return true;
    }
    // Si no tiene acceso completo, debe tener al menos un centro de trabajo asignado
    return usuario.centrosTrabajoAsignados && usuario.centrosTrabajoAsignados.length > 0;
  }).length;
});

const porcentajeCompletado = computed(() => {
  const totalUsuarios = props.usuarios.length;
  if (totalUsuarios === 0) return 0;
  
  const usuariosConAsignacionesCount = usuariosConAsignaciones.value;
  return Math.round((usuariosConAsignacionesCount / totalUsuarios) * 100);
});
</script>

<style>
html.dark-mode .assignments-summary {
  background-image: linear-gradient(to right, rgba(30, 58, 138, 0.24), rgba(67, 56, 202, 0.22)) !important;
  border-color: #1d4ed8 !important;
}

html.dark-mode .assignments-summary .text-gray-800 {
  color: #e2e8f0 !important;
}

html.dark-mode .assignments-summary .text-gray-600,
html.dark-mode .assignments-summary .text-gray-500 {
  color: #cbd5e1 !important;
}

html.dark-mode .assignments-summary .bg-gray-200 {
  background-color: #334155 !important;
}
</style>
