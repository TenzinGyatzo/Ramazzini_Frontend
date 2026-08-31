<script setup>
import { computed, ref, watch } from 'vue';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePagosStore } from '@/stores/pagosStore';

const props = defineProps({
  id: String,
  nombre: String,
  pais: String,
  correoElectronico: String,
  maxHistoriasPermitidasAlMes: Number,
  estadoSuscripcion: String,
  periodoDePruebaFinalizado: Boolean,
  fechaInicioTrial: String,
  colorInforme: String,
  semaforizacionActivada: Boolean,
  logotipoEmpresa: Object,
  suscripcion: Object,
  suscripcionActivaId: String,
  historiasClinicasMes: Number,
  notasMedicasMes: Number,
  todasLasHistoriasClinicas: Number,
  todasLasNotasMedicas: Number,
  empresasCount: Number,
  empresas: Array,
  principalUser: Object,
  users: Object,
});

const pagosStore = usePagosStore();
const detallesAbiertos = ref(false);
const suscripcionLocal = ref(null);
const cargandoSuscripcion = ref(false);

const baseURL = import.meta.env.VITE_API_URL || 'https://ramazzini.app';

const logoSrc = computed(() => {
  return `${baseURL}/assets/providers-logos/${props.logotipoEmpresa?.data}?t=${Date.now()}`;
});

const usuarioPrincipal = computed(() => {
  if (props.principalUser) return props.principalUser;
  const data = props.users?.data;
  return Array.isArray(data) && data.length ? data[0] : null;
});

const cantidadEmpresas = computed(() => {
  if (typeof props.empresasCount === 'number') return props.empresasCount;
  return Array.isArray(props.empresas) ? props.empresas.length : 0;
});

const suscripcionVisible = computed(
  () => props.suscripcion ?? suscripcionLocal.value,
);

const tieneSuscripcionActiva = computed(
  () => Boolean(props.suscripcionActivaId || props.suscripcion || suscripcionLocal.value),
);

watch(detallesAbiertos, async (abierto) => {
  if (!abierto || suscripcionVisible.value || !props.suscripcionActivaId) return;

  cargandoSuscripcion.value = true;
  try {
    suscripcionLocal.value = await pagosStore.getSubscriptionFromDB(
      props.suscripcionActivaId,
    );
  } catch (error) {
    console.error('Error al cargar suscripción:', error);
  } finally {
    cargandoSuscripcion.value = false;
  }
});

const colorOptions = [
  { name: "Gris Oscuro (Default)", hex: "#343A40" },
  { name: "Gris", hex: "#6C757D" },
  { name: "Azul Oscuro", hex: "#004085" },
  { name: "Azul Profesional", hex: "#007BFF" },
  { name: "Turquesa Oscuro", hex: "#138496" },
  { name: "Turquesa", hex: "#17A2B8" },
  { name: "Azul Claro", hex: "#2BB9D9" },
  { name: "Verde Oscuro", hex: "#1E7E34" },
  { name: "Verde Médico", hex: "#28A745" },
  { name: "Rojo Oscuro", hex: "#C82333" },
  { name: "Rojo Médico", hex: "#DC3545" },
  { name: "Naranja", hex: "#E67E22" },
  { name: "Oro", hex: "#E0A800" },
];

const nombreColorInforme = computed(() => {
  const color = colorOptions.find(option => option.hex.toLowerCase() === props.colorInforme?.toLowerCase());
  return color ? color.name : 'No disponible';
});

const mesActual = computed(() => {
  const mes = format(new Date(), 'MMMM', { locale: es });
  return mes.charAt(0).toUpperCase() + mes.slice(1);
});

const formatDate = (dateString) =>
  dateString
    ? format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: es })
    : 'No disponible';

const periodoGratuito = computed(() => {
  if (!props.fechaInicioTrial) return 'No disponible';

  const fechaInicio = parseISO(props.fechaInicioTrial);
  const fechaFin = new Date(fechaInicio);
  fechaFin.setDate(fechaFin.getDate() + 15);
  fechaFin.setHours(23, 59, 59);

  const hoy = new Date();
  const diasRestantes = differenceInDays(fechaFin, hoy);

  return diasRestantes > 0
    ? `Hasta el ${formatDate(fechaFin)} (${diasRestantes} días restantes)`
    : `Finalizado el ${formatDate(fechaFin)}`;
});

const clasesEstado = computed(() => ({
  'text-green-600 bg-green-100 px-2 py-0.5 rounded-full': props.estadoSuscripcion === 'authorized',
  'text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full': props.estadoSuscripcion === 'pending',
  'text-red-600 bg-red-100 px-2 py-0.5 rounded-full': props.estadoSuscripcion === 'cancelled',
  'text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full': !props.estadoSuscripcion,
}));

const formatCurrency = (amount) => {
  if (amount == null) return '0';
  return amount.toLocaleString("en-US");
};
</script>

