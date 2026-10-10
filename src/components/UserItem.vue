<script setup>

defineProps({
    id: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
    },
    cuentaActiva: {
        type: Boolean,
        default: true
    },
    /** Pantalla de firmante del usuario; solo la recibe el Administrador de plataforma. */
    rutaFirmante: {
        type: Object,
        default: null
    }
});

defineEmits(['eliminarUsuario', 'toggleAccountStatus']);

</script>

<template>
    <div
        class="w-full sm:w-2/3 lg:w-1/2 xl:w-full p-6 max-w-6xl mx-auto bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col md:flex-row justify-between items-start md:items-center">
        <!-- Información del usuario -->
        <div class="w-full grid grid-cols-1 xl:grid-cols-4 gap-3 xl:gap-8">
            <div class="font-semibold text-gray-600 break-words"><span class="font-light">Nombre:</span><br> <span class="break-all">{{ username }}</span></div>
            <div class="font-semibold text-gray-600 break-words"><span class="font-light">Correo:</span><br> <span class="break-all">{{ email }}</span></div>
            <div class="font-semibold text-gray-600 break-words"><span class="font-light">Teléfono:</span><br> <span class="break-all">{{ phone }}</span></div>
            <div class="font-semibold text-gray-600 break-words">
                <span class="font-light">Usuario:</span><br> 
                <span class="break-all">{{ role }}</span>
                <br>
                <span 
                    :class="[
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1',
                        cuentaActiva 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                    ]"
                >
                    <i 
                        :class="[
                            'w-1.5 h-1.5 rounded-full mr-1',
                            cuentaActiva ? 'bg-green-400' : 'bg-red-400'
                        ]"
                    ></i>
                    {{ cuentaActiva ? 'Activa' : 'Suspendida' }}
                </span>
            </div>
        </div>

        <!-- Botones de acción -->
        <div class="mt-4 md:mt-0 md:ml-4 w-full md:w-auto flex flex-col space-y-2">
            <!-- Perfil de firmante (Administrador de plataforma) -->
            <RouterLink v-if="rutaFirmante" :to="rutaFirmante"
                class="user-item-firmante w-full md:w-auto min-w-[140px] px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white uppercase rounded-lg transition duration-300 text-sm sm:text-base flex items-center justify-center"
                title="Ver y editar su perfil de firmante"
                data-test="perfil-firmante">
                <i class="fas fa-signature mr-2"></i>
                Firmante
            </RouterLink>
            <!-- Botón de suspender/reactivar -->
            <button v-if="role != 'Principal'" type="button"
                :class="[
                    'w-full md:w-auto min-w-[140px] px-4 py-1.5 uppercase rounded-lg transition duration-300 text-sm sm:text-base flex items-center justify-center',
                    cuentaActiva
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                ]"
                @click="$emit('toggleAccountStatus', email)"
                >
                <i :class="[
                    'fas mr-2',
                    cuentaActiva ? 'fa-pause' : 'fa-play'
                ]"></i>
                {{ cuentaActiva ? 'Suspender' : 'Reactivar' }}
            </button>
            
            <!-- Botón de eliminar -->
            <button v-if="role != 'Principal'" type="button"
                class="w-full md:w-auto min-w-[140px] px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white uppercase rounded-lg transition duration-300 text-sm sm:text-base flex items-center justify-center"
                @click="$emit('eliminarUsuario', email, username)"
                >
                Eliminar
            </button>
            <button v-else type="button"
                class="w-full md:w-auto min-w-[140px] px-4 py-1.5 bg-red-300 text-white uppercase rounded-lg transition duration-300 text-sm sm:text-base flex items-center justify-center opacity-0"
                disabled>
                Eliminar
            </button>
        </div>
    </div>
</template>