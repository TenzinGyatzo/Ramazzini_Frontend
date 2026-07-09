<script setup>
import { ref, inject, computed, watch, onUnmounted } from "vue";
import { useProveedorSaludStore } from "@/stores/proveedorSalud";
import { useUserStore } from "@/stores/user";
import { useRouter, RouterLink } from "vue-router";
import CountryPhoneInput from "@/components/CountryPhoneInput.vue";
import CountrySelect from "@/components/CountrySelect.vue";
import CLUESAutocomplete from "@/components/selectors/CLUESAutocomplete.vue";
import MexicoGeoSelect from "@/components/selectors/MexicoGeoSelect.vue";
import CPAutocomplete from "@/components/selectors/CPAutocomplete.vue";
import { useNom024Fields } from "@/composables/useNom024Fields";
import ChangeRegimenModal from "@/components/onboarding/ChangeRegimenModal.vue";
import { processProviderLogo } from "@/helpers/processProviderLogo";

const proveedorSalud = useProveedorSaludStore();
const userStore = useUserStore();
const router = useRouter();

const logotipoPreview = ref(null);
const logotipoArchivo = ref(null);
const procesandoLogotipo = ref(false);
const isDragOver = ref(false);  // Para el estado de drag and drop
const toast = inject("toast");

// URL de objeto de la vista previa, para liberarla al reemplazar o desmontar
let previewObjectUrl = null;

const revokePreviewUrl = () => {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
};

onUnmounted(revokePreviewUrl);

const colorInforme = ref("#343A40");
const semaforizacionActivada = ref(false);

const isMX = computed(() => formulario.value.pais === 'MX');
const { cluesFieldVisible } = useNom024Fields();

const showChangeRegimenModal = ref(false);
const canChangeRegimenRegulatorio = computed(
  () => userStore.user?.role === 'Principal',
);

// Objeto reactivo para el formulario
const formulario = ref({
  nombre: "",
  direccion: "",
  municipio: "",
  estado: "",
  telefono: "",
  sitioWeb: "",
  pais: "",
  correoElectronico: "",
  perfilProveedorSalud: "", 
  codigoPostal: "",
  clues: ""
});

// Cargar los valores iniciales del proveedor en el formulario
watch(
  () => proveedorSalud.proveedorSalud,
  (proveedor) => {
    if (!proveedor?._id) return;

    const estadoValue = proveedor.estado;
    const municipioValue = proveedor.municipio;
    const codigoPostalValue = proveedor.codigoPostal;

    Object.assign(formulario.value, {
      nombre: proveedor.nombre ?? "",
      direccion: proveedor.direccion ?? "",
      municipio: typeof municipioValue === 'string' ? (municipioValue || "") : (municipioValue ? String(municipioValue) : ""),
      estado: typeof estadoValue === 'string' ? (estadoValue || "") : (estadoValue ? String(estadoValue) : ""),
      telefono: proveedor.telefono ?? "",
      sitioWeb: proveedor.sitioWeb ?? "",
      pais: proveedor.pais ?? "",
      correoElectronico: proveedor.correoElectronico ?? "",
      perfilProveedorSalud: proveedor.perfilProveedorSalud ?? "",
      codigoPostal: typeof codigoPostalValue === 'string' ? (codigoPostalValue || "") : (codigoPostalValue ? String(codigoPostalValue) : ""),
      clues: proveedor.clues ?? ""
    });

    colorInforme.value = proveedor.colorInforme || "#343A40";
    semaforizacionActivada.value = proveedor.semaforizacionActivada ?? false;
  },
  { immediate: true },
);

// Limpiar campos geográficos si se cambia de país
watch(() => formulario.value.pais, (newPais, oldPais) => {
  if (oldPais && newPais !== oldPais) {
    // Limpiar campos geográficos cuando cambia el país
    formulario.value.estado = "";
    formulario.value.municipio = "";
    formulario.value.codigoPostal = "";
    // Si cambia de MX a otro país, también limpiar CLUES
    if (oldPais === 'MX' && newPais !== 'MX') {
      formulario.value.clues = "";
    }
  }
});

