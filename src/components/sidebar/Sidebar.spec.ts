import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import Sidebar from './Sidebar.vue';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useSidebarStore } from '@/stores/sidebar';

function createSiresPolicy() {
  return {
    regime: 'SIRES_NOM024' as const,
    features: {
      sessionTimeoutEnabled: true,
      enforceDocumentImmutabilityUI: true,
      documentImmutabilityEnabled: true,
      showSiresUI: true,
      giisExportEnabled: true,
      notaAclaratoriaEnabled: true,
      cluesFieldVisible: true,
    },
    validation: {
      curpFirmantes: 'required' as const,
      workerCurp: 'required_strict' as const,
      cie10Principal: 'required' as const,
      geoFields: 'required' as const,
    },
  };
}

function createSinRegimenPolicy() {
  return {
    regime: 'SIN_REGIMEN' as const,
    features: {
      sessionTimeoutEnabled: false,
      enforceDocumentImmutabilityUI: false,
      documentImmutabilityEnabled: false,
      showSiresUI: false,
      giisExportEnabled: false,
      notaAclaratoriaEnabled: false,
      cluesFieldVisible: false,
    },
    validation: {
      curpFirmantes: 'optional' as const,
      workerCurp: 'optional' as const,
      cie10Principal: 'optional' as const,
      geoFields: 'optional' as const,
    },
  };
}

async function mountSidebar(pinia = createPinia()) {
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });
  await router.push('/');
  await router.isReady();

  return mount(Sidebar, {
    global: {
      plugins: [pinia, router],
      provide: { toast: { open: vi.fn() } },
      stubs: {
        SidebarLink: true,
        Transition: true,
      },
    },
  });
}

async function expandSidebar(wrapper: Awaited<ReturnType<typeof mountSidebar>>) {
  const sidebar = useSidebarStore();
  sidebar.collapsed = false;
  await wrapper.vm.$nextTick();
}

describe('Sidebar — folio de edición', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1024,
    });
  });

  it('sin régimen no muestra nada (punto 50: solo la versión, y aquí no hay)', async () => {
    const wrapper = await mountSidebar();
    await expandSidebar(wrapper);
    expect(wrapper.find('[data-testid="edition-label"]').exists()).toBe(false);
  });

  it('SIRES_NOM024 muestra solo el folio, sin la palabra SIRES', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSiresPolicy(),
    } as any;

    const wrapper = await mountSidebar(pinia);
    await expandSidebar(wrapper);
    const el = wrapper.get('[data-testid="edition-label"]');
    expect(el.text()).toBe(__APP_VERSION_SIRES__);
    expect(el.attributes('title')).toBe(`Versión ${__APP_VERSION_SIRES__.replace(/^v/i, '')}`);
    expect(el.text()).not.toContain('SIRES');
    expect(el.text()).not.toContain('v2.0.5');
  });

  it('SIN_REGIMEN muestra solo v2.0.5, sin la palabra Ramazzini', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSinRegimenPolicy(),
    } as any;

    const wrapper = await mountSidebar(pinia);
    await expandSidebar(wrapper);
    const el = wrapper.get('[data-testid="edition-label"]');
    expect(el.text()).toBe('v2.0.5');
    expect(el.attributes('title')).toBe('Versión 2.0.5');
    expect(el.text()).not.toContain('Ramazzini');
    expect(el.text()).not.toContain('v1.0.3');
    expect(el.text()).not.toContain('SIRES');
  });

  it('tras changeRegimen a SIRES el footer pasa al folio 1.0.x', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regimenRegulatorio: 'SIN_REGIMEN',
      regulatoryPolicy: createSinRegimenPolicy(),
    } as any;

    const wrapper = await mountSidebar(pinia);
    await expandSidebar(wrapper);
    expect(wrapper.get('[data-testid="edition-label"]').text()).toBe('v2.0.5');

    store.proveedorSalud = {
      ...store.proveedorSalud,
      regimenRegulatorio: 'SIRES_NOM024',
      regulatoryPolicy: createSiresPolicy(),
    } as any;
    await wrapper.vm.$nextTick();

    const el = wrapper.get('[data-testid="edition-label"]');
    expect(el.text()).toBe(__APP_VERSION_SIRES__);
    expect(el.attributes('title')).toBe(`Versión ${__APP_VERSION_SIRES__.replace(/^v/i, '')}`);
    expect(el.text()).not.toContain('v2.0.5');
  });

  it('colapsado desde md muestra la versión con v', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    });
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSinRegimenPolicy(),
    } as any;

    const wrapper = await mountSidebar(pinia);
    useSidebarStore().collapsed = true;
    await wrapper.vm.$nextTick();

    const el = wrapper.get('[data-testid="edition-label"]');
    expect(el.text()).toBe('v2.0.5');
    expect(el.attributes('title')).toBe('Versión 2.0.5');
  });

  it('colapsado desde md en SIRES muestra la versión con v', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    });
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSiresPolicy(),
    } as any;

    const wrapper = await mountSidebar(pinia);
    useSidebarStore().collapsed = true;
    await wrapper.vm.$nextTick();

    const el = wrapper.get('[data-testid="edition-label"]');
    expect(el.text()).toBe(__APP_VERSION_SIRES__);
    expect(el.text().startsWith('v')).toBe(true);
    expect(el.attributes('title')).toBe(`Versión ${__APP_VERSION_SIRES__.replace(/^v/i, '')}`);
  });

  it('colapsado en smartphone muestra solo el número de versión comercial', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    });
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSinRegimenPolicy(),
    } as any;

    const wrapper = await mountSidebar(pinia);
    useSidebarStore().collapsed = true;
    await wrapper.vm.$nextTick();

    const el = wrapper.get('[data-testid="edition-label"]');
    expect(el.text()).toBe('2.0.5');
    expect(el.attributes('title')).toBe('Versión 2.0.5');
  });

  it('colapsado en smartphone SIRES muestra solo el número de versión', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    });
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSiresPolicy(),
    } as any;

    const wrapper = await mountSidebar(pinia);
    useSidebarStore().collapsed = true;
    await wrapper.vm.$nextTick();

    const el = wrapper.get('[data-testid="edition-label"]');
    expect(el.text()).toBe(__APP_VERSION_SIRES__.replace(/^v/i, ''));
    expect(el.attributes('title')).toBe(`Versión ${__APP_VERSION_SIRES__.replace(/^v/i, '')}`);
    expect(el.text()).not.toContain('SIRES');
  });
});

