<script lang="ts" setup>
import { ref, watch, onMounted, computed } from 'vue';
import SidebarLink from './SidebarLink.vue';
import { useSidebarStore } from '@/stores/sidebar';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useDocumentosStore } from '@/stores/documentos';
import { useRoute } from 'vue-router';
import { useRiesgoTrabajoStore } from '@/stores/riesgosTrabajo';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';

const route = useRoute();
const sidebar = useSidebarStore();
const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const documentos = useDocumentosStore();
const riesgosTrabajo = useRiesgoTrabajoStore();

const isMounted = ref(false);
const hasVisitedDashboard = ref(false);
const hasVisitedRiesgosTrabajo = ref(false);

onMounted(async () => {
  try {
    const { idEmpresa, idCentroTrabajo, idTrabajador, tipoDocumento } = route.params;
    await sidebar.initializeState({ idEmpresa, idCentroTrabajo, idTrabajador, tipoDocumento });
    isMounted.value = true;
  } catch (error) {
    console.error('Error inicializando el estado:', error);
  }
});

watch(() => route.params, async (newParams) => {
  try {
    await sidebar.initializeState(newParams);
  } catch (error) {
    console.error('Error al actualizar estado con route.params:', error);
  }
});

// Rastrear si el usuario ha visitado el dashboard de la empresa actual
watch(() => route.name, (newRouteName) => {
  if (newRouteName === 'dashboard-empresa' && empresas.currentEmpresaId) {
    hasVisitedDashboard.value = true;
  }
  if (newRouteName === 'riesgos-trabajo' && empresas.currentEmpresaId) {
    hasVisitedRiesgosTrabajo.value = true;
  }
});

// Resetear el estado cuando cambia la empresa
watch(() => empresas.currentEmpresaId, (newEmpresaId, oldEmpresaId) => {
  if (newEmpresaId !== oldEmpresaId) {
    hasVisitedDashboard.value = false;
    hasVisitedRiesgosTrabajo.value = false;
  }
});

watch(() => empresas.currentEmpresa, (newEmpresa, oldEmpresa) => {
  if (newEmpresa?._id !== oldEmpresa?._id) {
    // Si currentEmpresa cambia, reinicia centrosTrabajo y trabajadores
    centrosTrabajo.resetCurrentCentroTrabajo();
    trabajadores.resetCurrentTrabajador();
    documentos.resetCurrentTypeOfDocument();
  }
});

watch(() => centrosTrabajo.currentCentroTrabajo, (newCentro, oldCentro) => {
  if (newCentro?._id !== oldCentro?._id) {
    // Si currentCentroTrabajo cambia, reinicia trabajadores
    trabajadores.resetCurrentTrabajador();
    documentos.resetCurrentTypeOfDocument();
  }
});

watch(() => trabajadores.currentTrabajador, (newTrabajador, oldTrabajador) => {
  if (newTrabajador?._id !== oldTrabajador?._id) {
    // Si currentCentroTrabajo cambia, reinicia trabajadores
    documentos.resetCurrentTypeOfDocument();
  }
});

const documentTypeLabels = {
  constanciaAptitud: "Constancia de Aptitud",
  aptitud: "Aptitud al Puesto",
  historiaClinica: "Historia Clínica",
  exploracionFisica: "Exploración Física",
  examenVista: "Examen de la Vista",
  audiometria: "Audiometría",
  antidoping: "Antidoping",
  certificado: "Certificado",
  certificadoExpedito: "Certificado Expedito",
  notaMedica: "Nota Médica",
  receta: "Receta",
  controlPrenatal: "Control Prenatal",
  historiaOtologica: "Historia Otologica",
  previoEspirometria: "Previo Espirometria",
  entrevistaPsicologica: "Entrevista Psicologica",
  trastornosEstadoAnimo: "Trastornos Estado Animo",
  cuestionarioProdromalBreve: "Cuestionario Prodromal Breve",
  trastornoLimitePersonalidad: "Trastorno Limite Personalidad",
  eventoSeguimientoCardiometabolico: "Evento Seguimiento Cardiometabolico",
};

