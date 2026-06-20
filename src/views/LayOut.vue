<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch, computed, onBeforeUnmount, provide } from "vue";
import { useUserStore } from "@/stores/user";
import { useProveedorSaludStore } from "@/stores/proveedorSalud";
import { useMedicoFirmanteStore } from "@/stores/medicoFirmante";
import { useEnfermeraFirmanteStore } from "@/stores/enfermeraFirmante";
import { useTecnicoFirmanteStore } from "@/stores/tecnicoFirmante";
import { useEmpresasStore } from "@/stores/empresas";
import { useRoute, useRouter, RouterLink } from "vue-router";
import TooltipInfo from "@/components/TooltipInfo.vue";
import {
  THEME_STORAGE_KEY,
  applyAppTheme,
  readInitialDarkPreference,
} from "@/theme/appTheme";
import { catalogAdminEnabled } from "@/composables/useCatalogAdminFeature";
import ModalEliminacion from "@/components/ModalEliminacion.vue";
import { useEliminacion } from "@/composables/useEliminacion";

const {
  isOpen: eliminacionOpen,
  isConfirming: eliminacionConfirming,
  nivel: eliminacionNivel,
  tipoRegistro: eliminacionTipoRegistro,
  identificacion: eliminacionIdentificacion,
  textoConfirmacionEsperado: eliminacionTextoConfirmacion,
  detalleContexto: eliminacionDetalleContexto,
  mensajePersonalizado: eliminacionMensajePersonalizado,
  requestEliminacion,
  confirmarEliminacion,
  cancelarEliminacion,
} = useEliminacion();

provide("requestEliminacion", requestEliminacion);

const user = useUserStore();
const proveedorSaludStore = useProveedorSaludStore();
const medicoFirmanteStore = useMedicoFirmanteStore();
const enfermeraFirmanteStore = useEnfermeraFirmanteStore();
const tecnicoFirmanteStore = useTecnicoFirmanteStore();
const empresas = useEmpresasStore();
const route = useRoute();
const router = useRouter();
const datosCargados = ref(false);
const empresasCargadas = ref(false); 

// Dark mode state
const isDarkMode = ref(false);

function syncThemeFromEnvironment() {
  isDarkMode.value = readInitialDarkPreference();
  applyAppTheme(isDarkMode.value);
}

// Función para alternar dark mode
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  localStorage.setItem(THEME_STORAGE_KEY, isDarkMode.value.toString());
  applyAppTheme(isDarkMode.value);
};

// Computed para el ícono del toggle
const darkModeIcon = computed(() => {
  return isDarkMode.value ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
});

// Computed para el texto del toggle
const darkModeText = computed(() => {
  return isDarkMode.value ? 'Modo Claro' : 'Modo Oscuro';
});

const isVisible = ref(false);
const isMenuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);
const isGuideMenuOpen = ref(false);
const guideMenuRef = ref<HTMLElement | null>(null);
const isNotificationVisible = ref(false);
const isNotificationEmpresasVisible = ref(false);

const guiaConfiguracionInicialURL = "https://scribehow.com/shared/Configuracion_de_Informes__qSuHpPxtSnKc8JTaObgY7Q?referrer=workspace"
const guiaRegistrarClientesURL = "https://scribehow.com/shared/Agregar_Clientes_y_Centros_de_Trabajo__32Haet8BQy6oFUDacWcbWg?referrer=documents"

const LOGO_ASSETS = [
  '/img/logosRamazzini/RamazziniBrand.png',
  '/img/logosRamazzini/RamazziniLogoNoBg.png',
  '/img/logosRamazzini/RamazziniLogoClaroNoBg.png',
];

// Función para cerrar el menú si se hace clic fuera
const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    isMenuOpen.value = false;
  }
  if (guideMenuRef.value && !guideMenuRef.value.contains(event.target as Node)) {
    isGuideMenuOpen.value = false;
  }
};

// Función para cerrar notificaciones
const closeNotification = () => {
  isNotificationVisible.value = false;
};

// Función para cerrar notificación de empresas
const closeNotificationEmpresas = () => {
  isNotificationEmpresasVisible.value = false;
};

onMounted(() => {
  syncThemeFromEnvironment();

  LOGO_ASSETS.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  watch(
    () => user.user,
    async (user) => {
      datosCargados.value = false;
      if (user?.idProveedorSalud) {
        await proveedorSaludStore.loadProveedorSalud(user.idProveedorSalud);
      }
      if (user?._id) {
        await medicoFirmanteStore.loadMedicoFirmante(user._id);
        await enfermeraFirmanteStore.loadEnfermeraFirmante(user._id);
        await tecnicoFirmanteStore.loadTecnicoFirmante(user._id);
      }
      datosCargados.value = true;
    },
    { immediate: true }
  );

  setTimeout(() => {
    isVisible.value = true;
  }, 400);

  document.addEventListener("click", handleClickOutside);
});

watch(
  () => empresas.empresas.length,
  () => {
    empresasCargadas.value = true;
  }
);

onMounted(() => {
  if (user.user?.idProveedorSalud) {
    empresas.fetchEmpresas(user.user.idProveedorSalud).then(() => {
      empresasCargadas.value = true;
    });
  }
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});

const toggleMenu = () => {
  event?.stopPropagation();
  isMenuOpen.value = !isMenuOpen.value;
  if (isMenuOpen.value) {
    isGuideMenuOpen.value = false;
  }
};

const toggleGuideMenu = (event: MouseEvent) => {
  event.stopPropagation();
  isGuideMenuOpen.value = !isGuideMenuOpen.value;
  if (isGuideMenuOpen.value) {
    isMenuOpen.value = false;
  }
};

watch(
  () => route.path,
  (newPath, oldPath) => {
    if (oldPath === "/" && newPath !== "/") {
      isMenuOpen.value = false;
      isGuideMenuOpen.value = false;
    }
  }
);

// Verificar si falta el logotipo de la empresa
const logotipoPendiente = computed(() => proveedorSaludStore.logotipoPendiente);

// Campos pendientes en Proveedor de Salud (desde store, con guard de carga)
const camposPendientesProveedor = computed(
  () => proveedorSaludStore.camposPendientesProveedor,
);

// Computed para verificar los campos pendientes en Médico Firmante
const camposPendientesMedico = computed(() => {
  const medico = medicoFirmanteStore.medicoFirmante;
  const pendientes: string[] = [];

  if (!medico?.nombre) pendientes.push("Nombre");
  if (!medico?.primerApellido) pendientes.push("Primer Apellido");
  if (!medico?.tituloProfesional) pendientes.push("Título Profesional");
  if (!medico?.numeroCedulaProfesional) pendientes.push("Número de Cédula Profesional");

  return pendientes;
});

// Computed para verificar los campos pendientes en Enfermera Firmante
const camposPendientesEnfermera = computed(() => {
  const enfermera = enfermeraFirmanteStore.enfermeraFirmante;
  const pendientes: string[] = [];

  if (!enfermera?.nombre) pendientes.push("Nombre");
  if (!enfermera?.primerApellido) pendientes.push("Primer Apellido");
  if (!enfermera?.sexo) pendientes.push("Sexo");
  if (!enfermera?.tituloProfesional) pendientes.push("Título Profesional");
  if (!enfermera?.numeroCedulaProfesional) pendientes.push("Número de Registro/Cédula Profesional");

  return pendientes;
});

