<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted, computed, inject } from 'vue';
import SidebarLink from './SidebarLink.vue';
import { useSidebarStore } from '@/stores/sidebar';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useDocumentosStore } from '@/stores/documentos';
import { useRoute, useRouter } from 'vue-router';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import { useEditionLabel } from '@/composables/useEditionLabel';
import { useUserStore } from '@/stores/user';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useIncapacidadesStore } from '@/stores/incapacidades';
import { useUserPermissions } from '@/composables/useUserPermissions';
import { INCAPACIDADES_SOLO_ADMINISTRADOR } from '@/helpers/incapacidades';

const route = useRoute();
const router = useRouter();
const toast: any = inject('toast');
const sidebar = useSidebarStore();
const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const documentos = useDocumentosStore();
const user = useUserStore();
const proveedorSalud = useProveedorSaludStore();
/** «Vigencias» solo aparece con el módulo activado en «Módulos y funciones». */
const vigenciasHabilitadas = computed(() => proveedorSalud.proveedorSalud?.vigenciasHabilitadas === true);
/** Incapacidades de la empresa: las mismas condiciones que el botón de la vista de centros de trabajo. */
const incapacidadesStore = useIncapacidadesStore();
const { canAccessRiesgosTrabajo } = useUserPermissions();
const showIncapacidades = computed(
  () =>
    !!user.user &&
    incapacidadesStore.gestionaEnEmpresa(empresas.currentEmpresaId) &&
    canAccessRiesgosTrabajo.value &&
    (!INCAPACIDADES_SOLO_ADMINISTRADOR || user.user?.role === 'Administrador'),
);

const isMounted = ref(false);
const hasVisitedDashboard = ref(false);

async function syncRouteState(params: typeof route.params) {
  const { redirectedTrabajadorId } = await sidebar.initializeState(params);

  if (redirectedTrabajadorId && route.name === 'expediente-medico') {
    toast?.open({
      message: 'Este trabajador fue fusionado. Se abrió el expediente unificado.',
      type: 'info',
    });
    await router.replace({
      name: 'expediente-medico',
      params: {
        idEmpresa: params.idEmpresa,
        idCentroTrabajo: params.idCentroTrabajo,
        idTrabajador: redirectedTrabajadorId,
      },
    });
  }
}

onMounted(async () => {
  try {
    await syncRouteState(route.params);
    isMounted.value = true;
  } catch (error) {
    console.error('Error inicializando el estado:', error);
  }
});

watch(() => route.params, async (newParams) => {
  try {
    await syncRouteState(newParams);
  } catch (error) {
    console.error('Error al actualizar estado con route.params:', error);
  }
});

// Rastrear si el usuario ha visitado el dashboard de la empresa actual
watch(() => route.name, (newRouteName) => {
  if (newRouteName === 'dashboard-empresa' && empresas.currentEmpresaId) {
    hasVisitedDashboard.value = true;
  }
});

// Resetear el estado cuando cambia la empresa
watch(() => empresas.currentEmpresaId, (newEmpresaId, oldEmpresaId) => {
  if (newEmpresaId !== oldEmpresaId) {
    hasVisitedDashboard.value = false;
  }
});

watch(() => route.fullPath, () => {
  if (sidebar.isMobileOverlayOpen) {
    sidebar.collapseSidebar();
  }
});

watch(() => sidebar.isMobileOverlayOpen, (open) => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = open ? 'hidden' : '';
}, { immediate: true });

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
});

const documentTypeLabels = {
  constanciaAptitud: "Constancia de Aptitud",
  constanciaExamenAdmision: "Constancia de Examen Médico de Admisión",
  aptitud: "Aptitud al Puesto",
  historiaClinica: "Historia Clínica",
  exploracionFisica: "Exploración Física",
  examenVista: "Examen de la Vista",
  audiometria: "Audiometría",
  antidoping: "Antidoping",
  certificado: "Certificado",
  certificadoExpedito: "Certificado Expedito",
  notaMedica: "Nota Médica",
  notaEnfermeria: "Nota de Enfermería",
  notaAclaratoria: "Nota Aclaratoria",
  receta: "Receta",
  controlPrenatal: "Control Prenatal",
  historiaOtologica: "Historia Otologica",
  previoEspirometria: "Previo Espirometria",
  entrevistaPsicologica: "Entrevista Psicologica",
  trastornosEstadoAnimo: "Trastornos Estado Animo",
  cuestionarioProdromalBreve: "Cuestionario Prodromal Breve",
  trastornoLimitePersonalidad: "Trastorno Limite Personalidad",
  cuestionarioNordico: "Cuestionario Nórdico",
  evaluacionSuenoVigilia: "Evaluación de Sueño y Vigilia",
  eventoSeguimientoCardiometabolico: "Evento Seguimiento Cardiometabolico",
  informeLongitudinalCardiometabolico: "Informe Longitudinal Cardiometabolico",
  informeLongitudinalAudiometrico: "Informe Longitudinal Audiometrico",
};

