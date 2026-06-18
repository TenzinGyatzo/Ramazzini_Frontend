<script setup>
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

const userStore = useUserStore();
const proveedorSaludStore = useProveedorSaludStore();
const { proveedorSalud } = storeToRefs(proveedorSaludStore);
const user = computed(() => userStore.user);
const router = useRouter();
const route = useRoute();

const emit = defineEmits(['closeModal']);

const closeModal = () => {
  emit('closeModal');
};


const historiasDelMes = ref(0);
const vistaActual = ref(route.name);
  
onMounted(async () => {
  // Obtener historias clínicas del mes
    historiasDelMes.value = await proveedorSaludStore.getHistoriasClinicasDelMes();
});

const maxHistoriasPermitidasAlMes = computed(() => proveedorSalud.value?.maxHistoriasPermitidasAlMes);
const periodoDePruebaFinalizado = computed(() => proveedorSalud.value?.periodoDePruebaFinalizado);
const estadoSuscripcion = computed(() => proveedorSalud.value?.estadoSuscripcion);
const finDeSuscripcion = computed(() =>
  proveedorSalud.value?.finDeSuscripcion
    ? new Date(proveedorSalud.value.finDeSuscripcion)
    : null
);

const modalContent = computed(() => {
  
  // if (vistaActual.value === 'add-user' && usuariosCreados.value >= maxUsuariosPermitidos) {
  //   return {
  //     title: 'Has alcanzado el límite de usuarios',
  //     message: `Tu plan actual permite hasta ${maxUsuariosPermitidos} ${maxUsuariosPermitidos === 1 ? 'usuario' : 'usuarios'}.`,
  //     price: 'Actualiza tu plan para añadir más usuarios y seguir creciendo.',
  //     benefits: [
  //       'Aumenta el número de usuarios permitidos',
  //       'Mantén a todo tu equipo conectado',
  //       'Escala tu organización sin limitaciones'
  //     ],
  //     buttonText: 'Actualizar plan',
  //     action: () => router.push({ name: 'subscription' }),
  //     show: true
  //   };
  // }

  // if (vistaActual.value === 'empresas' && empresasCreadas.value >= maxEmpresasPermitidas) {
  //   return {
  //     title: 'Has alcanzado el límite de empresas',
  //     message: `Tu plan actual permite hasta ${maxEmpresasPermitidas} empresas.`,
  //     price: 'Actualiza tu plan para añadir más empresas y seguir creciendo.',
  //     benefits: [
  //       'Amplía tu capacidad para gestionar más empresas',
  //       'Administra múltiples organizaciones desde una sola plataforma',
  //       'Potencia el crecimiento de tu negocio sin restricciones'
  //     ],
  //     buttonText: 'Actualizar plan',
  //     action: () => router.push({ name: 'subscription' }),
  //     show: true
  //   };
  // }
  
  if (periodoDePruebaFinalizado && !estadoSuscripcion) {
    return {
      title: 'Tu prueba gratuita ha finalizado',
      message: 'No te detengas aquí, sigue optimizando tu práctica.',
      price: 'A partir de $999/mes, desbloquea el potencial completo de nuestro software y obtén acceso a todas las herramientas que necesitas.',
      benefits: [
        'Registra y gestiona a tus clientes y sus trabajadores.',
        'Genera informes y documentos personalizados de forma automática.',
        'Mejora la precisión y confianza en tu trabajo.',
      ],
      buttonText: 'Suscríbete ahora',
      action: () => router.push({ name: 'subscription' }),
    };
  }
  
  if (periodoDePruebaFinalizado && estadoSuscripcion === 'cancelled' && (!finDeSuscripcion || new Date(finDeSuscripcion) <= new Date())) {
    return {
      title: 'Tu suscripción ha finalizado',
      message: `Tu acceso expiró el ${finDeSuscripcion ? finDeSuscripcion.toLocaleDateString() : 'anteriormente'}.`,
      price: 'Reactiva tu acceso y vuelve a disfrutar de todas nuestras herramientas. Tenemos planes que se adaptan a tus necesidades.',
      buttonText: 'Suscríbete ahora',
      action: () => router.push({ name: 'subscription' }),
    };
  }
  
  if (periodoDePruebaFinalizado && estadoSuscripcion === 'inactive') {
    return {
      title: 'Tu pago no fue procesado',
      message: 'Parece que hubo un problema con tu pago y tu suscripción no pudo activarse.',
      price: 'Actualiza tu método de pago para seguir usando todas nuestras herramientas sin interrupciones.',
      buttonText: 'Actualizar pago',
      action: () => router.push({ name: 'subscription' }),
    };
  }

  if (vistaActual.value === 'expediente-medico' && historiasDelMes.value >= maxHistoriasPermitidasAlMes) {
    return {
      title: 'Has alcanzado el límite de historias clínicas este mes',
      message: `Tu plan actual permite hasta ${maxHistoriasPermitidasAlMes} historias clínicas al mes.`,
      price: 'Actualiza tu plan para añadir más historias clínicas y seguir creciendo.',
      benefits: [
        'Registra y gestiona más exámenes médicos laborales al mes',
        'Realiza un seguimiento detallado de la salud ocupacional',
        'Mejora la atención y el control médico de los trabajadores'
      ],
      buttonText: 'Actualizar plan',
      action: () => router.push({ name: 'subscription' }),
      show: true
    };
  }

  return { show: false };
});