// Técnico Evaluador – campos pendientes
const camposPendientesTecnicoEvaluador = computed(() => {
  const tecnico = (tecnicoFirmanteStore as any).tecnicoFirmante;
  const pendientes: string[] = [];

  if (!tecnico?.nombre) pendientes.push("Nombre");
  if (!tecnico?.primerApellido) pendientes.push("Primer Apellido");
  if (!tecnico?.sexo) pendientes.push("Sexo");
  if (!tecnico?.tituloProfesional) pendientes.push("Título Profesional (recomendado)");
  if (!tecnico?.numeroCedulaProfesional) pendientes.push("Registro/Cédula Profesional (recomendado)");

  return pendientes;
});

// Computed para determinar si mostrar el ícono del tooltip
const mostrarTooltipProveedor = computed(() => camposPendientesProveedor.value.length > 0);
const mostrarTooltipMedico = computed(() => camposPendientesMedico.value.length > 0);
const mostrarTooltipEnfermera = computed(() => camposPendientesEnfermera.value.length > 0);
const mostrarTooltipTecnicoEvaluador = computed(() => camposPendientesTecnicoEvaluador.value.length > 0);

// Badges del engrane: solo tras cargar datos del proveedor
const mostrarNotificacionLogotipo = computed(
  () => datosCargados.value && proveedorSaludStore.logotipoPendiente,
);

const mostrarNotificacionCampos = computed(() => {
  if (!datosCargados.value) return false;

  const userRole = user.user?.role;

  if (
    userRole === 'Administrador' ||
    userRole === 'Principal' ||
    userRole === 'Secundario' ||
    userRole === 'Médico'
  ) {
    return (
      proveedorSaludStore.camposPendientesProveedor.length > 0 ||
      camposPendientesMedico.value.length > 0
    );
  }

  if (userRole === 'Enfermero/a') {
    return camposPendientesEnfermera.value.length > 0;
  }

  if (userRole === 'Técnico Evaluador') {
    return camposPendientesTecnicoEvaluador.value.length > 0;
  }

  return false;
});

// Control de animación
const animacionNotificacion = ref("notificacion-animada");
const animacionTooltipProveedor = ref("tooltip-pulse");
const animacionTooltipMedico = ref("tooltip-pulse");
const animacionTooltipEnfermera = ref("tooltip-pulse");
const animacionTooltipTecnicoEvaluador = ref("tooltip-pulse");
const showTooltipProveedor = ref(false);
const showTooltipMedico = ref(false);
const showTooltipEnfermera = ref(false);
const showTooltipLogotipo = ref(false);
const showTooltipTecnicoEvaluador = ref(false);

// Refs para posicionar tooltips con Teleport
const tooltipLogotipoRef = ref<HTMLElement | null>(null);
const tooltipProveedorRef = ref<HTMLElement | null>(null);
const tooltipMedicoRef = ref<HTMLElement | null>(null);
const tooltipEnfermeraRef = ref<HTMLElement | null>(null);
const tooltipTecnicoEvaluadorRef = ref<HTMLElement | null>(null);

// Estilos reactivos para tooltips (se actualizan en mouseenter)
const tooltipLogotipoStyle = ref<Record<string, string>>({});
const tooltipProveedorStyle = ref<Record<string, string>>({});
const tooltipMedicoStyle = ref<Record<string, string>>({});
const tooltipEnfermeraStyle = ref<Record<string, string>>({});
const tooltipTecnicoEvaluadorStyle = ref<Record<string, string>>({});

// Funciones para mostrar tooltips y calcular posición
const showTooltipLogotipoHandler = () => {
  if (tooltipLogotipoRef.value) {
    const rect = tooltipLogotipoRef.value.getBoundingClientRect();
    tooltipLogotipoStyle.value = {
      top: `${rect.top + rect.height / 2}px`,
      left: `${rect.left - 285}px`,
      transform: 'translateY(-20%)'
    };
  }
  showTooltipLogotipo.value = true;
};

const showTooltipProveedorHandler = () => {
  if (tooltipProveedorRef.value) {
    const rect = tooltipProveedorRef.value.getBoundingClientRect();
    tooltipProveedorStyle.value = {
      top: `${rect.top + rect.height / 2}px`,
      left: `${rect.left - 285}px`,
      transform: 'translateY(-20%)'
    };
  }
  showTooltipProveedor.value = true;
};

const showTooltipMedicoHandler = () => {
  if (tooltipMedicoRef.value) {
    const rect = tooltipMedicoRef.value.getBoundingClientRect();
    tooltipMedicoStyle.value = {
      top: `${rect.top + rect.height / 2}px`,
      left: `${rect.left - 285}px`,
      transform: 'translateY(-20%)'
    };
  }
  showTooltipMedico.value = true;
};

const showTooltipEnfermeraHandler = () => {
  if (tooltipEnfermeraRef.value) {
    const rect = tooltipEnfermeraRef.value.getBoundingClientRect();
    tooltipEnfermeraStyle.value = {
      top: `${rect.top + rect.height / 2}px`,
      left: `${rect.left - 285}px`,
      transform: 'translateY(-20%)'
    };
  }
  showTooltipEnfermera.value = true;
};

const showTooltipTecnicoEvaluadorHandler = () => {
  if (tooltipTecnicoEvaluadorRef.value) {
    const rect = tooltipTecnicoEvaluadorRef.value.getBoundingClientRect();
    tooltipTecnicoEvaluadorStyle.value = {
      top: `${rect.top + rect.height / 2}px`,
      left: `${rect.left - 285}px`,
      transform: 'translateY(-20%)'
    };
  }
  showTooltipTecnicoEvaluador.value = true;
};

let intervaloAnimacion: ReturnType<typeof setInterval> | null = null;
let intervaloTooltipProveedor: ReturnType<typeof setInterval> | null = null;
let intervaloTooltipMedico: ReturnType<typeof setInterval> | null = null;
let intervaloTooltipEnfermera: ReturnType<typeof setInterval> | null = null;
let intervaloTooltipTecnicoEvaluador: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  intervaloAnimacion = setInterval(() => {
    animacionNotificacion.value = 
      animacionNotificacion.value === "notificacion-pulso" 
      ? "notificacion-vibracion" 
      : "notificacion-pulso";
  }, 3000);
});

onBeforeUnmount(() => {
  if (intervaloAnimacion !== null) {
    clearInterval(intervaloAnimacion);
  }
  if (intervaloTooltipProveedor !== null) {
    clearInterval(intervaloTooltipProveedor);
  }
  if (intervaloTooltipMedico !== null) {
    clearInterval(intervaloTooltipMedico);
  }
  if (intervaloTooltipEnfermera !== null) {
    clearInterval(intervaloTooltipEnfermera);
  }
  if (intervaloTooltipTecnicoEvaluador !== null) {
    clearInterval(intervaloTooltipTecnicoEvaluador);
  }
});

// Verificar si se debe mostrar el mensaje de configuración pendiente
const mostrarMensajePendiente = computed(() => {
  const userRole = user.user?.role;
  
  // Para roles de médicos (Administrador, Principal, Secundario, Médico)
  if (userRole === 'Administrador' || userRole === 'Principal' || userRole === 'Secundario' || userRole === 'Médico') {
    return logotipoPendiente.value || 
      camposPendientesProveedor.value.length > 0 || 
      camposPendientesMedico.value.length > 0;
  }
  
  // Para rol de enfermera
  if (userRole === 'Enfermero/a') {
    return camposPendientesEnfermera.value.length > 0;
  }
  
  // Para rol de técnico evaluador
  if (userRole === 'Técnico Evaluador') {
    return camposPendientesTecnicoEvaluador.value.length > 0;
  }
  
  return false;
});