// Computed properties para mejorar la legibilidad
const showEmpresaSection = computed(() => !!user.user && empresas.currentEmpresaId);
const showCentroTrabajoSection = computed(() => !!user.user && centrosTrabajo.currentCentroTrabajoId && empresas.currentEmpresaId);
const showTrabajadorSection = computed(() => !!user.user && trabajadores.currentTrabajadorId && centrosTrabajo.currentCentroTrabajoId && empresas.currentEmpresaId);
const showDocumentoSection = computed(() => !!user.user && documentos.currentTypeOfDocument && trabajadores.currentTrabajadorId && centrosTrabajo.currentCentroTrabajoId && empresas.currentEmpresaId);
const showAnalyticsSection = computed(() => !!user.user && empresas.currentEmpresaId && hasVisitedDashboard.value);

// Punto 50: un renglón por elemento; lo que antes iba en letras chicas, en el `title` o el tooltip
const nombreEmpresa = computed(() => empresas.currentEmpresa?.nombreComercial || 'Empresa');
const tituloEmpresa = computed(() => {
  const razon = empresas.currentEmpresa?.razonSocial;
  return razon && razon !== nombreEmpresa.value ? `${nombreEmpresa.value} · ${razon}` : nombreEmpresa.value;
});
const nombreCentro = computed(() => centrosTrabajo.currentCentroTrabajo?.nombreCentro || 'Centro de trabajo');
const tituloCentro = computed(() => {
  const direccion = centrosTrabajo.currentCentroTrabajo?.direccionCentro;
  return direccion ? `${nombreCentro.value} · ${direccion}` : nombreCentro.value;
});
const nombreTrabajador = computed(() => formatNombreCompleto(trabajadores.currentTrabajador) || 'Trabajador');
const nombreDocumento = computed(
  () => documentTypeLabels[documentos.currentTypeOfDocument as keyof typeof documentTypeLabels] || 'Documento',
);
/** Lo único que se conserva del texto chico: si el documento se está creando o editando. */
const estadoDocumento = computed(() => (documentos.currentDocument ? 'Editando' : 'Creando'));

const { editionVersion, editionVersionPrefixed } = useEditionLabel();

// Punto 50: solo la versión (sin «SIRES» ni «Ramazzini», como pidió el usuario); colapsado en
// teléfono, sin la «v» para que quepa. Sin versión (sin régimen elegido), no se muestra nada.
const footerEditionText = computed(() => {
  if (sidebar.collapsed && sidebar.isSmallScreen) {
    return editionVersion.value;
  }
  return editionVersionPrefixed.value;
});

</script>

