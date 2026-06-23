<script setup lang="ts">
import { ref, onMounted, computed, inject, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import { useEmpresasStore } from '@/stores/empresas';
import AssignmentsAPI from '@/api/AssignmentsAPI';
import { onBeforeRouteLeave } from 'vue-router';
import MultiSelectEmpresas from '@/components/MultiSelectEmpresas.vue';
import MultiSelectCentrosAsync from '@/components/MultiSelectCentrosAsync.vue';
import AssignmentsSummary from '@/components/AssignmentsSummary.vue';
import { preloadCentros } from '@/composables/useCentrosCache';

// Interfaces
interface Usuario {
  _id: string;
  username: string;
  email: string;
  role: string;
  empresasAsignadas?: string[];
  centrosTrabajoAsignados?: string[];
  permisos?: {
    gestionarEmpresas: boolean;
    gestionarCentrosTrabajo: boolean;
    gestionarTrabajadores: boolean;
    gestionarDocumentosDiagnostico: boolean;
    gestionarDocumentosEvaluacion: boolean;
    gestionarDocumentosExternos: boolean;
    gestionarCuestionariosAdicionales: boolean;
    accesoCompletoEmpresasCentros: boolean;
    accesoDashboardSalud: boolean;
    accesoRiesgosTrabajo: boolean;
  };
}

interface Empresa {
  _id: string;
  nombreComercial: string;
  razonSocial?: string;
  rfc?: string;
}

interface Toast {
  open: (options: { message: string; type: string }) => void;
}

const toast = inject<Toast>('toast');
const userStore = useUserStore();
const empresasStore = useEmpresasStore();

const usuarios = ref<Usuario[]>([]);
const empresas = ref<Empresa[]>([]);
const loading = ref(true);
const saving = ref(false);
const hasUnsavedChanges = ref(false);

const user = computed(() => userStore.user);

// Filtrar usuarios para mostrar solo Médicos, Enfermeros/as, Administrativos y Técnicos Evaluadores
const usuariosFiltrados = computed(() => {
  return usuarios.value.filter(usuario => 
    usuario.role === 'Médico' || usuario.role === 'Enfermero/a' || 
    usuario.role === 'Administrativo' || usuario.role === 'Técnico Evaluador'
  );
});

// Estado original de asignaciones para comparar cambios
const originalAssignments = ref(new Map());

// Función para marcar cambios como pendientes
const markAsChanged = () => {
  hasUnsavedChanges.value = true;
};

// Función para comparar si hay cambios pendientes
const hasChanges = computed(() => {
  return usuariosFiltrados.value.some(usuario => {
    const original = originalAssignments.value.get(usuario._id);
    if (!original) return false;
    
    const currentEmpresas = usuario.empresasAsignadas || [];
    const currentCentros = usuario.centrosTrabajoAsignados || [];
    
    return JSON.stringify(currentEmpresas) !== JSON.stringify(original.empresasAsignadas) ||
           JSON.stringify(currentCentros) !== JSON.stringify(original.centrosTrabajoAsignados);
  });
});

const syncOriginalAssignments = () => {
  originalAssignments.value.clear();
  usuariosFiltrados.value.forEach((usuario) => {
    originalAssignments.value.set(usuario._id, {
      empresasAsignadas: [...(usuario.empresasAsignadas || [])],
      centrosTrabajoAsignados: [...(usuario.centrosTrabajoAsignados || [])],
    });
  });
};

const normalizeUsuario = (usuario: Usuario): Usuario => ({
  ...usuario,
  empresasAsignadas: (usuario.empresasAsignadas ?? []).map(String),
  centrosTrabajoAsignados: (usuario.centrosTrabajoAsignados ?? []).map(String),
});

const cargarEmpresasDisponibles = async (idProveedorSalud: string): Promise<Empresa[]> => {
  if (empresasStore.empresas.length > 0) {
    return empresasStore.empresas.map((e) => ({
      _id: e._id,
      nombreComercial: e.nombreComercial,
      razonSocial: e.razonSocial,
      rfc: e.RFC,
    }));
  }

  const resultado = await AssignmentsAPI.getAvailableEmpresas(idProveedorSalud);
  return resultado.data ?? [];
};

onMounted(async () => {
  await cargarDatos();
  syncOriginalAssignments();
});

// Watch para detectar cambios en asignaciones
watch(hasChanges, (newValue) => {
  hasUnsavedChanges.value = newValue;
}, { deep: true });

// Función para verificar si un usuario específico tiene cambios
const hasChangesForUser = (usuario: Usuario) => {
  const original = originalAssignments.value.get(usuario._id);
  if (!original) return false;
  
  const currentEmpresas = usuario.empresasAsignadas || [];
  const currentCentros = usuario.centrosTrabajoAsignados || [];
  
  return JSON.stringify(currentEmpresas) !== JSON.stringify(original.empresasAsignadas) ||
         JSON.stringify(currentCentros) !== JSON.stringify(original.centrosTrabajoAsignados);
};

const cargarDatos = async () => {
  const idProveedorSalud = user.value?.idProveedorSalud;
  if (!idProveedorSalud) {
    toast?.open({ message: 'No se pudo identificar el proveedor de salud', type: 'error' });
    return;
  }

  loading.value = true;
  try {
    const [resultadoUsuarios, empresasData] = await Promise.all([
      userStore.fetchUsersByProveedorId(idProveedorSalud, { scope: 'assignments' }),
      cargarEmpresasDisponibles(idProveedorSalud),
    ]);

    if (!resultadoUsuarios.success) {
      usuarios.value = [];
      empresas.value = [];
      toast?.open({
        message: 'Error al cargar usuarios',
        type: 'error',
      });
      return;
    }

    usuarios.value = (resultadoUsuarios.data ?? []).map(normalizeUsuario);
    empresas.value = empresasData;

    const empresaIds = [
      ...new Set(
        usuarios.value
          .filter(
            (u) =>
              (u.role === 'Médico' ||
                u.role === 'Enfermero/a' ||
                u.role === 'Administrativo' ||
                u.role === 'Técnico Evaluador') &&
              !u.permisos?.accesoCompletoEmpresasCentros,
          )
          .flatMap((u) => u.empresasAsignadas ?? []),
      ),
    ];

    await preloadCentros(empresaIds);
  } catch (error) {
    console.error('Error al cargar datos:', error);
    toast?.open({
      message: 'Error al cargar datos',
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
};

const guardarTodosLosCambios = async () => {
  if (!hasChanges.value) {
    toast?.open({
      message: 'No hay cambios para guardar',
      type: 'info'
    });
    return;
  }

  saving.value = true;
  const usuariosConCambios = usuariosFiltrados.value.filter(usuario => hasChangesForUser(usuario));

  try {
    // Guardar todos los cambios en paralelo
    const promises = usuariosConCambios.map(usuario => 
      AssignmentsAPI.updateUserAssignments(usuario._id, {
        empresasAsignadas: usuario.empresasAsignadas || [],
        centrosTrabajoAsignados: usuario.centrosTrabajoAsignados || []
      })
    );
    
    await Promise.all(promises);
    
    // Actualizar el estado original con los nuevos valores
    usuariosConCambios.forEach(usuario => {
      originalAssignments.value.set(usuario._id, {
        empresasAsignadas: [...(usuario.empresasAsignadas || [])],
        centrosTrabajoAsignados: [...(usuario.centrosTrabajoAsignados || [])]
      });
    });
    
    hasUnsavedChanges.value = false;

    userStore.invalidateTenantUsersCache(user.value?.idProveedorSalud);
    
    toast?.open({
      message: `Asignaciones actualizadas para ${usuariosConCambios.length} usuario(s)`,
      type: 'success'
    });
  } catch (error) {
    console.error('Error al actualizar asignaciones:', error);
    toast?.open({
      message: 'Error al actualizar asignaciones',
      type: 'error'
    });
    
    await cargarDatos();
    syncOriginalAssignments();
  } finally {
    saving.value = false;
  }
};

const descartarCambios = async () => {
  try {
    await cargarDatos();
    syncOriginalAssignments();
    hasUnsavedChanges.value = false;
    
    toast?.open({
      message: 'Cambios descartados',
      type: 'info'
    });
  } catch (error) {
    console.error('Error al descartar cambios:', error);
    toast?.open({
      message: 'Error al descartar cambios',
      type: 'error'
    });
  }
};

// Guard de navegación específico para esta vista
onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges.value) {
    const answer = window.confirm(
      'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir? Los cambios se perderán.'
    );
    if (answer) {
      next();
    } else {
      next(false);
    }
  } else {
    next();
  }
});
</script>

<template>
  <div class="manage-assignments-view p-4 sm:p-6 max-w-7xl mx-auto">
    <div class="mb-6">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Gestionar Asignaciones de Usuarios</h1>
          <p class="text-sm sm:text-base text-gray-600">Asigna empresas y centros de trabajo específicos a cada usuario médico y enfermero/a</p>
        </div>
        
        <!-- Indicador de cambios y botones de acción -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-end w-full lg:w-auto mt-4 sm:mt-0">
          <!-- Indicador de cambios sin guardar -->
          <div v-if="hasUnsavedChanges" class="assignments-unsaved-indicator flex items-center justify-between sm:justify-center text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 text-xs sm:text-sm">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <span class="font-medium">Cambios sin guardar</span>
          </div>
          
          <!-- Botones de acción -->
          <div class="flex flex-col sm:flex-row gap-2">
            <button
              v-if="hasUnsavedChanges"
              @click="descartarCambios"
              :disabled="saving"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
            >
              <i class="fas fa-times mr-2"></i>
              Descartar
            </button>
            
            <button
              @click="guardarTodosLosCambios"
              :disabled="saving || !hasChanges"
              class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duración-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base w-full sm:w-auto"
            >
              <i v-if="saving" class="fas fa-spinner fa-spin mr-2"></i>
              <i v-else class="fas fa-save mr-2"></i>
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <Transition appear mode="out-in" name="slide-up">
    <div v-if="loading" key="loading" class="text-center py-20">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4 animate-pulse">
        <i class="empresa-item-placeholder-icon fas fa-spinner fa-spin text-2xl text-emerald-600"></i>
      </div>
      <h2 class="text-xl font-semibold text-gray-700 mb-2">Cargando Datos...</h2>
      <p class="text-gray-500">Obteniendo información de usuarios y asignaciones</p>
    </div>

    <div v-else-if="usuariosFiltrados.length === 0" key="empty" class="text-center py-20">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
        <i class="fas fa-users text-2xl text-gray-400"></i>
      </div>
      <h2 class="text-xl font-semibold text-gray-700 mb-2">No hay usuarios para gestionar</h2>
      <p class="text-gray-500">Solo se muestran usuarios con rol Médico o Enfermero/a</p>
    </div>

    <div v-else key="content">
      <!-- Resumen de asignaciones -->
      <AssignmentsSummary :usuarios="usuariosFiltrados" />
      
      <!-- Información adicional -->
      <div class="assignments-info-card mt-1 p-4 bg-white rounded-lg shadow-lg border border-gray-200 mb-6">
        <div class="flex items-start gap-3">
          <i class="fas fa-info-circle text-blue-600 mt-0.5"></i>
          <div>
            <p class="text-sm sm:text-base text-blue-800 font-medium mb-1">Información de Asignaciones</p>
            <p class="text-xs sm:text-sm text-blue-700">
              Los usuarios solo podrán ver y trabajar con las empresas y centros de trabajo asignados específicamente a ellos. 
              Los centros de trabajo solo se pueden asignar de empresas que ya están asignadas al usuario.
            </p>
          </div>
        </div>
      </div>
      
      <!-- Grid de usuarios -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <div 
          v-for="usuario in usuariosFiltrados" 
          :key="usuario._id"
          :class="[
            'assignment-user-card bg-white rounded-xl shadow-lg border p-4 sm:p-6 hover:shadow-xl transition-all duration-300',
            hasChangesForUser(usuario) ? 'border-amber-300 shadow-amber-100' : 'border-gray-200'
          ]"
        >
        <!-- Header del usuario -->
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
          <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <i class="fas fa-user text-white text-lg"></i>
              </div>
              <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-semibold text-gray-900 text-base sm:text-lg">{{ usuario.username }}</h3>
                  <!-- Indicador de cambios para este usuario -->
                  <span v-if="hasChangesForUser(usuario)" class="assignment-modified-badge inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    <i class="fas fa-pencil-alt mr-1"></i>
                    Modificado
                  </span>
                </div>
              <p class="text-xs sm:text-sm text-gray-500">{{ usuario.role }}</p>
              </div>
            </div>
            
            <!-- Resumen de asignaciones -->
          <div class="flex gap-4 flex-wrap">
              <!-- Indicador de acceso completo -->
              <div v-if="usuario.permisos?.accesoCompletoEmpresasCentros" class="text-center">
              <div class="text-base sm:text-lg font-bold text-emerald-600">
                  <i class="fas fa-globe"></i>
                </div>
              <div class="text-[11px] sm:text-xs text-gray-500">Acceso Total</div>
              </div>
              <div v-else class="flex gap-4">
                <div class="text-center">
                <div class="text-base sm:text-lg font-bold text-blue-600">
                    {{ usuario.permisos?.accesoCompletoEmpresasCentros ? '∞' : (usuario.empresasAsignadas || []).length }}
                  </div>
                <div class="text-[11px] sm:text-xs text-gray-500">Empresas</div>
                </div>
                <div class="text-center">
                <div class="text-base sm:text-lg font-bold text-green-600">
                    {{ usuario.permisos?.accesoCompletoEmpresasCentros ? '∞' : (usuario.centrosTrabajoAsignados || []).length }}
                  </div>
                <div class="text-[11px] sm:text-xs text-gray-500">Centros</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Asignaciones -->
          <div class="space-y-4">
            <!-- Contenido dinámico basado en permiso -->
            <div v-if="!usuario.permisos?.accesoCompletoEmpresasCentros">
              <!-- Asignación granular -->
              <div class="space-y-4">
                <!-- Empresas asignadas -->
                <div class="relative">
                  <MultiSelectEmpresas
                    :items="empresas"
                    :selected-ids="usuario.empresasAsignadas || []"
                    label="Empresas Asignadas"
                    placeholder="Buscar empresas..."
                    @update:selected-ids="(ids) => { usuario.empresasAsignadas = ids; markAsChanged(); }"
                  />
                </div>

                <!-- Centros de trabajo asignados -->
                <div class="relative">
                  <MultiSelectCentrosAsync
                    :selected-ids="usuario.centrosTrabajoAsignados || []"
                    :empresas-seleccionadas="usuario.empresasAsignadas || []"
                    :empresas-disponibles="empresas"
                    label="Centros de Trabajo Asignados"
                    placeholder="Buscar centros..."
                    @update:selected-ids="(ids) => { usuario.centrosTrabajoAsignados = ids; markAsChanged(); }"
                  />
                </div>
              </div>
            </div>

            <!-- Acceso completo habilitado -->
            <div v-else class="assignment-access-full-card bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-3 sm:p-4">
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <i class="fas fa-globe text-emerald-600 text-base sm:text-lg"></i>
                </div>
                <div class="ml-3 flex-1">
                  <h4 class="text-xs sm:text-sm font-semibold text-emerald-800 mb-2">
                    Acceso Completo Habilitado
                  </h4>
                  <p class="text-xs sm:text-sm text-emerald-700 mb-3">
                    Este usuario tiene acceso completo a todas las empresas y centros de trabajo. 
                    No es necesario realizar asignaciones granulares.
                  </p>

                  <div class="assignment-warning-card bg-amber-50 border border-amber-200 rounded-md p-3">
                    <div class="flex items-center mb-2">
                      <i class="fas fa-exclamation-triangle text-amber-600 mr-2"></i>
                      <span class="text-xs sm:text-sm font-medium text-amber-800">Para asignación granular</span>
                    </div>
                    <p class="text-[11px] sm:text-xs text-amber-700 leading-snug">
                      Si deseas asignar empresas y centros específicos, primero debes deshabilitar el permiso 
                      <strong>"Acceso Completo a Empresas y Centros"</strong> en la gestión de permisos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        
        </div>
      </div>
    </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-up-enter-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
</style>

<style>
html.dark-mode .manage-assignments-view .assignments-unsaved-indicator {
  color: #fcd34d !important;
  background-color: rgba(146, 64, 14, 0.28) !important;
  border-color: #b45309 !important;
}

html.dark-mode .manage-assignments-view .assignments-info-card {
  background-color: #0f172a !important;
  border-color: #334155 !important;
}

html.dark-mode .manage-assignments-view .assignment-user-card {
  background-color: #0f172a !important;
}

html.dark-mode .manage-assignments-view .assignment-modified-badge {
  background-color: rgba(180, 83, 9, 0.28) !important;
  color: #fcd34d !important;
}

html.dark-mode .manage-assignments-view .assignment-access-full-card {
  background-image: linear-gradient(to right, rgba(6, 78, 59, 0.45), rgba(22, 101, 52, 0.4)) !important;
  border-color: #047857 !important;
}

html.dark-mode .manage-assignments-view .assignment-warning-card {
  background-color: rgba(146, 64, 14, 0.22) !important;
  border-color: #b45309 !important;
}
</style>
