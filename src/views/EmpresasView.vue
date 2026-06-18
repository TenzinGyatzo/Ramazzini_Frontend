<script setup lang="ts">
import { onUnmounted, ref, watch, inject, computed, watchEffect } from 'vue';
import EmpresaItem from '@/components/EmpresaItem.vue';
import { useEmpresasStore } from '@/stores/empresas';
import GreenButton from '@/components/GreenButton.vue';
import ModalEmpresas from '@/components/ModalEmpresas.vue';
import ModalSuscripcion from '@/components/suscripciones/ModalSuscripcion.vue';
import type { EliminacionRequest } from '@/composables/useEliminacion';
import type { Empresa } from '@/interfaces/empresa.interface';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useRouter } from 'vue-router';
import { useUserPermissions } from '@/composables/useUserPermissions';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';
import CentrosTrabajoAPI from '@/api/CentrosTrabajoAPI';

const toast: any = inject('toast');
const requestEliminacion = inject<(request: EliminacionRequest) => void>('requestEliminacion');

const empresas = useEmpresasStore();
const proveedorSalud = useProveedorSaludStore();
const router = useRouter();
const { canManageEmpresas } = useUserPermissions();
const { executeIfCanManageEmpresas } = usePermissionRestrictions();

const showModal = ref(false);
const showSubscriptionModal = ref(false);

const busqueda = ref('');

const empresasFiltradas = computed(() => {
  const termino = busqueda.value.toLowerCase().trim();
  if (!termino) return empresas.empresas;

  return empresas.empresas.filter(empresa =>
    empresa.nombreComercial?.toLowerCase().includes(termino) ||
    empresa.razonSocial?.toLowerCase().includes(termino) ||
    empresa.RFC?.toLowerCase().includes(termino)
  );
});


const openModal = async (empresa: Empresa | null = null) => {
  // Si es una nueva empresa (empresa === null), validar permisos
  if (!empresa) {
    executeIfCanManageEmpresas(() => {
      // Solo ejecutar si tiene permisos
      openModalInternal(empresa);
    }, 'crear nuevas empresas');
    return;
  }
  
  // Si es editar empresa existente, también validar permisos
  executeIfCanManageEmpresas(() => {
    openModalInternal(empresa);
  }, 'editar empresas');
};

const openModalInternal = async (empresa: Empresa | null = null) => {
  showModal.value = false;  // Cerramos el modal antes de cargar
  empresas.loadingModal = true;  // Iniciamos la carga del modal

  if (empresa) {
    try {
      await empresas.fetchEmpresaById(empresa._id);  // Esperamos a que se cargue la empresa
    } catch (error) {
      console.error('Error al cargar la empresa:', error);
    }
  } else {
    empresas.resetCurrentEmpresa();  // Resetear si es una nueva empresa
  }

  empresas.loadingModal = false;  // Terminamos la carga del modal
  showModal.value = true;  // Abrimos el modal
};

const closeModal = () => {
  showModal.value = false;
};

const solicitarEliminacionEmpresa = async (idEmpresa: string, nombreComercial: string) => {
  let cantidadCentros = 0;
  try {
    const { data } = await CentrosTrabajoAPI.getCentrosTrabajo(idEmpresa);
    cantidadCentros = Array.isArray(data) ? data.length : 0;
  } catch (error) {
    console.error('Error al obtener centros de la empresa:', error);
    cantidadCentros = 1;
  }

  requestEliminacion?.({
    entidad: 'empresa',
    identificacion: nombreComercial,
    textoConfirmacion: cantidadCentros > 0 ? nombreComercial : undefined,
    contextoNivel: { cantidadCentros },
    onConfirm: async (password) => {
      try {
        toast.open({
          message: `Eliminando empresa ${nombreComercial}...`,
          type: 'info',
        });
        await empresas.deleteEmpresaById(idEmpresa, password);
        toast.open({ message: 'Empresa eliminada con éxito' });
        await empresas.fetchEmpresas(proveedorSalud.proveedorSalud!._id);
        empresas.resetCurrentEmpresa();
      } catch (error) {
        console.log('Error al eliminar la empresa:', error);
        toast.open({
          message:
            'Error al eliminar la empresa. Algunos documentos no se pudieron eliminar. Elimínalos directamente y vuelve a intentarlo',
          type: 'error',
        });
        throw error;
      }
    },
  });
};

