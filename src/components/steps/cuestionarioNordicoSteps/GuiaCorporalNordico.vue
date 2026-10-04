<script setup>
import { REGIONES_NORDICO } from '@/helpers/cuestionarioNordico';

/**
 * Guía corporal del Cuestionario Nórdico: silueta en vista posterior (el lado izquierdo
 * del trabajador queda a la izquierda) con las 16 regiones numeradas.
 * La silueta, las coordenadas y los colores coinciden con `guia-corporal-nordico.svg.ts` (PDF).
 */
const props = defineProps({
  /** Nivel por región: 'molestia' | 'prioritaria'; sin entrada = sin molestia. */
  niveles: { type: Object, default: () => ({}) },
  /** Claves de las regiones del paso actual (se resaltan). */
  regionesActivas: { type: Array, default: () => [] },
  /** Si es true, cada marcador se puede pulsar y emite `seleccionar`. */
  interactiva: { type: Boolean, default: false },
});

const emit = defineEmits(['seleccionar']);

const COLOR_SILUETA = '#CBD5E1';

const COLOR_NIVEL = {
  sinMolestia: { relleno: '#FFFFFF', borde: '#64748B', texto: '#334155' },
  molestia: { relleno: '#F59E0B', borde: '#B45309', texto: '#FFFFFF' },
  prioritaria: { relleno: '#DC2626', borde: '#991B1B', texto: '#FFFFFF' },
};

const colorDe = (clave) => COLOR_NIVEL[props.niveles?.[clave] ?? 'sinMolestia'];

const esActiva = (clave) => props.regionesActivas.includes(clave);

const seleccionar = (clave) => {
  if (props.interactiva) emit('seleccionar', clave);
};
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 200 420"
    class="w-full h-auto select-none"
    role="img"
    aria-label="Guía corporal en vista posterior con las 16 regiones del cuestionario numeradas"
  >
    <!-- Silueta -->
    <g :fill="COLOR_SILUETA">
      <circle cx="100" cy="30" r="21" />
      <rect x="91" y="48" width="18" height="20" />
      <path d="M58 72 Q100 60 142 72 L135 150 Q133 178 140 208 L60 208 Q67 178 65 150 Z" />
      <circle cx="28" cy="210" r="9" />
      <circle cx="172" cy="210" r="9" />
      <ellipse cx="78" cy="390" rx="15" ry="8" />
      <ellipse cx="122" cy="390" rx="15" ry="8" />
    </g>
    <g fill="none" :stroke="COLOR_SILUETA" stroke-linecap="round" stroke-linejoin="round">
      <path d="M55 80 L40 140 L30 196" stroke-width="17" />
      <path d="M145 80 L160 140 L170 196" stroke-width="17" />
      <path d="M81 208 L80 294 L80 374" stroke-width="27" />
      <path d="M119 208 L120 294 L120 374" stroke-width="27" />
    </g>

    <!-- Marcadores de región -->
    <g
      v-for="region in REGIONES_NORDICO"
      :key="region.clave"
      :class="interactiva ? 'cursor-pointer' : ''"
      :data-region="region.clave"
      @click="seleccionar(region.clave)"
    >
      <title>{{ region.numero }}. {{ region.etiqueta }}</title>
      <circle
        v-if="esActiva(region.clave)"
        :cx="region.x"
        :cy="region.y"
        r="13.5"
        fill="none"
        stroke="#EAB308"
        stroke-width="2.5"
      />
      <circle
        :cx="region.x"
        :cy="region.y"
        r="9.5"
        :fill="colorDe(region.clave).relleno"
        :stroke="colorDe(region.clave).borde"
        stroke-width="1.2"
      />
      <text
        :x="region.x"
        :y="region.y + 3.4"
        font-size="9.5"
        font-weight="bold"
        text-anchor="middle"
        :fill="colorDe(region.clave).texto"
      >
        {{ region.numero }}
      </text>
    </g>

    <text x="20" y="414" font-size="9" font-weight="bold" text-anchor="middle" fill="#475569">IZQ</text>
    <text x="100" y="414" font-size="8" text-anchor="middle" fill="#64748B">Vista posterior</text>
    <text x="180" y="414" font-size="9" font-weight="bold" text-anchor="middle" fill="#475569">DER</text>
  </svg>
</template>