// Definir el mensaje adecuado según el estado y el rol
const mensajeConfiguracion = computed(() => {
  const userRole = user.user?.role;
  
  // Mensajes para roles de médicos
  if (userRole === 'Administrador' || userRole === 'Principal' || userRole === 'Secundario' || userRole === 'Médico') {
    if ((camposPendientesProveedor.value.length === 4) && (camposPendientesMedico.value.length === 4)) {
      return "Tus informes aún no están configurados correctamente.";
    } else if (camposPendientesProveedor.value.length > 0) {
      return 'Hay campos pendientes en "Mi Negocio".';
    } else if (logotipoPendiente.value) {
      return "Aún no has subido el logotipo.";
    } else if (camposPendientesMedico.value.length > 0) {
      return 'Hay campos pendientes en "Médico Firmante".';
    } else {
      return "Algunos campos están incompletos en tu configuración.";
    }
  }
  
  // Mensajes para rol de enfermera
  if (userRole === 'Enfermero/a') {
    if (camposPendientesEnfermera.value.length > 0) {
      return 'Hay campos pendientes en "Enfermera Firmante".';
    }
  }
  
  // Mensajes para rol de técnico evaluador
  if (userRole === 'Técnico Evaluador') {
    if (camposPendientesTecnicoEvaluador.value.length > 0) {
      return 'Hay campos pendientes en "Técnico Firmante".';
    }
  }
  
  return "Algunos campos están incompletos en tu configuración.";
});

// Definir el texto del enlace dependiendo de la situación
const textoEnlace = computed(() => {
  const userRole = user.user?.role;
  
  if (userRole === 'Administrador' || userRole === 'Principal' || userRole === 'Secundario' || userRole === 'Médico') {
    if (logotipoPendiente.value && !(camposPendientesProveedor.value.length > 0 || camposPendientesMedico.value.length > 0)) {
      return "Sigue esta guía para hacerlo";
    } else {
      return "Sigue esta guía para configurarlos";
    }
  }
  
  if (userRole === 'Enfermero/a' || userRole === 'Técnico Evaluador') {
    return "Sigue esta guía para configurarlos";
  }
  
  return "Sigue esta guía para configurarlos";
});

// Computed para determinar el tipo de notificación
const tipoNotificacion = computed(() => {
  const userRole = user.user?.role;
  
  // Para roles de médicos
  if (userRole === 'Administrador' || userRole === 'Principal' || userRole === 'Secundario' || userRole === 'Médico') {
    if (logotipoPendiente.value) return 'error';
    if (camposPendientesProveedor.value.length > 0 || camposPendientesMedico.value.length > 0) return 'warning';
  }
  
  // Para rol de enfermera
  if (userRole === 'Enfermero/a') {
    if (camposPendientesEnfermera.value.length > 0) return 'warning';
  }
  
  // Para rol de técnico evaluador
  if (userRole === 'Técnico Evaluador') {
    if (camposPendientesTecnicoEvaluador.value.length > 0) return 'warning';
  }
  
  return 'info';
});

// Computed para el ícono de notificación
const iconoNotificacion = computed(() => {
  switch (tipoNotificacion.value) {
    case 'error': return 'fa-solid fa-exclamation-triangle';
    case 'warning': return 'fa-solid fa-exclamation-circle';
    default: return 'fa-regular fa-lightbulb';
  }
});

// Computed para el color de notificación
const colorNotificacion = computed(() => {
  switch (tipoNotificacion.value) {
    case 'error': return 'text-red-500';
    case 'warning': return 'text-yellow-500';
    default: return 'text-blue-500';
  }
});

// Watcher para mostrar la notificación cuando hay campos pendientes
watch(mostrarMensajePendiente, (nuevoValor) => {
  if (nuevoValor && datosCargados.value) {
    // Mostrar la notificación después de un pequeño delay para mejor UX
    setTimeout(() => {
      isNotificationVisible.value = true;
    }, 1000);
  }
});

// Watcher adicional para cuando datosCargados cambie a true y ya haya campos pendientes
watch(datosCargados, (nuevoValor) => {
  if (nuevoValor && mostrarMensajePendiente.value) {
    // Mostrar la notificación después de un pequeño delay para mejor UX
    setTimeout(() => {
      isNotificationVisible.value = true;
    }, 1000);
  }
});

// Watcher adicional para cuando mostrarMensajePendiente cambie después de que los datos estén cargados
watch([datosCargados, mostrarMensajePendiente], ([nuevosDatosCargados, nuevoMostrarMensaje]) => {
  if (nuevosDatosCargados && nuevoMostrarMensaje) {
    // Mostrar la notificación después de un pequeño delay para mejor UX
    setTimeout(() => {
      isNotificationVisible.value = true;
    }, 1000);
  }
});

// Watcher adicional para cuando datosCargados cambie a true y ya haya campos pendientes
watch([datosCargados, logotipoPendiente, camposPendientesProveedor, camposPendientesMedico, camposPendientesEnfermera, camposPendientesTecnicoEvaluador], ([nuevosDatosCargados, nuevoLogotipoPendiente, nuevosCamposProveedor, nuevosCamposMedico, nuevosCamposEnfermera, nuevosCamposTecnico]) => {
  const userRole = user.user?.role;
  
  // Para roles de médicos
  if ((userRole === 'Administrador' || userRole === 'Principal' || userRole === 'Secundario' || userRole === 'Médico') && 
      nuevosDatosCargados && 
      (nuevoLogotipoPendiente || nuevosCamposProveedor.length > 0 || nuevosCamposMedico.length > 0)) {
    setTimeout(() => {
      isNotificationVisible.value = true;
    }, 1000);
  }
  
  // Para rol de enfermera
  if (userRole === 'Enfermero/a' && nuevosDatosCargados && nuevosCamposEnfermera.length > 0) {
    setTimeout(() => {
      isNotificationVisible.value = true;
    }, 1000);
  }
  
  // Para rol de técnico evaluador
  if (userRole === 'Técnico Evaluador' && nuevosDatosCargados && nuevosCamposTecnico.length > 0) {
    setTimeout(() => {
      isNotificationVisible.value = true;
    }, 1000);
  }
});

// Watcher para mostrar la notificación cuando no hay empresas registradas
watch([empresasCargadas, () => empresas.empresas.length], ([nuevoEmpresasCargadas, nuevoNumeroEmpresas]) => {
  if (nuevoEmpresasCargadas && nuevoNumeroEmpresas === 0) {
    // Mostrar la notificación después de un pequeño delay para mejor UX
    setTimeout(() => {
      isNotificationEmpresasVisible.value = true;
    }, 1000);
  }
});

// Watcher adicional para cuando empresasCargadas cambie a true y no haya empresas
watch(empresasCargadas, (nuevoValor) => {
  if (nuevoValor && empresas.empresas.length === 0) {
    // Mostrar la notificación después de un pequeño delay para mejor UX
    setTimeout(() => {
      isNotificationEmpresasVisible.value = true;
    }, 1000);
  }
});

// Watcher adicional para cuando ambos valores cambien
watch([empresasCargadas, () => empresas.empresas.length], ([nuevoEmpresasCargadas, nuevoNumeroEmpresas]) => {
  if (nuevoEmpresasCargadas && nuevoNumeroEmpresas === 0) {
    // Mostrar la notificación después de un pequeño delay para mejor UX
    setTimeout(() => {
      isNotificationEmpresasVisible.value = true;
    }, 1000);
  }
});

