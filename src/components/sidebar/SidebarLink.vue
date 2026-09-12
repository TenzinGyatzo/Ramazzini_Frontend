<script lang="ts" setup>
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { computed, ref } from 'vue';
import { useSidebarStore } from '../../stores/sidebar';

const sidebar = useSidebarStore();
const router = useRouter();

const props = defineProps({
    to: { type: [String, Object], required: true },
    icon: { type: String, required: true },
    badge: { type: String, default: '' },
    tooltip: { type: String, default: '' },
});

const route = useRoute();
const isHovered = ref(false);
const linkContainerRef = ref<HTMLElement>();

const isActive = computed(() => {
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
            zIndex: 9999
        };
    } catch (error) {
        return {};
    }
});
</script>

<template>
    <div class="link-container"
         :class="{ 'is-icon-only': sidebar.collapsed }"
         @mouseenter="isHovered = true" 
         @mouseleave="isHovered = false"
         ref="linkContainerRef">
        
        <RouterLink :to="to" class="link" :class="{ 'active': isActive }" @click.stop="onNavigate">
            <div class="icon-container">
                <i class="icon" :class="icon"></i>
                <div v-if="badge" class="badge">{{ badge }}</div>
            </div>
            
            <Transition appear mode="out-in" name="fade" :duration="200">
                <div v-if="!sidebar.collapsed" class="content">
                    <slot></slot>
                </div>
            </Transition>
            
            <!-- Indicador de estado activo -->
            <div class="active-indicator" :class="{ 'active': isActive }"></div>
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
    margin: 0.25rem 0;
}

.link {
    display: flex;
    align-items: center;
    position: relative;
    cursor: pointer;
    font-weight: 500;
    user-select: none;
    margin: 0.25rem 0;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    min-height: 3.5rem;
    color: rgba(255, 255, 255, 0.9);
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: transparent;
    border: 1px solid transparent;
    overflow: hidden;
}

.link:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    transform: translateX(4px);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.link.active {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
    color: white;
    border-color: rgba(255, 255, 255, 0.35);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    transform: translateX(4px);
}

.icon-container {
    position: relative;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    margin-right: 0.75rem;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.15);
    transition: all 0.3s ease;
}

.link:hover .icon-container {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.1);
}

.link.active .icon-container {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
}

.icon {
    font-size: 1.1rem;
    transition: all 0.3s ease;
}

.link:hover .icon {
    transform: scale(1.1);
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
}

.content p {
    margin: 0;
    line-height: 1.4;
    transition: all 0.3s ease;
}

.content p:first-child {
    font-weight: 600;
    font-size: 0.95rem;
}

.content p:last-child {
    font-size: 0.8rem;
    opacity: 0.85;
    margin-top: 0.125rem;
}

.active-indicator {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 0.25rem;
    height: 0;
    background: linear-gradient(180deg, #ffffff, #f0fdf4);
    border-radius: 0 0.125rem 0.125rem 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
}

.active-indicator.active {
    height: 2rem;
    opacity: 1;
}

/* Animaciones */
.fade-enter-active,
.fade-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from {
    opacity: 0;
    transform: translateX(-10px);
}

.fade-leave-to {
    opacity: 0;
    transform: translateX(-10px);
}

/* Tooltip */
.tooltip {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
}

.tooltip-content {
    background: linear-gradient(135deg, #1f2937, #111827);
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
    min-width: 140px;
    text-align: center;
    max-width: 220px;
    word-wrap: break-word;
    position: relative;
}

.tooltip-arrow {
    position: absolute;
    left: -0.5rem;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 0.5rem solid transparent;
    border-bottom: 0.5rem solid transparent;
    border-right: 0.5rem solid #1f2937;
    filter: drop-shadow(-2px 0 2px rgba(0, 0, 0, 0.3));
}

.tooltip-enter-active,
.tooltip-leave-active {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.tooltip-enter-from,
.tooltip-leave-to {
    opacity: 0;
    transform: translateY(-50%) translateX(-10px);
}

/* Responsive */
@media (max-width: 768px) {
    .link {
        padding: 0.5rem 0.45rem;
        min-height: 3rem;
    }
    
    .icon-container {
        width: 1.75rem;
        height: 1.75rem;
        margin-right: 0.5rem;
    }
    
    .icon {
        font-size: 1rem;
    }
    
    .tooltip-content {
        font-size: 0.8rem;
        padding: 0.625rem 0.875rem;
        min-width: 120px;
    }

    .is-icon-only .link {
        justify-content: center;
        padding: 0.375rem 0;
        min-height: 0;
        margin: 0.2rem 0;
    }

    .is-icon-only .link:hover,
    .is-icon-only .link.active {
        transform: none;
    }

    .is-icon-only .icon-container {
        width: 2rem;
        height: 2rem;
        margin-right: 0;
    }

    .is-icon-only .link:hover .icon-container,
    .is-icon-only .link.active .icon-container {
        transform: none;
    }
}
</style>