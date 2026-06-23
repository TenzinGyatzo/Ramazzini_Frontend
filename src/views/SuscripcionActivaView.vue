<script setup>
import { ref, onMounted, computed, inject } from 'vue';
import { storeToRefs } from 'pinia';
import { usePagosStore } from '@/stores/pagosStore';
import { useUserStore } from '@/stores/user';
import { useEmpresasStore } from '@/stores/empresas';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useRouter } from 'vue-router';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es, hi } from 'date-fns/locale';
import ModalCancelarSuscripcion from '@/components/suscripciones/ModalCancelarSuscripcion.vue';

const pagosStore = usePagosStore();
const proveedorSaludStore = useProveedorSaludStore();
const { proveedorSalud } = storeToRefs(proveedorSaludStore);
const router = useRouter();

const toast = inject('toast');

const suscripcionActual = ref(null);
const historiasDelMes = ref(0);
// const usuariosCreados = ref(0);
// const empresasCreadas = ref(0);
// const empresaConMasTrabajadores = ref('');
// const trabajadoresCreados = ref(0);
const showCancelModal = ref(false);
const isCancelling = ref(false); // Estado para manejar la carga

// Función para obtener toda la información necesaria en una sola llamada
const fetchData = async () => {
  if (proveedorSalud.value?.suscripcionActiva) {
    try {
        // Obtener suscripción
        const response = await pagosStore.getSubscriptionFromAPI(proveedorSalud.value.suscripcionActiva);
        // const response = await pagosStore.getSubscriptionFromDB(proveedorSalud.value.suscripcionActiva);
      if (response) {
        suscripcionActual.value = response;
        // console.log('Detalles de la suscripción:', suscripcionActual.value);
      }

    } catch (error) {
      console.error('Error al obtener datos:', error);
    }
  }

  // Obtener historias clínicas del mes
    historiasDelMes.value = await proveedorSaludStore.getHistoriasClinicasDelMes();
  
  // // Obtener usuarios creados
  // const resultadoUsuarios = await userStore.fetchUsersByProveedorId(proveedorSalud.value._id);
  // usuariosCreados.value = resultadoUsuarios.data.length;
   
  // // Obtener empresas creadas
  // await empresasStore.fetchEmpresas(proveedorSalud.value._id);
  // empresasCreadas.value = empresasStore.empresas.length;

  // Obtener empresa con mayor número de trabajadores registrados
  // const top3Empresas = await proveedorSaludStore.getTopEmpresasByWorkers();
  // if (top3Empresas?.length > 0) {
  //   empresaConMasTrabajadores.value = top3Empresas[0].nombreComercial;
  //   trabajadoresCreados.value = top3Empresas[0].totalTrabajadores;
  // } else {
  //   console.log("No se encontraron empresas con trabajadores registrados.");
  // }

};

onMounted(async () => {
  // Recargar los datos del proveedor desde el backend
  const proveedorActualizado = await proveedorSaludStore.getProveedorById(proveedorSalud.value._id);
  proveedorSalud.value = proveedorActualizado;

  // Luego, cargar el resto de los datos
  await fetchData();
});

const toggleCancelModal = () => {
  showCancelModal.value = !showCancelModal.value;
};

const formatDate = (dateString) => {
  return dateString ? format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'No disponible';
};

const formatCurrency = (amount) => {
  return amount.toLocaleString("en-US");
};

// Computed para obtener los add-ons
// const totalUsuariosAdicionales = computed(() => {
//   return proveedorSalud.value?.addOns?.reduce((total, addon) => {
//     return addon.tipo === 'usuario_adicional' ? total + addon.cantidad : total;
//   }, 0) || 0;
// });

// const totalEmpresasAdicionales = computed(() => {
//   return proveedorSalud.value?.addOns?.reduce((total, addon) => {
//     return addon.tipo === 'empresas_extra' ? total + addon.cantidad : total;
//   }, 0) || 0;
// });

// const totalTrabajadoresAdicionales = computed(() => {
//   return proveedorSalud.value?.addOns?.reduce((total, addon) => {
//     return addon.tipo === 'trabajadores_extra' ? total + addon.cantidad : total;
//   }, 0) || 0;
// });

