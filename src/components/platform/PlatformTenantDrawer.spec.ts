import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const getUsersByProveedorId = vi.fn();
vi.mock("@/api/AuthAPI", () => ({ default: { getUsersByProveedorId: (...a: unknown[]) => getUsersByProveedorId(...a) } }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { default: PlatformTenantDrawer } = await import("./PlatformTenantDrawer.vue");

const proveedor = {
    _id: "650000000000000000000001",
    nombre: "Clínica Norte",
    pais: "MX",
    estadoSuscripcion: "authorized",
    maxHistoriasPermitidasAlMes: 50,
    limiteHistoriasEfectivo: 80,
    historiasCortesia: 30,
    historiasClinicasMes: 12,
    historiasPorMes: [
        { mes: "2026-09", count: 12 },
        { mes: "2026-08", count: 30 },
        { mes: "2026-07", count: 25 },
    ],
    notasPorMes: [
        { mes: "2026-09", count: 4 },
        { mes: "2026-08", count: 9 },
        { mes: "2026-07", count: 0 },
    ],
    todasLasHistoriasClinicas: 300,
    todasLasNotasMedicas: 90,
    usuariosPorRol: { Principal: 1, Médico: 1, "Enfermero/a": 2 },
    colorInforme: "#007bff",
    semaforizacionActivada: true,
};

describe("PlatformTenantDrawer", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        getUsersByProveedorId.mockReset();
    });

    const montar = async () => {
        const wrapper = mount(PlatformTenantDrawer, {
            props: { proveedor },
            global: { stubs: { TenantSettingsPanel: true, PlatformContratacionPanel: true } },
            attachTo: document.body,
        });
        await flushPromises();
        return wrapper;
    };

    it("muestra HC y notas de los tres meses y el total histórico", async () => {
        getUsersByProveedorId.mockResolvedValue({ data: [] });
        const wrapper = await montar();
        const filas = wrapper.findAll('[data-testid="drawer-meses"] tbody tr').map((tr) => tr.text());
        expect(filas[0]).toContain("sep 2026");
        expect(filas[0]).toContain("(en curso)");
        expect(filas[0]).toContain("12");
        expect(filas[1]).toMatch(/ago 2026\s*30\s*9/);
        expect(filas[3]).toMatch(/Total histórico\s*300\s*90/);
        expect(wrapper.find('[data-testid="drawer-limite"]').text()).toContain("50 contratadas + 30 de cortesía");
        wrapper.unmount();
    });

    it("resumen por rol (Principal = médico) y lista sin el Administrador, Principal primero", async () => {
        getUsersByProveedorId.mockResolvedValue({
            data: [
                { _id: "u2", username: "Beto", email: "b@x.com", role: "Enfermero/a" },
                { _id: "u9", username: "Admin", email: "a@x.com", role: "Administrador" },
                { _id: "u1", username: "Zoe", email: "z@x.com", role: "Principal" },
                { _id: "u3", username: "Ana", email: "an@x.com", role: "Médico", cuentaActiva: false },
            ],
        });
        const wrapper = await montar();
        expect(getUsersByProveedorId).toHaveBeenCalledWith(proveedor._id, { scope: "permissions" });
        const roles = wrapper.find('[data-testid="drawer-roles"]').text();
        expect(roles).toMatch(/Médicos\s*2/);
        expect(roles).toMatch(/Enfermería\s*2/);
        const items = wrapper.findAll('[data-testid="drawer-usuarios"] li').map((li) => li.text());
        expect(items).toHaveLength(3);
        expect(items[0]).toContain("Zoe");
        expect(items.join(" ")).not.toContain("Admin ");
        expect(items.find((t) => t.includes("Ana"))).toContain("Suspendida");
        expect(wrapper.text()).toContain("Azul profesional");
        wrapper.unmount();
    });

    it("Esc cierra el detalle", async () => {
        getUsersByProveedorId.mockResolvedValue({ data: [] });
        const wrapper = await montar();
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        expect(wrapper.emitted("close")).toHaveLength(1);
        wrapper.unmount();
    });
});
