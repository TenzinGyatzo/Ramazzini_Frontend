import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { aFechaYmd, finDeDiaIso, resolverFechaFinTrial } from '@/utils/periodoPrueba';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

const updateTenantSettings = vi.fn();
vi.mock('@/api/PlataformaAPI', () => ({
  default: { updateTenantSettings, enterTenant: vi.fn(), exitTenant: vi.fn(), getContexto: vi.fn() },
}));
const toastOpen = vi.fn();
vi.mock('@/utils/toast', () => ({ getToast: () => ({ open: toastOpen }) }));

const { default: TenantSettingsPanel } = await import('./TenantSettingsPanel.vue');

describe('periodoPrueba (utils)', () => {
  it('fin efectivo: backend > fecha fijada > inicio + 15 días al final del día', () => {
    const inicio = '2026-09-01T12:00:00.000Z';
    const fin = resolverFechaFinTrial({ fechaInicioTrial: inicio })!;
    const esperado = new Date(inicio);
    esperado.setDate(esperado.getDate() + 15);
    esperado.setHours(23, 59, 59);
    expect(fin.getTime()).toBe(esperado.getTime());

    expect(
      resolverFechaFinTrial({ fechaInicioTrial: inicio, fechaFinTrial: '2026-12-31T00:00:00.000Z' })!.toISOString(),
    ).toBe('2026-12-31T00:00:00.000Z');
    expect(
      resolverFechaFinTrial({
        fechaInicioTrial: inicio,
        fechaFinTrial: '2026-12-31T00:00:00.000Z',
        fechaFinTrialEfectiva: '2027-01-15T00:00:00.000Z',
      })!.toISOString(),
    ).toBe('2027-01-15T00:00:00.000Z');
    expect(resolverFechaFinTrial({})).toBeNull();
  });

  it('conversión de fechas del input', () => {
    const iso = finDeDiaIso('2026-10-05');
    const d = new Date(iso);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()]).toEqual([2026, 10, 5, 23]);
    expect(aFechaYmd(d)).toBe('2026-10-05');
    expect(aFechaYmd(null)).toBe('');
  });
});

describe('proveedorSalud store: valores comerciales efectivos', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('límite: el mayor entre contratado y asignado; el asignado solo aumenta', () => {
    const store = useProveedorSaludStore();
    store.proveedorSalud = { maxHistoriasPermitidasAlMes: 50 } as any;
    expect(store.limiteHistoriasContratado).toBe(50);
    expect(store.limiteHistoriasEfectivo).toBe(50);
    expect(store.historiasExtraAsignadas).toBe(0);
    expect(store.accesoRestringido).toBe(false);

    // Un asignado menor no deja al cliente por debajo de lo que paga
    store.proveedorSalud = { maxHistoriasPermitidasAlMes: 50, limiteHistoriasManual: 0 } as any;
    expect(store.limiteHistoriasEfectivo).toBe(50);
    expect(store.historiasExtraAsignadas).toBe(0);

    store.proveedorSalud = {
      maxHistoriasPermitidasAlMes: 50,
      limiteHistoriasManual: 200,
      restriccionManual: true,
    } as any;
    expect(store.limiteHistoriasEfectivo).toBe(200);
    expect(store.historiasExtraAsignadas).toBe(150);
    expect(store.accesoRestringido).toBe(true);

    // Si el backend ya calculó el efectivo, se usa ese
    store.proveedorSalud = {
      maxHistoriasPermitidasAlMes: 50,
      limiteHistoriasManual: 80,
      limiteHistoriasEfectivo: 80,
    } as any;
    expect(store.limiteHistoriasEfectivo).toBe(80);
    expect(store.historiasExtraAsignadas).toBe(30);
  });

  it('periodo gratuito: original (inicio + 15) frente al ajustado por Ramazzini', () => {
    const store = useProveedorSaludStore();
    const inicio = '2026-09-01T12:00:00.000Z';
    store.proveedorSalud = { fechaInicioTrial: inicio } as any;
    expect(store.periodoGratuitoAjustado).toBe(false);
    expect(store.fechaFinTrialEfectiva?.getTime()).toBe(store.fechaFinTrialOriginal?.getTime());

    store.proveedorSalud = { fechaInicioTrial: inicio, fechaFinTrial: '2026-12-31T23:59:59.000Z' } as any;
    expect(store.periodoGratuitoAjustado).toBe(true);
    expect(store.fechaFinTrialEfectiva?.toISOString()).toBe('2026-12-31T23:59:59.000Z');
    const original = new Date(inicio);
    original.setDate(original.getDate() + 15);
    original.setHours(23, 59, 59);
    expect(store.fechaFinTrialOriginal?.getTime()).toBe(original.getTime());
  });
});

