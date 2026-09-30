import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const api = {
    getContratacion: vi.fn(),
    guardarContrato: vi.fn(),
    terminarContrato: vi.fn(),
    registrarPago: vi.fn(),
    emitirFactura: vi.fn(),
    anularPago: vi.fn(),
};
vi.mock("@/api/PlataformaAPI", () => ({ default: api }));
const toastOpen = vi.fn();
vi.mock("@/utils/toast", () => ({ getToast: () => ({ open: toastOpen }) }));

const { default: PlatformContratacionPanel } = await import("./PlatformContratacionPanel.vue");

const ID = "650000000000000000000001";
const enDias = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

const sinContrato = (extra: Record<string, unknown> = {}) => ({
    id: ID,
    contrato: null,
    contratoVigente: false,
    privado: null,
    historias: { base: 25, cortesia: 0, efectivo: 25 },
    manualHeredado: false,
    mercadoPago: { estadoSuscripcion: null, suscripcionActiva: null, finDeSuscripcion: null, suscripcion: null, pagos: [] },
    pagos: [],
    ...extra,
});
const conContrato = (extra: Record<string, unknown> = {}) =>
    sinContrato({
        contrato: {
            plan: "profesional",
            historiasMes: 150,
            periodicidad: "mensual",
            renovacionAutomatica: false,
            fechaInicio: enDias(-30),
            pagadoHasta: enDias(20),
            estado: "activo",
        },
        contratoVigente: true,
        privado: { formaPago: "transferencia", requiereFactura: true, montoPeriodo: 2400, notas: "Pago por SPEI" },
        ...extra,
    });