describe('Sidebar — anchos móviles', () => {
  function stubViewport(width: number) {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    });
  }

  afterEach(() => {
    stubViewport(1024);
  });

  it('en smartphone inicia colapsado a 56px y el overlay no supera 220px', async () => {
    stubViewport(390);
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSidebarStore();

    expect(store.isSmallScreen).toBe(true);
    expect(store.collapsed).toBe(true);
    expect(store.sidebarWidth).toBe('56px');
    expect(store.isMobileOverlayOpen).toBe(false);

    store.toggleSidebar();
    expect(store.isMobileOverlayOpen).toBe(true);
    const expanded = Number.parseInt(store.sidebarWidth, 10);
    expect(expanded).toBeLessThanOrEqual(220);
    expect(expanded).toBe(Math.min(220, Math.round(390 * 0.72)));
    expect(store.sidebarWidthCollapsed).toBe('56px');
  });

  it('en escritorio conserva 230 / 80', async () => {
    stubViewport(1280);
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSidebarStore();

    expect(store.isSmallScreen).toBe(false);
    store.collapsed = true;
    expect(store.sidebarWidth).toBe('80px');
    store.collapsed = false;
    expect(store.sidebarWidth).toBe('230px');
    expect(store.isMobileOverlayOpen).toBe(false);
  });
});

