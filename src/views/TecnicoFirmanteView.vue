<script setup>
import { ref, inject, watchEffect, computed } from 'vue';
import { useTecnicoFirmanteStore } from '@/stores/tecnicoFirmante';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useUserStore } from '@/stores/user';
import { useRouter, RouterLink } from 'vue-router';
import { formatearTituloYNombreFirmante } from '@/helpers/nombres';

const tecnicoFirmante = useTecnicoFirmanteStore();
const proveedorSaludStore = useProveedorSaludStore();
const userStore = useUserStore();
const router = useRouter();

const firmaPreview = ref(null);
const firmaArchivo = ref(null);
const isDragOver = ref(false);

const formularioTecnicoFirmante = ref({
  nombre: "",
  primerApellido: "",
  segundoApellido: "",
  sexo: "",
  tituloProfesional: "",
  numeroCedulaProfesional: "",
  nombreCredencialAdicional: "",
  numeroCredencialAdicional: ""
});

watchEffect(() => {
  if (tecnicoFirmante.tecnicoFirmante) {
    Object.assign(formularioTecnicoFirmante.value, {
      nombre: tecnicoFirmante.tecnicoFirmante.nombre || "",
      primerApellido: tecnicoFirmante.tecnicoFirmante.primerApellido || "",
      segundoApellido: tecnicoFirmante.tecnicoFirmante.segundoApellido || "",
      sexo: tecnicoFirmante.tecnicoFirmante.sexo || "",
      tituloProfesional: tecnicoFirmante.tecnicoFirmante.tituloProfesional || "",
      numeroCedulaProfesional: tecnicoFirmante.tecnicoFirmante.numeroCedulaProfesional || "",
      nombreCredencialAdicional: tecnicoFirmante.tecnicoFirmante.nombreCredencialAdicional || "",
      numeroCredencialAdicional: tecnicoFirmante.tecnicoFirmante.numeroCredencialAdicional || ""
    });
  }
});

const toast = inject('toast');

const validateFile = (file) => {
  const validExtensions = ['.png', '.jpg', '.jpeg'];
  const maxSizeMB = 1;
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!validExtensions.includes(extension)) return { valid: false, message: 'Solo se permiten archivos: PNG, JPG, JPEG' };
  if (file.size > maxSizeMB * 1024 * 1024) return { valid: false, message: `El archivo es muy grande. Límite: ${maxSizeMB}MB` };
  return { valid: true };
};

const piePaginaFirmante = computed(() => ({
  nombre: formularioTecnicoFirmante.value.nombre || "",
  primerApellido: formularioTecnicoFirmante.value.primerApellido || "",
  segundoApellido: formularioTecnicoFirmante.value.segundoApellido || "",
  nombreCompleto: formatearTituloYNombreFirmante(formularioTecnicoFirmante.value),
  tituloProfesional: formularioTecnicoFirmante.value.tituloProfesional || "",
  numeroCedulaProfesional: formularioTecnicoFirmante.value.numeroCedulaProfesional || "",
  nombreCredencialAdicional: formularioTecnicoFirmante.value.nombreCredencialAdicional || "",
  numeroCredencialAdicional: formularioTecnicoFirmante.value.numeroCredencialAdicional || "",
  sexo: formularioTecnicoFirmante.value.sexo || ""
}));

const handleFileChange = (event) => {
  const file = event?.target?.files?.[0];
  if (file && file instanceof File) {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.open({ message: validation.message, type: 'error' });
      return;
    }
    firmaArchivo.value = file;
    const reader = new FileReader();
    reader.onload = (e) => { firmaPreview.value = e.target.result; };
    reader.readAsDataURL(file);
  } else {
    firmaPreview.value = null;
    firmaArchivo.value = null;
  }
};

const handleDragEnter = (event) => { event.preventDefault(); event.stopPropagation(); isDragOver.value = true; };
const handleDragLeave = (event) => { event.preventDefault(); event.stopPropagation(); if (!event.currentTarget.contains(event.relatedTarget)) { isDragOver.value = false; } };
const handleDragOver = (event) => { event.preventDefault(); event.stopPropagation(); };
const handleDrop = (event) => {
  event.preventDefault(); event.stopPropagation(); isDragOver.value = false;
  const files = Array.from(event.dataTransfer.files);
  if (files.length > 0) {
    const file = files[0];
    const validation = validateFile(file);
    if (!validation.valid) { toast.open({ message: validation.message, type: 'error' }); return; }
    firmaArchivo.value = file;
    const reader = new FileReader(); reader.onload = (e) => { firmaPreview.value = e.target.result; }; reader.readAsDataURL(file);
  }
};

