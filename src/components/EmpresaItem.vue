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
    <div class="empresa-item group min-w-0">
        <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg">
            <!-- Contenido principal -->
            <RouterLink
            v-if="empresa?._id"
            :to="{ name: 'centros-trabajo', params: { idEmpresa: empresa._id } }"
            class="empresa-card-link empresa-item__link block w-full min-w-0 p-6 text-center transition-all duration-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-200">
            
            <img v-if="empresa.logotipoEmpresa?.data"
                :src="'/uploads/logos/' + empresa.logotipoEmpresa.data + '?t=' + empresa.updatedAt"
                :alt="'Logo de ' + empresa.nombreComercial"
                class="empresa-item__logo mb-4 h-32 w-full rounded object-contain" />
            
            <!-- Placeholder si no hay logotipo -->
            <div v-else class="empresa-item-placeholder empresa-item__placeholder mx-auto mb-4 flex h-32 w-4/6 flex-col items-center justify-center rounded border-2 border-dashed border-gray-400 bg-gradient-to-r from-gray-200 to-gray-300 px-4 text-center text-gray-500">
                <i class="empresa-item-placeholder-icon fas fa-camera mb-2 text-4xl"></i>
                <span class="text-xs text-center">
                    <span class="hidden sm:inline">Identifica más rápido a tu cliente agregando un logotipo</span>
                    <span class="inline sm:hidden">Agrega un logotipo para identificarlo</span>
                </span>
            </div>

            <h2
                class="empresa-item-title mb-3 text-2xl font-bold leading-tight text-gray-900 sm:text-3xl"
                :title="empresa.nombreComercial"
            >{{ empresa.nombreComercial }}</h2>
            
            <!-- Si no hay razón social, ocultar o mostrar un mensaje alternativo -->
            <p
                v-if="empresa.razonSocial"
                class="empresa-item-subtitle mb-2 text-sm leading-relaxed text-gray-600 sm:text-base"
                :title="empresa.razonSocial"
            >
                {{ empresa.razonSocial }}
            </p>
            <p v-else class="empresa-item-muted mb-2 text-sm italic leading-relaxed text-gray-400 sm:text-base">
                Sin razón social registrada
            </p>
            
            </RouterLink>

            <!-- Barra de acciones -->
            <div class="empresa-item__actions border-t border-gray-100 bg-gray-50 px-6 py-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="empresa-item-actions-label text-xs font-medium text-gray-500">Acciones</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button 
                            type="button" 
                            @click="handleEditarEmpresa(empresa)"
                            :disabled="!canManageEmpresas"
                            :class="[
                                'empresa-item__action-btn inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 transform focus:outline-none focus:ring-2',
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
                                'empresa-item__action-btn inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 transform focus:outline-none focus:ring-2',
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

.empresa-item-title,
.empresa-item-subtitle {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

@media (max-width: 479px) {
    .group:hover {
        transform: none;
    }

    .empresa-item__link {
        padding: 0.75rem;
    }

    .empresa-item__logo {
        height: 5.5rem;
        margin-bottom: 0.75rem;
    }

    .empresa-item__placeholder {
        width: 100%;
        height: 5.5rem;
        margin-bottom: 0.75rem;
        padding-left: 0.75rem;
        padding-right: 0.75rem;
    }

    .empresa-item-placeholder-icon {
        font-size: 1.5rem;
        margin-bottom: 0.25rem;
    }

    .empresa-item-title,
    .empresa-item-subtitle,
    .empresa-item-muted {
        white-space: normal;
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow-wrap: anywhere;
        text-overflow: ellipsis;
    }

    .empresa-item-title {
        margin-bottom: 0.35rem;
        font-size: 1.05rem;
        line-height: 1.25;
    }

    .empresa-item-subtitle,
    .empresa-item-muted {
        margin-bottom: 0;
        font-size: 0.75rem;
        line-height: 1.3;
    }

    .empresa-item__actions {
        padding: 0.5rem 0.75rem;
    }

    .empresa-item__action-btn {
        padding: 0.375rem 0.5rem;
    }

    .empresa-item__action-btn:hover {
        transform: none;
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
