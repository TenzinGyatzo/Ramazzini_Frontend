<script setup>
import { ref, onMounted, computed, inject } from 'vue';
import { storeToRefs } from 'pinia';
import { usePagosStore } from '@/stores/pagosStore';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useRouter } from 'vue-router';
import { format, differenceInDays, parseISO, addMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import ModalCancelarSuscripcion from '@/components/suscripciones/ModalCancelarSuscripcion.vue';
import {
  CORREO_RAMAZZINI,
  WHATSAPP_RAMAZZINI_VISIBLE,
  enlaceCorreo,
  enlaceWhatsApp,
} from '@/utils/contactoRamazzini';
import { nombrePlanContrato } from '@/utils/accesoComercial';

const pagosStore = usePagosStore();
const proveedorSaludStore = useProveedorSaludStore();
const { proveedorSalud } = storeToRefs(proveedorSaludStore);
// Solo visualización: contratado vs. asignado por Ramazzini (ajustes de la consola de plataforma)
const {
  limiteHistoriasContratado,
  limiteHistoriasEfectivo,
  historiasExtraAsignadas,
  fechaFinTrialEfectiva,
  fechaFinTrialOriginal,
  periodoGratuitoAjustado,
  pagoEnLineaHabilitado,
  contrato,
  contratoEstaVigente,
  diasParaVencerElContrato,
} = storeToRefs(proveedorSaludStore);
const limiteHistorias = computed(() => limiteHistoriasEfectivo.value ?? 0);
const router = useRouter();

const toast = inject('toast');

const suscripcionActual = ref(null);
const historiasDelMes = ref(0);
const showCancelModal = ref(false);
const isCancelling = ref(false);

const fetchData = async () => {
  if (proveedorSalud.value?.suscripcionActiva) {
    try {
      const response = await pagosStore.getSubscriptionFromAPI(proveedorSalud.value.suscripcionActiva);
      if (response) {
        suscripcionActual.value = response;
      }
    } catch (error) {
      console.error('Error al obtener datos:', error);
    }
  }

  historiasDelMes.value = await proveedorSaludStore.getHistoriasClinicasDelMes();
};

onMounted(async () => {
  // Recargar los datos del proveedor desde el backend
  const proveedorActualizado = await proveedorSaludStore.getProveedorById(proveedorSalud.value._id);
  proveedorSalud.value = proveedorActualizado;

  await fetchData();
});

const toggleCancelModal = () => {
  showCancelModal.value = !showCancelModal.value;
};

const formatDate = (dateString) => {
  return dateString ? format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'No disponible';
};

const formatCurrency = (amount) => {
  return amount.toLocaleString('en-US');
};

const totalHistoriasAdicionales = computed(() => {
  return proveedorSalud.value?.addOns?.reduce((total, addon) => {
    return addon.tipo === 'historias_extra' ? total + addon.cantidad : total;
  }, 0) || 0;
});

/** Días que quedan del periodo gratuito; 0 si ya terminó o no aplica. */
const diasRestantesPeriodoGratuito = computed(() => {
  if (proveedorSalud.value?.periodoDePruebaFinalizado || !fechaFinTrialEfectiva.value) return 0;
  return Math.max(0, differenceInDays(fechaFinTrialEfectiva.value, new Date()));
});

const periodoGratuito = computed(() => {
  if (proveedorSalud.value?.periodoDePruebaFinalizado) return 'Finalizado';
  if (!fechaFinTrialEfectiva.value) return 'No disponible';
  // Fin efectivo: el fijado por Ramazzini, o inicio + 15 días
  return diasRestantesPeriodoGratuito.value > 0
    ? `Hasta el ${formatDate(fechaFinTrialEfectiva.value)} (${diasRestantesPeriodoGratuito.value} días restantes)`
    : 'Finalizado';
});

const calcularPorcentaje = (valorActual, valorTotal) => {
  if (!valorTotal && valorActual > 0) return 100; // Sin límite pero con uso: lleno
  if (!valorTotal || !valorActual) return 0;
  return Math.round(Math.min((valorActual / valorTotal) * 100, 100));
};

const porcentajeHistorias = computed(() => calcularPorcentaje(historiasDelMes.value, limiteHistorias.value));
const historiasDisponibles = computed(() => Math.max(0, limiteHistorias.value - historiasDelMes.value));
const limiteAlcanzado = computed(() => historiasDelMes.value >= limiteHistorias.value);
const cercaDelLimite = computed(() => !limiteAlcanzado.value && porcentajeHistorias.value >= 80);

const claseBarraUso = computed(() => {
  if (limiteAlcanzado.value) return 'bg-red-500';
  if (cercaDelLimite.value) return 'bg-amber-500';
  return 'bg-emerald-500';
});

const cancelSubscription = async () => {
  isCancelling.value = true;
  try {
    await pagosStore.cancelSubscription(suscripcionActual.value.id);

    // Actualizar proveedorSalud localmente
    proveedorSalud.value.estadoSuscripcion = 'cancelled';
    proveedorSalud.value.finDeSuscripcion = suscripcionActual.value.next_payment_date;
    proveedorSalud.value.suscripcionActiva = '';

    suscripcionActual.value = {
      status: 'cancelled',
    };

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

// Contrato con Ramazzini (transferencia o enlace de Mercado Pago): sin monto, solo plan y vigencia
const nombreContrato = computed(() => nombrePlanContrato(contrato.value));
/** La tarjeta de Mercado Pago se muestra si no hay contrato o si también hay historial de Mercado Pago. */
const mostrarMercadoPago = computed(
  () => !contrato.value || !!suscripcionActual.value || !!proveedorSalud.value?.estadoSuscripcion,
);
const vigenciaContrato = computed(() => {
  const c = contrato.value;
  if (!c) return '';
  if (c.estado === 'activo' && c.renovacionAutomatica) return 'Renovación automática';
  if (!c.pagadoHasta) return 'Sin vigencia registrada';
  return contratoEstaVigente.value
    ? `Vigente hasta el ${formatDate(c.pagadoHasta)}`
    : `Venció el ${formatDate(c.pagadoHasta)}`;
});

const suscripcionCanceladaYActiva = computed(() => {
  if (proveedorSalud.value?.estadoSuscripcion === 'cancelled' && proveedorSalud.value?.finDeSuscripcion) {
    const fechaFinSuscripcion = parseISO(proveedorSalud.value.finDeSuscripcion);
    return differenceInDays(fechaFinSuscripcion, new Date()) >= 0;
  }
  return false;
});

const mesActual = computed(() => format(new Date(), 'MMMM', { locale: es }));
/** El conteo de historias es por mes calendario. */
const reinicioContador = computed(() => format(startOfMonth(addMonths(new Date(), 1)), "d 'de' MMMM", { locale: es }));

const ESTADOS_MERCADO_PAGO = {
  authorized: { texto: 'Activa', clase: 'bg-emerald-100 text-emerald-800' },
  pending: { texto: 'Pendiente', clase: 'bg-amber-100 text-amber-800' },
  cancelled: { texto: 'Cancelada', clase: 'bg-red-100 text-red-700' },
};
const ESTADO_SIN_SUSCRIPCION = { texto: 'Sin suscripción', clase: 'bg-gray-200 text-gray-700' };

const estadoMercadoPago = computed(
  () => ESTADOS_MERCADO_PAGO[proveedorSalud.value?.estadoSuscripcion] ?? ESTADO_SIN_SUSCRIPCION,
);

/** Estado que resume la cuenta en el encabezado: manda el contrato; si no hay, Mercado Pago o el periodo gratuito. */
const estadoGeneral = computed(() => {
  if (contrato.value) {
    return contratoEstaVigente.value
      ? ESTADOS_MERCADO_PAGO.authorized
      : { texto: 'Vencida', clase: 'bg-red-100 text-red-700' };
  }
  if (proveedorSalud.value?.estadoSuscripcion) return estadoMercadoPago.value;
  if (diasRestantesPeriodoGratuito.value > 0) {
    return { texto: 'Periodo gratuito', clase: 'bg-sky-100 text-sky-800' };
  }
  return { texto: 'Sin plan', clase: ESTADO_SIN_SUSCRIPCION.clase };
});

const CLASES_AVISO = {
  peligro: 'border-red-200 bg-red-50 text-red-800',
  advertencia: 'border-amber-200 bg-amber-50 text-amber-900',
};

/** Un solo aviso a la vez, el más urgente; `accion` decide el botón que lo acompaña. */
const aviso = computed(() => {
  if (contrato.value && !contratoEstaVigente.value) {
    return {
      id: 'suscripcion-contrato-vencido',
      tono: 'peligro',
      icono: 'fa-solid fa-circle-exclamation',
      texto: 'Tu plan no está vigente. Contacta a Ramazzini para renovarlo.',
      accion: 'contacto',
    };
  }
  if (limiteAlcanzado.value) {
    return {
      id: 'suscripcion-aviso-limite',
      tono: 'peligro',
      icono: 'fa-solid fa-circle-exclamation',
      texto: `Alcanzaste el límite de historias clínicas de ${mesActual.value}.`,
      accion: pagoEnLineaHabilitado.value ? 'planes' : 'contacto',
    };
  }
  if (contrato.value && diasParaVencerElContrato.value !== null) {
    const dias = diasParaVencerElContrato.value;
    const cuando = dias === 0 ? 'hoy' : `en ${dias} ${dias === 1 ? 'día' : 'días'}`;
    return {
      id: 'suscripcion-contrato-aviso',
      tono: 'advertencia',
      icono: 'fa-regular fa-clock',
      texto: `Tu plan vence ${cuando}. Contacta a Ramazzini para renovarlo.`,
      accion: 'contacto',
    };
  }
  if (suscripcionCanceladaYActiva.value) {
    return {
      id: 'suscripcion-aviso-cancelada',
      tono: 'advertencia',
      icono: 'fa-regular fa-clock',
      texto: `Cancelaste tu suscripción; conservas el acceso hasta el ${formatDate(proveedorSalud.value.finDeSuscripcion)}.`,
      accion: null,
    };
  }
  if (cercaDelLimite.value) {
    return {
      id: 'suscripcion-aviso-cerca-limite',
      tono: 'advertencia',
      icono: 'fa-solid fa-triangle-exclamation',
      texto: 'Estás cerca del límite de historias clínicas de este mes.',
      accion: pagoEnLineaHabilitado.value ? 'planes' : 'contacto',
    };
  }
  return null;
});

/** Con contrato, o sin pago en línea, el plan se gestiona hablando con Ramazzini. */
const mostrarContactoRamazzini = computed(() => !!contrato.value || !pagoEnLineaHabilitado.value);
const mostrarBotonPlanes = computed(() => pagoEnLineaHabilitado.value && mostrarMercadoPago.value);
const puedeCancelar = computed(() => suscripcionActual.value?.status === 'authorized');

const irAPlanes = () => router.push('/suscripcion');

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
    { code: 'PR', name: 'Puerto Rico' },
  ];

  const country = countries.find((c) => c.code === codigoPais);
  return country ? `${country.name}` : codigoPais;
};
</script>

<template>
  <Transition appear name="fade">
    <ModalCancelarSuscripcion v-if="showCancelModal" @closeModal="toggleCancelModal" @confirmCancellation="cancelSubscription" />
  </Transition>

  <Transition appear mode="out-in" name="slide-up">
    <div class="suscripcion-activa max-w-4xl mx-auto p-4 sm:p-6 space-y-4 min-h-screen">
      <!-- Encabezado -->
      <header class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h1 class="text-2xl sm:text-3xl font-semibold text-gray-800">Mi suscripción</h1>
          <p v-if="proveedorSalud?.nombre" class="mt-0.5 text-sm text-gray-500 truncate">{{ proveedorSalud.nombre }}</p>
        </div>
        <span
          data-testid="suscripcion-estado-general"
          class="mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
          :class="estadoGeneral.clase"
        >
          {{ estadoGeneral.texto }}
        </span>
      </header>

      <!-- Aviso más urgente -->
      <div
        v-if="aviso"
        :data-testid="aviso.id"
        role="status"
        class="flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center"
        :class="CLASES_AVISO[aviso.tono]"
      >
        <p class="flex flex-1 items-start gap-2.5">
          <i :class="aviso.icono" class="mt-0.5" aria-hidden="true"></i>
          <span>{{ aviso.texto }}</span>
        </p>
        <a
          v-if="aviso.accion === 'contacto'"
          :href="enlaceWhatsApp(proveedorSalud?.nombre)"
          target="_blank"
          rel="noopener"
          class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Escribir por WhatsApp
        </a>
        <button
          v-else-if="aviso.accion === 'planes'"
          type="button"
          class="inline-flex shrink-0 items-center justify-center rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
          @click="irAPlanes"
        >
          Ver planes
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Plan contratado con Ramazzini -->
        <section v-if="contrato" data-testid="suscripcion-contrato" class="suscripcion-tarjeta rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Tu plan</p>
          <h2 class="mt-0.5 text-xl font-semibold text-gray-800">{{ nombreContrato }}</h2>
          <p class="text-xs text-gray-500">Contratado directamente con Ramazzini</p>
          <dl class="mt-3">
            <div class="flex items-baseline justify-between gap-4 border-t border-gray-100 py-2 text-sm">
              <dt class="text-gray-500">Historias al mes</dt>
              <dd class="text-right font-medium text-gray-800">
                {{ contrato.historiasMes }}
                <span v-if="historiasExtraAsignadas > 0" class="font-normal text-emerald-700">
                  +{{ historiasExtraAsignadas }} de cortesía
                </span>
              </dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 border-t border-gray-100 py-2 text-sm">
              <dt class="text-gray-500">Periodo</dt>
              <dd class="text-right font-medium text-gray-800">{{ contrato.periodicidad === 'anual' ? 'Anual' : 'Mensual' }}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 border-t border-gray-100 py-2 text-sm">
              <dt class="text-gray-500">Vigencia</dt>
              <dd data-testid="suscripcion-contrato-vigencia" class="text-right font-medium text-gray-800">{{ vigenciaContrato }}</dd>
            </div>
          </dl>
        </section>

        <!-- Suscripción por Mercado Pago -->
        <section v-if="mostrarMercadoPago" data-testid="suscripcion-mercado-pago" class="suscripcion-tarjeta rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-gray-500">{{ contrato ? 'Suscripción en línea' : 'Tu plan' }}</p>
          <h2 class="mt-0.5 text-xl font-semibold text-gray-800">{{ suscripcionActual?.reason || 'Sin plan activo' }}</h2>
          <dl class="mt-3">
            <div class="flex items-baseline justify-between gap-4 border-t border-gray-100 py-2 text-sm">
              <dt class="text-gray-500">Estado</dt>
              <dd class="text-right font-medium text-gray-800">
                <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="estadoMercadoPago.clase">
                  {{ estadoMercadoPago.texto }}
                </span>
              </dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 border-t border-gray-100 py-2 text-sm">
              <dt class="text-gray-500">Pago mensual</dt>
              <dd class="text-right font-medium text-gray-800">
                {{
                  suscripcionActual?.auto_recurring?.transaction_amount
                    ? `$${formatCurrency(suscripcionActual.auto_recurring.transaction_amount)} MXN`
                    : '—'
                }}
              </dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 border-t border-gray-100 py-2 text-sm">
              <dt class="text-gray-500">Próximo cobro</dt>
              <dd class="text-right font-medium text-gray-800">
                {{
                  suscripcionActual?.status === 'cancelled'
                    ? 'No se realizarán más cobros'
                    : suscripcionActual?.next_payment_date
                      ? formatDate(suscripcionActual.next_payment_date)
                      : '—'
                }}
              </dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 border-t border-gray-100 py-2 text-sm">
              <dt class="text-gray-500">Adicionales</dt>
              <dd class="text-right font-medium text-gray-800">
                {{
                  totalHistoriasAdicionales
                    ? `${totalHistoriasAdicionales} ${totalHistoriasAdicionales === 1 ? 'historia' : 'historias'} al mes`
                    : 'Sin adicionales'
                }}
              </dd>
            </div>
          </dl>
        </section>

        <!-- Uso del mes -->
        <section
          data-testid="suscripcion-uso"
          class="suscripcion-tarjeta rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm"
          :class="{ 'md:col-span-2': contrato && mostrarMercadoPago }"
        >
          <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Historias clínicas en {{ mesActual }}</p>
          <p class="mt-0.5 text-gray-800">
            <span class="text-3xl font-semibold">{{ historiasDelMes }}</span>
            <span class="text-sm text-gray-500"> de {{ limiteHistorias }}</span>
          </p>
          <div
            class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="porcentajeHistorias"
            :aria-label="`${historiasDelMes} de ${limiteHistorias} historias clínicas usadas`"
          >
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="claseBarraUso"
              :style="{ width: porcentajeHistorias + '%' }"
            ></div>
          </div>
          <div class="mt-1.5 flex justify-between text-xs text-gray-500">
            <span>{{ porcentajeHistorias }}% usado</span>
            <span>{{ historiasDisponibles }} disponibles</span>
          </div>

          <dl v-if="historiasExtraAsignadas > 0" data-testid="suscripcion-desglose-historias" class="mt-3">
            <div class="flex items-baseline justify-between gap-4 border-t border-gray-100 py-2 text-sm">
              <dt class="text-gray-500">Incluidas en tu plan</dt>
              <dd class="text-right font-medium text-gray-800">{{ limiteHistoriasContratado ?? 0 }}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 border-t border-gray-100 py-2 text-sm">
              <dt class="text-gray-500">De cortesía de Ramazzini</dt>
              <dd class="text-right font-medium text-gray-800">+{{ historiasExtraAsignadas }}</dd>
            </div>
          </dl>
          <p class="mt-2 text-xs text-gray-500">El contador se reinicia el {{ reinicioContador }}.</p>
        </section>
      </div>

      <!-- Cuenta -->
      <section class="suscripcion-tarjeta rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Cuenta</p>
        <dl class="mt-2 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt class="text-xs text-gray-500">Nombre</dt>
            <dd class="text-sm text-gray-800">{{ proveedorSalud.nombre || 'No disponible' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">País</dt>
            <dd class="text-sm text-gray-800">{{ formatearPais(proveedorSalud.pais) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">Correo</dt>
            <dd class="text-sm text-gray-800 break-words">{{ proveedorSalud.correoElectronico || 'No disponible' }}</dd>
          </div>
          <div data-testid="suscripcion-periodo-gratuito">
            <dt class="text-xs text-gray-500">Periodo gratuito</dt>
            <dd class="text-sm text-gray-800">{{ periodoGratuito }}</dd>
            <dd
              v-if="periodoGratuitoAjustado && fechaFinTrialOriginal"
              data-testid="suscripcion-periodo-ajustado"
              class="text-xs text-gray-500"
            >
              Ajustado por Ramazzini (originalmente hasta el {{ formatDate(fechaFinTrialOriginal) }}).
            </dd>
          </div>
        </dl>
      </section>

      <!-- Cambiar o renovar el plan -->
      <section class="suscripcion-tarjeta rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-gray-800">¿Quieres cambiar o renovar tu plan?</p>
          <p v-if="mostrarContactoRamazzini" class="text-xs text-gray-500">
            Tu plan se gestiona directamente con Ramazzini. Escríbenos para contratar, cambiar o renovar.
          </p>
          <p v-else class="text-xs text-gray-500">Puedes cambiarlo en línea cuando quieras.</p>
        </div>
        <div class="flex flex-col gap-2 text-sm sm:flex-row">
          <button
            v-if="mostrarBotonPlanes"
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700 active:scale-95 transition"
            @click="irAPlanes"
          >
            {{ suscripcionActual ? 'Mejorar mi plan' : 'Comenzar con un Plan' }}
          </button>
          <div
            v-if="mostrarContactoRamazzini"
            data-testid="suscripcion-contacto-ramazzini"
            class="flex flex-col gap-2 sm:flex-row"
          >
            <a
              :href="enlaceWhatsApp(proveedorSalud?.nombre)"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700"
            >
              <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> WhatsApp {{ WHATSAPP_RAMAZZINI_VISIBLE }}
            </a>
            <a
              :href="enlaceCorreo(proveedorSalud?.nombre)"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              <i class="fa-solid fa-envelope" aria-hidden="true"></i> {{ CORREO_RAMAZZINI }}
            </a>
          </div>
        </div>
      </section>

      <!-- Cancelar: acción secundaria, sin protagonismo -->
      <p v-if="puedeCancelar" class="text-right">
        <button
          type="button"
          data-testid="suscripcion-cancelar"
          class="text-xs text-gray-500 underline hover:text-red-600 disabled:cursor-not-allowed disabled:no-underline"
          :disabled="isCancelling"
          @click="toggleCancelModal"
        >
          {{ isCancelling ? 'Procesando…' : 'Cancelar suscripción' }}
        </button>
      </p>
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
</style>
