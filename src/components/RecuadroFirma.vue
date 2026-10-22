<script setup lang="ts">
/**
 * Recuadro donde el trabajador firma con pluma, dedo o mouse (docs/firma-en-pantalla-especificacion.md, 3).
 * Usa Pointer Events del navegador: no necesita drivers ni librerías. El papel siempre es blanco,
 * también en modo oscuro, para que la firma se vea como en el PDF.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import {
  CapturaFirma,
  cerrarLinea,
  dibujarTramo,
  dibujarTrazo,
  exportarImagenFirma,
  type EventoPuntero,
  type FirmaCapturada,
  type TipoPuntero,
} from '@/helpers/capturaFirma';

export interface EstadoRecuadroFirma {
  vacia: boolean;
  valida: boolean;
  pointerType: TipoPuntero | null;
}

const props = withDefaults(defineProps<{ deshabilitado?: boolean }>(), { deshabilitado: false });

const emit = defineEmits<{ cambio: [estado: EstadoRecuadroFirma] }>();

const contenedor = ref<HTMLDivElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const captura = new CapturaFirma();
const vacia = ref(true);
let punteroActivo: number | null = null;
let observador: ResizeObserver | null = null;
// Tamaño del recuadro al iniciar la firma: las coordenadas del trazo son relativas a él
let ancho = 0;
let alto = 0;

function avisar() {
  vacia.value = captura.vacia;
  emit('cambio', { vacia: captura.vacia, valida: captura.esValida, pointerType: captura.pointerType });
}

function contexto() {
  return canvas.value?.getContext('2d') ?? null;
}

/** Ajusta el canvas a su tamaño en pantalla y a la densidad de píxeles, y vuelve a dibujar. */
function ajustarTamano() {
  const el = canvas.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = window.devicePixelRatio || 1;
  el.width = Math.round(rect.width * dpr);
  el.height = Math.round(rect.height * dpr);
  if (captura.vacia) {
    ancho = rect.width;
    alto = rect.height;
  }
  const ctx = contexto();
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  dibujarTrazo(ctx, captura.trazo);
}

function evento(e: PointerEvent): EventoPuntero {
  const rect = canvas.value!.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    tiempo: e.timeStamp,
    presion: e.pressure,
    pointerType: e.pointerType,
  };
}

/** Solo el tramo nuevo: redibujar toda la firma en cada movimiento se nota en un celular. */
function dibujarUltimoTramo() {
  const ctx = contexto();
  const linea = captura.trazo.at(-1);
  if (!ctx || !linea) return;
  dibujarTramo(ctx, linea, linea.length - 1);
}

/**
 * La captura solo evita perder el trazo si la pluma sale del recuadro; si el navegador la
 * rechaza (algunos controladores de tableta), se firma igual.
 */
function capturarPuntero(pointerId: number, capturar: boolean) {
  try {
    if (capturar) canvas.value?.setPointerCapture?.(pointerId);
    else canvas.value?.releasePointerCapture?.(pointerId);
  } catch {
    // Sin captura
  }
}

function alPresionar(e: PointerEvent) {
  if (props.deshabilitado || punteroActivo !== null) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  punteroActivo = e.pointerId;
  capturarPuntero(e.pointerId, true);
  if (captura.vacia) {
    const rect = canvas.value!.getBoundingClientRect();
    ancho = rect.width;
    alto = rect.height;
  }
  captura.iniciarLinea(evento(e));
  dibujarUltimoTramo();
}

function alMover(e: PointerEvent) {
  if (e.pointerId !== punteroActivo) return;
  e.preventDefault();
  // La pluma reporta más puntos de los que llegan como eventos: se usan todos
  const eventos = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
  for (const ev of eventos.length ? eventos : [e]) {
    if (captura.agregarPunto(evento(ev))) dibujarUltimoTramo();
  }
}

function alSoltar(e: PointerEvent) {
  if (e.pointerId !== punteroActivo) return;
  punteroActivo = null;
  capturarPuntero(e.pointerId, false);
  const ctx = contexto();
  const linea = captura.trazo.at(-1);
  if (ctx && linea) cerrarLinea(ctx, linea);
  avisar();
}

function limpiar() {
  captura.limpiar();
  punteroActivo = null;
  ajustarTamano();
  avisar();
}

/** Firma lista para enviar; null si todavía no alcanza. */
function exportar(): FirmaCapturada | null {
  if (!captura.esValida || !captura.pointerType) return null;
  // Si el recuadro no tenía tamaño al empezar (p. ej. la pestaña estaba oculta), basta el trazo
  const puntos = captura.trazo.flat();
  const anchoFirma = Math.max(ancho, ...puntos.map((p) => p.x + 8));
  const altoFirma = Math.max(alto, ...puntos.map((p) => p.y + 8));
  return {
    imagen: exportarImagenFirma(captura.trazo, anchoFirma, altoFirma),
    trazo: captura.trazo.map((linea) => linea.map((p) => ({ ...p }))),
    dispositivo: {
      pointerType: captura.pointerType,
      ancho: Math.round(anchoFirma),
      alto: Math.round(altoFirma),
      userAgent: navigator.userAgent.slice(0, 500),
    },
    duracionMs: captura.duracionMs,
  };
}

defineExpose({ limpiar, exportar });

onMounted(() => {
  ajustarTamano();
  if (typeof ResizeObserver !== 'undefined' && contenedor.value) {
    observador = new ResizeObserver(() => ajustarTamano());
    observador.observe(contenedor.value);
  }
});

onBeforeUnmount(() => observador?.disconnect());
</script>

<template>
  <div ref="contenedor" class="recuadro-firma" :class="{ 'recuadro-firma--deshabilitado': deshabilitado }">
    <canvas
      ref="canvas"
      class="recuadro-firma__canvas"
      aria-label="Recuadro para firmar"
      @pointerdown="alPresionar"
      @pointermove="alMover"
      @pointerup="alSoltar"
      @pointercancel="alSoltar"
      @lostpointercapture="alSoltar"
    />
    <div class="recuadro-firma__renglon" aria-hidden="true" />
    <span v-if="vacia" class="recuadro-firma__indicacion" aria-hidden="true">Firme aquí</span>
  </div>
</template>

<style scoped>
.recuadro-firma {
  position: relative;
  width: 100%;
  height: 220px;
  border: 2px dashed #94a3b8;
  border-radius: 0.75rem;
  background-color: #ffffff;
  overflow: hidden;
}

.recuadro-firma--deshabilitado {
  opacity: 0.6;
}

.recuadro-firma__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* Sin esto, el dedo o la pluma desplazan la página en vez de firmar */
  touch-action: none;
  cursor: crosshair;
  user-select: none;
  -webkit-user-select: none;
}

.recuadro-firma__renglon {
  position: absolute;
  left: 1.5rem;
  right: 1.5rem;
  bottom: 2.75rem;
  border-bottom: 1px solid #cbd5e1;
  pointer-events: none;
}

.recuadro-firma__indicacion {
  position: absolute;
  left: 1.5rem;
  bottom: 3.25rem;
  color: #94a3b8;
  font-size: 0.95rem;
  pointer-events: none;
}

@media (max-width: 640px) {
  .recuadro-firma {
    height: 180px;
  }
}
</style>