const handleCPSelect = (data) => {
  if (data) {
    formulario.value.estado = data.estado;
    formulario.value.municipio = data.municipio;
    
    // Opcional: Si no hay dirección, sugerir la colonia
    if (data.asentamiento && !formulario.value.direccion) {
      formulario.value.direccion = `Colonia ${data.asentamiento}`;
    }
  }
};

// Función para validar archivo
const validateFile = (file) => {
  const validExtensions = ['.png', '.jpg', '.jpeg'];
  const maxSizeMB = 1;
  
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!validExtensions.includes(extension)) {
    return { valid: false, message: 'Solo se permiten archivos: PNG, JPG, JPEG' };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, message: `El archivo es muy grande. Límite: ${maxSizeMB}MB` };
  }
  return { valid: true };
};

// Computed Reactivo para el Pie de Página del Informe
const piePaginaInforme = computed(() => ({
  nombre: formulario.value.nombre || "",
  direccion: formulario.value.direccion || "",
  municipio: formulario.value.municipio || "",
  estado: formulario.value.estado || "",
  telefono: formatearTelefono(formulario.value.telefono),
  sitioWeb: formulario.value.sitioWeb || "",
  RFC: formulario.value.RFC || "",
  correoElectronico: formulario.value.correoElectronico || ""
}));

// Función para formatear el teléfono internacional
function formatearTelefono(telefono) {
  if (!telefono) {
    return ''; 
  }
  
  // Si el teléfono ya tiene formato internacional (+52XXXXXXXXXX)
  if (telefono.startsWith('+')) {
    // Buscar el país correspondiente para obtener el código
    const countries = [
      { code: 'MX', dialCode: '+52' },
      { code: 'AR', dialCode: '+54' },
      { code: 'BR', dialCode: '+55' },
      { code: 'CL', dialCode: '+56' },
      { code: 'CO', dialCode: '+57' },
      { code: 'PE', dialCode: '+51' },
      { code: 'VE', dialCode: '+58' },
      { code: 'UY', dialCode: '+598' },
      { code: 'PY', dialCode: '+595' },
      { code: 'BO', dialCode: '+591' },
      { code: 'EC', dialCode: '+593' },
      { code: 'GT', dialCode: '+502' },
      { code: 'CR', dialCode: '+506' },
      { code: 'PA', dialCode: '+507' },
      { code: 'HN', dialCode: '+504' },
      { code: 'NI', dialCode: '+505' },
      { code: 'SV', dialCode: '+503' },
      { code: 'CU', dialCode: '+53' },
      { code: 'DO', dialCode: '+1' },
      { code: 'PR', dialCode: '+1' }
    ];
    
    // Encontrar el país por código de marcación
    const country = countries.find(c => telefono.startsWith(c.dialCode));
    if (country) {
      const numeroLocal = telefono.replace(country.dialCode, '');
      return `(${country.dialCode}) ${numeroLocal}`;
    }
  }
  
  // Si es un número local de 10 dígitos (México)
  if (telefono.length === 10 && /^\d{10}$/.test(telefono)) {
    return `(+52) ${telefono}`;
  }
  
  // Si es un número local de otros países (8-11 dígitos)
  if (telefono.length >= 8 && telefono.length <= 11 && /^\d+$/.test(telefono)) {
    return `(+XX) ${telefono}`;
  }
  
  // Si no coincide con ningún formato conocido, devolver tal como está
  return telefono;
}