watch(
    () => proveedorSalud.proveedorSalud,
    (nuevoProveedorSalud) => {
        if (nuevoProveedorSalud) {
          empresas.fetchEmpresas(proveedorSalud.proveedorSalud!._id);
        }
    },
    { immediate: true } // Ejecutar inmediatamente al montar el componente
);

onUnmounted( async () => {
  if (proveedorSalud.proveedorSalud) {
    await proveedorSalud.verificarPeriodoDePrueba(proveedorSalud.proveedorSalud!._id);    
    await proveedorSalud.loadProveedorSalud(proveedorSalud.proveedorSalud!._id);
    if(proveedorSalud.proveedorSalud.estadoSuscripcion === 'cancelled') {
      await proveedorSalud.verificarFinSuscripcion(proveedorSalud.proveedorSalud!._id);  
    }
  }
});

const proveedor = computed(() => proveedorSalud.proveedorSalud);

watchEffect(() => {
  const p = proveedor.value;
  if (!p) return;
  const periodoDePruebaFinalizado = p.periodoDePruebaFinalizado;
  const estadoSuscripcion = p.estadoSuscripcion;
  const finDeSuscripcion = p.finDeSuscripcion ? new Date(p.finDeSuscripcion) : null;

  if (periodoDePruebaFinalizado && estadoSuscripcion === 'cancelled' && finDeSuscripcion && finDeSuscripcion > new Date()) {
    toast.open({
      message: `Aún tienes acceso hasta el ${finDeSuscripcion.toLocaleDateString()}.`,
      type: 'success',
      onClick: () => router.push({ name: 'subscription' }),
    });
    toast.open({
      message: `Haz clic aquí para renovar tu suscripción.`,
      type: 'info',
      onClick: () => router.push({ name: 'subscription' }),
    });
  }
});
</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
    <div>
      <Transition appear name="fade">
        <ModalEmpresas v-if="showModal" @closeModal="closeModal" @openSubscriptionModal="showSubscriptionModal = true"/>
      </Transition>

      <Transition appear name="fade">
        <ModalSuscripcion v-if="showSubscriptionModal" 
          @closeModal="showSubscriptionModal = false"/>
      </Transition>

      <div class="p-5 grid gap-5">
        <div class="w-full px-4 grid gap-4">
          <!-- Layout responsivo -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          
            <!-- Botón: siempre a la izquierda -->
            <div class="w-full sm:w-auto">
              <button 
                type="button"
                @click="openModal(null)"
                :disabled="!canManageEmpresas"
                :class="[
                  'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-normal rounded-xl transition-all duration-300 transform focus:outline-none focus:ring-4 focus:ring-emerald-200 active:scale-95 shadow-lg',
                  canManageEmpresas 
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white hover:scale-105 hover:shadow-xl' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                ]"
                :title="canManageEmpresas ? 'Crear nueva empresa' : 'No tienes permisos para crear empresas'"
              >
                <i class="fas fa-building text-sm"></i>
                <span>Nuevo Cliente</span>
              </button>
            </div>

            <!-- Buscador: siempre a la derecha -->
            <div class="relative w-full sm:w-60 md:w-80 lg:w-96">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fa-solid fa-magnifying-glass text-gray-500 dark:text-slate-300"></i>
              </span>
              <input
              v-model="busqueda"
              type="text"
              placeholder="Buscar empresa..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white text-gray-800 placeholder-gray-500 hover:shadow-md rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 transition dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-300"
              />
            </div>
          </div>
        </div>

        <!-- <Transition name="slide-up">
          <div v-if="empresasFiltradas.length === 0" 
              class="fixed bottom-4 right-4 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-lg p-3 flex items-center gap-2 cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105">
            <i class="fa-regular fa-lightbulb text-yellow-500 text-xl mr-1"></i>
            <div>
              <p class="text-sm font-medium">
                Aún no tienes clientes registrados <br>
                <a :href="guiaURL" target="_blank" rel="noopener noreferrer" class="underline text-blue-600">Sigue esta guía para registrar a tu primer cliente.</a>.
              </p>
            </div>
          </div>
        </Transition> -->

        <Transition appear mode="out-in" name="slide-up">
          <div>
            <!-- Si el array está vacío, mostramos el estado vacío con explicación -->
            <div v-if="empresasFiltradas.length === 0" class="text-center py-8">
              <!-- Mensaje cuando no hay empresas registradas -->
              <div v-if="empresas.empresas.length === 0">
                <div class="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full mb-6">
                  <i class="fas fa-building text-6xl text-gray-400"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">
                  Aún no hay clientes registrados
                </h2>
                <p class="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Comienza registrando a tus primeros clientes para gestionar sus expedientes médicos y organizaciones laborales.
                </p>
                
                <!-- Explicación de beneficios -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8 max-w-4xl mx-auto">
                  <h3 class="text-lg font-semibold text-gray-800 mb-6 text-center">
                    ¿Por qué registrar clientes?
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <div class="text-center p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
                      <div class="w-16 h-16 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-users text-white text-xl"></i>
                      </div>
                      <h4 class="font-semibold text-gray-900 mb-2">Gestión de Trabajadores</h4>
                      <p class="text-sm text-gray-600">
                        Organiza y administra el personal de cada cliente
                      </p>
                    </div>
                    
                    <div class="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                      <div class="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-notes-medical text-white text-xl"></i>
                      </div>
                      <h4 class="font-semibold text-gray-900 mb-2">Expedientes Médicos</h4>
                      <p class="text-sm text-gray-600">
                        Mantén historiales médicos completos y organizados
                      </p>
                    </div>
                    
                    <div class="text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                      <div class="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-chart-line text-white text-xl"></i>
                      </div>
                      <h4 class="font-semibold text-gray-900 mb-2">Reportes y Análisis</h4>
                      <p class="text-sm text-gray-600">
                        Genera informes detallados por cliente
                      </p>
                    </div>
                  </div>
                  
                  <!-- Beneficios adicionales -->
                  <div class="mt-8 pt-6 border-t border-gray-200">
                    <h4 class="font-semibold text-gray-800 mb-4 text-center">
                      Beneficios del registro
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                          <i class="fas fa-shield-alt text-emerald-600 text-sm"></i>
                        </div>
                        <span class="text-sm text-gray-700">Cumplimiento normativo</span>
                      </div>
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <i class="fas fa-clock text-blue-600 text-sm"></i>
                        </div>
                        <span class="text-sm text-gray-700">Ahorro de tiempo</span>
                      </div>
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <i class="fas fa-database text-purple-600 text-sm"></i>
                        </div>
                        <span class="text-sm text-gray-700">Datos centralizados</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <GreenButton 
                  text="Registrar Primer Cliente" 
                  size="large"
                  @click="openModal(null)" 
                />
              </div>

              <!-- Mensaje cuando la búsqueda no encuentra resultados -->
              <div v-else>
                <div class="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full mb-6">
                  <i class="fas fa-search text-6xl text-gray-400"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">
                  No se encontraron resultados
                </h2>
                <p class="text-gray-600 mb-8 max-w-2xl mx-auto">
                  No hay empresas que coincidan con tu búsqueda "<span class="font-semibold text-gray-800">{{ busqueda }}</span>". 
                  Intenta con otros términos o revisa la ortografía.
                </p>
                
                <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button 
                    @click="busqueda = ''"
                    class="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 flex items-center gap-2"
                  >
                    <i class="fas fa-times"></i>
                    Limpiar búsqueda
                  </button>
                  <GreenButton 
                    text="Registrar Nueva Empresa" 
                    size="medium"
                    :disabled="!canManageEmpresas"
                    @click="openModal(null)" 
                    title="Registrar una nueva empresa"
                  />
                </div>
              </div>
            </div>
            <!-- Si hay empresas, mostramos los items -->
            <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              <EmpresaItem v-for="empresa in empresasFiltradas" :key="empresa._id" :empresa="empresa"
                @editarEmpresa="openModal" @eliminarEmpresa="solicitarEliminacionEmpresa" />
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

