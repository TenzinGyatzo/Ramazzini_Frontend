import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/stores/user";

const enterTenant = vi.fn().mockResolvedValue({ data: {} });
const exitTenant = vi.fn().mockResolvedValue({ data: {} });
vi.mock("@/api/PlataformaAPI", () => ({
    default: { enterTenant, exitTenant, getContexto: vi.fn() },
}));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const {
    PLATFORM_CONSOLE_PATH,
    PLATFORM_CONTEXT_CHANNEL,
    TENANT_HOME_PATH,
    listenPlatformContextChanges,
    platformNavigation,
    shouldRedirectToPlatformConsole,
    usePlatformContext,
} = await import("./usePlatformContext");

/** BroadcastChannel en memoria (jsdom no lo trae en todas las versiones). */
class FakeChannel {
    static instances: FakeChannel[] = [];
    static posted: unknown[] = [];
    onmessage: ((event: MessageEvent) => void) | null = null;
    constructor(public name: string) {
        FakeChannel.instances.push(this);
    }
    postMessage(data: unknown) {
        FakeChannel.posted.push(data);
        for (const other of FakeChannel.instances) {
            if (other !== this && other.name === this.name) {
                other.onmessage?.({ data } as MessageEvent);
            }
        }
    }
    close() {
        FakeChannel.instances = FakeChannel.instances.filter((c) => c !== this);
    }
}

const activeTenant = { id: "prov-b", nombre: "Clínica B", regimenRegulatorio: null };

describe("shouldRedirectToPlatformConsole (router)", () => {
    it("usuarios normales: nunca", () => {
        expect(shouldRedirectToPlatformConsole({ role: "Principal" }, "inicio")).toBe(false);
        expect(shouldRedirectToPlatformConsole({ role: "Médico" }, "trabajadores")).toBe(false);
        expect(shouldRedirectToPlatformConsole(null, "inicio")).toBe(false);
    });

    it("Administrador sin tenant activo: consola para cualquier ruta de tenant", () => {
        const admin = { role: "Administrador", platformContext: { activeTenant: null } };
        expect(shouldRedirectToPlatformConsole(admin, "inicio")).toBe(true);
        expect(shouldRedirectToPlatformConsole(admin, "expediente-medico")).toBe(true);
        expect(shouldRedirectToPlatformConsole({ role: "Administrador" }, "empresas")).toBe(true);
        expect(shouldRedirectToPlatformConsole(admin, "panel-administrador")).toBe(false);
    });

    it("Administrador dentro de un tenant: navega libremente", () => {
        const admin = { role: "Administrador", platformContext: { activeTenant } };
        expect(shouldRedirectToPlatformConsole(admin, "inicio")).toBe(false);
        expect(shouldRedirectToPlatformConsole(admin, "panel-administrador")).toBe(false);
    });
});

describe("usePlatformContext", () => {
    let reloadTo: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        setActivePinia(createPinia());
        FakeChannel.instances = [];
        FakeChannel.posted = [];
        vi.stubGlobal("BroadcastChannel", FakeChannel);
        reloadTo = vi.spyOn(platformNavigation, "reloadTo").mockImplementation(() => {});
        enterTenant.mockClear();
        exitTenant.mockClear();
    });

    it("expone el tenant activo del Administrador", () => {
        const userStore = useUserStore();
        userStore.user = {
            _id: "a",
            username: "admin",
            email: "a@test.com",
            role: "Administrador",
            platformContext: { activeTenant },
        } as any;
        const ctx = usePlatformContext();
        expect(ctx.isPlatformAdmin.value).toBe(true);
        expect(ctx.isInsideTenant.value).toBe(true);
        expect(ctx.activeTenant.value).toEqual(activeTenant);
    });

    it("un Principal no es Administrador de plataforma", () => {
        const userStore = useUserStore();
        userStore.user = { _id: "p", username: "p", email: "p@t.com", role: "Principal" } as any;
        const ctx = usePlatformContext();
        expect(ctx.isPlatformAdmin.value).toBe(false);
        expect(ctx.isInsideTenant.value).toBe(false);
    });

    it("entrar: API, aviso a otras pestañas y recarga completa al inicio del tenant", async () => {
        await usePlatformContext().enterTenant("prov-b");
        expect(enterTenant).toHaveBeenCalledWith("prov-b");
        expect(FakeChannel.posted).toEqual([{ type: "tenant-changed", target: TENANT_HOME_PATH }]);
        expect(reloadTo).toHaveBeenCalledWith(TENANT_HOME_PATH);
    });

    it("salir: API, aviso y recarga a la consola", async () => {
        await usePlatformContext().exitTenant();
        expect(exitTenant).toHaveBeenCalled();
        expect(FakeChannel.posted).toEqual([{ type: "tenant-changed", target: PLATFORM_CONSOLE_PATH }]);
        expect(reloadTo).toHaveBeenCalledWith(PLATFORM_CONSOLE_PATH);
    });

    it("si la API falla no recarga ni avisa", async () => {
        enterTenant.mockRejectedValueOnce(new Error("boom"));
        await expect(usePlatformContext().enterTenant("prov-b")).rejects.toThrow("boom");
        expect(reloadTo).not.toHaveBeenCalled();
        expect(FakeChannel.posted).toEqual([]);
    });

    it("otra pestaña que escucha se recarga en el destino recibido", () => {
        const stop = listenPlatformContextChanges();
        const sender = new FakeChannel(PLATFORM_CONTEXT_CHANNEL);
        sender.postMessage({ type: "tenant-changed", target: PLATFORM_CONSOLE_PATH });
        expect(reloadTo).toHaveBeenCalledWith(PLATFORM_CONSOLE_PATH);
        stop();
        reloadTo.mockClear();
        sender.postMessage({ type: "tenant-changed", target: TENANT_HOME_PATH });
        expect(reloadTo).not.toHaveBeenCalled();
    });

    it("sin BroadcastChannel no falla", () => {
        vi.stubGlobal("BroadcastChannel", undefined);
        const stop = listenPlatformContextChanges();
        expect(() => stop()).not.toThrow();
    });
});