// Watcher adicional para cuando datosCargados cambie a true y ya haya empresas cargadas
watch([datosCargados, empresasCargadas, () => empresas.empresas.length], ([nuevosDatosCargados, nuevoEmpresasCargadas, nuevoNumeroEmpresas]) => {
  if (nuevosDatosCargados && nuevoEmpresasCargadas && nuevoNumeroEmpresas === 0) {
    // Mostrar la notificación después de un pequeño delay para mejor UX
    setTimeout(() => {
      isNotificationEmpresasVisible.value = true;
    }, 1000);
  }
});

// Watchers para las animaciones de tooltips
watch(mostrarTooltipProveedor, (nuevoValor) => {
  if (intervaloTooltipProveedor) {
    clearInterval(intervaloTooltipProveedor);
    intervaloTooltipProveedor = null;
  }
  
  if (nuevoValor) {
    intervaloTooltipProveedor = setInterval(() => {
      animacionTooltipProveedor.value = 
        animacionTooltipProveedor.value === "tooltip-pulse" 
        ? "tooltip-bounce" 
        : "tooltip-pulse";
    }, 2000);
  }
});

watch(mostrarTooltipMedico, (nuevoValor) => {
  if (intervaloTooltipMedico) {
    clearInterval(intervaloTooltipMedico);
    intervaloTooltipMedico = null;
  }
  
  if (nuevoValor) {
    intervaloTooltipMedico = setInterval(() => {
      animacionTooltipMedico.value = 
        animacionTooltipMedico.value === "tooltip-bounce" 
        ? "tooltip-pulse" 
        : "tooltip-pulse";
    }, 2000);
  }
});

watch(mostrarTooltipEnfermera, (nuevoValor) => {
  if (intervaloTooltipEnfermera) {
    clearInterval(intervaloTooltipEnfermera);
    intervaloTooltipEnfermera = null;
  }
  
  if (nuevoValor) {
    intervaloTooltipEnfermera = setInterval(() => {
      animacionTooltipEnfermera.value = 
        animacionTooltipEnfermera.value === "tooltip-bounce" 
        ? "tooltip-pulse" 
        : "tooltip-bounce";
    }, 2000);
  }
});

watch(mostrarTooltipTecnicoEvaluador, (nuevoValor) => {
  if (intervaloTooltipTecnicoEvaluador) {
    clearInterval(intervaloTooltipTecnicoEvaluador);
    intervaloTooltipTecnicoEvaluador = null;
  }
  
  if (nuevoValor) {
    intervaloTooltipTecnicoEvaluador = setInterval(() => {
      animacionTooltipTecnicoEvaluador.value = 
        animacionTooltipTecnicoEvaluador.value === "tooltip-bounce" 
        ? "tooltip-pulse" 
        : "tooltip-bounce";
    }, 2000);
  }
});

const isHomeRoute = computed(() => route.name === 'inicio');

</script>