const handleSubmit = async (data) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== "") { formData.append(key, value); } });
  formData.append('idUser', userStore.user?._id);
  if (firmaArchivo.value) { formData.append('firma', firmaArchivo.value); }
  try {
    let response;
    if (tecnicoFirmante.tecnicoFirmante?._id) {
      response = await tecnicoFirmante.updateTecnicoFirmanteById(tecnicoFirmante.tecnicoFirmante._id, formData);
    } else {
      response = await tecnicoFirmante.createTecnicoFirmante(formData);
    }
    toast.open({ message: response.message });
    const id = response.data._id || tecnicoFirmante.tecnicoFirmante?._id;
    if (id) { await tecnicoFirmante.loadTecnicoFirmanteById(id); }
  } catch (error) {
    console.error('Error al crear o actualizar el técnico firmante:', error);
    toast.open({ message: error.response?.data?.message || 'Error al guardar los datos del técnico firmante', type: 'error' });
  }
};

const volver = () => { router.push({ name: 'inicio' }); };

const baseURL = import.meta.env.VITE_API_URL || 'https://ramazzini.app';
const firmaSrc = computed(() => `${baseURL}/assets/signatories/${tecnicoFirmante.tecnicoFirmante.firma?.data}?t=${Date.now()}`);
</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
    <div class="relative bg-white text-gray-800 w-full max-w-5xl p-5 sm:p-8 lg:p-10 mt-2 sm:mt-4 rounded-lg shadow-lg mx-auto max-h-none overflow-visible lg:max-h-[82vh] lg:overflow-y-auto">
      <Transition appear name="fade-slow">
        <div v-if="tecnicoFirmante.loading"></div>
        <div v-else>
          <h1 class="text-3xl">Datos del técnico firmante</h1>
          <hr class="mt-2 mb-3">

          <FormKit type="form" :actions="false" incomplete-message="Por favor, valide que los datos sean correctos*" @submit="handleSubmit">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FormKit type="text" label="Nombre(s)" name="nombre" placeholder="Ej. Juan" validation="required" :validation-messages="{ required: 'Este campo es obligatorio' }" v-model="formularioTecnicoFirmante.nombre" />
              <FormKit type="text" label="Primer Apellido" name="primerApellido" placeholder="Ej. Pérez" validation="required" :validation-messages="{ required: 'Este campo es obligatorio' }" v-model="formularioTecnicoFirmante.primerApellido" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FormKit type="text" label="Segundo Apellido" name="segundoApellido" placeholder="Ej. Galeana" v-model="formularioTecnicoFirmante.segundoApellido" />
              <FormKit type="select" label="Sexo" name="sexo" placeholder='Selecciona "Masculino" o "Femenino"' :options="['Masculino', 'Femenino']" validation="required" :validation-messages="{ required: 'Este campo es obligatorio' }" v-model="formularioTecnicoFirmante.sexo" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FormKit type="text" label="Título Profesional" name="tituloProfesional" placeholder="Tec., Lic., Ing., etc." v-model="formularioTecnicoFirmante.tituloProfesional" />
              <FormKit type="text" :label="proveedorSaludStore.proveedorSalud?.pais === 'MX' ? 'Cédula Profesional' : 'Registro Profesional'" name="numeroCedulaProfesional" placeholder="Ej. 142988, REG-123456, CRM 123456" validation="cedulaProfesionalValidation" v-model="formularioTecnicoFirmante.numeroCedulaProfesional" :validation-messages="{ cedulaProfesionalValidation: 'El registro debe tener entre 3 y 20 caracteres (letras, números, guiones o espacios).' }" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FormKit type="text" label="Credencial/Certificación Adicional" name="nombreCredencialAdicional" placeholder="Ej. Certificado ante el CNMMT" v-model="formularioTecnicoFirmante.nombreCredencialAdicional" />
              <FormKit type="text" label="Número de Credencial Adicional" name="numeroCredencialAdicional" placeholder="Ej. 924" v-model="formularioTecnicoFirmante.numeroCredencialAdicional" />
            </div>

            <!-- Área de arrastrar y soltar para la firma -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mt-4 mb-2">Firma (Asegura que sea .png sin fondo, cuadrada, de al menos 500 x 500px)</label>
              <div 
                class="border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-all duration-200 cursor-pointer"
                :class="[
                  isDragOver 
                    ? 'border-emerald-500 bg-emerald-50 scale-105' 
                    : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
                ]"
                @dragenter="handleDragEnter"
                @dragleave="handleDragLeave"
                @dragover="handleDragOver"
                @drop="handleDrop"
                @click="$refs.firmaInput.click()"
              >
                <input
                  ref="firmaInput"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  @change="handleFileChange"
                  class="hidden"
                />
                
                <div class="text-gray-600">
                  <!-- Icono dinámico -->
                  <div class="mx-auto h-12 w-12 mb-4 transition-all duration-200" :class="isDragOver ? 'scale-110' : ''">
                    <div v-if="!isDragOver" class="flex items-center justify-center">
                      <svg class="h-12 w-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                        <path fill="#9ca3af" d="M192 192C192 174.3 206.3 160 224 160C241.7 160 256 174.3 256 192L256 199.8C256 227.5 253.6 255.1 248.9 282.3L164.5 307.6C123.9 319.8 96.1 357.2 96.1 399.6L96.1 432L24.1 432C10.8 432 .1 442.7 .1 456C.1 469.3 10.8 480 24.1 480L96.6 480C100.8 516 131.4 544 168.6 544C194.6 544 218.6 530.1 231.5 507.5L245.4 483.2C272.2 436.2 291.9 385.5 303.8 332.7L398.2 304.4L385.7 341.9C382.4 351.7 384.1 362.4 390.1 370.7C396.1 379 405.7 384 416 384L544 384C561.7 384 576 369.7 576 352C576 334.3 561.7 320 544 320L460.4 320L478.4 266.1C482.2 254.8 479.3 242.3 471 233.7C462.7 225.1 450.3 221.9 438.8 225.3L316.4 262.1C318.8 241.4 320 220.7 320 199.8L320 192C320 139 277 96 224 96C171 96 128 139 128 192L128 224C128 241.7 142.3 256 160 256C177.7 256 192 241.7 192 224L192 192zM182.8 369L231.8 354.3C221.4 388.1 207.3 420.7 189.7 451.5L175.8 475.8C174.3 478.4 171.5 480.1 168.4 480.1C163.7 480.1 159.9 476.3 159.9 471.6L159.9 399.7C159.9 385.6 169.2 373.1 182.7 369zM616 480C629.3 480 640 469.3 640 456C640 442.7 629.3 432 616 432L323.1 432C316.6 448.3 309.4 464.3 301.5 480L616 480z"/>
                      </svg>
                    </div>

                    <div v-else class="flex items-center justify-center">
                      <svg class="h-12 w-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
                        <path fill="#00bc7d" d="M192 128c0-17.7 14.3-32 32-32s32 14.3 32 32l0 7.8c0 27.7-2.4 55.3-7.1 82.5l-84.4 25.3c-40.6 12.2-68.4 49.6-68.4 92l0 32.4-72 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l72.5 0c4.2 36 34.8 64 72 64 26 0 50-13.9 62.9-36.5l13.9-24.3c26.8-47 46.5-97.7 58.4-150.5l94.4-28.3-12.5 37.5c-3.3 9.8-1.6 20.5 4.4 28.8S405.7 320 416 320l128 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-83.6 0 18-53.9c3.8-11.3 .9-23.8-7.4-32.4s-20.7-11.8-32.2-8.4L316.4 198.1c2.4-20.7 3.6-41.4 3.6-62.3l0-7.8c0-53-43-96-96-96s-96 43-96 96l0 32c0 17.7 14.3 32 32 32s32-14.3 32-32l0-32zm-9.2 177l49-14.7c-10.4 33.8-24.5 66.4-42.1 97.2l-13.9 24.3c-1.5 2.6-4.3 4.3-7.4 4.3-4.7 0-8.5-3.8-8.5-8.5l0-71.9c0-14.1 9.3-26.6 22.8-30.7zM616 416c13.3 0 24-10.7 24-24s-10.7-24-24-24l-292.9 0c-6.5 16.3-13.7 32.3-21.6 48L616 416z"/>
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Texto dinámico -->
                  <p class="text-lg font-medium transition-colors duration-200" :class="isDragOver ? 'text-emerald-700' : ''">
                    {{ isDragOver ? '¡Suelta la firma aquí!' : 'Arrastra la firma aquí o haz clic para seleccionar' }}
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

            <div class="flex flex-col xl:flex-row justify-center items-stretch xl:items-center gap-6 mt-4">
              <div v-if="piePaginaFirmante.nombre" class="w-full xl:w-1/2 flex flex-col items-center xl:items-start">
                <p class="font-medium text-lg text-gray-700 text-center xl:text-left">Pie de Página del Técnico Firmante:</p>
                <div class="w-full max-w-md mt-4 p-4 border rounded-lg bg-gray-50 text-center xl:text-left">
                  <p class="text-sm text-gray-800 space-y-1">
                    <span class="font-medium" v-if="piePaginaFirmante.nombre">{{ piePaginaFirmante.nombreCompleto }}</span><br v-if="piePaginaFirmante.nombre">
                    <span v-if="piePaginaFirmante.numeroCedulaProfesional" class="font-light">{{ proveedorSaludStore.proveedorSalud.pais === 'MX' ? 'Cédula Profesional No.' : 'Registro Profesional No.' }} {{ piePaginaFirmante.numeroCedulaProfesional }}</span><br v-if="piePaginaFirmante.numeroCedulaProfesional">
                    <span v-if="piePaginaFirmante.nombreCredencialAdicional" class="font-light block truncate overflow-hidden text-ellipsis whitespace-nowrap max-w-[390px]">{{ piePaginaFirmante.nombreCredencialAdicional }} No. {{ piePaginaFirmante.numeroCredencialAdicional }}</span>
                    <span v-if="piePaginaFirmante.sexo" class="font-light">{{ piePaginaFirmante.sexo === 'Femenino' ? 'Responsable de evaluación' : 'Responsable de evaluación' }}</span>
                  </p>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row justify-center items-center gap-4">
                <div v-if="tecnicoFirmante.tecnicoFirmante?.firma?.data" class="w-full sm:w-1/2 flex flex-col items-center">
                  <p class="font-medium text-lg text-gray-700">Firma actual:</p>
                  <img :src="firmaSrc" :alt="'Firma de ' + tecnicoFirmante.tecnicoFirmante.nombre" class="w-40 h-40 sm:w-48 sm:h-48 object-contain mt-2 border-2 border-gray-300 rounded-lg"/>
                </div>
                <Transition appear name="fade-slow">
                  <div v-if="firmaPreview" class="w-full sm:w-1/2 flex flex-col items-center">
                    <p class="font-medium text-lg text-gray-700">Firma Nueva:</p>
                    <img :src="firmaPreview" alt="Vista previa de la firma" class="w-40 h-40 sm:w-48 sm:h-48 object-contain mt-2 border-2 border-gray-300 rounded-lg" />
                  </div>
                </Transition>
              </div>
            </div>

            <hr class="my-3">
            <div class="flex flex-col sm:flex-row justify-between items-center gap-2">
              <RouterLink :to="{ name: 'inicio' }" class="nav-action-link block text-center text-lg w-full sm:w-1/2 rounded-lg bg-white font-medium text-gray-800 shadow-sm ring-2 ring-inset ring-gray-300 hover:bg-gray-100 p-3 transition-transform duration-300 transform hover:scale-105 hover:shadow-lg mb-1">Volver</RouterLink>
              <div class="w-full sm:w-1/2 pr-2">
                <FormKit type="submit">
                  <span v-if="tecnicoFirmante.loading">Guardando...</span>
                  <span v-else>Actualizar Datos</span>
                </FormKit>
              </div>
            </div>
          </FormKit>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.fade-slow-enter-from,
.fade-slow-leave-to { opacity: 0; }
.fade-slow-enter-active,
.fade-slow-leave-active { transition: all 500ms ease-out; }
.fade-slow-leave-active { transition-delay: 250ms; }
</style>