// Lista de opciones de colores predefinidos
const colorOptions = [
  { name: "Gris Oscuro", hex: "#343A40" },
  { name: "Gris", hex: "#6C757D" },
  // { name: "Gris Claro", hex: "#F8F9FA" },
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

// Valida y procesa el logotipo (fondo, recorte, padding, 500x500 PNG) antes de usarlo
const handleLogoSelection = async (file) => {
  const validation = validateFile(file);
  if (!validation.valid) {
    toast.open({ message: validation.message, type: 'error' });
    return;
  }

  procesandoLogotipo.value = true;
  try {
    const { file: processed, warnings } = await processProviderLogo(file);
    logotipoArchivo.value = processed;
    revokePreviewUrl();
    previewObjectUrl = URL.createObjectURL(processed);
    logotipoPreview.value = previewObjectUrl;
    warnings.forEach((warning) => {
      toast.open({ message: warning, type: 'warning' });
    });
  } catch (error) {
    console.error('Error al procesar el logotipo:', error);
    toast.open({
      message: 'No se pudo procesar el logotipo, por favor intenta con otra imagen.',
      type: 'error',
    });
    revokePreviewUrl();
    logotipoPreview.value = null;
    logotipoArchivo.value = null;
  } finally {
    procesandoLogotipo.value = false;
  }
};

const handleFileChange = (event) => {
  const file = event?.target?.files?.[0];
  if (file && file instanceof File) {
    handleLogoSelection(file);
  } else {
    revokePreviewUrl();
    logotipoPreview.value = null;
    logotipoArchivo.value = null;
  }
};

// Eventos de drag and drop
const handleDragEnter = (event) => {
  event.preventDefault();
  event.stopPropagation();
  isDragOver.value = true;
};

const handleDragLeave = (event) => {
  event.preventDefault();
  event.stopPropagation();
  // Solo cambiar a false si salimos del área de drop
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDragOver.value = false;
  }
};

const handleDragOver = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

const handleDrop = (event) => {
  event.preventDefault();
  event.stopPropagation();
  isDragOver.value = false;

  if (procesandoLogotipo.value) return;

  const files = Array.from(event.dataTransfer.files);
  if (files.length > 0) {
    handleLogoSelection(files[0]); // Solo tomamos el primer archivo
  }
};

// Función auxiliar para normalizar valores geográficos a strings
const normalizeGeoValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value !== null) {
    // Si es un objeto, intentar extraer el valor útil
    if (value.code) return String(value.code).trim();
    if (value.value) return String(value.value).trim();
    if (value.description) return String(value.description).trim();
    return '';
  }
  return String(value).trim();
};

