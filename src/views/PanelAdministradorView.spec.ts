import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/stores/user";
import { useProveedorSaludStore } from "@/stores/proveedorSalud";


function memoriaStorage() {
    const datos = new Map<string, string>();
    return {
        getItem: (k: string) => datos.get(k) ?? null,
        setItem: (k: string, v: string) => void datos.set(k, String(v)),
        removeItem: (k: string) => void datos.delete(k),
        clear: () => datos.clear(),
    };
}

const getPanelAdmin = vi.fn();
vi.mock("@/api/ProveedorSaludAPI", () => ({ default: { getPanelAdmin: (...a: unknown[]) => getPanelAdmin(...a) } }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { default: PanelAdministradorView } = await import("./PanelAdministradorView.vue");
const { invalidatePanelAdminCache } = await import("@/composables/usePanelAdminCache");

const lista = [
    { _id: "650000000000000000000001", nombre: "Clínica Norte", pais: "MX", estadoSuscripcion: "authorized", maxHistoriasPermitidasAlMes: 50 },
    { _id: "650000000000000000000002", nombre: "Salud Sur", pais: "GT", fechaFinTrial: new Date(Date.now() - 86400000).toISOString() },
];

describe("PanelAdministradorView (consola de plataforma)", () => {
    beforeEach(() => {
        vi.stubGlobal("localStorage", memoriaStorage());
        invalidatePanelAdminCache();
        setActivePinia(createPinia());
        getPanelAdmin.mockReset();
        const userStore = useUserStore();
        userStore.user = { role: "Administrador" } as any;
        vi.spyOn(useProveedorSaludStore(), "getAllProveedores").mockResolvedValue(lista as any);
    });

    const montar = async () => {
        const wrapper = mount(PanelAdministradorView, { global: { stubs: { PlatformTenantDrawer: true } } });
        await flushPromises();
        return wrapper;
    };

    it("carga el detalle de todos en una sola llamada y muestra las filas", async () => {
        getPanelAdmin.mockResolvedValue({
            data: [
                { _id: lista[0]._id, historiasClinicasMes: 45, usuariosTotal: 4, empresasCount: 2 },
                { _id: lista[1]._id, historiasClinicasMes: 0, usuariosTotal: 1 },
            ],
        });
        const wrapper = await montar();
        expect(getPanelAdmin).toHaveBeenCalledTimes(1);
        expect(getPanelAdmin).toHaveBeenCalledWith();
        const filas = wrapper.findAll('[data-testid="platform-tenant-row"]');
        expect(filas).toHaveLength(2);
        expect(filas[0].text()).toContain("45 / 50");
        expect(wrapper.find('[data-testid="consola-metricas"]').text()).toMatch(/HC este mes\s*45/);
    });

    it("filtra por búsqueda y recuerda la preferencia", async () => {
        getPanelAdmin.mockResolvedValue({ data: [] });
        const wrapper = await montar();
        await wrapper.find('[data-testid="consola-busqueda"]').setValue("sur");
        expect(wrapper.findAll('[data-testid="platform-tenant-row"]')).toHaveLength(1);
        await flushPromises();
        expect(JSON.parse(localStorage.getItem("ramazzini.consola.preferencias")!).busqueda).toBe("sur");

        await wrapper.find('[data-testid="consola-busqueda"]').setValue("zzz");
        expect(wrapper.find('[data-testid="consola-vacio"]').text()).toContain("Ningún proveedor coincide");
    });

    it("si falla el detalle, la lista sigue visible con aviso", async () => {
        getPanelAdmin.mockRejectedValue(new Error("red"));
        vi.spyOn(console, "error").mockImplementation(() => {});
        const wrapper = await montar();
        expect(wrapper.findAll('[data-testid="platform-tenant-row"]')).toHaveLength(2);
        expect(wrapper.text()).toContain("No se pudo cargar el uso y los usuarios");
    });

    it("al hacer clic en una fila abre el detalle", async () => {
        getPanelAdmin.mockResolvedValue({ data: [] });
        const wrapper = await montar();
        expect(wrapper.findComponent({ name: "PlatformTenantDrawer" }).exists()).toBe(false);
        await wrapper.findAll('[data-testid="platform-tenant-row"]')[0].trigger("click");
        expect(wrapper.findComponent({ name: "PlatformTenantDrawer" }).exists()).toBe(true);
    });
});