</script>

<template>
  <div v-if="modalContent.show !== false" class="modal fixed top-0 left-0 z-50 p-4 sm:p-8 h-screen w-full flex items-center justify-center">
    <div class="absolute top-0 left-0 w-full h-full bg-gray-800 bg-opacity-60 backdrop-blur-sm" @click="closeModal"></div>

    <Transition appear name="fade">
      <div
        class="modal-inner relative bg-white text-gray-900 w-full sm:w-4/5 md:w-3/5 xl:w-2/5 2xl:w-1/3 p-8 rounded-xl shadow-lg border border-gray-200 max-h-[90vh] overflow-y-auto"
      >
        <div
          class="modal-close absolute h-10 w-10 flex justify-center items-center top-3 right-3 text-2xl text-gray-500 hover:text-gray-700 transition-all duration-300 cursor-pointer"
          @click="closeModal"
        >
          &times;
        </div>

        <div class="mb-5">
          <h1 class="text-3xl font-extrabold text-gray-800 tracking-tight">
            <span class="bg-gradient-to-r from-emerald-600 to-teal-400 bg-clip-text text-transparent">
              {{ modalContent.title }}
            </span>
          </h1>
          <hr class="mt-3 mb-5 border-t border-gray-300" />
        </div>

        <h3 class="text-2xl font-semibold text-gray-800">{{ modalContent.message }}</h3>

        <p class="text-lg text-gray-700 font-medium mt-4">
          {{ modalContent.price }}
        </p>

        <ul v-if="modalContent.benefits" class="list-disc list-inside space-y-2 text-gray-700 text-base mt-4">
          <li v-for="(benefit, index) in modalContent.benefits" :key="index">{{ benefit }}</li>
        </ul>

        <div class="flex justify-center mt-6">
          <button
            @click="modalContent.action"
            class="w-full sm:w-3/4 py-3 px-6 text-2xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-transform duration-300"
          >
            {{ modalContent.buttonText }}
          </button>
        </div>

        <p class="text-sm text-gray-500 mt-2 text-center">Cancela en cualquier momento. Sin compromisos.</p>

        <div class="flex justify-center mt-4">
          <button
            class="w-full sm:w-3/4 py-3 px-6 text-base font-light text-gray-800 bg-white rounded-lg ring-1 ring-gray-300 shadow-sm hover:bg-gray-100 hover:scale-105 transition-transform duration-300"
            @click="closeModal"
          >
            Seguir explorando
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>


<style scoped>
.fade-slow-enter-from,
.fade-slow-leave-to {
  opacity: 0;
}

.fade-slow-enter-active,
.fade-slow-leave-active {
  transition: all 500ms ease-out;
}

.fade-slow-leave-active {
  transition-delay: 250ms;
}
</style>