<template>
  <Teleport to="body">
    <div
      v-if="sidebar.isMobileOverlayOpen"
      class="sidebar-backdrop"
      data-testid="sidebar-backdrop"
      aria-hidden="true"
      @click="sidebar.collapseSidebar()"
    />
  </Teleport>
  <div
    class="sidebar"
    :class="{
      'collapsed': sidebar.collapsed,
      'is-overlay': sidebar.isMobileOverlayOpen,
    }"
    :style="{ width: sidebar.sidebarWidth }"
    @click="sidebar.toggleSidebar()"
  >
    
    <!-- Header del Sidebar (punto 50: compacto; colapsado, solo el ícono) -->
    <div class="sidebar-header">
      <div class="logo-icon" aria-hidden="true">
        <i class="fas fa-compass"></i>
      </div>
      <h1 v-if="!sidebar.collapsed" class="logo-titulo">Navegación</h1>
    </div>

    <!-- Contenido del Sidebar -->
    <div class="sidebar-content">

      <!-- General -->
      <div class="section">
        <SidebarLink v-if="route.path !== '/login'"
          to="/"
          icon="fa-solid fa-home"
          tooltip="Inicio"
          @click.stop>
          Inicio
        </SidebarLink>

        <SidebarLink v-if="route.path !== '/login'"
          to="/empresas"
          icon="fas fa-industry"
          tooltip="Empresas"
          @click.stop>
          Empresas
        </SidebarLink>

        <SidebarLink v-if="route.path !== '/login' && vigenciasHabilitadas"
          to="/vigencias"
          icon="fa-solid fa-calendar-check"
          tooltip="Vigencias: empresas en seguimiento"
          titulo="Vigencias: empresas en seguimiento"
          data-testid="vigencias-sidebar-link"
          @click.stop>
          Vigencias
        </SidebarLink>
      </div>

      <!-- Donde estás: empresa → centro → trabajador → documento, unidos por una línea -->
      <Transition name="slide-fade" :duration="300">
        <div v-if="showEmpresaSection" class="section">
          <p v-if="!sidebar.collapsed" class="section-title">Donde estás</p>
          <div class="ruta" data-testid="sidebar-ruta">
            <SidebarLink
              :to="{ name: 'centros-trabajo', params: { idEmpresa: empresas.currentEmpresaId } }"
              icon="fas fa-warehouse"
              en-ruta
              :tooltip="`Empresa: ${nombreEmpresa}`"
              :titulo="tituloEmpresa"
              @click.stop>
              {{ nombreEmpresa }}
            </SidebarLink>

            <SidebarLink v-if="showAnalyticsSection"
              :to="{ name: 'dashboard-empresa', params: { idEmpresa: empresas.currentEmpresaId } }"
              icon="fas fa-chart-line"
              en-ruta
              :nivel="1"
              :tooltip="`Estadísticas de ${nombreEmpresa}`"
              @click.stop>
              Estadísticas
            </SidebarLink>

            <SidebarLink v-if="showIncapacidades"
              :to="{ name: 'incapacidades-empresa', params: { idEmpresa: empresas.currentEmpresaId } }"
              icon="fas fa-bed"
              en-ruta
              :nivel="1"
              :tooltip="`Incapacidades de ${nombreEmpresa}`"
              data-testid="sidebar-incapacidades"
              @click.stop>
              Incapacidades
            </SidebarLink>

            <SidebarLink v-if="showCentroTrabajoSection"
              :to="{
                name: 'trabajadores',
                params: {
                  idEmpresa: empresas.currentEmpresaId || '',
                  idCentroTrabajo: centrosTrabajo.currentCentroTrabajoId || ''
                }
              }"
              icon="fas fa-users"
              en-ruta
              :tooltip="`Centro de trabajo: ${nombreCentro}`"
              :titulo="tituloCentro"
              @click.stop>
              {{ nombreCentro }}
            </SidebarLink>

            <SidebarLink v-if="showTrabajadorSection"
              :to="{
                name: 'expediente-medico',
                params: {
                  idEmpresa: empresas.currentEmpresaId || '',
                  idCentroTrabajo: centrosTrabajo.currentCentroTrabajoId || '',
                  idTrabajador: trabajadores.currentTrabajadorId || ''
                }
              }"
              icon="fa-regular fa-folder-open"
              en-ruta
              :tooltip="`Expediente de ${nombreTrabajador}`"
              :titulo="`Expediente de ${nombreTrabajador}`"
              @click.stop>
              {{ nombreTrabajador }}
            </SidebarLink>

            <SidebarLink v-if="showDocumentoSection"
              :to="{
                name: 'crear-documento',
                params: {
                  idEmpresa: empresas.currentEmpresaId || '',
                  idCentroTrabajo: centrosTrabajo.currentCentroTrabajoId || '',
                  idTrabajador: trabajadores.currentTrabajadorId || '',
                  tipoDocumento: documentos.currentTypeOfDocument,
                  idDocumento: documentos.currentDocument?._id
                }
              }"
              icon="fas fa-file-pdf"
              en-ruta
              :tooltip="`${nombreDocumento} · ${estadoDocumento}`"
              :titulo="`${nombreDocumento} · ${estadoDocumento}`"
              @click.stop>
              {{ nombreDocumento }}
              <template #insignia>
                <span class="insignia-documento" data-testid="sidebar-estado-documento">{{ estadoDocumento }}</span>
              </template>
            </SidebarLink>
          </div>
        </div>
      </Transition>

    </div>

    <!-- Footer del Sidebar: colapsar, salir y versión en un renglón (colapsado, en columna) -->
    <div class="sidebar-footer">
      <div class="footer-botones">
        <button
          class="collapse-button"
          :class="{ 'collapsed': sidebar.collapsed }"
          @click.stop="sidebar.toggleSidebar()"
          :title="sidebar.collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'"
          :aria-label="sidebar.collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'">
          <i class="fas fa-angle-double-left"></i>
        </button>
        <button
          type="button"
          data-testid="sidebar-logout"
          class="sidebar-logout"
          :title="'Cerrar sesión'"
          :aria-label="'Cerrar sesión'"
          @click.stop="user.logout()"
        >
          <i class="fas fa-sign-out-alt"></i>
          <span v-if="!sidebar.collapsed">Salir</span>
        </button>
      </div>
      <p
        v-if="footerEditionText"
        class="sidebar-version"
        data-testid="edition-label"
        :title="`Versión ${editionVersion}`"
      >
        {{ footerEditionText }}
      </p>
    </div>
  </div>
</template>