describe('Sidebar — Inicio', () => {
  it('Inicio va en un solo renglón, sin el subtítulo «Resumen de trabajo» (punto 50)', async () => {
    setActivePinia(createPinia());
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(Sidebar, {
      global: {
        plugins: [createPinia(), router],
        provide: { toast: { open: vi.fn() } },
        renderStubDefaultSlot: true,
        stubs: {
          SidebarLink: true,
          Transition: true,
        },
      },
    });
    expect(wrapper.text()).toContain('Inicio');
    expect(wrapper.text()).not.toContain('Resumen de trabajo');
  });

  it('«Vigencias» solo aparece con el módulo activado', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useProveedorSaludStore();
    store.proveedorSalud = { _id: 'p1', vigenciasHabilitadas: false } as any;
    const wrapper = await mountSidebar(pinia);
    expect(wrapper.find('[data-testid="vigencias-sidebar-link"]').exists()).toBe(false);

    store.proveedorSalud = { _id: 'p1', vigenciasHabilitadas: true } as any;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="vigencias-sidebar-link"]').exists()).toBe(true);
  });

  it('expone Cerrar sesión en el footer', async () => {
    const wrapper = await mountSidebar();
    const sidebar = useSidebarStore();
    sidebar.collapsed = false;
    await wrapper.vm.$nextTick();
    const logout = wrapper.get('[data-testid="sidebar-logout"]');
    expect(logout.element.tagName).toBe('BUTTON');
    expect(logout.attributes('aria-label')).toBe('Cerrar sesión');
    expect(logout.attributes('title')).toBe('Cerrar sesión');
    expect(logout.text()).toContain('Salir');
  });

  it('«Donde estás» une la ruta y conserva solo el estado del documento (punto 50)', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useUserStore } = await import('@/stores/user');
    const { useEmpresasStore } = await import('@/stores/empresas');
    const { useCentrosTrabajoStore } = await import('@/stores/centrosTrabajo');
    const { useTrabajadoresStore } = await import('@/stores/trabajadores');
    const { useDocumentosStore } = await import('@/stores/documentos');
    (useUserStore() as any).user = { _id: 'u1' };
    const empresas = useEmpresasStore() as any;
    empresas.currentEmpresaId = 'e1';
    empresas.currentEmpresa = { nombreComercial: 'Delta', razonSocial: 'Delta S.A. de C.V.' };
    const centros = useCentrosTrabajoStore() as any;
    centros.currentCentroTrabajoId = 'c1';
    centros.currentCentroTrabajo = { nombreCentro: 'Planta Norte', direccionCentro: 'Av. Industrial 450' };
    const trabajadores = useTrabajadoresStore() as any;
    trabajadores.currentTrabajadorId = 't1';
    trabajadores.currentTrabajador = { nombre: 'Fatima', primerApellido: 'González' };
    (useDocumentosStore() as any).currentTypeOfDocument = 'notaMedica';
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/e/:idEmpresa/centros', name: 'centros-trabajo', component: { template: '<div />' } },
        { path: '/e/:idEmpresa/tablero', name: 'dashboard-empresa', component: { template: '<div />' } },
        { path: '/e/:idEmpresa/c/:idCentroTrabajo', name: 'trabajadores', component: { template: '<div />' } },
        { path: '/e/:idEmpresa/c/:idCentroTrabajo/t/:idTrabajador', name: 'expediente-medico', component: { template: '<div />' } },
        { path: '/e/:idEmpresa/c/:idCentroTrabajo/t/:idTrabajador/:tipoDocumento/:idDocumento?', name: 'crear-documento', component: { template: '<div />' } },
      ],
    });
    await router.push('/');
    await router.isReady();
    const wrapper = mount(Sidebar, {
      global: {
        plugins: [pinia, router],
        provide: { toast: { open: vi.fn() } },
        stubs: { Transition: true },
      },
    });
    useSidebarStore().collapsed = false;
    await wrapper.vm.$nextTick();
    const ruta = wrapper.get('[data-testid="sidebar-ruta"]');
    expect(ruta.text()).toContain('Delta');
    expect(ruta.text()).toContain('Planta Norte');
    expect(ruta.text()).toContain('Nota Médica');
    // Lo que antes iba en letras chicas ya no está a la vista
    expect(ruta.text()).not.toContain('S.A. de C.V.');
    expect(ruta.text()).not.toContain('Av. Industrial');
    expect(ruta.text()).not.toContain('Expediente Médico');
    expect(wrapper.get('[data-testid="sidebar-estado-documento"]').text()).toBe('Creando');
  });

  it('Incapacidades aparece bajo la empresa después de visitarla, si la empresa las gestiona (punto 50)', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useUserStore } = await import('@/stores/user');
    const { useEmpresasStore } = await import('@/stores/empresas');
    const { useIncapacidadesStore } = await import('@/stores/incapacidades');
    (useUserStore() as any).user = { _id: 'u1', role: 'Principal', permisos: { accesoRiesgosTrabajo: true } };
    const empresas = useEmpresasStore() as any;
    empresas.currentEmpresaId = 'e1';
    empresas.currentEmpresa = { nombreComercial: 'Delta' };
    const incapacidades = useIncapacidadesStore();
    incapacidades.aplicar({ incapacidadesDisponible: true, incapacidadesHabilitado: false, empresasConIncapacidades: ['e1'] } as any);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/e/:idEmpresa/centros', name: 'centros-trabajo', component: { template: '<div />' } },
        { path: '/e/:idEmpresa/incapacidades', name: 'incapacidades-empresa', component: { template: '<div />' } },
      ],
    });
    await router.push('/');
    await router.isReady();
    const wrapper = mount(Sidebar, {
      global: { plugins: [pinia, router], provide: { toast: { open: vi.fn() } }, stubs: { Transition: true } },
    });
    useSidebarStore().collapsed = false;
    await wrapper.vm.$nextTick();
    // Módulo apagado: no aparece
    expect(wrapper.find('[data-testid="sidebar-incapacidades"]').exists()).toBe(false);
    incapacidades.aplicar({ incapacidadesDisponible: true, incapacidadesHabilitado: true, empresasConIncapacidades: ['e1'] } as any);
    await wrapper.vm.$nextTick();
    // Encendido pero sin visitarla todavía: no aparece (como Estadísticas)
    expect(wrapper.find('[data-testid="sidebar-incapacidades"]').exists()).toBe(false);
    await router.push('/e/e1/incapacidades');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="sidebar-incapacidades"]').exists()).toBe(true);
    // En una subpantalla (el informe) también se marca como activo, y la empresa no
    router.addRoute({ path: '/e/:idEmpresa/incapacidades/informe', name: 'incapacidades-informe', component: { template: '<div />' } });
    await router.push('/e/e1/incapacidades/informe');
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-testid="sidebar-incapacidades"] a').classes()).toContain('active');
    expect(wrapper.get('[data-testid="sidebar-ruta"] a').classes()).not.toContain('active');
    // Otra empresa: vuelve a esconderse hasta visitarla
    empresas.currentEmpresaId = 'e2';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="sidebar-incapacidades"]').exists()).toBe(false);
  });

  it('Inventario aparece bajo el centro cuando el centro lleva inventario (punto 50)', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useUserStore } = await import('@/stores/user');
    const { useEmpresasStore } = await import('@/stores/empresas');
    const { useCentrosTrabajoStore } = await import('@/stores/centrosTrabajo');
    const { useInventarioStore } = await import('@/stores/inventario');
    (useUserStore() as any).user = { _id: 'u1', role: 'Principal' };
    const empresas = useEmpresasStore() as any;
    empresas.currentEmpresaId = 'e1';
    empresas.currentEmpresa = { nombreComercial: 'Delta' };
    const centros = useCentrosTrabajoStore() as any;
    centros.currentCentroTrabajoId = 'c1';
    centros.currentCentroTrabajo = { nombreCentro: 'Planta Norte' };
    const inventario = useInventarioStore() as any;
    inventario.habilitado = true;
    inventario.centrosConInventario = ['c2'];
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/e/:idEmpresa/centros', name: 'centros-trabajo', component: { template: '<div />' } },
        { path: '/e/:idEmpresa/c/:idCentroTrabajo', name: 'trabajadores', component: { template: '<div />' } },
        { path: '/e/:idEmpresa/c/:idCentroTrabajo/inventario', name: 'inventario', component: { template: '<div />' } },
      ],
    });
    await router.push('/');
    await router.isReady();
    const wrapper = mount(Sidebar, {
      global: { plugins: [pinia, router], provide: { toast: { open: vi.fn() } }, stubs: { Transition: true } },
    });
    useSidebarStore().collapsed = false;
    await wrapper.vm.$nextTick();
    // Otro centro lleva inventario, este no
    expect(wrapper.find('[data-testid="sidebar-inventario"]').exists()).toBe(false);
    inventario.centrosConInventario = ['c1'];
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="sidebar-inventario"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="sidebar-inventario"]').text()).toContain('Inventario');
  });
});
