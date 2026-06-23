<script setup>
import { ref, onMounted, computed, inject, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import PermissionsAPI from '@/api/PermissionsAPI';
import { onBeforeRouteLeave } from 'vue-router';
import {
  sanitizePermissionsForRole,
  isPermissionEditableForRole,
  getPermissionBlockReason,
} from '@/constants/rolePermissionPolicy';

const toast = inject('toast');
const userStore = useUserStore();
const user = computed(() => userStore.user);

const usuarios = ref([]);
const loading = ref(true);
const saving = ref(false);
const hasUnsavedChanges = ref(false);

const ROLES_OPERATIVOS = [
  'Médico',
  'Enfermero/a',
  'Administrativo',
  'Técnico Evaluador',
];

// Filtrar usuarios para mostrar solo Médicos, Enfermeros/as, Administrativos y Técnicos Evaluadores
const usuariosFiltrados = computed(() => {
  return usuarios.value.filter((usuario) =>
    ROLES_OPERATIVOS.includes(usuario.role),
  );
});

// Estado original de permisos para comparar cambios
const originalPermissions = ref(new Map());

// Función para marcar cambios como pendientes
const markAsChanged = () => {
  hasUnsavedChanges.value = true;
};

// Función para comparar si hay cambios pendientes
const hasChanges = computed(() => {
  return usuariosFiltrados.value.some(usuario => {
    const original = originalPermissions.value.get(usuario._id);
    if (!original) return false;
    
    return Object.keys(usuario.permisos).some(permiso => 
      usuario.permisos[permiso] !== original[permiso]
    );
  });
});

const syncOriginalPermissions = () => {
  originalPermissions.value.clear();
  usuariosFiltrados.value.forEach((usuario) => {
    originalPermissions.value.set(usuario._id, { ...usuario.permisos });
  });
};

onMounted(async () => {
  await cargarUsuarios();
  syncOriginalPermissions();
});

// Watch para detectar cambios en permisos
watch(hasChanges, (newValue) => {
  hasUnsavedChanges.value = newValue;
}, { deep: true });

// Función para verificar si un usuario específico tiene cambios
const hasChangesForUser = (usuario) => {
  const original = originalPermissions.value.get(usuario._id);
  if (!original) return false;
  
  return Object.keys(usuario.permisos).some(permiso => 
    usuario.permisos[permiso] !== original[permiso]
  );
};

const isPermissionDisabled = (role, permissionKey) =>
  !isPermissionEditableForRole(role, permissionKey);

const normalizeUserPermissions = (usuario) => ({
  ...usuario,
  permisos: sanitizePermissionsForRole(usuario.role, usuario.permisos ?? {}),
});

const cargarUsuarios = async () => {
  const idProveedorSalud = user.value?.idProveedorSalud;
  if (!idProveedorSalud) {
    toast.open({
      message: 'No se pudo identificar el proveedor de salud',
      type: 'error',
    });
    return;
  }

  loading.value = true;
  try {
    const resultado = await userStore.fetchUsersByProveedorId(
      idProveedorSalud,
      {
        scope: 'permissions',
        roles: ROLES_OPERATIVOS.join(','),
      },
    );

    if (!resultado.success) {
      usuarios.value = [];
      toast.open({
        message: 'Error al cargar usuarios',
        type: 'error',
      });
      return;
    }

    usuarios.value = (resultado.data ?? []).map(normalizeUserPermissions);
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
    usuarios.value = [];
    toast.open({
      message: 'Error al cargar usuarios',
      type: 'error'
    });
  } finally {
    loading.value = false;
  }
};

const guardarTodosLosCambios = async () => {
  if (!hasChanges.value) {
    toast.open({
      message: 'No hay cambios para guardar',
      type: 'info'
    });
    return;
  }

  saving.value = true;
  const usuariosConCambios = usuariosFiltrados.value.filter(usuario => {
    const original = originalPermissions.value.get(usuario._id);
    if (!original) return false;
    
    return Object.keys(usuario.permisos).some(permiso => 
      usuario.permisos[permiso] !== original[permiso]
    );
  });

  // Aplicar techos por rol antes de guardar
  usuariosConCambios.forEach(usuario => {
    usuario.permisos = sanitizePermissionsForRole(usuario.role, usuario.permisos);
  });

  try {
    // Guardar todos los cambios en paralelo
    const promises = usuariosConCambios.map(usuario => 
      PermissionsAPI.updateUserPermissions(usuario._id, usuario.permisos)
    );
    
    await Promise.all(promises);
    
    // Actualizar el estado original con los nuevos valores
    usuariosConCambios.forEach(usuario => {
      originalPermissions.value.set(usuario._id, { ...usuario.permisos });
    });
    
    hasUnsavedChanges.value = false;

    userStore.invalidateTenantUsersCache(user.value?.idProveedorSalud);
    
    toast.open({
      message: `Permisos actualizados para ${usuariosConCambios.length} usuario(s)`,
      type: 'success'
    });
  } catch (error) {
    console.error('Error al actualizar permisos:', error);
    toast.open({
      message: 'Error al actualizar permisos',
      type: 'error'
    });
    
    await cargarUsuarios();
    syncOriginalPermissions();
  } finally {
    saving.value = false;
  }
};

const descartarCambios = async () => {
  try {
    await cargarUsuarios();
    syncOriginalPermissions();
    hasUnsavedChanges.value = false;
    
    toast.open({
      message: 'Cambios descartados',
      type: 'info'
    });
  } catch (error) {
    console.error('Error al descartar cambios:', error);
    toast.open({
      message: 'Error al descartar cambios',
      type: 'error'
    });
  }
};

const toggleAccountStatus = async (usuario) => {
  try {
    const nuevoEstado = !usuario.cuentaActiva;
    await PermissionsAPI.toggleAccountStatus(usuario._id, nuevoEstado);
    
    usuario.cuentaActiva = nuevoEstado;
    userStore.invalidateTenantUsersCache(user.value?.idProveedorSalud);
    const estado = nuevoEstado ? 'reactivada' : 'suspendida';
    
    toast.open({
      message: `Cuenta de ${usuario.username} ${estado} correctamente`,
      type: 'success'
    });
  } catch (error) {
    console.error('Error al cambiar estado de cuenta:', error);
    toast.open({
      message: 'Error al cambiar estado de cuenta',
      type: 'error'
    });
    
    // Recargar usuarios para restaurar el estado anterior
    await cargarUsuarios();
    syncOriginalPermissions();
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
  <div class="p-4 sm:p-6 max-w-7xl mx-auto">
    <div class="mb-6">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Gestionar Permisos de Usuarios</h1>
          <p class="text-sm sm:text-base text-gray-600">Configura los permisos específicos para usuarios operativos del tenant</p>
        </div>
        
        <!-- Indicador de cambios y botones de acción -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-end w-full lg:w-auto">
          <!-- Indicador de cambios sin guardar -->
          <div v-if="hasUnsavedChanges" class="permissions-unsaved-indicator flex flex-wrap items-center justify-between sm:justify-center text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 text-xs sm:text-sm gap-1">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <span class="font-medium">Cambios sin guardar</span>
          </div>
          
          <!-- Botones de acción -->
          <div class="flex flex-col sm:flex-row gap-2">
            <button
              v-if="hasUnsavedChanges"
              @click="descartarCambios"
              :disabled="saving"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duración-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
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
      <h2 class="text-xl font-semibold text-gray-700 mb-2">Cargando Usuarios...</h2>
      <p class="text-gray-500">Obteniendo información de permisos</p>
    </div>

    <div v-else-if="usuariosFiltrados.length === 0" key="empty" class="text-center py-20">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
        <i class="fas fa-users text-2xl text-gray-400"></i>
      </div>
      <h2 class="text-xl font-semibold text-gray-700 mb-2">No hay usuarios para gestionar</h2>
      <p class="text-gray-500">Solo se muestran usuarios con rol Médico, Enfermero/a, Administrativo o Técnico Evaluador</p>
    </div>

    <div v-else key="content">
      <!-- Tarjeta de estado de permisos del usuario actual -->
      <!-- <PermissionStatusCard class="mb-6" /> -->

      <!-- Información adicional -->
      <div class="p-4 bg-white rounded-lg shadow-lg border border-gray-200 mb-6">
        <div class="flex items-start gap-3">
          <i class="fas fa-info-circle text-blue-600 mt-0.5"></i>
          <div>
            <p class="text-sm sm:text-base text-blue-800 font-medium mb-1">Información de Permisos</p>
            <p class="text-xs sm:text-sm text-blue-700">
              Los permisos se aplican automáticamente en toda la aplicación. 
              Si no tienes un permiso específico, los botones correspondientes estarán deshabilitados 
              o se mostrarán mensajes informativos cuando intentes realizar acciones restringidas.
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
          'bg-white rounded-xl shadow-lg border p-4 sm:p-6 hover:shadow-xl transition-all duration-300',
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
                <span v-if="hasChangesForUser(usuario)" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  <i class="fas fa-pencil-alt mr-1"></i>
                  Modificado
                </span>
              </div>
              <p class="text-xs sm:text-sm text-gray-500">{{ usuario.role }}</p>
            </div>
          </div>
          
          <!-- Estado de cuenta -->
          <div class="flex items-center space-x-1.5 sm:space-x-2">
            <span 
              :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                usuario.cuentaActiva 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              ]"
            >
              <i 
                :class="[
                  'w-1.5 h-1.5 rounded-full mr-1',
                  usuario.cuentaActiva ? 'bg-green-400' : 'bg-red-400'
                ]"
              ></i>
              {{ usuario.cuentaActiva ? 'Activa' : 'Suspendida' }}
            </span>
          </div>
        </div>

        <!-- Botón de suspender/reactivar -->
        <div class="mb-4">
          <button
            @click="toggleAccountStatus(usuario)"
            :class="[
              'w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 text-sm sm:text-base',
              usuario.cuentaActiva
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            ]"
          >
            <i :class="[
              'fas mr-2',
              usuario.cuentaActiva ? 'fa-pause' : 'fa-play'
            ]"></i>
            {{ usuario.cuentaActiva ? 'Suspender Cuenta' : 'Reactivar Cuenta' }}
          </button>
        </div>

        <!-- Permisos -->
        <div class="space-y-4">
          <!-- Gestión de Entidades -->
          <div>
            <h4 class="font-medium text-gray-900 mb-3 flex items-center">
              <i class="fas fa-cogs text-blue-600 mr-2"></i>
              Gestión de Entidades
            </h4>
            <div class="space-y-3 pl-4 sm:pl-6">
              <label class="flex items-center space-x-2 sm:space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="usuario.permisos.gestionarEmpresas"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                >
                <i class="fas fa-building text-gray-600 text-sm sm:text-base"></i>
                <span class="text-xs sm:text-sm text-gray-700 leading-snug">Gestionar Empresas</span>
              </label>

              <label class="flex items-center space-x-2 sm:space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="usuario.permisos.gestionarCentrosTrabajo"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                >
                <i class="fas fa-industry text-gray-600 text-sm sm:text-base"></i>
                <span class="text-xs sm:text-sm text-gray-700 leading-snug">Gestionar Centros de Trabajo</span>
              </label>

              <label class="flex items-center space-x-2 sm:space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="usuario.permisos.gestionarTrabajadores"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                >
                <i class="fas fa-users text-gray-600 text-sm sm:text-base"></i>
                <span class="text-xs sm:text-sm text-gray-700 leading-snug">Gestionar Trabajadores</span>
              </label>
            </div>
          </div>

          <!-- Separador visual -->
          <div class="border-t border-gray-200"></div>

          <!-- Gestión de Documentos -->
          <div>
            <h4 class="font-medium text-gray-900 mb-3 flex items-center">
              <i class="fas fa-file-medical text-green-600 mr-2"></i>
              Gestión de Documentos Médicos
            </h4>

            <!-- Mensaje informativo para administrativos -->
            <div v-if="usuario.role === 'Administrativo'" class="manage-permissions-role-hint mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] sm:text-xs text-amber-700 flex items-start gap-2">
              <i class="fas fa-info-circle mt-0.5 shrink-0"></i>
              <span>Los usuarios administrativos no pueden gestionar documentos clínicos (diagnóstico, evaluación u otros). Solo pueden gestionar documentos externos.</span>
            </div>

            <!-- Mensaje informativo para técnicos evaluadores -->
            <div v-if="usuario.role === 'Técnico Evaluador'" class="manage-permissions-role-hint mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] sm:text-xs text-amber-700 flex items-start gap-2">
              <i class="fas fa-info-circle mt-0.5 shrink-0"></i>
              <span>Los usuarios técnicos no tienen permitido gestionar documentos de Diagnóstico y Certificación.</span>
            </div>

            <div class="space-y-3 pl-4 sm:pl-6">
              <label 
                :class="[
                  'flex items-center space-x-2 sm:space-x-3',
                  isPermissionDisabled(usuario.role, 'gestionarDocumentosDiagnostico') ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                ]"
              >
                <input 
                  type="checkbox" 
                  v-model="usuario.permisos.gestionarDocumentosDiagnostico"
                  :disabled="isPermissionDisabled(usuario.role, 'gestionarDocumentosDiagnostico')"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                >
                <i class="fas fa-stethoscope text-gray-600 text-sm sm:text-base"></i>
                <span class="text-xs sm:text-sm text-gray-700 leading-snug">Documentos de Diagnóstico y Certificación</span>
              </label>

              <label 
                :class="[
                  'flex items-center space-x-2 sm:space-x-3',
                  isPermissionDisabled(usuario.role, 'gestionarDocumentosEvaluacion') ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                ]"
              >
                <input 
                  type="checkbox" 
                  v-model="usuario.permisos.gestionarDocumentosEvaluacion"
                  :disabled="isPermissionDisabled(usuario.role, 'gestionarDocumentosEvaluacion')"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                >
                <i class="fas fa-clipboard-check text-gray-600 text-sm sm:text-base"></i>
                <span class="text-xs sm:text-sm text-gray-700 leading-snug">Documentos de Evaluación</span>
              </label>

              <label class="flex items-center space-x-2 sm:space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="usuario.permisos.gestionarDocumentosExternos"
                  :disabled="isPermissionDisabled(usuario.role, 'gestionarDocumentosExternos')"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                >
                <i class="fas fa-file-upload text-gray-600 text-sm sm:text-base"></i>
                <span class="text-xs sm:text-sm text-gray-700 leading-snug">Documentos Externos</span>
              </label>

              <label 
                :class="[
                  'flex items-center space-x-2 sm:space-x-3',
                  isPermissionDisabled(usuario.role, 'gestionarOtrosDocumentos') ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                ]"
              >
                <input 
                  type="checkbox" 
                  v-model="usuario.permisos.gestionarOtrosDocumentos"
                  :disabled="isPermissionDisabled(usuario.role, 'gestionarOtrosDocumentos')"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                >
                <i class="fas fa-clipboard-list text-gray-600 text-sm sm:text-base"></i>
                <span class="text-xs sm:text-sm text-gray-700 leading-snug">Otros Documentos</span>
              </label>
            </div>
          </div>

          <!-- Separador visual -->
          <div class="border-t border-gray-200"></div>

          <!-- Acceso a Funcionalidades -->
          <div>
            <h4 class="font-medium text-gray-900 mb-3 flex items-center">
              <i class="fas fa-shield-alt text-purple-600 mr-2"></i>
              Acceso a Funcionalidades
            </h4>

            <div
              v-if="usuario.role === 'Administrativo' || usuario.role === 'Técnico Evaluador'"
              class="manage-permissions-role-hint mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] sm:text-xs text-amber-700 flex items-start gap-2"
            >
              <i class="fas fa-info-circle mt-0.5 shrink-0"></i>
              <span>{{ getPermissionBlockReason(usuario.role, 'accesoRiesgosTrabajo') }}</span>
            </div>

            <div class="space-y-3 pl-4 sm:pl-6">
              <label class="flex items-center space-x-2 sm:space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="usuario.permisos.accesoCompletoEmpresasCentros"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                >
                <i class="fas fa-globe text-gray-600 text-sm sm:text-base"></i>
                <span class="text-xs sm:text-sm text-gray-700 leading-snug">Acceso Completo a Empresas y Centros</span>
              </label>

              <label class="flex items-center space-x-2 sm:space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="usuario.permisos.accesoDashboardSalud"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                >
                <i class="fas fa-chart-line text-gray-600 text-sm sm:text-base"></i>
                <span class="text-xs sm:text-sm text-gray-700 leading-snug">Acceso al Dashboard de Salud</span>
              </label>

              <label 
                :class="[
                  'flex items-center space-x-2 sm:space-x-3',
                  isPermissionDisabled(usuario.role, 'accesoRiesgosTrabajo') ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                ]"
              >
                <input 
                  type="checkbox" 
                  v-model="usuario.permisos.accesoRiesgosTrabajo"
                  :disabled="isPermissionDisabled(usuario.role, 'accesoRiesgosTrabajo')"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                >
                <i class="fas fa-exclamation-triangle text-gray-600 text-sm sm:text-base"></i>
                <span class="text-xs sm:text-sm text-gray-700 leading-snug">Acceso a Riesgos de Trabajo</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Información adicional -->
        <div class="mt-4 pt-4 border-t border-gray-200">
          <p class="text-[11px] sm:text-xs text-gray-500">
            <i class="fas fa-envelope mr-1"></i>
            {{ usuario.email }}
          </p>
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
html.dark-mode .permissions-unsaved-indicator {
  color: #fcd34d !important;
  background-color: rgba(146, 64, 14, 0.28) !important;
  border-color: #b45309 !important;
}
</style>