const totalHistoriasAdicionales = computed(() => {
  return proveedorSalud.value?.addOns?.reduce((total, addon) => {
    return addon.tipo === 'historias_extra' ? total + addon.cantidad : total;
  }, 0) || 0;
});

// Computed para mostrar el estado del periodo gratuito
const periodoGratuito = computed(() => {
  if (proveedorSalud.value?.periodoDePruebaFinalizado) {
    return 'Finalizado';
  } else if (proveedorSalud.value?.fechaInicioTrial) {
    const fechaInicioTrial = parseISO(proveedorSalud.value.fechaInicioTrial);
    const fechaFinTrial = new Date(fechaInicioTrial);
    fechaFinTrial.setDate(fechaFinTrial.getDate() + 15); // 15 días de trial
    fechaFinTrial.setHours(23, 59, 59); // Asegura que el día final termine a las 23:59:59

    const hoy = new Date();
    const diasRestantes = differenceInDays(fechaFinTrial, hoy);

    if (diasRestantes > 0) {
      return `Hasta el ${formatDate(fechaFinTrial)} (${diasRestantes} días restantes)`; // Suma 1 día
    } else {
      return 'Finalizado';
    }
  }
  return 'No disponible';
});

// Sin mostrar días restantes
/* const periodoGratuito = computed(() => {
  if (proveedorSalud.value?.periodoDePruebaFinalizado) {
    return 'Finalizado';
  } else if (proveedorSalud.value?.fechaInicioTrial) {
    return `Hasta el ${formatDate(proveedorSalud.value.fechaInicioTrial)}`; // Falta sumar los 15 días
  }
  return 'No disponible';
}); */


// Computed para calcular el uso de usuarios y empresas
const calcularPorcentaje = (valorActual, valorTotal) => {
  if (!valorTotal && valorActual > 0) {
    return 100; // Si no hay límite pero hay empresas creadas, mostrar 100%
  }
  if (!valorTotal || !valorActual) {
    return 0; // Si no hay empresas creadas o no hay límite, mostrar 0%
  }
  return Math.min((valorActual / valorTotal) * 100, 100).toFixed(0);
};

const porcentajeHistorias = computed(() => {
  return calcularPorcentaje(historiasDelMes.value, proveedorSalud.value.maxHistoriasPermitidasAlMes);
});