// Computed properties para mejorar la legibilidad
const showEmpresaSection = computed(() => empresas.currentEmpresaId);
const showCentroTrabajoSection = computed(() => centrosTrabajo.currentCentroTrabajoId && empresas.currentEmpresaId);
const showTrabajadorSection = computed(() => trabajadores.currentTrabajadorId && centrosTrabajo.currentCentroTrabajoId && empresas.currentEmpresaId);
const showDocumentoSection = computed(() => documentos.currentTypeOfDocument && trabajadores.currentTrabajadorId && centrosTrabajo.currentCentroTrabajoId && empresas.currentEmpresaId);
const showAnalyticsSection = computed(() => empresas.currentEmpresaId && hasVisitedDashboard.value);
const showRiesgosSection = computed(() => empresas.currentEmpresaId && hasVisitedRiesgosTrabajo.value);

</script>

<template>
  <div class="sidebar" :class="{ 'collapsed': sidebar.collapsed }" :style="{ width: sidebar.sidebarWidth }" @click="sidebar.toggleSidebar()">
    
    <!-- Header del Sidebar -->
    <div class="sidebar-header">
      <div class="logo-container">
        <div v-if="sidebar.collapsed" class="logo-collapsed">
          <div class="logo-letter">N</div>
          <div class="logo-letter">A</div>
          <div class="logo-letter">V</div>
        </div>
        <div v-else class="logo-expanded">
          <div class="logo-icon">
            <i class="fas fa-compass"></i>
          </div>
          <div class="logo-text">
            <h1>Navegación</h1>
            <p>Sistema Ramazzini</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Contenido del Sidebar -->
    <div class="sidebar-content">
      
      <!-- Sección Principal -->
      <div class="section">
        <div class="section-header" v-if="!sidebar.collapsed">
          <span class="section-title">Principal</span>
        </div>
        
        <Transition appear name="slide-fade" :duration="300">
          <SidebarLink v-if="route.path !== '/login'" 
            to="/" 
            icon="fa-solid fa-home" 
            tooltip="Inicio"
            :class="{ 'fade-in': isMounted }"
            @click.stop>
            <p>Inicio</p>
            <p class="font-light text-xs">Volver al inicio</p>
          </SidebarLink>
        </Transition>

        <Transition appear name="slide-fade" :duration="300">
          <SidebarLink v-if="route.path !== '/login'" 
            to="/empresas" 
            icon="fas fa-industry" 
            tooltip="Clientes"
            :class="{ 'fade-in': isMounted }"
            @click.stop>
            <p>Clientes</p>
            <p class="font-light text-xs">Explorar Clientes</p>
          </SidebarLink>
        </Transition>
      </div>

      <!-- Sección Empresa -->
      <Transition name="slide-fade" :duration="400">
        <div v-if="showEmpresaSection" class="section">
          <div class="section-header" v-if="!sidebar.collapsed">
            <span class="section-title">Empresa</span>
            <div class="section-indicator"></div>
          </div>
          
          <SidebarLink 
            :to="{ name: 'centros-trabajo', params: { idEmpresa: empresas.currentEmpresaId } }" 
            icon="fas fa-warehouse"
            :tooltip="`Centros de Trabajo`"
            class="leading-5" 
            @click.stop>
            <p class="overflow-hidden text-ellipsis max-w-[155px]">
              {{ empresas.currentEmpresa?.nombreComercial || 'Nombre no disponible' }}
            </p>
            <p class="font-light text-xs overflow-hidden text-ellipsis max-w-[155px]">
              {{ empresas.currentEmpresa?.razonSocial || 'Nombre no disponible' }}
            </p>
          </SidebarLink>
        </div>
      </Transition>
      
      <!-- Sección Centro de Trabajo -->
      <Transition name="slide-fade" :duration="500">
        <div v-if="showCentroTrabajoSection" class="section">
          <div class="section-header" v-if="!sidebar.collapsed">
            <span class="section-title">Centro de Trabajo</span>
            <div class="section-indicator"></div>
          </div>
          
          <SidebarLink 
            :to="{
              name: 'trabajadores',
              params: {
                idEmpresa: empresas.currentEmpresaId || '',
                idCentroTrabajo: centrosTrabajo.currentCentroTrabajoId || ''
              }
            }" 
            icon="fas fa-users" 
            :tooltip="`Trabajadores`"
            class="leading-5" 
            @click.stop>
            <p class="overflow-hidden text-ellipsis max-w-[155px]">
              {{ centrosTrabajo.currentCentroTrabajo?.nombreCentro }}
            </p>
            <p class="font-light text-xs">
              {{ centrosTrabajo.currentCentroTrabajo?.direccionCentro }}
            </p>
          </SidebarLink>
        </div>
      </Transition>
      
      <!-- Sección Trabajador -->
      <Transition name="slide-fade" :duration="600">
        <div v-if="showTrabajadorSection" class="section">
          <div class="section-header" v-if="!sidebar.collapsed">
            <span class="section-title">Trabajador</span>
            <div class="section-indicator"></div>
          </div>
          
          <SidebarLink 
            :to="{
              name: 'expediente-medico',
              params: {
                idEmpresa: empresas.currentEmpresaId || '',
                idCentroTrabajo: centrosTrabajo.currentCentroTrabajoId || '',
                idTrabajador: trabajadores.currentTrabajadorId || ''
              }
            }" 
            icon="fa-regular fa-folder-open" 
            :tooltip="`Expediente Médico`"
            class="leading-5" 
            @click.stop>
            <p>{{ formatNombreCompleto(trabajadores.currentTrabajador) }}</p>
            <p class="font-light text-xs">Expediente Médico</p>
          </SidebarLink>
        </div>
      </Transition>
      
      <!-- Sección Documento -->
      <Transition name="slide-fade" :duration="700">
        <div v-if="showDocumentoSection" class="section">
          <div class="section-header" v-if="!sidebar.collapsed">
            <span class="section-title">Documento</span>
            <div class="section-indicator"></div>
          </div>
          
          <SidebarLink 
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
            :tooltip="`${documentTypeLabels[documentos.currentTypeOfDocument as keyof typeof documentTypeLabels] || 'Documento'} - ${documentos.currentDocument ? 'Editando' : 'Nuevo'}`"
            class="leading-5" 
            @click.stop>
            <p>{{ documentTypeLabels[documentos.currentTypeOfDocument as keyof typeof documentTypeLabels] || 'Documento desconocido' }}</p>
            <p v-if="documentos.currentDocument" class="font-light text-xs">Editando</p>
            <p v-else class="font-light text-xs">Creando nuevo</p>
          </SidebarLink>
        </div>
      </Transition>
      
      <!-- Sección Analytics -->
      <Transition name="slide-fade" :duration="800">
        <div v-if="showAnalyticsSection" class="section">
          <div class="section-header" v-if="!sidebar.collapsed">
            <span class="section-title">Analíticas</span>
            <div class="section-indicator"></div>
          </div>
          
          <SidebarLink 
            :to="{ name: 'dashboard-empresa', params: { idEmpresa: empresas.currentEmpresaId } }" 
            icon="fas fa-chart-line"
            :tooltip="`Estadísticas`"
            class="leading-5" 
            @click.stop>
            <p>Estadísticas</p>
            <p class="font-light text-xs overflow-hidden text-ellipsis max-w-[155px]">
              {{ empresas.currentEmpresa?.nombreComercial || 'Nombre no disponible' }}
            </p>
          </SidebarLink>
        </div>
      </Transition>

      <!-- Sección Riesgos -->
      <Transition name="slide-fade" :duration="900">
        <div v-if="showRiesgosSection" class="section">
          <div class="section-header" v-if="!sidebar.collapsed">
            <span class="section-title">Riesgos</span>
            <div class="section-indicator"></div>
          </div>
          
          <SidebarLink 
            :to="{ name: 'riesgos-trabajo', params: { idEmpresa: empresas.currentEmpresaId } }" 
            icon="fas fa-hard-hat"
            :tooltip="`Riesgos de Trabajo`"
            class="leading-5" 
            @click.stop>
            <p class="text-sm">Riesgos de Trabajo</p>
            <p class="font-light text-xs overflow-hidden text-ellipsis max-w-[155px]">
              {{ empresas.currentEmpresa?.nombreComercial || 'Nombre no disponible' }}
            </p>
          </SidebarLink>
        </div>
      </Transition>

      <!-- Sección Estadísticas RT -->
      <Transition name="slide-fade" :duration="900">
        <div v-if="showRiesgosSection" class="section">
          <div class="section-header" v-if="!sidebar.collapsed">
            <span class="section-title">Estadísticas RT</span>
            <div class="section-indicator"></div>
          </div>
          
          <SidebarLink 
            :to="{ name: 'dashboard-rt', params: { idEmpresa: empresas.currentEmpresaId } }" 
            icon="fas fa-chart-line"
            :tooltip="`Estadísticas RT`"
            class="leading-5" 
            @click.stop>
            <p class="text-sm">Estadísticas RT</p>
            <p class="font-light text-xs overflow-hidden text-ellipsis max-w-[155px]">
              {{ empresas.currentEmpresa?.nombreComercial || 'Nombre no disponible' }}
            </p>
          </SidebarLink>
        </div>
      </Transition>
    </div>

    <!-- Footer del Sidebar -->
    <div class="sidebar-footer">
      <button 
        class="collapse-button" 
        :class="{ 'collapsed': sidebar.collapsed }"
        @click.stop="sidebar.toggleSidebar()"
        :title="sidebar.collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'"
        :aria-label="sidebar.collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'">
        <i class="fas fa-angle-double-left"></i>
      </button>
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
  z-index: 5;
  top: 0;
  left: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 4px 0 20px var(--sidebar-shadow);
  border-right: 1px solid var(--sidebar-border);
  overflow: hidden;
  cursor: pointer;
}

