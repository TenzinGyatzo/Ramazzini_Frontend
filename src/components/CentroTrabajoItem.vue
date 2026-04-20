<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref, onMounted, watch } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import type { Empresa } from '@/interfaces/empresa.interface';
import type { CentroTrabajo } from '@/interfaces/centro-trabajo.interface';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';

const router = useRouter();
const trabajadores = useTrabajadoresStore();
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
});

const emit = defineEmits<{
    (event: 'editarCentro', empresa: Empresa, centro: CentroTrabajo): void;
    (event: 'eliminarCentro', id: string, nombreCentro: string): void;
}>();

const handleEditarCentro = (empresa: Empresa, centro: CentroTrabajo) => {
    executeIfCanManageCentrosTrabajo(() => {
        // Emitir evento solo si tiene permisos
        emit('editarCentro', empresa, centro);
    }, 'editar centros de trabajo');
};

const handleEliminarCentro = (id: string, nombreCentro: string) => {
    executeIfCanManageCentrosTrabajo(() => {
        // Emitir evento solo si tiene permisos
        emit('eliminarCentro', id, nombreCentro);
    }, 'eliminar centros de trabajo');
};

// Estado para el número de trabajadores
const numeroTrabajadores = ref(0);
const loadingTrabajadores = ref(false);

// Método para formatear la dirección
const formatDireccion = (centro: CentroTrabajo) => {
    const parts: string[] = [];
    if (centro.direccionCentro) parts.push(centro.direccionCentro);
    if (centro.codigoPostal) parts.push(centro.codigoPostal);
    if (centro.municipio) parts.push(centro.municipio);
    if (centro.estado) parts.push(centro.estado);
    return parts.join(', ');
};

// Función para obtener el número de trabajadores del centro
const obtenerNumeroTrabajadores = async () => {
    if (!props.centro || !props.empresa) {
        numeroTrabajadores.value = 0;
        return;
    }

    loadingTrabajadores.value = true;
    try {
        const trabajadoresCentro = await trabajadores.fetchTrabajadores(
            props.empresa._id, 
            props.centro._id
        );
        
        if (Array.isArray(trabajadoresCentro)) {
            numeroTrabajadores.value = trabajadoresCentro.length;
        } else {
            numeroTrabajadores.value = 0;
        }
    } catch (error) {
        console.error('Error al obtener trabajadores del centro:', error);
        numeroTrabajadores.value = 0;
    } finally {
        loadingTrabajadores.value = false;
    }
};

// Observar cambios en las props para actualizar el conteo
watch(() => [props.centro?._id, props.empresa?._id], () => {
    if (props.centro && props.empresa) {
        obtenerNumeroTrabajadores();
    }
}, { immediate: true });

// Cargar trabajadores cuando el componente se monta
onMounted(() => {
    if (props.centro && props.empresa) {
        obtenerNumeroTrabajadores();
    }
});
</script>

<template>
    <div v-if="centro && empresa" class="group">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
            <!-- Contenido principal -->
            <button type="button"
                class="w-full text-left p-6 hover:bg-gray-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                @click="router.push({ name: 'trabajadores', params: { idEmpresa: empresa._id, idCentroTrabajo: centro._id } })">
                
                <!-- Header con icono y título -->
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-sm">
                            <i class="fas fa-building text-white text-lg"></i>
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-gray-900 mb-1">{{ centro.nombreCentro }}</h3>
                            <div class="flex items-center gap-2">
                                <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                <span v-if="loadingTrabajadores" class="text-sm text-gray-400">
                                    <i class="fas fa-spinner fa-spin mr-1"></i>
                                    Contando...
                                </span>
                                <span v-else class="empresa-item-subtitle text-sm text-gray-600">
                                    {{ numeroTrabajadores || 0 }} {{ (numeroTrabajadores || 0) === 1 ? 'trabajador' : 'trabajadores' }}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Indicador de acción -->
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <i class="fas fa-arrow-right text-emerald-500 text-lg"></i>
                    </div>
                </div>

                <!-- Información de ubicación -->
                <div class="space-y-3">
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center mt-0.5">
                            <i class="fas fa-map-marker-alt text-gray-400 text-xs"></i>
                        </div>
                        <div class="flex-1">
                            <p v-if="formatDireccion(centro)" class="text-gray-700 leading-relaxed text-sm">
                                {{ formatDireccion(centro) }}
                            </p>
                            <p v-else class="text-gray-400 italic text-sm">
                                Dirección no registrada
                            </p>
                        </div>
                    </div>
                    

                </div>
            </button>

            <!-- Barra de acciones -->
            <div class="border-t border-gray-100 bg-gray-50 px-6 py-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500 font-medium">Acciones</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button 
                            type="button" 
                            @click="handleEditarCentro(empresa, centro)"
                            :disabled="!canManageCentrosTrabajo"
                            :class="[
                                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 transform focus:outline-none focus:ring-2',
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
                                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 transform focus:outline-none focus:ring-2',
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