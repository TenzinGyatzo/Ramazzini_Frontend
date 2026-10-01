import { computed } from "vue";
import PlataformaAPI from "@/api/PlataformaAPI";
import { useUserStore } from "@/stores/user";

export const PLATFORM_CONTEXT_CHANNEL = "ramazzini-platform-context";

/** Rutas disponibles para el Administrador sin tenant activo (consola de plataforma). */
export const PLATFORM_ROUTE_NAMES: ReadonlySet<string> = new Set([
    "panel-administrador",
    "admin-catalogos",
    "registros-administrador",
]);

export const PLATFORM_CONSOLE_PATH = "/panel-administrador";
/** Ruta "inicio" (resumen de trabajo): path "" dentro del layout, es decir "/". */
export const TENANT_HOME_PATH = "/";

type PlatformContextMessage = { type: "tenant-changed"; target: string };

type UserLike = {
    role?: string;
    platformContext?: { activeTenant: unknown | null };
} | null | undefined;

/**
 * Administrador sin tenant activo que intenta abrir una pantalla de tenant → consola.
 * Usuarios normales: nunca.
 */
export function shouldRedirectToPlatformConsole(
    user: UserLike,
    routeName: unknown,
): boolean {
    return (
        user?.role === "Administrador" &&
        !user.platformContext?.activeTenant &&
        !PLATFORM_ROUTE_NAMES.has(String(routeName ?? ""))
    );
}

/**
 * Recarga completa: garantiza que ningún store conserve datos del tenant anterior (D3).
 * Se separa para poder sustituirla en pruebas.
 */
export const platformNavigation = {
    reloadTo(path: string) {
        window.location.assign(path);
    },
};

function openChannel(): BroadcastChannel | null {
    if (typeof BroadcastChannel === "undefined") return null;
    try {
        return new BroadcastChannel(PLATFORM_CONTEXT_CHANNEL);
    } catch {
        return null;
    }
}

function notifyOtherTabs(target: string) {
    const channel = openChannel();
    if (!channel) return;
    try {
        channel.postMessage({ type: "tenant-changed", target } satisfies PlatformContextMessage);
    } finally {
        channel.close();
    }
}

/**
 * Escucha cambios de tenant hechos en otras pestañas y recarga esta.
 * Devuelve la función para dejar de escuchar.
 */
export function listenPlatformContextChanges(): () => void {
    const channel = openChannel();
    if (!channel) return () => {};
    channel.onmessage = (event: MessageEvent<PlatformContextMessage>) => {
        if (event.data?.type === "tenant-changed") {
            platformNavigation.reloadTo(event.data.target || TENANT_HOME_PATH);
        }
    };
    return () => channel.close();
}

export function usePlatformContext() {
    const userStore = useUserStore();

    const isPlatformAdmin = computed(() => userStore.user?.role === "Administrador");
    const activeTenant = computed(() => userStore.user?.platformContext?.activeTenant ?? null);
    const isInsideTenant = computed(() => isPlatformAdmin.value && !!activeTenant.value);

    async function enterTenant(proveedorSaludId: string) {
        await PlataformaAPI.enterTenant(proveedorSaludId);
        notifyOtherTabs(TENANT_HOME_PATH);
        platformNavigation.reloadTo(TENANT_HOME_PATH);
    }

    async function exitTenant() {
        await PlataformaAPI.exitTenant();
        notifyOtherTabs(PLATFORM_CONSOLE_PATH);
        platformNavigation.reloadTo(PLATFORM_CONSOLE_PATH);
    }

    return { isPlatformAdmin, activeTenant, isInsideTenant, enterTenant, exitTenant };
}