const handleSubmit = async (data) => {
  const formData = new FormData();
  const proveedorActual = proveedorSalud.proveedorSalud;
  const isUpdate = !!proveedorActual?._id;

  // Agregar solo los campos con valores definidos, pero asegurar que campos geográficos sean strings
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Campos geográficos deben ser siempre strings
      if (key === 'estado' || key === 'municipio' || key === 'codigoPostal') {
        const stringValue = typeof value === 'string' ? value : String(value || '');
        if (stringValue) {
          formData.append(key, stringValue);
        }
      } else {
        formData.append(key, value);
      }
    }
  });

  // Agregar personalización de informes
  formData.append("colorInforme", colorInforme.value);
  formData.append("semaforizacionActivada", semaforizacionActivada.value);
  
  // Agregar teléfono del formulario (CountryPhoneInput no es FormKit)
  if (formulario.value.telefono) {
    formData.append("telefono", formulario.value.telefono);
  }

  // CountrySelect no es FormKit. En actualización solo enviar país si cambió,
  // porque el backend revalida régimen regulatorio al recibir este campo.
  if (
    formulario.value.pais &&
    (!isUpdate || formulario.value.pais !== proveedorActual?.pais)
  ) {
    formData.append("pais", formulario.value.pais);
  }

  // Sobrescribir campos geográficos desde formulario.value para asegurar que siempre sean strings válidos
  // Esto es importante porque pueden venir como objetos desde componentes de autocomplete
  const cpValue = normalizeGeoValue(formulario.value.codigoPostal);
  formData.delete("codigoPostal");
  if (cpValue) {
    formData.append("codigoPostal", cpValue);
  }
  
  const estadoValue = normalizeGeoValue(formulario.value.estado);
  formData.delete("estado");
  if (estadoValue) {
    formData.append("estado", estadoValue);
  }
  
  const municipioValue = normalizeGeoValue(formulario.value.municipio);
  formData.delete("municipio");
  if (municipioValue) {
    formData.append("municipio", municipioValue);
  }

  // CLUES opcional: solo si se incluye en el payload; si ya existía y se deja vacío, enviar "" para borrarlo
  const cluesValue = (formulario.value.clues || "").trim();
  const hadClues = (proveedorActual?.clues || "").trim() !== "";
  if (cluesValue) {
    formData.append("clues", cluesValue);
  } else if (isUpdate && hadClues) {
    formData.append("clues", "");
  }

  // Asegurar que solo se agrega un archivo válido
  if (logotipoArchivo.value instanceof File) {
    formData.append("logotipoEmpresa", logotipoArchivo.value);
  }

  // 🚀 Eliminar logotipoEmpresa si sigue en FormData como un string vacío
  if (formData.get("logotipoEmpresa") === "") {
    formData.delete("logotipoEmpresa");
  }

  // Depuramos el contenido de FormData
  // for (let [key, value] of formData.entries()) {
  //     console.log(`${key}:`, value);
  // }

  try {
    let response;

    if (proveedorSalud.proveedorSalud._id) {
      // Actualizar proveedor existente
      response = await proveedorSalud.updateProveedorById(
        proveedorSalud.proveedorSalud._id,
        formData
      );
    } else {
      // Crear nuevo proveedor
      response = await proveedorSalud.createProveedor(formData);
    }

    toast.open({
      message: response.message,
    });
  } catch (error) {
    console.error("Error al crear o actualizar el proveedor:", error);
    alert(
      "Hubo un error al crear o actualizar el proveedor, por favor intente nuevamente."
    );
  }
};

const volver = () => {
  router.push({ name: "inicio" });
};

const handleRegimenChange = async (reason) => {
  try {
    await proveedorSalud.changeRegimenRegulatorio('SIRES_NOM024', reason);
    toast.open({
      message: 'Régimen regulatorio actualizado exitosamente',
      type: 'success'
    });
    showChangeRegimenModal.value = false;
  } catch (error) {
    console.error('Error al cambiar régimen regulatorio:', error);
    toast.open({
      message: error.response?.data?.message || 'Error al cambiar régimen regulatorio',
      type: 'error'
    });
  }
};

const perfiles = [
  "Médico único de empresa",
  "Médico independiente que brinda servicios a empresas",
  "Empresa de salud ocupacional",
  "Equipo Médico Interno de la Empresa",
  "Otro",
];

const estadosDeMexico = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Coahuila",
  "Colima",
  "Durango",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Estado de México",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
];

const baseURL = import.meta.env.VITE_API_URL || 'https://ramazzini.app';
// console.log('baseURL:', baseURL);

const logoSrc = computed(() => {
  return `${baseURL}/assets/providers-logos/${proveedorSalud.proveedorSalud.logotipoEmpresa?.data}?t=${Date.now()}`;
});
// console.log('logoSrc:', logoSrc.value);

</script>

