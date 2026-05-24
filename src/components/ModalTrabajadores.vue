<script setup>
import { inject, ref, watch, computed, provide } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { convertirFechaISOaYYYYMMDD, calcularEdad, calcularAntiguedad } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import TrabajadoresAPI from '@/api/TrabajadoresAPI';
import api from '@/lib/axios';
import EmpresasSelector from './EmpresasSelector.vue';
import EstadoAutocomplete from './selectors/EstadoAutocomplete.vue';
import NacionalidadAutocomplete from './selectors/NacionalidadAutocomplete.vue';
import ResidenciaGeoAutocomplete from './selectors/ResidenciaGeoAutocomplete.vue';
import { useNom024Fields } from '@/composables/useNom024Fields';

// Método para formatear la dirección (igual que en CentroTrabajoItem.vue)
const formatDireccion = (centro) => {
    const parts = [];
    if (centro.direccionCentro) parts.push(centro.direccionCentro);
    if (centro.codigoPostal) parts.push(centro.codigoPostal);
    if (centro.municipio) parts.push(centro.municipio);
    if (centro.estado) parts.push(centro.estado);
    return parts.join(', ');
};

const toast = inject('toast');

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const proveedorSaludStore = useProveedorSaludStore();
const { ensureUserLoaded } = useCurrentUser();
const { geoFieldsRequired, workerCurpRequired, isSIRES } = useNom024Fields();

const emit = defineEmits(['closeModal', 'openSubscriptionModal'])

const periodoDePruebaFinalizado = proveedorSaludStore.proveedorSalud?.periodoDePruebaFinalizado;
const estadoSuscripcion = proveedorSaludStore.proveedorSalud?.estadoSuscripcion;
const finDeSuscripcion = proveedorSaludStore.proveedorSalud?.finDeSuscripcion ? new Date(proveedorSaludStore.proveedorSalud.finDeSuscripcion) : null;

const nivelesEscolaridadBase = [
  "Primaria", "Secundaria", "Preparatoria",
  "Licenciatura", "Maestría", "Doctorado",
  "Nula",
];

const nivelesEscolaridad = computed(() => {
  if (paisProveedor.value === "GT") {
    return nivelesEscolaridadBase.map((nivel) =>
      nivel === "Preparatoria" ? "Diversificado" : nivel
    );
  }

  return nivelesEscolaridadBase;
});

const escolaridadDefaultValue = computed(() => {
  const actual = trabajadores.currentTrabajador?.escolaridad || "";
  if (paisProveedor.value === "GT" && actual === "Preparatoria") {
    return "Diversificado";
  }
  return actual;
});

const estadosCiviles = [
  "Soltero/a", "Casado/a", "Unión libre",
  "Separado/a", "Divorciado/a", "Viudo/a",
];

// Variables reactivas para el modal de transferencia
const mostrarModalTransferencia = ref(false);
const empresasDisponibles = ref([]);
const empresaSeleccionada = ref(null);
const centrosDisponibles = ref([]);
const centroSeleccionado = ref(null);
const transferenciaEnProceso = ref(false);
const loadingEmpresas = ref(false);
// Cache simple para resultados de empresas por contexto
const cacheEmpresas = new Map();
// Buscador de empresas con debounce
const empresaSearch = ref('');
const empresaSearchDebounced = ref('');
let empresaSearchTimer = null;
// Paginación simple en cliente
const empresaPage = ref(1);
const EMPRESAS_PAGE_SIZE = 25;

watch(empresaSearch, (val) => {
  if (empresaSearchTimer) clearTimeout(empresaSearchTimer);
  empresaSearchTimer = setTimeout(() => {
    empresaSearchDebounced.value = (val || '').trim();
  }, 300);
});