const cancelSubscription = async () => {
  isCancelling.value = true; // Activar el estado de carga
  try {
    await pagosStore.cancelSubscription(suscripcionActual.value.id);

    // Actualizar proveedorSalud localmente
    proveedorSalud.value.estadoSuscripcion = 'cancelled';
    proveedorSalud.value.finDeSuscripcion = suscripcionActual.value.next_payment_date;
    proveedorSalud.value.suscripcionActiva = ''; // Vaciar suscripción activa

    // Limpiar suscripción actual
    suscripcionActual.value = {
      status: 'cancelled'
    };

    // Mostrar notificación
    toast.open({
      type: 'success',
      message: 'Tu suscripción ha sido cancelada exitosamente',
      position: 'bottom',
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
  } finally {
    isCancelling.value = false; 
  }
};

const suscripcionCanceladaYActiva = computed(() => {
  if (proveedorSalud.value?.estadoSuscripcion === 'cancelled' && proveedorSalud.value?.finDeSuscripcion) {
    const fechaFinSuscripcion = parseISO(proveedorSalud.value.finDeSuscripcion);
    const hoy = new Date();
    return differenceInDays(fechaFinSuscripcion, hoy) >= 0; // Si la fecha de fin es en el futuro
  }
  return false;
});

const mesActual = computed(() => {
  const mes = format(new Date(), 'MMMM', { locale: es });
  return mes.charAt(0).toUpperCase() + mes.slice(1);
});

// Función para formatear el país mostrando código y nombre
const formatearPais = (codigoPais) => {
  if (!codigoPais) return 'No disponible';
  
  const countries = [
    { code: 'MX', name: 'México' },
    { code: 'AR', name: 'Argentina' },
    { code: 'BR', name: 'Brasil' },
    { code: 'CL', name: 'Chile' },
    { code: 'CO', name: 'Colombia' },
    { code: 'PE', name: 'Perú' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'GT', name: 'Guatemala' },
    { code: 'CR', name: 'Costa Rica' },
    { code: 'PA', name: 'Panamá' },
    { code: 'HN', name: 'Honduras' },
    { code: 'NI', name: 'Nicaragua' },
    { code: 'SV', name: 'El Salvador' },
    { code: 'CU', name: 'Cuba' },
    { code: 'DO', name: 'República Dominicana' },
    { code: 'PR', name: 'Puerto Rico' }
  ];
  
  const country = countries.find(c => c.code === codigoPais);
  return country ? `${country.name}` : codigoPais;
};

</script>

<template>
  <Transition appear name="fade">
    <ModalCancelarSuscripcion v-if="showCancelModal" @closeModal="toggleCancelModal" @confirmCancellation="cancelSubscription" />
  </Transition>

  <Transition appear mode="out-in" name="slide-up">
    <div class="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 min-h-screen">
      <h2 class="text-gray-800 text-2xl sm:text-3xl md:text-4xl mb-4 font-semibold text-center sm:text-left">Detalles de Mi Suscripción</h2>
  
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <!-- Sección de Suscripción -->
        <div class="bg-white border p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out space-y-4">
          <h3 class="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">{{ suscripcionActual?.reason || 'Sin plan activo' }}</h3>
          <!-- Mensaje de suscripción cancelada pero activa -->
          <div v-if="suscripcionCanceladaYActiva" class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded">
            <p class="text-sm">
              Has cancelado tu suscripción, pero tendrás acceso a los beneficios hasta el <strong>{{ formatDate(proveedorSalud.finDeSuscripcion) }}</strong>.
            </p>
          </div>
          <p v-if="totalHistoriasAdicionales" class="text-gray-600 text-sm sm:text-base">
            <strong>➕ Adicionales: </strong> 
            <span>
              {{ totalHistoriasAdicionales ? `${totalHistoriasAdicionales} ${totalHistoriasAdicionales === 1 ? 'Historia' : 'Historias'}` : '' }} al mes
            </span>
          </p>

          <p v-else class="text-gray-600 text-sm sm:text-base"><strong>➕ Adicionales:</strong> Sin adicionales contratados</p>
          <!-- <p class="text-gray-600"><strong>📅 Inicio de suscripción:</strong> {{ suscripcionActual ? formatDate(suscripcionActual.date_created) : 'No disponible' }}</p> -->
          <p class="text-gray-600 text-sm sm:text-base"><strong>💰 Pago mensual:</strong> {{ suscripcionActual?.auto_recurring?.transaction_amount ? `$${formatCurrency(suscripcionActual.auto_recurring.transaction_amount)} MXN` : 'Sin plan activo' }}</p>
            <p class="text-gray-600 text-sm sm:text-base"><strong>📅 Próximo cobro:</strong> 
            {{ suscripcionActual?.status === 'cancelled' ? 
               'No se realizarán más cobros' : 
               (suscripcionActual?.next_payment_date ? formatDate(suscripcionActual.next_payment_date) : 'Sin plan activo') 
            }}
            </p>
          <p class="text-gray-600 text-sm sm:text-base"><strong>📍 Estado: </strong>
            <span :class="{
              'text-green-600 bg-green-100 px-2 py-0.5 rounded-full': proveedorSalud.estadoSuscripcion === 'authorized', 
              'text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full': proveedorSalud.estadoSuscripcion === 'pending',
              'text-red-600 bg-red-100 px-2 py-0.5 rounded-full': proveedorSalud.estadoSuscripcion === 'cancelled',
              'text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full': !proveedorSalud.estadoSuscripcion
            }">
              {{ proveedorSalud.estadoSuscripcion || 'Sin suscripción actual' }}
            </span>
          </p>
          <button 
            @click="router.push('/suscripcion')"
            class="mt-2 w-full bg-gradient-to-r from-sky-600 to-sky-500 text-white px-4 py-2 rounded-lg hover:scale-105 transition-all duration-300 ease-in-out active:scale-95 text-sm sm:text-base">
            {{ suscripcionActual ? 'Mejorar mi Plan ✨' : 'Comenzar con un Plan 🚀' }}
          </button>
        </div>
  
        <!-- Sección de Uso -->
        <div class="bg-white border p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out">
          <h3 class="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">Uso de Recursos</h3>
          
          <!-- Uso de Historias Clínicas -->
          <div>
            <p class="text-gray-600 text-sm sm:text-base"><strong>👥 Historias Clínicas creadas en {{ mesActual }}:</strong> <br> {{ historiasDelMes }} de {{ proveedorSalud.maxHistoriasPermitidasAlMes }} permitidas</p>
            <div class="w-full bg-gray-200 rounded-full h-3 sm:h-4 mt-2 relative">
              <div 
                :style="{ width: porcentajeHistorias + '%' }" 
                class="h-3 sm:h-4 rounded-full absolute top-0 left-0 transition-all duration-500" 
                :class="{
                  'bg-gradient-to-r from-cyan-500 to-cyan-400': historiasDelMes < proveedorSalud.maxHistoriasPermitidasAlMes,
                  'bg-gradient-to-r from-red-500 to-red-400': historiasDelMes >= proveedorSalud.maxHistoriasPermitidasAlMes
                }">
              </div>
                <span class="absolute top-0 left-1/2 transform -translate-x-1/2 text-[10px] sm:text-xs font-semibold" :class="porcentajeHistorias <= 55 ? 'text-gray-600' : 'text-white'">
                {{ porcentajeHistorias }}%
                </span>
            </div>
            <p v-if="porcentajeHistorias >= 80 && porcentajeHistorias < 100" class="text-yellow-600 text-xs sm:text-sm mt-2">
              ⚠️ Estás cerca del límite de historias clínicas. Considera actualizar tu plan.
            </p>
            <p v-if="historiasDelMes >= proveedorSalud.maxHistoriasPermitidasAlMes" class="text-red-600 text-xs sm:text-sm mt-2">⚠️ Has alcanzado el límite de historias clínicas.
              <a @click="router.push('/suscripcion')" class="text-sky-600 underline cursor-pointer">Mejora tu plan</a>.
            </p>
          </div>

        </div>
      </div>
      <!-- Información de Cuenta -->
      <div class="bg-white border p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out">
        <h3 class="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">Mi Cuenta</h3>
        <p class="text-gray-600 text-sm sm:text-base"><strong>👤 Nombre:</strong> {{ proveedorSalud.nombre || 'No disponible' }}</p>
        <p class="text-gray-600 text-sm sm:text-base"><strong>🌍 País:</strong> {{ formatearPais(proveedorSalud.pais) }}</p>
        <p class="text-gray-600 text-sm sm:text-base"><strong>📧 Correo:</strong> {{ proveedorSalud.correoElectronico || 'No disponible' }}</p>
        <p class="text-gray-600 text-sm sm:text-base"><strong>👥 Historias Clínicas {{ mesActual }}:</strong> {{ `${proveedorSalud.maxHistoriasPermitidasAlMes - historiasDelMes} disponibles` || 'No disponible' }}</p>
        <p class="text-gray-600 text-sm sm:text-base"><strong>⏳ Periodo Gratuito:</strong> {{ periodoGratuito }}</p>
      </div>

      <button 
        v-if="suscripcionActual && suscripcionActual.status === 'authorized'"
        @click="toggleCancelModal"
        :disabled="isCancelling"
        class="mt-2 ml-auto block text-white px-4 py-2 rounded-lg transition-all duration-300 ease-in-out text-sm sm:text-base"
        :class="[
          isCancelling ? 
          'bg-red-400 cursor-not-allowed' : 
          'bg-red-600 hover:bg-red-500 active:scale-95'
        ]"
      >
        {{ isCancelling ? 'Procesando...' : 'Cancelar Suscripción' }}
      </button>
    </div>
  </Transition>
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

.bg-gray-100 {
  background-color: #f7fafc;
}
.text-green-600 {
  color: #38a169;
}
.text-red-600 {
  color: #e53e3e;
}
.progress-bar {
  height: 10px;
  width: 100%;
  background-color: #e2e8f0;
  border-radius: 5px;
  overflow: hidden;
  margin-top: 4px;
}
.progress-fill {
  height: 100%;
  transition: width 0.5s ease-in-out;
}
.bg-blue-500 {
  background-color: #3b82f6;
}
.bg-green-500 {
  background-color: #10b981;
}
</style>