describe('TenantSettingsPanel', () => {
  beforeEach(() => {
    updateTenantSettings.mockReset();
    toastOpen.mockReset();
  });

  const mountPanel = (props: Record<string, unknown> = {}) =>
    mount(TenantSettingsPanel, {
      props: {
        proveedorId: 'prov-1',
        maxHistoriasPermitidasAlMes: 50,
        fechaInicioTrial: '2026-01-01T00:00:00.000Z',
        ...props,
      },
    });

  const abrir = async (wrapper: ReturnType<typeof mountPanel>) => {
    await wrapper.find('[data-testid="tenant-settings-toggle"]').trigger('click');
  };

  it('sin cambios no permite guardar', async () => {
    const wrapper = mountPanel();
    await abrir(wrapper);
    expect(wrapper.find('[data-testid="tenant-settings-guardar"]').attributes('disabled')).toBeDefined();
  });

  it('envía solo los campos que cambiaron y notifica al panel', async () => {
    const respuesta = { id: 'prov-1', limiteHistoriasManual: 120, restriccionManual: true };
    updateTenantSettings.mockResolvedValue({ data: respuesta });
    const wrapper = mountPanel();
    await abrir(wrapper);
    await wrapper.find('[data-testid="tenant-settings-limite"]').setValue('120');
    await wrapper.find('[data-testid="tenant-settings-restriccion"]').setValue(true);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateTenantSettings).toHaveBeenCalledWith('prov-1', {
      limiteHistoriasManual: 120,
      restriccionManual: true,
    });
    expect(wrapper.emitted('actualizado')?.[0]).toEqual([respuesta]);
    expect(toastOpen).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('pago en línea: se envía solo al cambiar', async () => {
    updateTenantSettings.mockResolvedValue({ data: { id: 'prov-1', pagoEnLineaHabilitado: true } });
    const wrapper = mountPanel();
    await abrir(wrapper);
    await wrapper.find('[data-testid="tenant-settings-pago-en-linea"]').setValue(true);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(updateTenantSettings).toHaveBeenCalledWith('prov-1', { pagoEnLineaHabilitado: true });
  });

  it('quitar el pago en línea con suscripción vigente muestra el aviso de cobros', async () => {
    const wrapper = mountPanel({ pagoEnLineaHabilitado: true, estadoSuscripcion: 'authorized' });
    await abrir(wrapper);
    expect(wrapper.find('[data-testid="tenant-settings-aviso-mp"]').exists()).toBe(false);
    await wrapper.find('[data-testid="tenant-settings-pago-en-linea"]').setValue(false);
    expect(wrapper.find('[data-testid="tenant-settings-aviso-mp"]').text()).toContain('seguirá cobrándose');
  });

  it('vaciar el límite manual lo devuelve al plan (null)', async () => {
    updateTenantSettings.mockResolvedValue({ data: { id: 'prov-1' } });
    const wrapper = mountPanel({ limiteHistoriasManual: 300 });
    await abrir(wrapper);
    await wrapper.find('[data-testid="tenant-settings-limite"]').setValue('');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(updateTenantSettings).toHaveBeenCalledWith('prov-1', { limiteHistoriasManual: null });
  });

  it('límite inválido bloquea el guardado', async () => {
    const wrapper = mountPanel();
    await abrir(wrapper);
    await wrapper.find('[data-testid="tenant-settings-limite"]').setValue('-3');
    expect(wrapper.text()).toContain('número entero');
    expect(wrapper.find('[data-testid="tenant-settings-guardar"]').attributes('disabled')).toBeDefined();
  });

  it('+15 días desde hoy cuando el periodo ya venció; se envía como fin de día', async () => {
    updateTenantSettings.mockResolvedValue({ data: { id: 'prov-1' } });
    const wrapper = mountPanel(); // inicio 2026-01-01: periodo vencido
    await abrir(wrapper);
    await wrapper.find('[data-testid="tenant-settings-extender-15"]').trigger('click');
    const esperado = new Date();
    esperado.setDate(esperado.getDate() + 15);
    expect((wrapper.find('[data-testid="tenant-settings-fin"]').element as HTMLInputElement).value).toBe(
      aFechaYmd(esperado),
    );
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(updateTenantSettings).toHaveBeenCalledWith('prov-1', {
      fechaFinTrial: finDeDiaIso(aFechaYmd(esperado)),
    });
  });

  it('error del servidor: muestra el mensaje y no emite', async () => {
    updateTenantSettings.mockRejectedValue({ response: { data: { message: ['No se indicó ningún cambio'] } } });
    const wrapper = mountPanel();
    await abrir(wrapper);
    await wrapper.find('[data-testid="tenant-settings-restriccion"]').setValue(true);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(toastOpen).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', message: 'No se indicó ningún cambio' }),
    );
    expect(wrapper.emitted('actualizado')).toBeUndefined();
  });
});