<template>
    <!-- <Transition appear name="fade-slow"> -->
    <Transition appear mode="out-in" name="slide-up">
    <div>
      <div
        class="form-green-submit relative bg-white text-gray-800 w-full max-w-5xl p-5 sm:p-8 lg:p-10 mt-2 sm:mt-4 rounded-lg shadow-lg mx-auto max-h-none overflow-visible lg:max-h-[82vh] lg:overflow-y-auto">
      <Transition appear name="fade-slow">
        <div v-if="proveedorSalud.loading && !proveedorSalud.proveedorSalud" class="py-12 text-center text-gray-500">
          <i class="fas fa-spinner fa-spin text-2xl text-emerald-600"></i>
        </div>
        <div v-else>
          <h1 class="text-3xl">Perfil de Proveedor de Servicios de Salud Ocupacional</h1>
          <hr class="mt-2 mb-3" />

          <!-- <div class="bg-amber-100 text-amber-800 p-3 rounded-md mb-4 flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 8v.01M3 3l18 18M9 13h6m-3 0v6m0 0l3-3m-3 3l-3-3" />
            </svg>
            <p class="font-medium">
              Los datos capturados en este formulario aparecerán automáticamente en el pie de página de sus informes.
            </p>
          </div> -->

          <FormKit type="form" :actions="false" incomplete-message="Por favor, valide que los datos sean correctos*"
            @submit="handleSubmit">
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4">
              <FormKit type="text" name="nombre"
                placeholder="¿Cual es tu nombre, denominación o razón social?" validation="required"
                :validation-messages="{ required: 'Este campo es obligatorio' }"
                v-model="formulario.nombre">
                <template #label>
                  <span class="font-medium text-lg text-gray-700">Razón Social, nombre o denominación<span class="text-red-500">*</span></span>
                </template>
              </FormKit>

              <CountrySelect
                label="País"
                placeholder="Selecciona tu país"
                v-model="formulario.pais"
                validation="required"
              />

              <FormKit type="select" name="perfilProveedorSalud"
                placeholder="Selecciona el que te describa mejor:" :options="perfiles" validation="required"
                :validation-messages="{ required: 'Este campo es obligatorio' }"
                v-model="formulario.perfilProveedorSalud">
                <template #label>
                  <span class="font-medium text-lg text-gray-700">Perfil de proveedor<span class="text-red-500">*</span></span>
                </template>
              </FormKit>

              <!-- Campo Código Postal -->
              <template v-if="isMX">
                <CPAutocomplete
                  v-model="formulario.codigoPostal"
                  @select="handleCPSelect"
                  label="Código Postal"
                  placeholder="Ej. 44100, Colinas del Río..."
                />
              </template>
              <template v-else>
                <FormKit type="text" label="Código Postal" name="codigoPostal" placeholder="Ej. 44100, 1000, 01000"
                  validation="postalCodeValidation" v-model="formulario.codigoPostal"
                  :validation-messages="{
                    postalCodeValidation:
                      'El código postal debe tener entre 4 y 10 dígitos.',
                  }" />
              </template>

              <!-- Ubicación Geográfica (NOM-024 para México) -->
              <template v-if="isMX">
                <div class="sm:col-span-2">
                  <MexicoGeoSelect
                    v-model:estado="formulario.estado"
                    v-model:municipio="formulario.municipio"
                  />
                </div>
              </template>

              <template v-else>
                <FormKit type="text" :label="proveedorSalud.proveedorSalud?.pais === 'MX' ? 'Estado' : 'Región/Provincia/Estado'" name="estado" placeholder="Ej. Estado de México, Buenos Aires, São Paulo"
                  v-model="formulario.estado" />

                <FormKit type="text" :label="proveedorSalud.proveedorSalud?.pais === 'PA' ? 'Ciudad/Corregimiento' : 'Ciudad/Municipio'" name="municipio" placeholder="Ej. Ciudad de México, Bogotá, Lima"
                  v-model="formulario.municipio" />
              </template>

              <FormKit type="text" label="Dirección (Calle, número y colonia)" name="direccion"
                placeholder="Ej. Calle Madero #123, Colonia Centro" v-model="formulario.direccion" />

              <CountryPhoneInput
                label="Teléfono"
                placeholder="Número local"
                v-model="formulario.telefono"
                :initial-country="formulario.pais"
              />

              <FormKit type="text" label="Correo Electrónico" name="correoElectronico"
                placeholder="Correo electrónico del proveedor" validation="mailValidation"
                v-model="formulario.correoElectronico" :validation-messages="{
                  mailValidation:
                    'El correo electrónico ingresado no es válido.',
                }" />

              <FormKit type="text" label="Sitio Web" name="sitioWeb" placeholder="Sitio web del proveedor"
                validation="urlValidation" v-model="formulario.sitioWeb" :validation-messages="{
                  urlValidation: 'El sitio web ingresado no es válido.',
                }" />

              <!-- Selector de Color -->
              <div>
                <label class="block mt-4 font-medium text-lg text-gray-700">Color del informe</label>
                <div class="flex flex-wrap gap-2">
                  <button
                  v-for="color in colorOptions"
                  :key="color.hex"
                  :style="{ backgroundColor: color.hex }"
                  class="w-10 h-10 rounded-full border-2 transition-all duration-200"
                  :class="colorInforme === color.hex ? 'border-black scale-110 shadow-lg' : 'border-gray-300'"
                  @click.prevent="colorInforme = color.hex"
                  :title="color.name"
                  >
                  <span v-if="colorInforme === color.hex" class="absolute text-white top-0.5 right-2.5 text-2xl">
                    ✓
                  </span>
                  </button>
                </div>
                <p class="mt-2 text-sm text-gray-600">Color seleccionado: <span class="font-semibold">{{ colorOptions.find(c => c.hex === colorInforme)?.name }}</span></p>
              </div>

              <!-- Switch para Activar Semaforización -->
              <div>
                <label class="block mt-4 font-medium text-lg text-gray-700">Activar Semaforización de Resultados🚦</label>
                
                <button
                  type="button"
                  @click="semaforizacionActivada = !semaforizacionActivada"
                  :class="semaforizacionActivada ? 'bg-emerald-500' : 'bg-gray-300'"
                  class="relative w-14 h-7 rounded-full transition-colors"
                >
                  <span 
                    class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform"
                    :class="semaforizacionActivada ? 'translate-x-7' : ''">
                  </span>
                </button>
                <p class="mt-2 text-sm text-gray-600 hidden sm:block">La semaforización permite el uso de colores en los resultados de los informes (<span class="text-emerald-700">Apto sin restricciones</span>, <span class="text-amber-700">Apto con restricciones</span>, <span class="text-red-700">No apto</span>) haciéndolo más claro y fácil de entender.</p>
              </div>

              <!-- Campo CLUES (NOM-024) -->
              <CLUESAutocomplete
                v-if="cluesFieldVisible"
                class="sm:col-span-2 mb-4"
                v-model="formulario.clues"
                :required="false"
              />

              <!-- Banner de setup incompleto SIRES -->
              <!-- <div
                v-if="proveedorSalud.isSIRES && !proveedorSalud.proveedorSalud?.clues"
                class="sm:col-span-2 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div class="flex items-start gap-2">
                  <i class="fa-solid fa-exclamation-triangle text-amber-600 mt-0.5"></i>
                  <div>
                    <p class="font-medium text-amber-800 mb-1">
                      Configuración SIRES incompleta
                    </p>
                    <p class="text-sm text-amber-700">
                      Completa tu CLUES para habilitar todas las funcionalidades SIRES.
                    </p>
                  </div>
                </div>
              </div> -->

              <!-- Sección Régimen Regulatorio -->
              <div class="sm:col-span-2 mb-4 p-4 border rounded-lg bg-gray-50">
                <h3 class="font-medium text-lg text-gray-700 mb-3">
                  Régimen Regulatorio
                </h3>
                
                <!-- Estado actual -->
                <div class="mb-3">
                  <p class="text-sm text-gray-600">
                    Estado actual: 
                    <span class="font-semibold">
                      {{ proveedorSalud.proveedorSalud?.regimenRegulatorio === 'SIRES_NOM024' 
                        ? 'SIRES (NOM-024-SSA3-2012)' 
                        : 'Sin régimen regulatorio' }}
                    </span>
                  </p>
                </div>

                <!-- Si es SIN_REGIMEN: mostrar CTA para upgrade (solo Principal) -->
                <div v-if="proveedorSalud.isSinRegimen && canChangeRegimenRegulatorio">
                  <button 
                    @click="showChangeRegimenModal = true"
                    type="button"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    <i class="fa-solid fa-arrow-up mr-2"></i>
                    Activar SIRES (NOM-024-SSA3-2012)
                  </button>
                </div>
                <p
                  v-else-if="proveedorSalud.isSinRegimen"
                  class="text-sm text-gray-500"
                >
                  Solo el usuario principal puede activar SIRES.
                </p>

                <!-- Si es SIRES: mostrar estado y bloqueo de downgrade -->
                <div v-else-if="proveedorSalud.isSIRES">
                  <div class="bg-green-50 border border-green-200 rounded p-3 mb-2">
                    <p class="text-sm text-green-800">
                      <i class="fa-solid fa-check-circle mr-2"></i>
                      SIRES activo. Las funcionalidades regulatorias están habilitadas.
                    </p>
                  </div>
                  <p class="text-xs text-gray-500">
                    Para desactivar SIRES, contacta a soporte.
                  </p>
                </div>
              </div>

            </div>

            <!-- Área de arrastrar y soltar para el logotipo -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Logotipo (Se optimizará automáticamente a PNG de 500 x 500px sin fondo claro. Para mejores resultados, usa un logo sobre fondo blanco o un PNG transparente)</label>
              <div 
                class="border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-all duration-200"
                :class="[
                  procesandoLogotipo
                    ? 'border-gray-300 bg-gray-50 cursor-wait opacity-70'
                    : isDragOver 
                      ? 'border-emerald-500 bg-emerald-50 scale-105 cursor-pointer' 
                      : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50 cursor-pointer'
                ]"
                @dragenter="handleDragEnter"
                @dragleave="handleDragLeave"
                @dragover="handleDragOver"
                @drop="handleDrop"
                @click="!procesandoLogotipo && $refs.logotipoInput.click()"
              >
                <input
                  ref="logotipoInput"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  @change="handleFileChange"
                  class="hidden"
                />
                
                <!-- Estado de procesamiento -->
                <div v-if="procesandoLogotipo" class="text-gray-600 py-4">
                  <i class="fas fa-spinner fa-spin text-3xl text-emerald-600 mb-3"></i>
                  <p class="text-lg font-medium">Optimizando logotipo...</p>
                </div>

                <div v-else class="text-gray-600">
                  <!-- Icono dinámico -->
                  <div class="mx-auto h-12 w-12 mb-4 transition-all duration-200" :class="isDragOver ? 'scale-110' : ''">
                    <div v-if="!isDragOver" class="flex items-center justify-center">
                      <svg class="h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </div>

                    <div v-else class="flex items-center justify-center">
                      <svg class="h-12 w-12 text-emerald-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Texto dinámico -->
                  <p class="text-lg font-medium transition-colors duration-200" :class="isDragOver ? 'text-emerald-700' : ''">
                    {{ isDragOver ? '¡Suelta el logotipo aquí!' : 'Arrastra el logotipo aquí o haz clic para seleccionar' }}
                  </p>
                  <p class="text-sm text-gray-500 mt-2">PNG, JPG, JPEG (máximo 1MB)</p>
                  
                  <!-- Indicador visual cuando se arrastra -->
                  <div v-if="isDragOver" class="mt-3">
                    <div class="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      Listo para soltar
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mostrar la vista previa del logotipo -->
            <div class="flex flex-col md:flex-row items-stretch xl:items-center justify-center gap-6">
              <div class="flex flex-col md:flex-row items-stretch xl:items-center justify-center gap-6">
              </div>
              <div v-if="proveedorSalud.proveedorSalud?.logotipoEmpresa?.data" class="w-full sm:w-2/3 xl:w-1/3 flex flex-col items-center text-center xl:text-left mx-auto">
                <p class="font-medium text-lg text-gray-700 mb-2">
                  Logotipo actual:
                </p>
                <img
                  :src="logoSrc"
                  :alt="'Logo de ' + proveedorSalud.proveedorSalud.nombre"
                  class="w-40 h-40 sm:w-48 sm:h-48 object-contain border-2 border-gray-300 rounded-lg"
                />
              </div>

              <Transition appear name="fade-slow">
                <div v-if="logotipoPreview" class="w-full sm:w-2/3 xl:w-1/3 flex flex-col items-center text-center xl:text-left mx-auto">
                  <p v-if="proveedorSalud.proveedorSalud?.logotipoEmpresa?.data" class="font-medium text-lg text-gray-700 mb-2">
                    Logotipo nuevo:
                  </p>
                  <p v-else class="font-medium text-lg text-gray-700 mb-2">
                    Logotipo:
                  </p>
                  <img :src="logotipoPreview" alt="Vista previa del logotipo"
                    class="w-40 h-40 sm:w-48 sm:h-48 object-contain border-2 border-gray-300 rounded-lg" />
                </div>
              </Transition>
              
              <!-- Vista previa del Pie de Página del Informe -->
              <div v-if="piePaginaInforme.nombre" class="w-full xl:w-1/2 flex flex-col items-center xl:items-end">
                <p class="font-medium text-lg text-gray-700 text-right w-full max-w-md">
                  Pie de Página en Informes:
                </p>
                <div class="w-full max-w-md mt-4 p-4 border rounded-lg bg-gray-50 text-right">                  
                  <p class="text-sm text-gray-800 italic space-y-1">
                    <span v-if="piePaginaInforme.nombre" class="font-medium">{{ piePaginaInforme.nombre }}</span><br v-if="piePaginaInforme.nombre">
                    
                    <span v-if="piePaginaInforme.direccion" class="font-light">{{ piePaginaInforme.direccion }}</span><br v-if="piePaginaInforme.direccion">
                    
                    <span class="font-light" v-if="piePaginaInforme.municipio || piePaginaInforme.estado">
                      <span v-if="piePaginaInforme.municipio">{{ piePaginaInforme.municipio }}</span>
                      <span v-if="piePaginaInforme.municipio && piePaginaInforme.estado">, </span>
                      <span v-if="piePaginaInforme.estado">{{ piePaginaInforme.estado }}, </span>
                      <span v-if="piePaginaInforme.telefono">Tel. {{ piePaginaInforme.telefono }}</span>
                    </span><br v-if="piePaginaInforme.municipio || piePaginaInforme.estado || piePaginaInforme.telefono">
                    
                    <span v-if="piePaginaInforme.sitioWeb" class="font-light text-blue-700">{{ piePaginaInforme.sitioWeb }}</span>
                  </p>
                </div>
              </div>
            </div>

            <hr class="my-3" />
            <div class="form-action-buttons flex flex-col sm:flex-row justify-between gap-2">
              <!-- Botón de Volver -->
              <RouterLink :to="{ name: 'inicio' }"
                class="nav-action-link flex items-center justify-center text-lg w-full sm:w-1/2 rounded-lg bg-white font-medium text-gray-800 shadow-sm ring-2 ring-inset ring-gray-300 hover:bg-gray-100 p-3 transition-transform duration-300 transform hover:scale-105 hover:shadow-lg">
                Volver
              </RouterLink>
              <!-- Botón de Actualizar -->
              <div class="w-full sm:w-1/2">
                <FormKit type="submit">
                  <span v-if="proveedorSalud.saving">Guardando...</span>
                  <span v-else>Actualizar Datos</span>
                </FormKit>
              </div>
            </div>
          </FormKit>
        </div>
      </Transition>
      </div>

      <!-- Modal de cambio de régimen -->
      <ChangeRegimenModal
        v-if="showChangeRegimenModal"
        @close="showChangeRegimenModal = false"
        @confirm="handleRegimenChange"
      />
    </div>
  </Transition>
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
