<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { Empresa } from '@/interfaces/empresa.interface';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';

const { canManageEmpresas, executeIfCanManageEmpresas } = usePermissionRestrictions();

defineProps({
    empresa: {
        type: Object as () => Empresa,
        required: true,
    }
});

const emit = defineEmits<{
    (event: 'editarEmpresa', empresa: Empresa | null): void;
    (event: 'eliminarEmpresa', id: string, nombreComercial: string): void;
}>();

const handleEditarEmpresa = (empresa: Empresa) => {
    executeIfCanManageEmpresas(() => {
        // Emitir evento solo si tiene permisos
        emit('editarEmpresa', empresa);
    }, 'editar empresas');
};

const handleEliminarEmpresa = (id: string, nombreComercial: string) => {
    executeIfCanManageEmpresas(() => {
        // Emitir evento solo si tiene permisos
        emit('eliminarEmpresa', id, nombreComercial);
    }, 'eliminar empresas');
};
</script>

<template>
    <div class="group">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
            <!-- Contenido principal -->
            <RouterLink
            v-if="empresa?._id"
            :to="{ name: 'centros-trabajo', params: { idEmpresa: empresa._id } }"
            class="empresa-card-link block w-full text-center p-6 hover:bg-gray-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-200">
            
            <img v-if="empresa.logotipoEmpresa?.data"
                :src="'/uploads/logos/' + empresa.logotipoEmpresa.data + '?t=' + empresa.updatedAt"
                :alt="'Logo de ' + empresa.nombreComercial"
                class="w-full h-32 object-contain mb-4 rounded" />
            
            <!-- Placeholder si no hay logotipo -->
            <div v-else class="empresa-item-placeholder w-4/6 mx-auto h-32 flex flex-col items-center justify-center bg-gradient-to-r from-gray-200 to-gray-300 text-gray-500 rounded mb-4 text-center px-4 border-2 border-dashed border-gray-400">
                <i class="empresa-item-placeholder-icon fas fa-camera text-4xl mb-2"></i> <!-- Icono de FontAwesome -->
                <span class="text-xs text-center">
                    <span class="hidden sm:inline">Identifica más rápido a tu cliente agregando un logotipo</span>
                    <span class="inline sm:hidden">Agrega un logotipo para identificarlo</span>
                </span>
            </div>

            <h2 class="empresa-item-title text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight truncate" :title="empresa.nombreComercial">{{ empresa.nombreComercial }}</h2>
            
            <!-- Si no hay razón social, ocultar o mostrar un mensaje alternativo -->
            <p v-if="empresa.razonSocial" class="empresa-item-subtitle text-sm sm:text-base text-gray-600 leading-relaxed mb-2 truncate">
                {{ empresa.razonSocial }}
            </p>
            <p v-else class="empresa-item-muted text-sm sm:text-base text-gray-400 italic leading-relaxed mb-2">
                Sin razón social registrada
            </p>
            
            </RouterLink>

            <!-- Barra de acciones -->
            <div class="border-t border-gray-100 bg-gray-50 px-6 py-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="empresa-item-actions-label text-xs text-gray-500 font-medium">Acciones</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button 
                            type="button" 
                            @click="handleEditarEmpresa(empresa)"
                            :disabled="!canManageEmpresas"
                            :class="[
                                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 transform focus:outline-none focus:ring-2',
                                canManageEmpresas 
                                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:scale-105 focus:ring-gray-200' 
                                    : 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                            ]"
                            :title="canManageEmpresas ? 'Editar empresa' : 'No tienes permisos para editar empresas'"
                        >
                            <i class="fas fa-edit text-xs"></i>
                            <span class="hidden sm:inline">Editar</span>
                        </button>
                        <button 
                            type="button" 
                            @click="handleEliminarEmpresa(empresa._id, empresa.nombreComercial)"
                            :disabled="!canManageEmpresas"
                            :class="[
                                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 transform focus:outline-none focus:ring-2',
                                canManageEmpresas 
                                    ? 'bg-red-50 hover:bg-red-100 text-red-600 hover:scale-105 focus:ring-red-200' 
                                    : 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                            ]"
                            :title="canManageEmpresas ? 'Eliminar empresa' : 'No tienes permisos para eliminar empresas'"
                        >
                            <i class="fas fa-trash text-xs"></i>
                            <span class="hidden sm:inline">Eliminar</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.empresa-card-link {
    text-decoration: none;
    color: inherit;
}

/* Animaciones suaves para las transiciones */
.group {
    transition: all 0.3s ease;
}

.group:hover {
    transform: translateY(-2px);
}

/* Efectos de hover para los botones */
button:active {
    transform: scale(0.98);
}

/* Mejoras para el focus de los botones */
button:focus {
    outline: none;
}

/* Efectos de hover para las tarjetas */
.bg-white {
    transition: all 0.3s ease;
}

.bg-white:hover {
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

/* Responsive design mejorado */
@media (max-width: 640px) {
    .hidden.sm\:inline {
        display: none;
    }
}

/* Mejoras para la accesibilidad */
@media (prefers-reduced-motion: reduce) {
    .group,
    button,
    .bg-white {
        transition: none;
    }
}

</style>