<template>
    <div class="text-sm grid grid-cols-1 md:grid-cols-4 w-full max-w-3xl xl:max-w-none mx-auto bg-white border p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out h-102">
        <div class="col-span-3">
            <p class="text-gray-600"><strong>🏢 Negocio:</strong> {{ nombre || 'No disponible' }}</p>
            <template v-if="usuarioPrincipal">
              <p class="text-gray-600"><strong>👤 Usuario Principal:</strong> {{ usuarioPrincipal.username }}</p>
              <p class="text-gray-600"><strong>📧 Correo:</strong> {{ usuarioPrincipal.email }}</p>
              <p class="text-gray-600"><strong>📞 Teléfono:</strong> {{ usuarioPrincipal.phone || 'No disponible' }}</p>
            </template>
            <p v-else class="text-gray-500 italic">Usuario principal no disponible</p>
            <p class="text-gray-600"><strong>🎨 Color Informe:</strong> {{ nombreColorInforme }}</p>
            <p class="text-gray-600"><strong>🚦 Semaforización:</strong> {{ semaforizacionActivada ? 'Activada' : 'Desactivada' }}</p>
            <p class="text-gray-600"><strong>📊 Clientes registrados:</strong> {{ cantidadEmpresas }}</p>
            <p class="text-gray-600">
                <strong>👥 H. C. Usadas en {{ mesActual }}:</strong>
                {{ `${historiasClinicasMes ?? 0} de ${maxHistoriasPermitidasAlMes} permitidas` }}
            </p>
            <p class="text-gray-600"><strong>📝 Notas Médicas Usadas en {{ mesActual }}:</strong> {{ `${notasMedicasMes ?? 0} ${notasMedicasMes === 1 ? 'nota' : 'notas'}` }}</p>
            <p class="text-gray-600"><strong>👥 Total de H. Clínicas:</strong> {{ `${todasLasHistoriasClinicas ?? 0}` }} historias</p>
            <p class="text-gray-600"><strong>📝 Total de Notas Médicas:</strong> {{ `${todasLasNotasMedicas ?? 0} ${todasLasNotasMedicas === 1 ? 'nota' : 'notas'}` }}</p>
            <p class="text-gray-600"><strong>⏳ Periodo Gratuito:</strong> {{ periodoGratuito }}</p>
            <p class="text-gray-600">
                <strong>📍 Estado: </strong>
                <span :class="clasesEstado">
                    {{ estadoSuscripcion || 'Sin suscripción actual' }}
                </span>
            </p>
            <div v-if="tieneSuscripcionActiva" class="mt-4">
                <button
                    type="button"
                    @click="detallesAbiertos = !detallesAbiertos"
                    class="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors duration-200 focus:outline-none"
                >
                    <span class="text-lg font-semibold text-gray-700">
                    📅 Detalles de Suscripción
                    </span>
                    <svg
                    :class="{ 'rotate-180': detallesAbiertos }"
                    class="w-4 h-4 transform transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 9l-7 7-7-7"
                    />
                    </svg>
                </button>

                <Transition name="fade" mode="out-in">
                    <div v-show="detallesAbiertos" class="mt-2">
                        <p v-if="cargandoSuscripcion" class="text-gray-500 text-sm">Cargando suscripción…</p>
                        <template v-else-if="suscripcionVisible">
                          <p class="text-gray-600"><strong>📦 {{ suscripcionVisible.reason || 'No disponible' }}</strong></p>
                          <p class="text-gray-600"><strong>💰 Monto mensual:</strong> $ {{ formatCurrency(suscripcionVisible.auto_recurring?.transaction_amount) }} MXN</p>
                          <p class="text-gray-600"><strong>💳 Método de pago:</strong> {{ suscripcionVisible.payment_method_id || 'No disponible' }}</p>
                          <p class="text-gray-600"><strong>📆 Inició:</strong> {{ formatDate(suscripcionVisible.date_created) }}</p>
                          <p class="text-gray-600"><strong>🔄 Próximo cobro:</strong> {{ formatDate(suscripcionVisible.next_payment_date) }}</p>
                          <p class="text-gray-600"><strong>🕓 Última actualización:</strong> {{ formatDate(suscripcionVisible.last_modified) }}</p>
                          <p class="text-gray-600"><strong>👤 Email del pagador:</strong> {{ suscripcionVisible.payer_email || 'No disponible' }}</p>
                        </template>
                        <p v-else class="text-gray-500 text-sm">No se pudo cargar la suscripción</p>
                    </div>
                </Transition>
            </div>
        </div>
        <div class="col-span-1">
            <div v-if="logotipoEmpresa?.data" class="w-full h-full flex justify-center items-center">
                    <img
                        :src="logoSrc"
                        :alt="'Logo de ' + nombre"
                        class="w-48 h-48 object-contain"
                    />
            </div>
        </div>
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  max-height: 0;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