<template>
  <main class="flex flex-col items-center p-4 md:p-10 md:w-full overflow-x-auto min-h-screen">
    
    <!-- Logo de la empresa -->
    <div v-if="empresas.currentEmpresa?.logotipoEmpresa?.data && 
      ['crear-documento'].includes(route.name as string)"
      class="fixed top-4 right-4 h-16 w-16 md:h-24 md:w-24 rounded-lg z-[55] flex flex-col items-center justify-center overflow-hidden bg-white shadow-lg border border-gray-200">
      <img :src="'/uploads/logos/' + empresas.currentEmpresa?.logotipoEmpresa?.data"
      :alt="'Logo de ' + empresas.currentEmpresa?.nombreComercial" 
      class="max-h-full max-w-full object-contain p-2">
    </div>

    <!-- Logo Ramazzini: tamaño/posición original por ruta; v-show evita remontaje; aspect-ratio evita CLS al cargar img -->
    <div class="layout-logo-region flex w-full flex-shrink-0 justify-center">
      <RouterLink
        v-show="isHomeRoute"
        :to="{ name: 'inicio' }"
        class="layout-nav-link logo-transition mt-14 block aspect-[1397/1403] w-1/2 transform cursor-pointer transition-transform duration-300 ease hover:scale-105 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-1/6 2xl:w-1/8"
      >
        <img
          src="/img/logosRamazzini/RamazziniBrand.png"
          alt="Ramazzini-Logo"
          width="1397"
          height="1403"
          decoding="async"
          fetchpriority="high"
          class="block h-auto w-full drop-shadow-lg"
        />
      </RouterLink>

      <RouterLink
        v-show="!isHomeRoute"
        :to="{ name: 'inicio' }"
        class="layout-nav-link logo-transition mb-5 mt-3 block aspect-[5210/1403] w-2/3 transform cursor-pointer transition-transform duration-300 ease hover:scale-105 sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 2xl:w-1/6"
      >
        <img
          :src="isDarkMode ? '/img/logosRamazzini/RamazziniLogoClaroNoBg.png' : '/img/logosRamazzini/RamazziniLogoNoBg.png'"
          alt="Ramazzini-Logo"
          width="5210"
          height="1403"
          decoding="async"
          class="block h-auto w-full drop-shadow-lg"
        />
      </RouterLink>
    </div>

    <!-- Contenido principal: inicio solo anima entrada; desmontaje instantáneo al navegar -->
    <Transition appear name="slide-up-in-only" @leave="(_, done) => done()">
      <div v-if="isHomeRoute" class="mx-auto flex w-full flex-col items-center">
        <h1 class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl py-5 text-center text-slate-700 font-medium bg-gradient-to-r from-slate-700 to-gray-600 bg-clip-text text-transparent">
          Ramazzini
        </h1>
        <p class="text-xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl xl:w-2/3 py-2 text-center text-gray-600">
          La aplicación para la creación y gestión de informes de exámenes médicos laborales.
        </p>
        <p class="text-gray-600 text-sm sm:text-lg my-4 text-center">Hola, {{ user.getUsername }}</p>
        
        <!-- Botones de acción -->
        <div class="grid gap-4 w-full max-w-md mt-2">
          <RouterLink
            :to="{ name: 'empresas' }"
            class="layout-nav-link button-transition block w-full transform rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3 text-center text-lg font-medium uppercase tracking-wide text-white shadow-lg transition-all duration-300 ease hover:scale-105 hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl sm:text-xl md:text-2xl">
            VER MIS CLIENTES
          </RouterLink>

          <div class="flex justify-center">
            <a href="/login">
              <button
                class="button-transition transform rounded-lg border-2 border-gray-300 px-4 py-1 text-sm uppercase text-gray-800 shadow-md transition-all duration-300 ease hover:scale-105 hover:bg-red-600 hover:text-gray-200 hover:shadow-lg sm:text-base md:text-lg"
                @click="user.logout">
                <i class="fa-solid fa-sign-out-alt mr-3"></i>
                CERRAR SESIÓN
              </button>
            </a>
          </div>
        </div>
      </div>
    </Transition>

    <!-- RouterView después de inicio en el DOM para quedar encima si hubiera un frame de solapamiento -->
    <div v-if="!isHomeRoute" class="relative z-10 w-full max-w-screen-2xl">
      <RouterView />
    </div>

    <!-- Notificaciones separadas con transiciones independientes -->
    
    <!-- Primera notificación: campos pendientes -->
    <Transition name="slide-up">
      <div v-if="datosCargados && mostrarMensajePendiente && isNotificationVisible" 
            class="hidden sm:block fixed bottom-6 right-6 z-50 bg-white text-gray-700 border-l-4 border-red-500 rounded-xl shadow-lg p-4 max-w-sm transform hover:scale-105 transition-transform duration-500 ease-in-out">
        <div class="flex items-start gap-3">
          <i :class="[iconoNotificacion, colorNotificacion, 'text-xl mt-1']"></i>
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-800 mb-2">
              {{ mensajeConfiguracion }}
            </p>
            <a :href="guiaConfiguracionInicialURL" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="text-blue-600 hover:text-blue-800 underline text-sm font-medium transition-colors duration-200">
              {{ textoEnlace }}
            </a>
          </div>
          <button @click="closeNotification" 
                  class="text-gray-400 hover:text-gray-600 transition-colors duration-200">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
      </div>
    </Transition>
    
    <!-- Segunda notificación: no hay empresas -->
    <Transition name="slide-up">
      <div v-if="datosCargados && empresasCargadas && empresas.empresas.length === 0 && isNotificationEmpresasVisible" 
            class="hidden sm:block fixed bottom-6 right-6 z-50 bg-white text-gray-700 border-l-4 border-blue-500 rounded-xl shadow-lg p-4 max-w-sm transform hover:scale-105 transition-transform duration-500 ease-in-out"
            :class="((camposPendientesProveedor.length === 4) && (camposPendientesMedico.length === 4)) ? 'mb-3' : '-mb-2'"
            :style="{ bottom: datosCargados && mostrarMensajePendiente && isNotificationVisible ? '8rem' : '1.5rem' }">
        <div class="flex items-start gap-3">
          <i class="fa-regular fa-lightbulb text-blue-500 text-xl mt-1"></i>
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-800 mb-2">
              Aún no tienes clientes registrados
            </p>
            <a :href="guiaRegistrarClientesURL" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="text-blue-600 hover:text-blue-800 underline text-sm font-medium transition-colors duration-200">
              Guía para registrar a tu primer cliente
            </a>
          </div>
          <button @click="closeNotificationEmpresas" 
                  class="text-gray-400 hover:text-gray-600 transition-colors duration-200">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Botón del engrane mejorado -->
    <Transition name="delayed-appear">
      <button 
        v-if="isVisible"
        @click="toggleMenu"
        class="fixed top-6 right-6 p-4 bg-white text-gray-700 rounded-full hover:bg-gray-50 transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl border border-gray-200 z-50 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-200"
        :aria-label="isMenuOpen ? 'Cerrar menú de configuración' : 'Abrir menú de configuración'"
        >
        <svg 
          class="w-6 h-6 text-gray-700 transition-transform duration-300 ease-in-out"
          :class="{ 'rotate-90': isMenuOpen }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        
        <!-- Notificaciones mejoradas -->
        <div v-if="mostrarNotificacionCampos" 
             :class="['absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full border-2 border-white shadow-lg', animacionNotificacion]">
          <i class="fa-solid fa-exclamation text-white text-xs absolute inset-0 flex items-center justify-center"></i>
        </div>
        
        <div v-if="mostrarNotificacionLogotipo" 
             :class="['absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg', animacionNotificacion]">
          <i class="fa-solid fa-exclamation-triangle text-white text-xs absolute inset-0 flex items-center justify-center"></i>
        </div>
      </button>
    </Transition>

    <!-- Menú desplegable mejorado -->
    <Transition name="fade">
      <div 
        v-if="isMenuOpen"
        ref="menuRef"
        class="fixed top-20 right-6 bg-white rounded-2xl shadow-2xl p-6 w-72 z-40 border border-gray-100 backdrop-blur-sm bg-white/95 overflow-visible">

        <div class="max-h-[70vh] overflow-y-auto pr-3">
          <div class="space-y-4">

          <!-- Administrador -->
          <div v-if="user.user?.role === 'Administrador'">
            <p class="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <i class="fa-solid fa-shield-alt mr-2 text-orange-500"></i>
              Administrador
            </p>
            <RouterLink :to="{ name: 'panel-administrador' }" @click="isMenuOpen = false"
               class="layout-nav-link block py-3 px-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-orange-50 hover:to-orange-100 rounded-xl transition-all duration-300 ease-in-out cursor-pointer border border-gray-200 hover:border-orange-300 group">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-tachometer-alt text-orange-500 group-hover:text-orange-600 transition-colors duration-200"></i>
                <span class="font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">Panel de Administrador</span>
              </div>
            </RouterLink>
          </div>
          
          <!-- Configuración -->
          <div>
            <p class="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <i class="fa-solid fa-cog mr-2 text-blue-500"></i>
              Configuración
            </p>

            <!-- Proveedor de Salud -->
            <RouterLink v-if="user.user?.role === 'Principal' || user.user?.role === 'Administrador'" 
               :to="{ name: 'perfil-proveedor' }"
               @click="isMenuOpen = false"
               :class="[
                 'block py-3 px-4 rounded-xl transition-all duration-300 ease-in-out cursor-pointer border group',
                 logotipoPendiente 
                   ? 'bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border-red-300 hover:border-red-400' 
                   : mostrarTooltipProveedor 
                     ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 border-yellow-300 hover:border-yellow-400'
                     : 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 border-gray-200 hover:border-blue-300'
               ]">
              <div class="flex items-center gap-3">
                <!-- Icono con animación para logotipo pendiente -->
                <div v-if="logotipoPendiente" class="relative group" ref="tooltipLogotipoRef" @mouseenter="showTooltipLogotipoHandler" @mouseleave="showTooltipLogotipo = false">
                  <i :class="['fa-solid fa-triangle-exclamation text-red-500 text-lg cursor-pointer', animacionTooltipProveedor]"></i>
                  <Teleport to="body">
                    <div v-if="showTooltipLogotipo" class="fixed z-[9999] bg-black bg-opacity-90 text-white border border-gray-700 rounded-md shadow-lg p-3 text-sm w-64" :style="tooltipLogotipoStyle">
                      <p class="font-semibold mb-1 text-base">Se requiere un logotipo para el encabezado del informe</p>
                    </div>
                  </Teleport>
                </div>
                
                <!-- Icono con animación para campos pendientes -->
                <div v-if="mostrarTooltipProveedor" class="relative group" ref="tooltipProveedorRef" @mouseenter="showTooltipProveedorHandler" @mouseleave="showTooltipProveedor = false">
                  <i :class="['fa-solid fa-exclamation-circle text-yellow-500 text-lg cursor-pointer', animacionTooltipProveedor]"></i>
                  <Teleport to="body">
                    <div v-if="showTooltipProveedor" class="fixed z-[9999] bg-black bg-opacity-90 text-white border border-gray-700 rounded-md shadow-lg p-3 text-sm w-64" :style="tooltipProveedorStyle">
                      <p class="font-semibold mb-1 text-base">Para un mejor pie de página, se recomienda guardar:</p>
                      <ul class="list-disc pl-4 mt-2 text-gray-300">
                        <li v-for="item in camposPendientesProveedor" :key="item">{{ item }}</li>
                      </ul>
                    </div>
                  </Teleport>
                </div>
                
                <i v-if="!logotipoPendiente && !mostrarTooltipProveedor" :class="[
                  'fa-solid fa-building transition-colors duration-200 text-blue-500 group-hover:text-blue-600'
                ]"></i>
                <span :class="[
                  'font-medium transition-colors duration-200',
                  logotipoPendiente 
                    ? 'text-red-700 group-hover:text-red-800' 
                    : mostrarTooltipProveedor 
                      ? 'text-yellow-700 group-hover:text-yellow-800'
                      : 'text-gray-700 group-hover:text-gray-900'
                ]">Mi Negocio</span>
              </div>
            </RouterLink>

            <!-- Médico Firmante -->
            <RouterLink v-if="user.user?.role === 'Principal' || user.user?.role === 'Médico' || user.user?.role === 'Administrador'" :to="{ name: 'medico-firmante' }" @click="isMenuOpen = false" 
               :class="[
                 'block py-3 px-4 rounded-xl mt-2 transition-all duration-300 ease-in-out cursor-pointer border group',
                 mostrarTooltipMedico 
                   ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 border-yellow-300 hover:border-yellow-400'
                   : 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 border-gray-200 hover:border-blue-300'
               ]">
              <div class="flex items-center gap-3">
                <!-- Icono con animación para campos pendientes del médico -->
                <div v-if="mostrarTooltipMedico" class="relative group" ref="tooltipMedicoRef" @mouseenter="showTooltipMedicoHandler" @mouseleave="showTooltipMedico = false">
                  <i :class="['fa-solid fa-exclamation-circle text-yellow-500 text-lg cursor-pointer', animacionTooltipMedico]"></i>
                  <Teleport to="body">
                    <div v-if="showTooltipMedico" class="fixed z-[9999] bg-black bg-opacity-90 text-white border border-gray-700 rounded-md shadow-lg p-3 text-sm w-64" :style="tooltipMedicoStyle">
                      <p class="font-semibold mb-1 text-base">Para un mejor pie de página, se recomienda guardar:</p>
                      <ul class="list-disc pl-4 mt-2 text-gray-300">
                        <li v-for="item in camposPendientesMedico" :key="item">{{ item }}</li>
                      </ul>
                    </div>
                  </Teleport>
                </div>
                
                <i v-if="!mostrarTooltipMedico" :class="[
                  'fa-solid fa-user-md transition-colors duration-200 text-green-500 group-hover:text-green-600'
                ]"></i>
                <span :class="[
                  'font-medium transition-colors duration-200',
                  mostrarTooltipMedico 
                    ? 'text-yellow-700 group-hover:text-yellow-800'
                    : 'text-gray-700 group-hover:text-gray-900'
                ]">Médico Firmante</span>
              </div>
            </RouterLink>

            <!-- Enfermera Firmante -->
            <RouterLink v-if="user.user?.role === 'Enfermero/a'" :to="{ name: 'enfermera-firmante' }" @click="isMenuOpen = false" 
               :class="[
                 'block py-3 px-4 rounded-xl mt-2 transition-all duration-300 ease-in-out cursor-pointer border group',
                 mostrarTooltipEnfermera 
                   ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 border-yellow-300 hover:border-yellow-400'
                   : 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 border-gray-200 hover:border-blue-300'
               ]">
              <div class="flex items-center gap-3">
                <!-- Icono con animación para campos pendientes de la enfermera -->
                <div v-if="mostrarTooltipEnfermera" class="relative group" ref="tooltipEnfermeraRef" @mouseenter="showTooltipEnfermeraHandler" @mouseleave="showTooltipEnfermera = false">
                  <i :class="['fa-solid fa-exclamation-circle text-yellow-500 text-lg cursor-pointer', animacionTooltipEnfermera]"></i>
                  <Teleport to="body">
                    <div v-if="showTooltipEnfermera" class="fixed z-[9999] bg-black bg-opacity-90 text-white border border-gray-700 rounded-md shadow-lg p-3 text-sm w-64" :style="tooltipEnfermeraStyle">
                      <p class="font-semibold mb-1 text-base">Para un mejor pie de página, se recomienda guardar:</p>
                      <ul class="list-disc pl-4 mt-2 text-gray-300">
                        <li v-for="item in camposPendientesEnfermera" :key="item">{{ item }}</li>
                      </ul>
                    </div>
                  </Teleport>
                </div>
                
                <i v-if="!mostrarTooltipEnfermera" :class="[
                  'fa-solid fa-user-nurse transition-colors duration-200 text-pink-500 group-hover:text-pink-600'
                ]"></i>
                <span :class="[
                  'font-medium transition-colors duration-200',
                  mostrarTooltipEnfermera 
                    ? 'text-yellow-700 group-hover:text-yellow-800'
                    : 'text-gray-700 group-hover:text-gray-900'
                ]">Enfermero/a Firmante</span>
              </div>
            </RouterLink>

            <!-- Técnico Evaluador Firmante -->
            <RouterLink v-if="user.user?.role === 'Técnico Evaluador'" :to="{ name: 'tecnico-evaluador-firmante' }" @click="isMenuOpen = false" 
               :class="[
                 'block py-3 px-4 rounded-xl mt-2 transition-all duration-300 ease-in-out cursor-pointer border group',
                 mostrarTooltipTecnicoEvaluador 
                   ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 border-yellow-300 hover:border-yellow-400'
                   : 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 border-gray-200 hover:border-blue-300'
               ]">
              <div class="flex items-center gap-3">
                <!-- Icono con animación para campos pendientes del técnico evaluador -->
                <div v-if="mostrarTooltipTecnicoEvaluador" class="relative group" ref="tooltipTecnicoEvaluadorRef" @mouseenter="showTooltipTecnicoEvaluadorHandler" @mouseleave="showTooltipTecnicoEvaluador = false">
                  <i :class="['fa-solid fa-exclamation-circle text-yellow-500 text-lg cursor-pointer', animacionTooltipTecnicoEvaluador]"></i>
                  <Teleport to="body">
                    <div v-if="showTooltipTecnicoEvaluador" class="fixed z-[9999] bg-black bg-opacity-90 text-white border border-gray-700 rounded-md shadow-lg p-3 text-sm w-64" :style="tooltipTecnicoEvaluadorStyle">
                      <p class="font-semibold mb-1 text-base">Para un mejor pie de página, se recomienda guardar:</p>
                      <ul class="list-disc pl-4 mt-2 text-gray-300">
                        <li v-for="item in camposPendientesTecnicoEvaluador" :key="item">{{ item }}</li>
                      </ul>
                    </div>
                  </Teleport>
                </div>
                
                <i v-if="!mostrarTooltipTecnicoEvaluador" :class="[
                  'fa-solid fa-user-gear transition-colors duration-200 text-purple-500 group-hover:text-purple-600'
                ]"></i>
                <span :class="[
                  'font-medium transition-colors duration-200',
                  mostrarTooltipTecnicoEvaluador 
                    ? 'text-yellow-700 group-hover:text-yellow-800'
                    : 'text-gray-700 group-hover:text-gray-900'
                ]">Técnico Firmante</span>
              </div>
            </RouterLink>

            <!-- Exportación GIIS (SIRES) -->
            <a v-if="(user.user?.role === 'Principal' || user.user?.role === 'Administrador') && proveedorSaludStore.giisExportEnabled"
               @click="router.push({ name: 'exportacion-giis' })"
               class="block py-3 px-4 rounded-xl mt-2 transition-all duration-300 ease-in-out cursor-pointer border group bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 border-gray-200 hover:border-blue-300">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-file-export transition-colors duration-200 text-blue-500 group-hover:text-blue-600"></i>
                <span class="font-medium transition-colors duration-200 text-gray-700 group-hover:text-gray-900">Exportación GIIS</span>
              </div>
            </a>

            <!-- Auditoría (NOM-024) -->
            <a v-if="user.user?.role === 'Principal' && proveedorSaludStore.auditTrailEnabled"
               @click="router.push({ name: 'auditoria' })"
               class="block py-3 px-4 rounded-xl mt-2 transition-all duration-300 ease-in-out cursor-pointer border group bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 border-gray-200 hover:border-blue-300">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-clipboard-list transition-colors duration-200 text-blue-500 group-hover:text-blue-600"></i>
                <span class="font-medium transition-colors duration-200 text-gray-700 group-hover:text-gray-900">Auditoría</span>
              </div>
            </a>

            <!-- Administrativo -->
            <p v-if="user.user?.role === 'Administrativo'" class="text-sm font-medium text-gray-700 text-justify">Tienes el rol de Administrativo. No hay nada que configurar para este rol.</p>
          </div>

          <!-- Gestión de Usuarios -->
          <div v-if="user.user?.role === 'Principal' || user.user?.role === 'Administrador'">
            <p class="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <i class="fa-solid fa-users mr-2 text-purple-500"></i>
              Gestión de Usuarios
            </p>
            <RouterLink :to="{ name: 'add-user' }" @click="isMenuOpen = false"
               class="layout-nav-link block py-3 px-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-purple-50 hover:to-purple-100 rounded-xl transition-all duration-300 ease-in-out cursor-pointer border border-gray-200 hover:border-purple-300 group">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-user-plus text-purple-500 group-hover:text-purple-600 transition-colors duration-200"></i>
                <span class="font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">Agregar Usuario</span>
              </div>
            </RouterLink>
            <RouterLink :to="{ name: 'user-productivity' }" @click="isMenuOpen = false"
               class="layout-nav-link block py-3 px-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 rounded-xl mt-2 transition-all duration-300 ease-in-out cursor-pointer border border-gray-200 hover:border-blue-300 group">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-chart-line text-blue-500 group-hover:text-blue-600 transition-colors duration-200"></i>
                <span class="font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">Monitoreo de Usuarios</span>
              </div>
            </RouterLink>
            <RouterLink :to="{ name: 'manage-permissions' }" @click="isMenuOpen = false"
               class="layout-nav-link block py-3 px-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-indigo-100 rounded-xl mt-2 transition-all duration-300 ease-in-out cursor-pointer border border-gray-200 hover:border-indigo-300 group">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-shield-halved text-indigo-500 group-hover:text-indigo-600 transition-colors duration-200"></i>
                <span class="font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">Gestionar Permisos</span>
              </div>
            </RouterLink>
            <RouterLink
              v-if="
                catalogAdminEnabled &&
                proveedorSaludStore.isSIRES &&
                (user.user?.role === 'Principal' || user.user?.role === 'Administrador')
              "
              :to="{ name: 'admin-catalogos' }"
              @click="isMenuOpen = false"
               class="layout-nav-link block py-3 px-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-teal-50 hover:to-teal-100 rounded-xl mt-2 transition-all duration-300 ease-in-out cursor-pointer border border-gray-200 hover:border-teal-300 group">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-book text-teal-500 group-hover:text-teal-600 transition-colors duration-200"></i>
                <span class="font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">Catálogos NOM-024</span>
              </div>
            </RouterLink>
            <RouterLink :to="{ name: 'manage-assignments' }" @click="isMenuOpen = false"
               v-if="user.user?.role === 'Principal' || user.user?.role === 'Administrador' "
               class="layout-nav-link block py-3 px-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-purple-50 hover:to-purple-100 rounded-xl mt-2 transition-all duration-300 ease-in-out cursor-pointer border border-gray-200 hover:border-purple-300 group">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-users-gear text-purple-500 group-hover:text-purple-600 transition-colors duration-200"></i>
                <span class="font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">Asignar Centros</span>
              </div>
            </RouterLink>
            <RouterLink :to="{ name: 'remove-users' }" @click="isMenuOpen = false"
               class="layout-nav-link block py-3 px-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-red-50 hover:to-red-100 rounded-xl mt-2 transition-all duration-300 ease-in-out cursor-pointer border border-gray-200 hover:border-red-300 group">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-user-minus text-red-500 group-hover:text-red-600 transition-colors duration-200"></i>
                <span class="font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">Eliminar Usuarios</span>
              </div>
            </RouterLink>
          </div>

          <!-- Suscripción -->
          <div v-if="user.user?.role === 'Principal' || user.user?.role === 'Administrador'">
            <p class="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <i class="fa-solid fa-credit-card mr-2 text-emerald-500"></i>
              Suscripción
            </p>
            <RouterLink :to="{ name: 'suscripcion-activa' }" @click="isMenuOpen = false"
               class="layout-nav-link block py-3 px-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-emerald-50 hover:to-emerald-100 rounded-xl transition-all duration-300 ease-in-out cursor-pointer border border-gray-200 hover:border-emerald-300 group">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-crown text-emerald-500 group-hover:text-emerald-600 transition-colors duration-200"></i>
                <span class="font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">Mi Suscripción</span>
              </div>
            </RouterLink>
            <RouterLink :to="{ name: 'subscription' }" @click="isMenuOpen = false"
               class="layout-nav-link block py-3 px-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-emerald-50 hover:to-emerald-100 rounded-xl mt-2 transition-all duration-300 ease-in-out cursor-pointer border border-gray-200 hover:border-emerald-300 group">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-list text-emerald-500 group-hover:text-emerald-600 transition-colors duration-200"></i>
                <span class="font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">Ver Planes</span>
              </div>
            </RouterLink>
          </div>

          <!-- Dark Mode Toggle -->
          <div>
            <p class="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <i class="fa-solid fa-palette mr-2 text-indigo-500"></i>
              Apariencia
            </p>
            <button @click="toggleDarkMode" 
                    class="w-full block py-3 px-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-indigo-100 rounded-xl transition-all duration-300 ease-in-out cursor-pointer border border-gray-200 hover:border-indigo-300 group">
              <div class="flex items-center gap-3">
                <i :class="[darkModeIcon, 'text-indigo-500 group-hover:text-indigo-600 transition-colors duration-200']"></i>
                <span class="font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">{{ darkModeText }}</span>
              </div>
            </button>
          </div>

          </div>
        </div>
      </div>
    </Transition>

    <!-- Icono de guía de uso mejorado -->
    <Transition name="delayed-appear">
      <button 
        v-if="isVisible && ['inicio', 'add-user', 'remove-users', 'perfil-proveedor', 'medico-firmante', 'subscription', 'suscripcion-activa', 'subscription-success', 'panel-administrador'].includes(route.name as string)"
        @click="toggleGuideMenu($event)"
        class="fixed top-24 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300 z-30 flex items-center justify-center group"
        :aria-label="isGuideMenuOpen ? 'Cerrar guías de uso' : 'Abrir guías de uso'">
        <i class="fa-solid fa-book text-lg group-hover:rotate-12 transition-transform duration-300"></i>
      </button>
    </Transition>

    <!-- Menú desplegable de guías de uso mejorado -->
    <Transition name="fade">
      <div 
        v-if="isGuideMenuOpen"
        ref="guideMenuRef"
        class="fixed top-40 right-6 bg-white rounded-2xl shadow-2xl p-6 w-82 z-20 border border-gray-100 backdrop-blur-sm bg-white/95 transition-all duration-300 ease-in-out">
        <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center">
          <i class="fa-solid fa-graduation-cap mr-2 text-blue-500"></i>
          Guías de Uso
        </h3>
        <ul class="space-y-2">
          <li v-for="(guia, index) in [
            { url: 'https://scribehow.com/shared/Configuracion_de_Informes__qSuHpPxtSnKc8JTaObgY7Q?referrer=workspace', text: 'Configuración de Informes', icon: 'fa-solid fa-cog' },
            { url: 'https://scribehow.com/shared/Agregar_Clientes_y_Centros_de_Trabajo__32Haet8BQy6oFUDacWcbWg?referrer=documents', text: 'Agregar Clientes y Centros de Trabajo', icon: 'fa-solid fa-building' },
            { url: 'https://scribehow.com/shared/Registrar_Trabajadores__C2clnmBvTT2xGW7QE-YHQQ?referrer=documents', text: 'Registrar Trabajadores', icon: 'fa-solid fa-user-plus' },
            { url: 'https://scribehow.com/shared/Gestion_de_Trabajadores__bGNGxMbuRXiKD6G8JiDGIQ?referrer=documents', text: 'Gestión de Trabajadores', icon: 'fa-solid fa-users' },
            { url: 'https://scribehow.com/shared/Creacion_de_Informes_Medicos__BffBrtm4Qze068R96fLL9w?referrer=documents', text: 'Creación de Informes Médicos', icon: 'fa-solid fa-file-medical' },
            { url: 'https://scribehow.com/shared/Subir_Documentos_Externos__p2VINQjBSYq8RKntzNZHSQ?referrer=workspace', text: 'Subir Documentos Externos', icon: 'fa-solid fa-upload' },
            { url: 'https://scribehow.com/shared/Resumen_de_Aptitud_al_Puesto__RZbuEGIpTTOiY1wSuxbqKQ?referrer=workspace', text: 'Resumen de Aptitud al Puesto', icon: 'fa-solid fa-clipboard-check' }
          ]" :key="index">
            <a :href="guia.url" 
               target="_blank" 
               class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-blue-50 transition-all duration-200 group">
              <span class="text-sm font-medium text-gray-500 group-hover:text-blue-600 transition-colors duration-200">{{ index + 1 }}.</span>
              <i :class="[guia.icon, 'text-blue-500 group-hover:text-blue-600 transition-colors duration-200']"></i>
              <span class="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">{{ guia.text }}</span>
            </a>
          </li>
          <!-- <li v-for="(guia, index) in [
            { text: 'Estadísticas de Salud', icon: 'fa-solid fa-chart-line' },
            { text: 'Gestión de RTs', icon: 'fa-solid fa-exclamation-triangle' }
          ]" :key="index + 7">
            <div class="flex items-center gap-3 py-2 px-3 rounded-lg opacity-50">
              <span class="text-sm font-medium text-gray-400">{{ index + 8 }}.</span>
              <i :class="[guia.icon, 'text-gray-400']"></i>
              <span class="text-sm font-medium text-gray-400">{{ guia.text }}</span>
            </div>
          </li> -->
        </ul>
      </div>
    </Transition>

  </main>

  <!-- Herramienta de Debug - Media Query -->
  <!-- <div class="fixed top-4 right-4 z-50 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm font-mono">
    <div class="flex items-center gap-2">
      <span class="w-2 h-2 bg-red-500 rounded-full sm:hidden"></span>
      <span class="w-2 h-2 bg-orange-500 rounded-full hidden sm:block md:hidden"></span>
      <span class="w-2 h-2 bg-yellow-500 rounded-full hidden md:block lg:hidden"></span>
      <span class="w-2 h-2 bg-green-500 rounded-full hidden lg:block xl:hidden"></span>
      <span class="w-2 h-2 bg-blue-500 rounded-full hidden xl:block 2xl:hidden"></span>
      <span class="w-2 h-2 bg-purple-500 rounded-full hidden 2xl:block"></span>
      <span class="text-xs">
        <span class="sm:hidden">xs</span>
        <span class="hidden sm:block md:hidden">sm</span>
        <span class="hidden md:block lg:hidden">md</span>
        <span class="hidden lg:block xl:hidden">lg</span>
        <span class="hidden xl:block 2xl:hidden">xl</span>
        <span class="hidden 2xl:block">2xl</span>
      </span>
    </div>
  </div>
  -->

  <Teleport to="body">
    <ModalEliminacion
      :is-visible="eliminacionOpen"
      :nivel="eliminacionNivel"
      :tipo-registro="eliminacionTipoRegistro"
      :identificacion="eliminacionIdentificacion"
      :texto-confirmacion-esperado="eliminacionTextoConfirmacion"
      :detalle-contexto="eliminacionDetalleContexto"
      :mensaje-personalizado="eliminacionMensajePersonalizado"
      :is-confirming="eliminacionConfirming"
      @confirm="confirmarEliminacion"
      @cancel="cancelarEliminacion"
    />
  </Teleport>