describe("PlatformContratacionPanel", () => {
    beforeEach(() => {
        Object.values(api).forEach((fn) => fn.mockReset());
        toastOpen.mockReset();
    });

    const montar = async (datos: Record<string, unknown>) => {
        api.getContratacion.mockResolvedValue({ data: datos });
        const wrapper = mount(PlatformContratacionPanel, { props: { proveedorId: ID } });
        await flushPromises();
        return wrapper;
    };

    it("sin contrato: registrar uno (el plan sugiere HC; forma y factura)", async () => {
        const wrapper = await montar(sinContrato({ manualHeredado: true }));
        expect(wrapper.find('[data-testid="contratacion-heredado"]').exists()).toBe(true);
        await wrapper.find('[data-testid="contratacion-nuevo"]').trigger("click");
        await wrapper.find('[data-testid="contrato-plan"]').setValue("empresarial");
        expect((wrapper.find('[data-testid="contrato-historias"]').element as HTMLInputElement).value).toBe("300");
        await wrapper.find('[data-testid="contrato-periodicidad"]').setValue("anual");
        await wrapper.find('[data-testid="contrato-factura"]').setValue(true);
        await wrapper.find('[data-testid="contrato-monto"]').setValue("24000");
        await wrapper.find('[data-testid="contrato-pagado-hasta"]').setValue("2027-09-30");
        api.guardarContrato.mockResolvedValue({ data: conContrato() });
        await wrapper.find('[data-testid="contratacion-form"]').trigger("submit");
        await flushPromises();

        const [, payload] = api.guardarContrato.mock.calls[0];
        expect(payload).toMatchObject({
            plan: "empresarial",
            historiasMes: 300,
            periodicidad: "anual",
            formaPago: "transferencia",
            requiereFactura: true,
            renovacionAutomatica: false,
            montoPeriodo: 24000,
        });
        expect(new Date(payload.pagadoHasta).getDate()).toBe(30);
        expect(wrapper.emitted("actualizado")?.[0]?.[0]).toMatchObject({ id: ID });
    });

    it("enlace de Mercado Pago: renovación automática por defecto, sin «pagado hasta»", async () => {
        const wrapper = await montar(sinContrato());
        await wrapper.find('[data-testid="contratacion-nuevo"]').trigger("click");
        await wrapper.find('[data-testid="contrato-forma-pago"]').setValue("mercadopago_enlace");
        expect((wrapper.find('[data-testid="contrato-renovacion"]').element as HTMLInputElement).checked).toBe(true);
        expect(wrapper.find('[data-testid="contrato-pagado-hasta"]').exists()).toBe(false);
        api.guardarContrato.mockResolvedValue({ data: conContrato() });
        await wrapper.find('[data-testid="contratacion-form"]').trigger("submit");
        await flushPromises();
        const [, payload] = api.guardarContrato.mock.calls[0];
        expect(payload.renovacionAutomatica).toBe(true);
        expect(payload.pagadoHasta).toBeUndefined();
    });

    it("muestra el contrato; registrar pago sin tocar el periodo deja que el servidor lo calcule", async () => {
        const wrapper = await montar(conContrato());
        const tarjeta = wrapper.find('[data-testid="contratacion-contrato"]').text();
        expect(tarjeta).toContain("Plan Profesional · 150 HC al mes");
        expect(tarjeta).toContain("Transferencia");
        expect(tarjeta).toMatch(/\$2,400/);
        expect(tarjeta).toContain("Pago por SPEI");
        expect(wrapper.find('[data-testid="contratacion-vigencia"]').text()).toContain("Pagado hasta el");

        await wrapper.find('[data-testid="contratacion-registrar-pago"]').trigger("click");
        expect((wrapper.find('[data-testid="pago-monto"]').element as HTMLInputElement).value).toBe("2400");
        api.registrarPago.mockResolvedValue({ data: conContrato() });
        await wrapper.find('[data-testid="contratacion-pago-form"]').trigger("submit");
        await flushPromises();
        const [, payload] = api.registrarPago.mock.calls[0];
        expect(payload.monto).toBe(2400);
        expect(payload).not.toHaveProperty("periodoDesde");
        expect(payload).not.toHaveProperty("periodoHasta");
    });

    it("periodo sugerido: desde lo ya pagado + 1 mes; si se edita, se envía", async () => {
        const wrapper = await montar(conContrato());
        await wrapper.find('[data-testid="contratacion-registrar-pago"]').trigger("click");
        const hasta = wrapper.find('[data-testid="pago-hasta"]');
        const pagado = new Date(enDias(20));
        pagado.setMonth(pagado.getMonth() + 1);
        expect((hasta.element as HTMLInputElement).value).toBe(
            `${pagado.getFullYear()}-${String(pagado.getMonth() + 1).padStart(2, "0")}-${String(pagado.getDate()).padStart(2, "0")}`,
        );
        await hasta.setValue("2030-01-31");
        await hasta.trigger("input");
        api.registrarPago.mockResolvedValue({ data: conContrato() });
        await wrapper.find('[data-testid="contratacion-pago-form"]').trigger("submit");
        await flushPromises();
        expect(new Date(api.registrarPago.mock.calls[0][1].periodoHasta).getFullYear()).toBe(2030);
    });

    it("factura pendiente → emitida con folio; anular con motivo", async () => {
        const pago = {
            _id: "p1",
            fechaPago: enDias(-2),
            monto: 2400,
            periodoDesde: enDias(-2),
            periodoHasta: enDias(28),
            formaPago: "transferencia",
            factura: { estado: "pendiente" },
        };
        const wrapper = await montar(conContrato({ pagos: [pago] }));
        expect(wrapper.find('[data-testid="contratacion-pagos"]').text()).toContain("Factura pendiente");

        await wrapper.find('[data-testid="pago-emitir"]').trigger("click");
        await wrapper.find('[data-testid="pago-edicion-texto"]').setValue(" A-1024 ");
        api.emitirFactura.mockResolvedValue({ data: conContrato({ pagos: [{ ...pago, factura: { estado: "emitida", folio: "A-1024" } }] }) });
        await wrapper.find('[data-testid="pago-edicion-confirmar"]').trigger("submit");
        await flushPromises();
        expect(api.emitirFactura).toHaveBeenCalledWith(ID, "p1", "A-1024");
        expect(wrapper.find('[data-testid="contratacion-pagos"]').text()).toContain("Folio A-1024");

        await wrapper.find('[data-testid="pago-anular"]').trigger("click");
        await wrapper.find('[data-testid="pago-edicion-texto"]').setValue("Duplicado");
        api.anularPago.mockResolvedValue({ data: conContrato({ pagos: [{ ...pago, anulado: { motivo: "Duplicado", fecha: enDias(0) } }] }) });
        await wrapper.find('[data-testid="pago-edicion-confirmar"]').trigger("submit");
        await flushPromises();
        expect(api.anularPago).toHaveBeenCalledWith(ID, "p1", "Duplicado");
        expect(wrapper.find('[data-testid="contratacion-pagos"]').text()).toContain("Anulado: Duplicado");
    });

    it("terminar: propone conservar el acceso hasta lo pagado", async () => {
        const wrapper = await montar(conContrato());
        await wrapper.find('[data-testid="contratacion-terminar"]').trigger("click");
        api.terminarContrato.mockResolvedValue({ data: conContrato() });
        await wrapper.find('[data-testid="contratacion-terminar-form"]').trigger("submit");
        await flushPromises();
        const [, accesoHasta] = api.terminarContrato.mock.calls[0];
        expect(new Date(accesoHasta).toDateString()).toBe(new Date(enDias(20)).toDateString());
    });

    it("error del servidor: mensaje y sin emitir", async () => {
        const wrapper = await montar(conContrato());
        await wrapper.find('[data-testid="contratacion-registrar-pago"]').trigger("click");
        api.registrarPago.mockRejectedValue({ response: { data: { message: ["El monto debe ser un número"] } } });
        await wrapper.find('[data-testid="contratacion-pago-form"]').trigger("submit");
        await flushPromises();
        expect(toastOpen).toHaveBeenCalledWith(expect.objectContaining({ type: "error", message: "El monto debe ser un número" }));
        expect(wrapper.emitted("actualizado")).toBeUndefined();
    });
});
