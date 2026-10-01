import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/stores/user";
import { useProveedorSaludStore } from "@/stores/proveedorSalud";

const api = {
    getRegistros: vi.fn(),
    exportarRegistros: vi.fn(),
    verificarRegistros: vi.fn(),
};
vi.mock("@/api/PlataformaAPI", () => ({ default: api }));
let query: Record<string, string> = {};
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: vi.fn() }),
    useRoute: () => ({ query }),
}));

const { default: RegistrosAdministradorView } = await import("./RegistrosAdministradorView.vue");

const TENANT = "650000000000000000000001";
const registro = (extra: Record<string, unknown> = {}) => ({
    _id: "e1",
    timestamp: new Date().toISOString(),
    actionType: "PLATFORM_TENANT_SETTINGS_UPDATED",
    categoria: "ajustes",
    tenantId: TENANT,
    tenantNombre: "Clínica Norte",
    resourceType: "ProveedorSalud",
    resourceId: TENANT,
    actor: "admin",
    payload: { tenantId: TENANT, antes: { historiasCortesia: 0 }, despues: { historiasCortesia: 20 } },
    hashEvento: "abc123",
    encadenado: true,
    ...extra,
});

describe("RegistrosAdministradorView", () => {
    beforeEach(() => {
        query = {};
        setActivePinia(createPinia());
        Object.values(api).forEach((fn) => fn.mockReset());
        api.getRegistros.mockResolvedValue({ data: { items: [registro()], total: 1, page: 1, limit: 50 } });
        useUserStore().user = { role: "Administrador" } as any;
        vi.spyOn(useProveedorSaludStore(), "getAllProveedores").mockResolvedValue([
            { _id: TENANT, nombre: "Clínica Norte" },
        ] as any);
    });

    const montar = async () => {
        const wrapper = mount(RegistrosAdministradorView, { global: { stubs: { RouterLink: true } } });
        await flushPromises();
        return wrapper;
    };
    const ultimaConsulta = () => api.getRegistros.mock.calls.at(-1)![0];

    it("al abrir: últimos 30 días, solo cambios, primera página", async () => {
        const wrapper = await montar();
        expect(ultimaConsulta()).toMatchObject({ soloCambios: true, page: 1, limit: 50 });
        expect(ultimaConsulta()).not.toHaveProperty("tenantId");
        expect(new Date(ultimaConsulta().to).getTime() - new Date(ultimaConsulta().from).getTime()).toBeGreaterThan(
            29 * 86_400_000,
        );
        const fila = wrapper.find('[data-testid="registro-fila"]').text();
        expect(fila).toContain("Ajustes de plataforma");
        expect(fila).toContain("Clínica Norte");
        expect(fila).toContain("HC de cortesía: 0 → 20");
        expect(wrapper.find('[data-testid="registros-total"]').text()).toBe("1 registro");
    });

    it("desde el detalle de un proveedor llega ya filtrado", async () => {
        query = { tenantId: TENANT };
        await montar();
        expect(ultimaConsulta().tenantId).toBe(TENANT);
    });

    it("filtros: categoría, ver todo y periodo vuelven a consultar desde la página 1", async () => {
        const wrapper = await montar();
        await wrapper.find('[data-testid="registros-categoria"]').setValue("contratacion");
        await flushPromises();
        expect(ultimaConsulta()).toMatchObject({ categoria: "contratacion", page: 1 });

        await wrapper.find('[data-testid="registros-categoria"]').setValue("");
        await wrapper.find('[data-testid="registros-solo-cambios"]').setValue(false);
        await flushPromises();
        expect(ultimaConsulta().soloCambios).toBe(false);

        await wrapper.find('[data-testid="registros-periodo-hoy"]').trigger("click");
        await flushPromises();
        expect(new Date(ultimaConsulta().to).getTime() - new Date(ultimaConsulta().from).getTime()).toBeLessThan(86_400_000);
    });

    it("rango manual incompleto: no consulta y avisa", async () => {
        const wrapper = await montar();
        api.getRegistros.mockClear();
        await wrapper.find('[data-testid="registros-periodo-rango"]').trigger("click");
        await flushPromises();
        expect(api.getRegistros).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain("Indica las dos fechas del rango");
        expect(wrapper.find('[data-testid="registros-exportar"]').attributes("disabled")).toBeDefined();
    });

    it("abrir una fila muestra el registro completo y su sello", async () => {
        const wrapper = await montar();
        expect(wrapper.find('[data-testid="registro-detalle"]').exists()).toBe(false);
        await wrapper.find('[data-testid="registro-fila"] button').trigger("click");
        const detalle = wrapper.find('[data-testid="registro-detalle"]').text();
        expect(detalle).toContain("PLATFORM_TENANT_SETTINGS_UPDATED");
        expect(detalle).toContain("por admin");
        expect(detalle).toContain("ligado al evento anterior");
        expect(detalle).toContain("abc123");
    });

    it("verificar cadena: íntegra, e inconsistencias", async () => {
        const wrapper = await montar();
        api.verificarRegistros.mockResolvedValue({ data: { valid: true, total: 12, encadenadoDesde: new Date().toISOString() } });
        await wrapper.find('[data-testid="registros-verificar"]').trigger("click");
        await flushPromises();
        expect(wrapper.find('[data-testid="registros-verificacion"]').text()).toContain("Cadena íntegra: 12 eventos");
        expect(api.verificarRegistros.mock.calls[0][0]).toHaveProperty("from");

        api.verificarRegistros.mockResolvedValue({ data: { valid: false, errors: [{ index: 3 }, { index: 4 }] } });
        await wrapper.find('[data-testid="registros-verificar"]').trigger("click");
        await flushPromises();
        expect(wrapper.find('[data-testid="registros-verificacion"]').text()).toContain("2 inconsistencias");
    });

    it("sin resultados con «solo cambios»: sugiere ver todo", async () => {
        api.getRegistros.mockResolvedValue({ data: { items: [], total: 0, page: 1, limit: 50 } });
        const wrapper = await montar();
        expect(wrapper.find('[data-testid="registros-vacio"]').text()).toContain("Desmarca «Solo cambios»");
    });

    it("paginación", async () => {
        api.getRegistros.mockResolvedValue({ data: { items: [registro()], total: 120, page: 1, limit: 50 } });
        const wrapper = await montar();
        await wrapper.find('[data-testid="registros-siguiente"]').trigger("click");
        await flushPromises();
        expect(ultimaConsulta().page).toBe(2);
    });
});