</template>

<style scoped>
@keyframes bounceIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.2);
    opacity: 1;
  }
  80% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  20%, 60% {
    transform: translateX(-2px);
  }
  40%, 80% {
    transform: translateX(2px);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes attention-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

@keyframes attention-bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

.notificacion-animada {
  animation: bounceIn 0.5s ease-out;
}

.notificacion-pulso {
  animation: pulse 1s infinite;
}

.notificacion-vibracion {
  animation: shake 0.5s infinite;
}

.attention-pulse {
  animation: attention-pulse 2s ease-in-out infinite;
}

.attention-bounce {
  animation: attention-bounce 2s ease-in-out infinite;
}

.tooltip-icon-pulse {
  animation: attention-pulse 1.5s ease-in-out infinite;
}

.tooltip-pulse {
  animation: attention-pulse 1.5s ease-in-out infinite;
}

.tooltip-bounce {
  animation: attention-bounce 1.5s ease-in-out infinite;
}

/* Estilos para tooltips personalizados */
.group:hover .absolute {
  display: block;
}

.group .absolute {
  opacity: 0;
  transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
}

.group:hover .absolute {
  opacity: 1;
  transform: translate(-29px, -26px);
}

/* Flecha del Tooltip */
.group .absolute::before {
  content: '';
  position: absolute;
  top: 10px;
  right: -14px;
  width: 0;
  height: 0;
  border-top: 14px solid transparent;
  border-bottom: 14px solid transparent;
  border-left: 14px solid black;
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.5));
}