<style>
:root {
  --sidebar-bg-color: #2f855a;
  --sidebar-item-hover: #38a169;
  --sidebar-item-active: #276749;
  --sidebar-accent: #10b981;
  --sidebar-text: #ffffff;
  --sidebar-text-muted: #d1fae5;
  --sidebar-border: #059669;
  --sidebar-shadow: rgba(0, 0, 0, 0.3);
}

/* Animaciones mejoradas */
.slide-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-in {
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

<style scoped>
.sidebar {
  color: var(--sidebar-text);
  background: linear-gradient(180deg, var(--sidebar-bg-color) 0%, #276749 100%);
  position: fixed;
  z-index: var(--z-sidebar);
  top: 0;
  left: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 4px 0 20px var(--sidebar-shadow);
  border-right: 1px solid var(--sidebar-border);
  overflow: hidden;
  cursor: pointer;
}

.sidebar.collapsed {
  width: 5rem !important;
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-sidebar) + 1);
  background: rgba(15, 23, 42, 0.45);
  cursor: pointer;
}

/* Header compacto */
.sidebar-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.625rem;
  padding: 0.75rem 0.875rem;
  border-bottom: 1px solid var(--sidebar-border);
  background: rgba(255, 255, 255, 0.05);
}

.sidebar.collapsed .sidebar-header {
  justify-content: center;
  padding: 0.75rem 0;
}

.logo-icon {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  background: #ffffff;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: var(--sidebar-bg-color);
}

.logo-titulo {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
}

/* Contenido: barra de desplazamiento diminuta (Firefox: la delgada; Chrome y Edge: 4 px),
   translúcida y sin carril */
.sidebar-content {
  flex: 1;
  min-height: 0;
  padding: 0.625rem 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.35) transparent;
}

.sidebar-content::-webkit-scrollbar {
  width: 4px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.35);
  border-radius: 2px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.55);
}

/* Secciones */
.section + .section {
  margin-top: 0.875rem;
}

.section-title {
  margin: 0 0 0.25rem;
  padding: 0 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--sidebar-text-muted);
  letter-spacing: 0.02em;
}

/* La ruta: una línea vertical detrás de los íconos une empresa → centro → trabajador → documento */
.ruta {
  position: relative;
}

.ruta::before {
  content: '';
  position: absolute;
  left: calc(0.5rem + 0.875rem - 1px);
  top: 1.25rem;
  bottom: 1.25rem;
  width: 2px;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.3);
}

.sidebar.collapsed .ruta::before {
  left: calc(50% - 1px);
}

.insignia-documento {
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 0.375rem;
  background: #d1fae5;
  color: #065f46;
}

/* Footer en un renglón */
.sidebar-footer {
  flex-shrink: 0;
  padding: 0.5rem;
  border-top: 1px solid var(--sidebar-border);
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.footer-botones {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 0.375rem;
}

.collapse-button,
.sidebar-logout {
  height: 2rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.collapse-button {
  width: 2rem;
  flex-shrink: 0;
}

.sidebar-logout {
  flex: 1;
  min-width: 0;
}

.collapse-button:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.collapse-button i {
  transition: transform 0.3s ease;
}

.collapse-button.collapsed i {
  transform: rotate(180deg);
}

.sidebar-logout:hover {
  background: rgba(220, 38, 38, 0.35);
  color: #fff;
}

.collapse-button:focus-visible,
.sidebar-logout:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

.sidebar-version {
  margin: 0;
  flex-shrink: 0;
  max-width: 6.5rem;
  font-size: 0.625rem;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Colapsado: el pie en columna */
.sidebar.collapsed .sidebar-footer {
  flex-direction: column;
  padding: 0.5rem 0.375rem;
}

.sidebar.collapsed .footer-botones {
  flex-direction: column;
  align-items: center;
}

.sidebar.collapsed .sidebar-logout {
  flex: none;
  width: 2rem;
}

.sidebar.collapsed .sidebar-version {
  max-width: 100%;
  text-align: center;
}

/* Responsive: rail más estrecho + overlay sin empujar el contenido */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    z-index: var(--z-sidebar);
    width: min(220px, 72vw) !important;
    max-width: min(220px, 72vw);
  }

  .sidebar.collapsed {
    width: 3.5rem !important;
    max-width: 3.5rem;
  }

  .sidebar.is-overlay {
    z-index: calc(var(--z-sidebar) + 2);
    box-shadow: 8px 0 28px var(--sidebar-shadow);
  }

  .sidebar-content {
    padding: 0.5rem 0.375rem;
  }

  .sidebar.collapsed .sidebar-content {
    padding: 0.5rem 0.25rem;
  }

  .sidebar.collapsed .sidebar-footer {
    padding: 0.5rem 0.25rem;
  }

  .sidebar.collapsed .collapse-button,
  .sidebar.collapsed .sidebar-logout {
    width: 1.875rem;
    height: 1.875rem;
    font-size: 0.75rem;
  }
}
</style>
