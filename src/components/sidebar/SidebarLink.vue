<script lang="ts" setup>
/**
 * Un elemento del sidebar (punto 50): un solo renglón con ícono y nombre (cortado con «…»; el
 * nombre completo en `title`). Colapsado, solo el ícono y un tooltip a la derecha.
 * - `nivel`: 1 = cuelga del elemento de arriba (p. ej. Estadísticas bajo la empresa).
 * - `enRuta`: parte de «Donde estás»; el ícono va sobre la línea que une la ruta.
 * - Ranura `insignia`: una etiqueta corta al final del renglón (estado del documento).
 * - `activoTambienEn`: nombres de ruta de subpantallas que también lo marcan como activo.
 */
import { useRouter, RouterLink, useRoute } from 'vue-router';
import { computed, ref } from 'vue';
import { useSidebarStore } from '../../stores/sidebar';

const sidebar = useSidebarStore();
const router = useRouter();

const props = defineProps({
    to: { type: [String, Object], required: true },
    icon: { type: String, required: true },
    badge: { type: String, default: '' },
    tooltip: { type: String, default: '' },
    /** Nombre completo para el `title` cuando se corta con «…». */
    titulo: { type: String, default: '' },
    nivel: { type: Number, default: 0 },
    enRuta: { type: Boolean, default: false },
    /**
     * Subpantallas que también lo marcan como activo (por nombre de ruta): p. ej. el informe y la
     * prima de Incapacidades. No se compara por prefijo de la ruta: las direcciones anidan la
     * jerarquía (centros → trabajadores) y se marcarían varios a la vez.
     */
    activoTambienEn: { type: Array as () => string[], default: () => [] },
});

const route = useRoute();
const isHovered = ref(false);
const linkContainerRef = ref<HTMLElement>();

const isActive = computed(() => {
    if (route.name && props.activoTambienEn.includes(String(route.name))) return true;
    const resolved = router.resolve(props.to);
    return resolved.path === route.path;
});

const showTooltip = computed(() => {
    return sidebar.collapsed && props.tooltip && isHovered.value;
});

function onNavigate() {
    if (sidebar.isMobileOverlayOpen) {
        sidebar.collapseSidebar();
    }
}

const tooltipStyle = computed(() => {
    if (!linkContainerRef.value || !showTooltip.value) {
        return {};
    }

    try {
        const rect = linkContainerRef.value.getBoundingClientRect();
        const sidebarWidth = Number.parseInt(sidebar.sidebarWidth, 10) || 80;

        return {
            position: 'fixed' as const,
            left: `${sidebarWidth + 12}px`,
            top: `${rect.top + rect.height / 2}px`,
            transform: 'translateY(-50%)',
            zIndex: 'var(--z-tooltip)'
        };
    } catch (error) {
        return {};
    }
});
</script>

<template>
    <div class="link-container"
         :class="{ 'is-icon-only': sidebar.collapsed, 'en-ruta': enRuta, 'nivel-1': nivel === 1 }"
         @mouseenter="isHovered = true"
         @mouseleave="isHovered = false"
         ref="linkContainerRef">

        <RouterLink
            :to="to"
            class="link"
            :class="{ 'active': isActive }"
            :title="!sidebar.collapsed && titulo ? titulo : undefined"
            :aria-label="sidebar.collapsed ? (tooltip || titulo || undefined) : undefined"
            @click.stop="onNavigate">
            <div class="icon-container">
                <i class="icon" :class="icon"></i>
                <div v-if="badge" class="badge">{{ badge }}</div>
            </div>

            <div v-if="!sidebar.collapsed" class="content">
                <span class="nombre"><slot></slot></span>
                <slot name="insignia"></slot>
            </div>
        </RouterLink>

        <!-- Tooltip para modo colapsado -->
        <Transition name="tooltip" :duration="200">
            <div v-if="showTooltip" class="tooltip" :style="tooltipStyle">
                <div class="tooltip-content">
                    {{ tooltip }}
                </div>
                <div class="tooltip-arrow"></div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.link-container {
    position: relative;
}

/* Un renglón de 40 px; sin moverse al pasar el mouse (dentro de la caja con desplazamiento,
   el movimiento recortaba el borde derecho) */
.link {
    display: flex;
    align-items: center;
    position: relative;
    cursor: pointer;
    user-select: none;
    margin: 0.125rem 0;
    padding: 0.375rem 0.5rem;
    border-radius: 0.5rem;
    min-height: 2.5rem;
    color: rgba(255, 255, 255, 0.92);
    text-decoration: none;
    background: transparent;
    transition: background-color 0.15s ease, color 0.15s ease;
}

.link:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
}

.link:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: -2px;
}

/* Activo: fondo suave y barra blanca a la izquierda */
.link.active {
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
}

.link.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.5rem;
    bottom: 0.5rem;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: #ffffff;
}

.icon-container {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    margin-right: 0.625rem;
    border-radius: 0.375rem;
    background: rgba(255, 255, 255, 0.15);
    transition: background-color 0.15s ease;
}

.link:hover .icon-container,
.link.active .icon-container {
    background: rgba(255, 255, 255, 0.26);
}

/* En la ruta, el ícono tapa la línea que la une (fondo opaco del mismo verde) */
.en-ruta .icon-container {
    background: #276749;
    box-shadow: 0 0 0 2px #2b7a52;
}

.en-ruta .link:hover .icon-container,
.en-ruta .link.active .icon-container {
    background: #22543d;
}

.nivel-1 .link {
    padding-left: 1.75rem;
    min-height: 2.25rem;
}

.nivel-1 .icon-container {
    width: 1.375rem;
    height: 1.375rem;
}

.nivel-1 .icon {
    font-size: 0.75rem;
}

.icon {
    font-size: 0.95rem;
}

.badge {
    position: absolute;
    top: -0.25rem;
    right: -0.25rem;
    background: #ef4444;
    color: white;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.125rem 0.375rem;
    border-radius: 1rem;
    min-width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #2f855a;
}

.content {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.nombre {
    flex: 1;
    min-width: 0;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Colapsado: solo el ícono, centrado */
.is-icon-only .link {
    justify-content: center;
    padding: 0.375rem 0;
}

.is-icon-only .icon-container {
    width: 2rem;
    height: 2rem;
    margin-right: 0;
}

.is-icon-only .icon {
    font-size: 1rem;
}

.is-icon-only.nivel-1 .link {
    padding-left: 0;
}

.is-icon-only.nivel-1 .icon-container {
    width: 1.625rem;
    height: 1.625rem;
}

.is-icon-only .link.active::before {
    top: 0.625rem;
    bottom: 0.625rem;
}

/* Tooltip */
.tooltip {
    position: fixed;
    z-index: var(--z-tooltip);
    pointer-events: none;
}

.tooltip-content {
    background: #1f2937;
    color: white;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.1);
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    position: relative;
}

.tooltip-arrow {
    position: absolute;
    left: -0.4rem;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 0.4rem solid transparent;
    border-bottom: 0.4rem solid transparent;
    border-right: 0.4rem solid #1f2937;
}

.tooltip-enter-active,
.tooltip-leave-active {
    transition: opacity 0.15s ease, transform 0.15s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
    opacity: 0;
    transform: translateY(-50%) translateX(-6px);
}

@media (max-width: 768px) {
    .is-icon-only .link {
        margin: 0.1rem 0;
    }

    .is-icon-only .icon-container {
        width: 1.875rem;
        height: 1.875rem;
    }
}
</style>