/* Transiciones mejoradas */
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

/* Inicio: misma entrada que slide-up, sin animación de salida al navegar */
.slide-up-in-only-enter-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-in-only-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.delayed-appear-enter-active {
  transition: all 1s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.delayed-appear-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.delayed-appear-enter-from,
.delayed-appear-leave-to {
  opacity: 0;
  transform: scale(0.5) rotate(-180deg);
}

.button-transition-enter-active,
.button-transition-leave-active {
  transition: all 0.3s ease;
}

.button-transition-enter-from,
.button-transition-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* Scrollbar personalizada */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(45deg, #cbd5e1, #94a3b8);
  border-radius: 10px;
  border: 2px solid #f1f1f1;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(45deg, #94a3b8, #64748b);
}

/* Efectos de hover mejorados */
.hover-lift {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

/* Animaciones de carga */
@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
}

/* Responsive improvements */
@media (max-width: 640px) {
  .fixed {
    position: fixed;
  }
  
  .top-6 {
    top: 1rem;
  }
  
  .right-6 {
    right: 1rem;
  }
  
  .bottom-6 {
    bottom: 1rem;
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus styles for better accessibility */
button:focus-visible,
a:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}


/* Transiciones del logo y botón de inicio (solo LayOut) */
.logo-transition {
  transition: transform 0.3s ease !important;
}

.logo-transition:hover {
  transform: scale(1.05) !important;
}

.button-transition {
  transition: all 0.3s ease !important;
}

.button-transition:hover {
  transform: scale(1.05) !important;
}

</style>