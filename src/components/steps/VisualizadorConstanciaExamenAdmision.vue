<script setup lang="ts">
/**
 * Vista previa de la Constancia de examen médico de admisión (punto 35), con el mismo diseño
 * que el PDF: logotipo arriba a la izquierda y título centrado debajo. Firma el médico; si el
 * usuario no tiene perfil de médico, la enfermera.
 */
import { computed, watch } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { useMedicoFirmanteStore } from '@/stores/medicoFirmante';
import { useEnfermeraFirmanteStore } from '@/stores/enfermeraFirmante';
import { useUserStore } from '@/stores/user';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { formatearTituloYNombreFirmante } from '@/helpers/nombres';
import { toTitleCase } from '@/helpers/toTitleCase';
import {
  conclusionConstanciaAdmision,
  fechaConDiaDeLaSemana,
  lugarDelProveedor,
  nombreConstanciaAdmision,
} from '@/helpers/constanciaExamenAdmision';
import EstadoDocumentoBadgeAlt from '../badges/EstadoDocumentoBadgeAlt.vue';

const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const steps = useStepsStore();
const medicoFirmanteStore = useMedicoFirmanteStore();
const enfermeraFirmanteStore = useEnfermeraFirmanteStore();
const userStore = useUserStore();
const proveedorSaludStore = useProveedorSaludStore();

const proveedorSalud = computed(() => proveedorSaludStore.proveedorSalud as any);
const documento = computed(() => formData.formDataConstanciaExamenAdmision as any);
const trabajador = computed(() => trabajadores.currentTrabajador as any);

watch(
  () => userStore.user?._id,
  (id) => {
    if (!id) return;
    medicoFirmanteStore.loadMedicoFirmante(id);
    enfermeraFirmanteStore.loadEnfermeraFirmante(id);
  },
  { immediate: true },
);

const firmante = computed<any>(() =>
  medicoFirmanteStore.medicoFirmante?.nombre
    ? medicoFirmanteStore.medicoFirmante
    : enfermeraFirmanteStore.enfermeraFirmante?.nombre
      ? enfermeraFirmanteStore.enfermeraFirmante
      : null,
);

const lugar = computed(() => lugarDelProveedor(proveedorSalud.value));
const fecha = computed(() => fechaConDiaDeLaSemana(documento.value?.fechaConstanciaExamenAdmision));

const nombreFirmante = computed(() =>
  firmante.value ? formatearTituloYNombreFirmante(firmante.value, proveedorSaludStore.regimenRegulatorio) : '',
);

const cedula = computed(() => {
  const numero = firmante.value?.numeroCedulaProfesional;
  if (!numero) return '';
  const pais = proveedorSalud.value?.pais || 'MX';
  if (pais === 'MX') return `Cédula profesional No. ${numero}`;
  if (pais === 'GT') return `Colegiado Activo No. ${numero}`;
  return `Registro Profesional No. ${numero}`;
});

const credencialAdicional = computed(() => {
  const f = firmante.value;
  if (!f?.nombreCredencialAdicional || !f?.numeroCredencialAdicional) return '';
  return proveedorSalud.value?.pais === 'GT'
    ? `Registro ${f.nombreCredencialAdicional} No. ${f.numeroCredencialAdicional}`
    : `${f.nombreCredencialAdicional} No. ${f.numeroCredencialAdicional}`;
});

const baseURL = import.meta.env.VITE_API_URL || 'https://ramazzini.app';
const firmaSrc = computed(() =>
  firmante.value?.firma?.data ? `${baseURL}/assets/signatories/${firmante.value.firma.data}` : null,
);
const logoSrc = computed(() =>
  proveedorSalud.value?.logotipoEmpresa?.data
    ? `${baseURL}/assets/providers-logos/${proveedorSalud.value.logotipoEmpresa.data}`
    : `${baseURL}/assets/RamazziniBrand600x600.png`,
);