// Highlight helper
const highlightMatch = (text, term) => {
  if (!text) return '';
  if (!term) return text;
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${esc})`, 'ig');
  return text.replace(re, '<mark>$1</mark>');
};

// Filtro y pseudo-virtualización
const filteredEmpresas = computed(() => {
  const term = empresaSearchDebounced.value.toLowerCase();
  let list = empresasDisponibles.value || [];
  if (term) {
    list = list.filter((e) => {
      const nombre = (e.nombreComercial || '').toLowerCase();
      const razon = (e.razonSocial || '').toLowerCase();
      const rfc = (e.RFC || e.rfc || '').toLowerCase();
      return nombre.includes(term) || razon.includes(term) || rfc.includes(term);
    });
  }
  return list;
});

const visibleEmpresas = computed(() => {
  // Paginar ya no es necesario: devolver lista completa filtrada
  return filteredEmpresas.value;
});

watch([empresaSearchDebounced, () => empresasDisponibles.value], () => {
  empresaPage.value = 1;
});

const renderEmpresaNombre = (e) => ({
  nombre: highlightMatch(e.nombreComercial || '', empresaSearchDebounced.value),
  razon: highlightMatch(e.razonSocial || '', empresaSearchDebounced.value),
  rfc: highlightMatch(e.RFC || e.rfc || '', empresaSearchDebounced.value)
});

const getEmpresaIniciales = (e) => {
  const base = (e.nombreComercial || e.razonSocial || '').trim();
  if (!base) return '?';
  const parts = base.split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('');
};

const paisProveedor = computed(() => proveedorSaludStore.proveedorSalud?.pais || '');

const identificadorPersonalLabel = computed(() => {
  switch (paisProveedor.value) {
    case 'PA':
      return 'Cédula de Identidad';
    case 'GT':
      return 'DPI';
    case 'MX':
      return 'CURP';
    default:
      return 'No. Identificación Personal';
  }
});

const identificadorPersonalPlaceholder = computed(() => {
  switch (paisProveedor.value) {
    case 'PA':
      return 'Ejemplo: E-8-123-456';
    case 'GT':
      return 'Ejemplo: 1234567890123';
    case 'MX':
      return 'Ejemplo: ROAJ850102HNLRRN08';
    default:
      return 'Ejemplo: 01234567-8';
  }
});

const identificadorPersonalValidationMessage = computed(() => {
  return 'Debe tener entre 4 y 30 caracteres alfanuméricos y puede incluir separadores comunes.';
});

// Validación condicional de CURP: requerido para SIRES, opcional para SIN_REGIMEN
const curpValidation = computed(() => {
  if (workerCurpRequired.value) {
    return 'required|curpValidation';
  }
  return 'optional|curpValidation';
});

// Validación condicional para campos NOM-024: requeridos solo para SIRES_NOM024
const nom024FieldValidation = computed(() => {
  return geoFieldsRequired.value ? 'required' : 'optional';
});

// Valores reactivos para campos NOM-024 (fuera de FormKit)
// Nacionalidad: sin valor por defecto, el usuario debe seleccionar en el autocomplete
const getDefaultNacionalidad = () => {
  return trabajadores.currentTrabajador?.nacionalidad || '';
};

const entidadNacimientoValue = ref(trabajadores.currentTrabajador?.entidadNacimiento || '');
const nacionalidadValue = ref(getDefaultNacionalidad());
const entidadResidenciaValue = ref(trabajadores.currentTrabajador?.entidadResidencia || '');
const municipioResidenciaValue = ref(trabajadores.currentTrabajador?.municipioResidencia || '');
const localidadResidenciaValue = ref(trabajadores.currentTrabajador?.localidadResidencia || '');

// Ref para el valor del CURP (para poder actualizarlo programáticamente)
const curpValue = ref(trabajadores.currentTrabajador?.curp || '');

// Watch para sincronizar curpValue con el trabajador actual
watch(() => trabajadores.currentTrabajador?.curp, (newCurp) => {
  curpValue.value = newCurp || '';
}, { immediate: true });

// Función para insertar CURP genérico (para paciente desconocido o extranjero)
const insertGenericCURP = () => {
  curpValue.value = 'XXXX999999XXXXXX99';
};

// Watch para sincronizar valores cuando cambia el trabajador actual
watch(() => trabajadores.currentTrabajador, (trabajador) => {
  entidadNacimientoValue.value = trabajador?.entidadNacimiento || '';
  nacionalidadValue.value = trabajador?.nacionalidad || '';
  entidadResidenciaValue.value = trabajador?.entidadResidencia || '';
  municipioResidenciaValue.value = trabajador?.municipioResidencia || '';
  localidadResidenciaValue.value = trabajador?.localidadResidencia || '';
}, { immediate: true });

// Al seleccionar un estado mexicano (no NE ni 00), auto-setear nacionalidad MEXICANA
const ENTIDADES_SIN_AUTO_NACIONALIDAD = ['NE', '00']; // Extranjero, No disponible
watch(entidadNacimientoValue, (entidad) => {
  if (!entidad) return;
  if (ENTIDADES_SIN_AUTO_NACIONALIDAD.includes(entidad)) return;
  nacionalidadValue.value = 'MEX';
});

// Variables para contar trabajadores por centro
const trabajadoresPorCentro = ref({});
const loadingTrabajadores = ref(false);
const centrosYaContados = new Set();
let observer = null;

const ensureObserver = () => {
  if (observer) return observer;
  observer = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const centroId = el && el.__centroId;
        if (!centroId || centrosYaContados.has(centroId)) {
          observer.unobserve(entry.target);
          return;
        }
        centrosYaContados.add(centroId);
        observer.unobserve(entry.target);
        const centro = centrosDisponibles.value.find(c => c._id === centroId);
        if (centro) {
          const numero = await obtenerNumeroTrabajadores(centro);
          trabajadoresPorCentro.value = { ...trabajadoresPorCentro.value, [centroId]: numero };
        }
      }
    });
  }, { root: null, threshold: 0.1 });
  return observer;
};

const registerCentroObserver = (el, centro) => {
  if (!el || !centro?._id) return;
  el.__centroId = centro._id;
  ensureObserver().observe(el);
};

// Función para obtener el número de trabajadores de un centro sin afectar el estado global
const obtenerNumeroTrabajadores = async (centro) => {
  if (!centro?._id) return 0;
  
  try {
    // Usar empresa real del centro (puede ser distinta a la actual)
    const empresaIdDelCentro = typeof centro.idEmpresa === 'object' ? centro.idEmpresa._id : centro.idEmpresa;
    const { data } = await TrabajadoresAPI.getTrabajadores(
      empresaIdDelCentro,
      centro._id
    );
    
    if (Array.isArray(data)) {
      return data.length;
    } else {
      return 0;
    }
  } catch (error) {
    console.error('Error al obtener trabajadores del centro:', error);
    return 0;
  }
};

// Función para cargar el número de trabajadores para todos los centros
const cargarTrabajadoresPorCentro = async () => {
  if (!centrosDisponibles.value.length) return;
  
  loadingTrabajadores.value = true;
  try {
    const conteos = await Promise.all(
      centrosDisponibles.value.map(async (centro) => {
        const numero = await obtenerNumeroTrabajadores(centro);
        return { centroId: centro._id, numero };
      })
    );
    
    // Convertir a objeto para fácil acceso
    trabajadoresPorCentro.value = conteos.reduce((acc, { centroId, numero }) => {
      acc[centroId] = numero;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error al cargar trabajadores por centro:', error);
  } finally {
    loadingTrabajadores.value = false;
  }
};

// Función para manejar el envío del formulario
// Ref para rastrear si el formulario ha intentado enviarse (para activar validaciones visuales)
const formSubmitAttempted = ref(false);

// Proveer el estado de validación a los componentes hijos
provide('formSubmitAttempted', formSubmitAttempted);

// Handler para cuando el formulario tiene errores de validación
const onFormSubmitInvalid = () => {
  formSubmitAttempted.value = true;
  // Resetear después de un tiempo para permitir que se vuelva a intentar
  setTimeout(() => {
    formSubmitAttempted.value = false;
  }, 5000);
};

const handleSubmit = async (data) => {
  formSubmitAttempted.value = false; // Resetear cuando el submit es exitoso
  if (!proveedorSaludStore.proveedorSalud) return;

  // Obtener el ID del usuario actual
  const currentUserId = await ensureUserLoaded();
  
  if (!currentUserId) {
    toast.open({ message: 'No se pudo identificar al usuario. Por favor, inicie sesión nuevamente.', type: 'error' });
    return;
  }

  if (periodoDePruebaFinalizado) {
    // Bloquear si el periodo de prueba ha finalizado y no tiene suscripción activa (Inactive aparece cuando el pago falla repetidamente)
    if (!estadoSuscripcion || estadoSuscripcion === 'inactive') {
      emit('openSubscriptionModal');
      return;
    }

    // Bloquear solo si canceló la suscripción y la fecha de fin de suscripción ya pasó
    if (estadoSuscripcion === 'cancelled' && finDeSuscripcion && new Date() > finDeSuscripcion) {
      emit('openSubscriptionModal');
      return;
    }
  }

  // Validar edad mínima: no permitir menores de 18 años
  if (data.fechaNacimiento) {
    const edad = calcularEdad(data.fechaNacimiento);
    if (edad < 18) {
      toast.open({
        message: 'No se puede registrar un menor de edad. El trabajador debe tener al menos 18 años cumplidos.',
        type: 'error'
      });
      return;
    }
  }

  const trabajadorData = {
    primerApellido: data.primerApellido,
    segundoApellido: data.segundoApellido,
    nombre: data.nombre,
    fechaNacimiento: data.fechaNacimiento,
    sexo: data.sexo,
    escolaridad: data.escolaridad,
    puesto: data.puesto,
    telefono: data.telefono,
    contactoEmergenciaNombre: data.contactoEmergenciaNombre,
    contactoEmergenciaTelefono: data.contactoEmergenciaTelefono,
    estadoCivil: data.estadoCivil,
    numeroEmpleado: data.numeroEmpleado,
    nss: data.nss,
    curp: data.curp || curpValue.value,
    // NOM-024 Fields (usar valores reactivos si no están en data)
    entidadNacimiento: data.entidadNacimiento || entidadNacimientoValue.value,
    nacionalidad: data.nacionalidad || nacionalidadValue.value,
    entidadResidencia: data.entidadResidencia || entidadResidenciaValue.value,
    municipioResidencia: data.municipioResidencia || municipioResidenciaValue.value,
    localidadResidencia: data.localidadResidencia || localidadResidenciaValue.value,
    idCentroTrabajo: data.idCentroTrabajo,
    createdBy: currentUserId,
    updatedBy: currentUserId
  };

  // Solo agregar fechaIngreso si tiene un valor válido
  if (data.fechaIngreso && data.fechaIngreso !== '') {
    trabajadorData.fechaIngreso = data.fechaIngreso;
  }

  // Agregar estadoLaboral solo si es un nuevo registro
  if (!trabajadores.currentTrabajador?._id) {
    trabajadorData.estadoLaboral = "Activo";
  }

  try {
    if (trabajadores.currentTrabajador?._id) {
      // Actualizar Trabajador
      await trabajadores.updateTrabajador(empresas.currentEmpresaId, centrosTrabajo.currentCentroTrabajoId, trabajadores.currentTrabajador._id, trabajadorData);
      toast.open({ message: 'Trabajador actualizado', type: 'success' });
    } else {
      // Registrar Trabajador
      await trabajadores.createTrabajador(empresas.currentEmpresaId, centrosTrabajo.currentCentroTrabajoId, trabajadorData);
      
      toast.open({ message: 'Trabajador registrado exitosamente', type: 'success' });
    }
    emit('closeModal');
    trabajadores.fetchTrabajadoresConHistoria(empresas.currentEmpresaId, centrosTrabajo.currentCentroTrabajoId);
  } catch (error) {
    console.error('Error al crear o actualizar al trabajador:', error);
    
    // Extraer el mensaje de error específico del backend
    let errorMessage = 'Hubo un error al crear o actualizar al trabajador, por favor intente nuevamente.';
    
    if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      // Manejar formato de errores NOM-024 (array de objetos {field, reason})
      errorMessage = error.response.data.errors.map(e => `${e.field}: ${e.reason}`).join('. ');
    } else if (error.response?.data?.message) {
      // Manejar formato estándar de NestJS (string o array de strings)
      errorMessage = Array.isArray(error.response.data.message) 
        ? error.response.data.message.join('. ') 
        : error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast.open({ message: errorMessage, type: 'error' });
  }
};

// Limpiar la vista previa cuando se cierre el modal
const closeModal = () => {
  emit('closeModal');
};

// Función para transferir trabajador a otro centro de trabajo (render inmediato + carga en bg)
const transferirTrabajador = async () => {
  // Mostrar modal inmediatamente
  mostrarModalTransferencia.value = true;

  // Resetear estados antes de cargar
  empresasDisponibles.value = [];
  empresaSeleccionada.value = null;
  centroSeleccionado.value = null;
  centrosDisponibles.value = [];

  // Cargar empresas en segundo plano
  loadingEmpresas.value = true;
  try {
    const cacheKey = `${empresas.currentEmpresaId}|${centrosTrabajo.currentCentroTrabajoId}|${proveedorSaludStore.proveedorSalud?._id}`;
    if (cacheEmpresas.has(cacheKey)) {
      empresasDisponibles.value = cacheEmpresas.get(cacheKey);
      return;
    }
    const { data } = await TrabajadoresAPI.getCentrosDisponiblesTransferencia(
      empresas.currentEmpresaId,
      centrosTrabajo.currentCentroTrabajoId,
      centrosTrabajo.currentCentroTrabajoId,
      proveedorSaludStore.proveedorSalud?._id
    );

    empresasDisponibles.value = data.empresas || [];
    cacheEmpresas.set(cacheKey, empresasDisponibles.value);

    if (!empresasDisponibles.value.length) {
      toast.open({
        message: 'No hay otros centros de trabajo disponibles para transferir',
        type: 'warning'
      });
    }
  } catch (error) {
    console.error('Error al cargar centros de trabajo:', error);
    toast.open({
      message: 'Error al cargar los centros de trabajo disponibles',
      type: 'error'
    });
  } finally {
    loadingEmpresas.value = false;
  }
};

// Función para cuando se selecciona una empresa
const onEmpresaSeleccionada = async () => {
  if (!empresaSeleccionada.value) {
    centrosDisponibles.value = [];
    centroSeleccionado.value = null;
    return;
  }

  // Obtener centros de la empresa seleccionada
  const empresaEncontrada = empresasDisponibles.value.find(
    emp => emp._id === empresaSeleccionada.value
  );

  if (empresaEncontrada && empresaEncontrada.centros) {
    centrosDisponibles.value = empresaEncontrada.centros;
    
    // Cargar el número de trabajadores para cada centro
    await cargarTrabajadoresPorCentro();
  } else {
    centrosDisponibles.value = [];
  }

  centroSeleccionado.value = null;
};

// Función para confirmar la transferencia
const confirmarTransferencia = async () => {
  if (!centroSeleccionado.value || !empresaSeleccionada.value) {
    toast.open({ 
      message: 'Por favor seleccione una empresa y un centro de trabajo', 
      type: 'warning' 
    });
    return;
  }

  try {
    transferenciaEnProceso.value = true;
    
    await trabajadores.transferirTrabajador(
      empresas.currentEmpresaId,
      centrosTrabajo.currentCentroTrabajoId,
      trabajadores.currentTrabajador._id,
      centroSeleccionado.value._id || centroSeleccionado.value
    );

    const empresaNombre = empresasDisponibles.value.find(e => e._id === empresaSeleccionada.value)?.nombreComercial || 'la empresa seleccionada';
    const centroNombre = centroSeleccionado.value.nombreCentro || centroSeleccionado.value;
    
    toast.open({ 
      message: `Trabajador transferido exitosamente a ${empresaNombre} (${centroNombre})`, 
      type: 'success' 
    });

    // Cerrar modales y actualizar la lista
    mostrarModalTransferencia.value = false;
    empresaSeleccionada.value = null;
    centroSeleccionado.value = null;
    emit('closeModal');
    trabajadores.fetchTrabajadoresConHistoria(empresas.currentEmpresaId, centrosTrabajo.currentCentroTrabajoId);
  } catch (error) {
    console.error('Error al transferir trabajador:', error);
    
    let errorMessage = 'Error al transferir el trabajador';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast.open({ message: errorMessage, type: 'error' });
  } finally {
    transferenciaEnProceso.value = false;
  }
};

// Función para cancelar la transferencia
const cancelarTransferencia = () => {
  mostrarModalTransferencia.value = false;
  empresaSeleccionada.value = null;
  centroSeleccionado.value = null;
  centrosDisponibles.value = [];
};
</script>

<template>
  <div class="modal modal-trabajadores fixed top-0 left-0 z-40 p-4 sm:p-8 h-screen w-full flex items-center justify-center">
    <!-- Fondo oscuro transparente -->
    <div class="absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm" @click="closeModal">
    </div>
    <Transition appear name="fade">
      <!-- Modal centrado con desplazamiento interno -->
      <div
        class="modal-inner relative bg-white text-gray-900 w-full sm:w-4/5 md:w-3/5 xl:w-2/5 2xl:w-1/3 p-6 sm:p-8 md:p-10 rounded-lg shadow-md shadow-slate-900 max-h-[90vh] overflow-y-auto"
        style="overflow-x: visible;">
        <!-- Botón para cerrar el modal -->
        <div
          class="modal-close absolute h-16 w-16 flex justify-center items-center top-0 right-0 text-5xl text-gray-400 hover:text-gray-500 cursor-pointer"
          @click="closeModal">
          &times;
        </div>

        <div v-if="trabajadores.loadingModal">
          <h1 class="text-3xl text-center">Cargando trabajador...</h1>
        </div>
        <!-- Contenido del modal -->
        <div v-else>
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
            <h1 class="text-2xl sm:text-3xl text-center sm:text-left w-full sm:w-auto">
              {{ trabajadores.currentTrabajador._id ? 'Editar Trabajador' : 'Registrar Trabajador' }}
            </h1>
            <!-- Botón de transferir solo visible cuando se está editando -->
            <button
              v-if="trabajadores.currentTrabajador._id"
              class="mr-8 w-full sm:w-auto text-xs sm:text-sm md:text-base px-3 py-2 sm:py-1 text-emerald-600 hover:text-emerald-700 border border-emerald-300 hover:border-emerald-400 rounded-md transition-colors duration-200 hover:bg-emerald-50"
              @click="transferirTrabajador"
              title="Transferir a otro centro de trabajo">
              <span>Transferir</span>
              <span class="inline sm:hidden"> a otro centro de trabajo</span>
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-1 mb-3">Los campos con <span class="text-red-500 font-medium">*</span> son obligatorios</p>
          <hr class="mt-2 mb-3">

          <FormKit type="form" :actions="false" incomplete-message="Por favor complete todos los campos"
            @submit="handleSubmit" @submit-invalid="onFormSubmitInvalid">
            <div class="lg:grid gap-3 lg:grid-cols-2">
              <div>
                <FormKit
                  type="text"
                  :label="identificadorPersonalLabel"
                  name="curp"
                  :placeholder="identificadorPersonalPlaceholder"
                  :validation="curpValidation"
                  :validation-messages="{ 
                    required: 'Este campo es obligatorio',
                    curpValidation: identificadorPersonalValidationMessage 
                  }"
                  maxlength="30"
                  v-model="curpValue"
                >
                  <template #label>
                    <span class="font-medium text-lg text-gray-700">
                      {{ identificadorPersonalLabel }}<span v-if="workerCurpRequired" class="text-red-500">*</span>
                    </span>
                  </template>
                </FormKit>
              </div>
              <div class="flex items-center">
                <!-- Botón sutil para insertar CURP genérico (solo para MX) -->
                <button
                  v-if="paisProveedor === 'MX'"
                  type="button"
                  @click.prevent="insertGenericCURP"
                  class="mt-0 mb-4 md:mt-4 md:mb-0 text-xs text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
                  title="Usar CURP genérico para paciente desconocido o extranjero (XXXX999999XXXXXX99)"
                >
                  <i class="fas fa-info-circle mr-1"></i>
                  Usar CURP genérico <br class="hidden md:block">(desconocido/extranjero)
                </button>
              </div>
              <FormKit type="text" name="primerApellido" placeholder="Apellido paterno"
                  validation="required" :validation-messages="{ required: 'Este campo es obligatorio' }"
                  :value="trabajadores.currentTrabajador?.primerApellido || ''">
                <template #label>
                  <span class="font-medium text-lg text-gray-700">Primer Apellido<span class="text-red-500">*</span></span>
                </template>
              </FormKit>
              <FormKit type="text" label="Segundo Apellido" name="segundoApellido" placeholder="Apellido materno"
                  :value="trabajadores.currentTrabajador?.segundoApellido || ''" />
              <FormKit type="text" name="nombre" placeholder="Nombres del trabajador"
                  validation="required" :validation-messages="{ required: 'Este campo es obligatorio' }"
                  :value="trabajadores.currentTrabajador?.nombre || ''">
                <template #label>
                  <span class="font-medium text-lg text-gray-700">Nombre(s)<span class="text-red-500">*</span></span>
                </template>
              </FormKit>
              <FormKit type="date" name="fechaNacimiento" validation="required"
                :validation-messages="{ required: 'Este campo es obligatorio' }"
                :value="convertirFechaISOaYYYYMMDD(trabajadores.currentTrabajador?.fechaNacimiento) || ''">
                <template #label>
                  <span class="font-medium text-lg text-gray-700">Fecha de Nacimiento<span class="text-red-500">*</span></span>
                </template>
              </FormKit>
              <FormKit type="select" name="sexo" placeholder="-Seleccione un sexo-"
                :options="['Masculino', 'Femenino']" validation="required"
                :validation-messages="{ required: 'Este campo es obligatorio' }"
                :value="trabajadores.currentTrabajador?.sexo || ''">
                <template #label>
                  <span class="font-medium text-lg text-gray-700">Sexo<span class="text-red-500">*</span></span>
                </template>
              </FormKit>
              <FormKit type="select" name="escolaridad"
                placeholder="-Seleccione último concluido-" :options="nivelesEscolaridad" validation="required"
                :validation-messages="{ required: 'Este campo es obligatorio' }"
                :value="escolaridadDefaultValue">
                <template #label>
                  <span class="font-medium text-lg text-gray-700">Escolaridad<span class="text-red-500">*</span></span>
                </template>
              </FormKit>
              <FormKit type="text" name="puesto" placeholder="Puesto al que aspira o desempeña" validation="required"
                :validation-messages="{ required: 'Este campo es obligatorio' }"
                :value="trabajadores.currentTrabajador?.puesto || ''">
                <template #label>
                  <span class="font-medium text-lg text-gray-700">Puesto<span class="text-red-500">*</span></span>
                </template>
              </FormKit>
              <FormKit type="select" name="estadoCivil" placeholder="-Seleccione un estado civil-"
                :options="estadosCiviles" validation="required"
                :validation-messages="{ required: 'Este campo es obligatorio' }"
                :value="trabajadores.currentTrabajador?.estadoCivil || ''">
                <template #label>
                  <span class="font-medium text-lg text-gray-700">Estado Civil<span class="text-red-500">*</span></span>
                </template>
              </FormKit>
              <FormKit type="text" label="Teléfono" name="telefono" placeholder="Número de teléfono"
                validation="optional|phoneValidation" 
                :validation-messages="{ phoneValidation: 'El número de teléfono debe tener entre 4 y 15 dígitos' }"
                :value="trabajadores.currentTrabajador?.telefono || ''" />
              <FormKit type="date" name="fechaIngreso" 
                :value="convertirFechaISOaYYYYMMDD(trabajadores.currentTrabajador?.fechaIngreso) || ''">
                <template #label>
                  <span class="font-medium text-lg text-gray-700">Fecha de Ingreso</span>
                </template>
              </FormKit>
              <FormKit type="text" label="Nombre contacto de emergencia" name="contactoEmergenciaNombre"
                placeholder="Ej: María López García"
                :value="trabajadores.currentTrabajador?.contactoEmergenciaNombre || ''" />
              <FormKit type="text" label="Teléfono contacto de emergencia" name="contactoEmergenciaTelefono"
                placeholder="Número de teléfono"
                validation="optional|phoneValidation"
                :validation-messages="{ phoneValidation: 'El número de teléfono debe tener entre 4 y 15 dígitos' }"
                :value="trabajadores.currentTrabajador?.contactoEmergenciaTelefono || ''" />
                <FormKit type="text" label="Número de Empleado" name="numeroEmpleado" placeholder="Sólo números"
                  validation="optional|matches:/^[0-9]*$/"
                  :validation-messages="{
                    matches: 'El número de empleado debe estar vacío o contener solo números entre 1 y 7 dígitos'
                  }"
                  maxlength="7" :value="trabajadores.currentTrabajador?.numeroEmpleado || ''" />
                <FormKit type="text" label="NSS" name="nss" placeholder="Número de Seguro Social"
                  validation="optional|nssValidation"
                  :validation-messages="{
                    nssValidation: 'Debe tener 4-30 caracteres alfanuméricos'
                  }"
                  maxlength="30" :value="trabajadores.currentTrabajador?.nss || ''" />
              <!-- Folio NOM-024: solo lectura, generado por el sistema para trabajadores nuevos -->
              <div v-if="trabajadores.currentTrabajador?.folio" class="lg:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Folio (Identificador en la UM)</label>
                <div class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700 font-mono text-sm">
                  {{ trabajadores.currentTrabajador.folio }}
                </div>
                <p class="text-xs text-gray-500 mt-1">Identificador único de 18 caracteres. Generado automáticamente al registrar.</p>
              </div>

              <!-- NOM-024 Identification Fields (solo visible para SIRES_NOM024) -->
              <div v-if="isSIRES" class="lg:col-span-2 mt-4">
                <h3 class="text-lg font-semibold text-emerald-800 mb-3 border-b border-emerald-100 pb-2">
                  Identificación NOM-024 (Estandarización)
                </h3>
                
                <!-- Campos de Nacimiento -->
                <div class="mb-4">
                  <h4 class="text-sm font-semibold text-gray-700 mb-3">Datos de Nacimiento</h4>
                  <div class="grid gap-3 sm:grid-cols-2">
                    <EstadoAutocomplete
                      v-model="entidadNacimientoValue"
                      label="Entidad de Nacimiento"
                      placeholder="Buscar por nombre del estado"
                      :required="geoFieldsRequired"
                    />
                    
                    <NacionalidadAutocomplete
                      v-model="nacionalidadValue"
                      label="Nacionalidad"
                      placeholder="Buscar por nombre de nacionalidad"
                      :required="geoFieldsRequired"
                    />
                  </div>
                </div>

                <!-- Campos de Residencia -->
                <div>
                  <h4 class="text-sm font-semibold text-gray-700 mb-3">Datos de Residencia</h4>
                  <ResidenciaGeoAutocomplete
                    :estadoResidencia="entidadResidenciaValue"
                    :municipioResidencia="municipioResidenciaValue"
                    :localidadResidencia="localidadResidenciaValue"
                    @update:estadoResidencia="entidadResidenciaValue = $event"
                    @update:municipioResidencia="municipioResidenciaValue = $event"
                    @update:localidadResidencia="localidadResidenciaValue = $event"
                    :required="geoFieldsRequired"
                  />
                </div>
              </div>
            </div>

            <!-- Campos ocultos para NOM-024 (para que FormKit los capture en el submit) -->
            <!-- Solo validar si es SIRES_NOM024, pero siempre enviar valores para compatibilidad -->
            <FormKit 
              type="hidden" 
              name="entidadNacimiento" 
              v-model="entidadNacimientoValue"
              :validation="nom024FieldValidation"
              :validation-messages="{ required: 'Este campo es obligatorio' }"
            />
            <FormKit 
              type="hidden" 
              name="nacionalidad" 
              v-model="nacionalidadValue"
              :validation="nom024FieldValidation"
              :validation-messages="{ required: 'Este campo es obligatorio' }"
            />
            <FormKit 
              type="hidden" 
              name="entidadResidencia" 
              v-model="entidadResidenciaValue"
              :validation="nom024FieldValidation"
              :validation-messages="{ required: 'Este campo es obligatorio' }"
            />
            <FormKit 
              type="hidden" 
              name="municipioResidencia" 
              v-model="municipioResidenciaValue"
              :validation="nom024FieldValidation"
              :validation-messages="{ required: 'Este campo es obligatorio' }"
            />
            <FormKit 
              type="hidden" 
              name="localidadResidencia" 
              v-model="localidadResidenciaValue"
              :validation="nom024FieldValidation"
              :validation-messages="{ required: 'Este campo es obligatorio' }"
            />

            <!-- Campos ocultos y botón de enviar -->
            <FormKit type="hidden" name="idCentroTrabajo" :value="centrosTrabajo.currentCentroTrabajoId" />

            <hr class="my-3">
            <FormKit type="submit" :disabled="trabajadores.loadingModal">
              <span v-if="trabajadores.loadingModal">Guardando...</span>
              <span v-else>{{ trabajadores.currentTrabajador._id ? 'Actualizar Trabajador' : 'Guardar Trabajador'
                }}</span>
            </FormKit>
          </FormKit>
        </div>

        <button
          class="text-xl mt-2 w-full rounded-lg bg-white font-semibold text-gray-800 shadow-sm ring-2 ring-inset ring-gray-300 hover:bg-gray-100 p-3 transition-transform duration-300 transform hover:scale-105 hover:shadow-lg flex-1"
          @click="closeModal">
          Cerrar
        </button>
      </div>
    </Transition>

    <!-- Modal de transferencia -->
    <Transition appear name="fade">
      <div v-if="mostrarModalTransferencia" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" @click="cancelarTransferencia">
        <div class="modal-inner bg-white text-gray-900 w-4/5 sm:w-3/5 md:w-1/2 lg:w-2/5 xl:w-1/3 2xl:w-1/4 p-8 rounded-lg shadow-md shadow-slate-900 max-h-[80vh] overflow-y-auto" @click.stop>
          <!-- Header del modal -->
          <div class="flex justify-between items-start mb-3">
            <div>
              <h2 class="text-3xl font-semibold text-gray-900 leading-tight">Transferir Trabajador</h2>
              <p class="mt-1 text-sm text-gray-500">Selecciona una empresa destino y luego un centro de trabajo.</p>
            </div>
            <button
              @click="cancelarTransferencia"
              class="text-gray-400 hover:text-gray-600 text-2xl"
              :disabled="transferenciaEnProceso">
              &times;
            </button>
          </div>

          <!-- Sección: Resumen del trabajador -->
          <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-6">
            
            <!-- Información principal -->
            <div class="mb-3 flex gap-3">
              <p class="text-xl font-semibold text-emerald-700">
                {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
                <!-- Número de empleado -->
              </p>
              <div v-if="trabajadores.currentTrabajador?.numeroEmpleado" class="flex items-center gap-2 text-sm">
                <i class="fas fa-id-badge text-purple-500"></i>
                <span class="text-emerald-700">No. {{ trabajadores.currentTrabajador.numeroEmpleado }}</span>
              </div>
            </div>
            
            <!-- Información detallada -->
            <div class="flex flex-wrap gap-3 text-sm">
              <!-- Sexo -->
              <div v-if="trabajadores.currentTrabajador?.sexo" class="flex items-center gap-2">
                <i v-if="trabajadores.currentTrabajador?.sexo === 'Masculino'" class="fas fa-mars text-sky-600"></i>
                <i v-else class="fas fa-venus text-rose-600"></i>
                <span class="text-emerald-700">{{ trabajadores.currentTrabajador.sexo }}</span>
              </div>
              
              <!-- Edad -->
              <div v-if="trabajadores.currentTrabajador?.fechaNacimiento" class="flex items-center gap-2">
                <i class="fas fa-birthday-cake text-emerald-500"></i>
                <span class="text-emerald-700">{{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }} años</span>
              </div>
              
              <!-- Puesto -->
              <div v-if="trabajadores.currentTrabajador?.puesto" class="flex items-center gap-2">
                <i class="fas fa-briefcase text-blue-500"></i>
                <span class="text-emerald-700">{{ trabajadores.currentTrabajador.puesto }}</span>
              </div>
              
              <!-- Antigüedad -->
              <div v-if="trabajadores.currentTrabajador?.fechaIngreso" class="flex items-center gap-2">
                <i class="fas fa-clock text-cyan-500"></i>
                <span class="text-emerald-700">{{ calcularAntiguedad(trabajadores.currentTrabajador.fechaIngreso) }}</span>
              </div>

              <!-- Ubicación actual de expediente (compacto, en línea, sin aumentar altura) -->
              <div class="flex items-center gap-2 text-sm">
                <span class="text-xs font-semibold text-gray-600">Ubicación actual de expediente:</span>
                <span class="inline-flex items-center gap-1 text-emerald-700 leading-none">
                  <i class="fas fa-building text-emerald-500"></i>
                  {{ empresas.currentEmpresa?.nombreComercial }}
                </span>
                <span class="text-gray-300">•</span>
                <span class="inline-flex items-center gap-1 text-sky-700 leading-none">
                  <i class="fas fa-map-marker-alt text-sky-500"></i>
                  {{ centrosTrabajo.currentCentroTrabajo?.nombreCentro }}
                </span>
              </div>
              
            </div>
          </div>

          <!-- Separador visual -->
          <div class="border-t border-gray-200 my-3"></div>

          <!-- Sección: Empresa destino -->
          <h3 class="text-lg font-medium text-gray-800 mb-1">Empresa destino</h3>
          <div class="mb-6">
              <div class="relative">
                <input
                  v-model="empresaSearch"
                  type="text"
                  class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  :disabled="transferenciaEnProceso || loadingEmpresas"
                  placeholder="Busca por nombre, razón social o RFC" />
                <span class="absolute inset-y-0 right-2 flex items-center text-gray-400">
                  <i class="fas fa-search"></i>
                </span>
              </div>
              <EmpresasSelector
                :loading="loadingEmpresas"
                :empresas="empresasDisponibles"
                :visibleEmpresas="visibleEmpresas"
                :filteredCount="filteredEmpresas.length"
                :selectedId="empresaSeleccionada"
                @select="(empresa) => { empresaSeleccionada = empresa._id; onEmpresaSeleccionada(); }"
              />
               <div v-if="empresaSeleccionada" class="mt-2">
                 <div class="flex items-center gap-3 p-2 rounded-lg border-2 border-emerald-300 bg-emerald-50">
                  <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center text-white font-bold">
                    {{ getEmpresaIniciales(empresasDisponibles.find(e => e._id === empresaSeleccionada) || {}) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-emerald-800 font-semibold truncate">{{ (empresasDisponibles.find(e => e._id === empresaSeleccionada)?.nombreComercial) || 'Empresa seleccionada' }}</span>
                      <span class="text-[10px] uppercase tracking-wide font-semibold text-emerald-700 bg-emerald-100 border border-emerald-300 rounded px-2 py-0.5">Seleccionada</span>
                    </div>
                    <div class="text-xs text-emerald-700 truncate">{{ (empresasDisponibles.find(e => e._id === empresaSeleccionada)?.razonSocial) || '' }}</div>
                  </div>
                </div>
              </div>
          </div>

          <!-- Sección: Centro destino -->
          <div v-if="empresaSeleccionada" class="mb-6">
            <h3 class="text-lg font-medium text-gray-800 mb-1">Centro de trabajo destino</h3>
              <div v-if="centrosDisponibles.length === 0 && !loadingEmpresas" class="text-sm text-gray-500 italic">
                No hay centros disponibles para esta empresa
              </div>
               <div v-else class="space-y-2 max-h-60 overflow-y-auto p-2">
                <template v-if="loadingEmpresas">
                  <div v-for="n in 3" :key="n" class="group">
                    <div class="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
                      <div class="w-full text-left p-3">
                        <div class="flex items-start gap-3 animate-pulse">
                          <div class="w-10 h-10 bg-gray-200 rounded-xl"></div>
                          <div class="flex-1">
                            <div class="h-4 w-1/2 bg-gray-200 rounded mb-2"></div>
                            <div class="h-3 w-1/3 bg-gray-100 rounded mb-3"></div>
                            <div class="h-3 w-24 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <div v-else v-for="centro in centrosDisponibles" :key="centro._id" class="group" :ref="(el) => registerCentroObserver(el, centro)">
                  <div class="bg-white rounded-2xl shadow-sm border-2 border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
                       :class="[
                         (centroSeleccionado?._id === centro._id || (typeof centroSeleccionado === 'string' && centroSeleccionado === centro._id))
                           ? 'bg-emerald-50 border-emerald-500 shadow-lg ring-2 ring-emerald-300'
                           : ''
                       ]">
                    <!-- Contenido principal -->
                    <button type="button"
                        class="w-full text-left p-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        :class="(centroSeleccionado?._id === centro._id || (typeof centroSeleccionado === 'string' && centroSeleccionado === centro._id)) ? 'bg-emerald-50' : 'hover:bg-gray-100'"
                        @click="centroSeleccionado = centro"
                        :disabled="transferenciaEnProceso">
                        
                        <!-- Header con icono y título -->
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-sm">
                                    <i class="fas fa-building text-white text-lg"></i>
                                </div>
                                <div>
                                    <h3 class="text-xl font-bold text-gray-900 mb-0.5">{{ centro.nombreCentro }}</h3>
                                    <p class="text-sm text-gray-500 mb-0.5">
                                      {{ empresasDisponibles.find(e => e._id === empresaSeleccionada)?.nombreComercial || '' }}
                                    </p>
                                    <div class="flex items-center gap-2">
                                        <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                        <span v-if="loadingTrabajadores" class="text-sm text-gray-400">
                                            <i class="fas fa-spinner fa-spin mr-1"></i>
                                            Contando...
                                        </span>
                                        <span v-else class="text-sm text-gray-600">
                                            {{ trabajadoresPorCentro[centro._id] || 0 }} {{ (trabajadoresPorCentro[centro._id] || 0) === 1 ? 'trabajador' : 'trabajadores' }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Indicador de selección -->
                            <div v-if="centroSeleccionado?._id === centro._id || (typeof centroSeleccionado === 'string' && centroSeleccionado === centro._id)" 
                                 class="opacity-100 transition-opacity duration-300 ml-2">
                                <i class="fas fa-check text-emerald-500 text-lg"></i>
                            </div>
                        </div>

                        <!-- Información de ubicación -->
                        <div class="space-y-1.5">
                            <div class="flex items-start gap-2">
                                <div class="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center mt-0.5">
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
                  </div>
                </div>
              </div>
          </div>

          <!-- Botones de acción -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              @click="cancelarTransferencia"
              class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
              :disabled="transferenciaEnProceso">
              Cancelar
            </button>
            <button
              @click="confirmarTransferencia"
              class="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!centroSeleccionado || !empresaSeleccionada || transferenciaEnProceso">
              <span v-if="transferenciaEnProceso" class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Transferiendo...
              </span>
              <span v-else>
                Transferir
              </span>
            </button>
          </div>
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