.sidebar.collapsed {
  width: 5rem !important;
}

/* Header */
.sidebar-header {
  padding: 1.5rem 1rem;
  border-bottom: 1px solid var(--sidebar-border);
  background: rgba(255, 255, 255, 0.05);
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-collapsed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.logo-letter {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}

.logo-expanded {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  width: 2.5rem;
  height: 2.5rem;
  background: linear-gradient(135deg, #ffffff, #f0fdf4);
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--sidebar-bg-color);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
}

.logo-text h1 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: #ffffff;
}

.logo-text p {
  font-size: 0.75rem;
  margin: 0;
  color: #f0fdf4;
  font-weight: 500;
}

/* Content */
.sidebar-content {
  flex: 1;
  padding: 1rem 0.75rem;
  overflow-y: auto;
  overflow-x: visible;
}

.sidebar-content::-webkit-scrollbar {
  width: 4px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: #ffffff;
  border-radius: 2px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: #f0fdf4;
}

/* Sections */
.section {
  margin-bottom: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding: 0 0.5rem;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-indicator {
  flex: 1;
  height: 2px;
  background: linear-gradient(90deg, #ffffff, rgba(255, 255, 255, 0.3));
  border-radius: 1px;
}

/* Footer */
.sidebar-footer {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.02);
}

.collapse-button {
  width: 100%;
  height: 2.5rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

.collapse-button:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.collapse-button i {
  transition: transform 0.3s ease;
}

.collapse-button.collapsed i {
  transform: rotate(180deg);
}

.collapse-button.collapsed:hover i {
  transform: rotate(180deg);
}

/* Responsive - Mantener funcionalidad original en pantallas pequeñas */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    z-index: 5;
    width: 100% !important;
    max-width: 300px;
  }
  
  .sidebar.collapsed {
    width: 5rem !important;
    max-width: 5rem;
  }
  
  .logo-expanded {
    gap: 0.5rem;
  }
  
  .logo-text h1 {
    font-size: 1rem;
  }
  
  .logo-text p {
    font-size: 0.7rem;
  }
}

/* Dark mode optimizations */
@media (prefers-color-scheme: dark) {
  .sidebar {
    background: linear-gradient(180deg, var(--sidebar-bg-color) 0%, #276749 100%);
  }
}
</style>