const pieDePagina = computed(() => {
  const p = proveedorSalud.value;
  const partes = [p?.direccion, toTitleCase(p?.municipio ?? ''), toTitleCase(p?.estado ?? '')].filter(Boolean);
  return partes.join(', ') + '.' + (p?.telefono ? ` Tel. ${p.telefono}` : '');
});
</script>

<template>
  <div
    class="clinical-step-scroll relative flex flex-col w-full border-shadow rounded-lg shadow-md bg-white max-w-6xl mx-auto max-h-[var(--alto-documento,66vh)] sm:max-h-[var(--alto-documento,68vh)] md:max-h-[var(--alto-documento,67vh)] lg:max-h-[var(--alto-documento,67vh)] xl:max-h-[var(--alto-documento,81vh)] overflow-y-auto"
    style="padding: 20px 40px 30px 40px;"
    data-visualizador="constanciaExamenAdmision"
  >
    <div class="absolute top-4 right-4">
      <EstadoDocumentoBadgeAlt
        v-if="proveedorSaludStore.isMX"
        :estado="documento.estado"
        :fechaFinalizacion="documento.fechaFinalizacion"
        :finalizadoPor="documento.finalizadoPor"
        :fechaAnulacion="documento.fechaAnulacion"
        :anuladoPor="documento.anuladoPor"
        :razonAnulacion="documento.razonAnulacion"
      />
    </div>

    <img :src="logoSrc" alt="Logotipo" class="w-14 h-auto object-contain" />

    <h1 class="text-center text-[17px] mt-6 mb-6">CONSTANCIA DE EXAMEN MÉDICO DE ADMISIÓN</h1>

    <p
      class="self-end text-right text-[12px] mb-8 cursor-pointer rounded-md"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 1 }"
      data-lugar-fecha
      @click="steps.goToStep(1)"
    >
      {{ lugar }}<template v-if="lugar"> a </template>{{ fecha || '[FECHA]' }}
    </p>

    <div class="text-center flex flex-col items-center">
      <p class="text-[14px] mb-2">Se hace constar que se realizó examen médico de admisión a:</p>
      <p class="text-[16px] underline mb-8" data-nombre>{{ nombreConstanciaAdmision(trabajador) || '[NOMBRE DEL TRABAJADOR]' }}</p>

      <p class="text-[14px] mb-2">Para el puesto de:</p>
      <p class="text-[16px] underline mb-8" data-puesto>{{ String(trabajador?.puesto ?? '').trim().toUpperCase() || '[PUESTO]' }}</p>

      <p class="text-[14px] leading-snug mx-5 mb-6">
        Tras realizar interrogatorio clínico y exploración física no se encuentran alteraciones en su estado de salud que
        impidan el desempeño del puesto de trabajo por lo que se considera:
      </p>
      <p class="text-[16px] underline mb-8" data-conclusion>{{ conclusionConstanciaAdmision(trabajador?.sexo) }}</p>

      <p class="text-[14px] mb-8">
        Se expide la presente<template v-if="lugar"> en {{ lugar }}</template> el día {{ fecha || '[FECHA]' }}.
      </p>

      <p class="text-[14px] tracking-wider mb-2">ATENTAMENTE</p>
      <p v-if="nombreFirmante" class="text-[14px]" data-firmante>{{ nombreFirmante }}</p>
      <p v-if="cedula" class="text-[13px]">{{ cedula }}</p>
      <p v-if="credencialAdicional" class="text-[13px]">{{ credencialAdicional }}</p>
      <img v-if="firmaSrc" :src="firmaSrc" alt="Firma" class="w-[100px] h-auto object-contain mt-2" />
    </div>

    <div class="mt-10 pt-1 border-t-2 border-red-500 text-center">
      <p class="text-[9px] italic">{{ pieDePagina }}</p>
      <p v-if="proveedorSalud?.sitioWeb" class="text-[9px] italic text-blue-600">{{ proveedorSalud.sitioWeb }}</p>
    </div>
  </div>
</template>
