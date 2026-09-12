<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { Empresa } from '@/interfaces/empresa.interface';
import type { CentroTrabajo } from '@/interfaces/centro-trabajo.interface';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';

const { canManageCentrosTrabajo, executeIfCanManageCentrosTrabajo } = usePermissionRestrictions();

const props = defineProps({
    centro: {
        type: Object as () => CentroTrabajo | null,
        required: false,
    },
    empresa: {
        type: Object as () => Empresa | null,
        required: false,
    },
    numeroTrabajadores: {
        type: Number,
        default: 0,
    },
    contandoTrabajadores: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits<{
    (event: 'editarCentro', empresa: Empresa, centro: CentroTrabajo): void;
    (event: 'eliminarCentro', id: string, nombreCentro: string, cantidadTrabajadores: number): void;
}>();

const handleEditarCentro = (empresa: Empresa, centro: CentroTrabajo) => {
    executeIfCanManageCentrosTrabajo(() => {
        emit('editarCentro', empresa, centro);
    }, 'editar centros de trabajo');
};

const handleEliminarCentro = (id: string, nombreCentro: string) => {
    executeIfCanManageCentrosTrabajo(() => {
        emit('eliminarCentro', id, nombreCentro, props.numeroTrabajadores);
    }, 'eliminar centros de trabajo');
};

const formatDireccion = (centro: CentroTrabajo) => {
    const parts: string[] = [];
    if (centro.direccionCentro) parts.push(centro.direccionCentro);
    if (centro.codigoPostal) parts.push(centro.codigoPostal);
    if (centro.municipio) parts.push(centro.municipio);
    if (centro.estado) parts.push(centro.estado);
    return parts.join(', ');
};
</script>

<template>
    <div v-if="centro && empresa" class="centro-item group min-w-0">
        <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg">
            <!-- Contenido principal -->
            <RouterLink
                :to="{ name: 'trabajadores', params: { idEmpresa: empresa._id, idCentroTrabajo: centro._id } }"
                class="centro-card-link centro-item__link block w-full min-w-0 p-6 text-left transition-all duration-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-200">
                
                <!-- Header con icono y título -->
                <div class="centro-item__header mb-4 flex min-w-0 items-start justify-between gap-2">
                    <div class="centro-item__identity flex min-w-0 flex-1 items-center gap-3">
                        <div class="centro-item__icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-sm">
                            <i class="fas fa-building text-lg text-white"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <h3
                                class="centro-item__title mb-1 text-xl font-bold text-gray-900"
                                :title="centro.nombreCentro"
                            >{{ centro.nombreCentro }}</h3>
                            <div class="flex min-w-0 items-center gap-2">
                                <div class="h-2 w-2 shrink-0 rounded-full bg-emerald-500"></div>
                                <span v-if="contandoTrabajadores" class="text-sm text-gray-400">
                                    <i class="fas fa-spinner fa-spin mr-1"></i>
                                    Contando...
                                </span>
                                <span v-else class="empresa-item-subtitle centro-item__count text-sm text-gray-600">
                                    {{ numeroTrabajadores || 0 }} {{ (numeroTrabajadores || 0) === 1 ? 'trabajador' : 'trabajadores' }}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Indicador de acción -->
                    <div class="centro-item__arrow shrink-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <i class="fas fa-arrow-right text-lg text-emerald-500"></i>
                    </div>
                </div>

                <!-- Información de ubicación -->
                <div class="space-y-3">
                    <div class="flex min-w-0 items-start gap-3">
                        <div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100">
                            <i class="fas fa-map-marker-alt text-xs text-gray-400"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <p
                                v-if="formatDireccion(centro)"
                                class="centro-item__address text-sm leading-relaxed text-gray-700"
                                :title="formatDireccion(centro)"
                            >
                                {{ formatDireccion(centro) }}
                            </p>
                            <p v-else class="centro-item__address text-sm italic text-gray-400">
                                Dirección no registrada
                            </p>
                        </div>
                    </div>
                    

                </div>
            </RouterLink>

            <!-- Barra de acciones -->
            <div class="centro-item__actions border-t border-gray-100 bg-gray-50 px-6 py-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="centro-item__actions-label text-xs font-medium text-gray-500">Acciones</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button 
                            type="button" 
                            @click="handleEditarCentro(empresa, centro)"
                            :disabled="!canManageCentrosTrabajo"
                            :class="[
                                'centro-item__action-btn inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 transform focus:outline-none focus:ring-2',
                                canManageCentrosTrabajo 
                                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:scale-105 focus:ring-gray-200' 
                                    : 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                            ]"
                            :title="canManageCentrosTrabajo ? 'Editar centro de trabajo' : 'No tienes permisos para editar centros de trabajo'"
                        >
                            <i class="fas fa-edit text-xs"></i>
                            <span class="hidden sm:inline">Editar</span>
                        </button>
                        <button 
                            type="button" 
                            @click="handleEliminarCentro(centro._id, centro.nombreCentro)"
                            :disabled="!canManageCentrosTrabajo"
                            :class="[
                                'centro-item__action-btn inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 transform focus:outline-none focus:ring-2',
                                canManageCentrosTrabajo 
                                    ? 'bg-red-50 hover:bg-red-100 text-red-600 hover:scale-105 focus:ring-red-200' 
                                    : 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                            ]"
                            :title="canManageCentrosTrabajo ? 'Eliminar centro de trabajo' : 'No tienes permisos para eliminar centros de trabajo'"
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
.centro-card-link {
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

/* Animación para el indicador de acción */
.group:hover .group-hover\:opacity-100 {
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-10px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
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

    .centro-item__link {
        padding: 0.75rem;
    }

    .centro-item__header {
        margin-bottom: 0.5rem;
        gap: 0;
    }

    .centro-item__identity {
        gap: 0.625rem;
    }

    .centro-item__icon {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 0.75rem;
    }

    .centro-item__icon i {
        font-size: 0.875rem;
    }

    .centro-item__arrow {
        display: none;
    }

    .centro-item__title {
        margin-bottom: 0.15rem;
        font-size: 1rem;
        line-height: 1.25;
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow-wrap: anywhere;
    }

    .centro-item__count {
        font-size: 0.75rem;
        white-space: nowrap;
    }

    .centro-item__address {
        font-size: 0.75rem;
        line-height: 1.35;
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow-wrap: anywhere;
    }

    .centro-item__actions {
        padding: 0.5rem 0.75rem;
    }

    .centro-item__action-btn {
        padding: 0.375rem 0.5rem;
    }

    .centro-item__action-btn:hover {
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