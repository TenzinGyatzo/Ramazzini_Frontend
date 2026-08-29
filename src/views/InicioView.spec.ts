import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { ref } from 'vue';
import InicioView from './InicioView.vue';
import { useUserStore } from '@/stores/user';
import { useDocumentosStore } from '@/stores/documentos';
import { inicioResumenState, invalidateInicioResumenCache } from '@/composables/inicioResumenCache';

const showHub = ref(false);
const isLoading = ref(false);
const showWelcome = ref(true);
const showError = ref(false);
const error = ref<string | null>(null);
const resumen = ref<any>(null);
const fetchResumen = vi.fn();
const getHoyTrabajadores = vi.fn();
const getHoyDocumentos = vi.fn();
const getHoyCentros = vi.fn();

vi.mock('@/composables/useInicioResumen', () => ({
  useInicioResumen: () => ({
    resumen,
    error,
    showHub,
    isLoading,
    showWelcome,
    showError,
    fetchResumen,
  }),
}));

vi.mock('@/api/InicioAPI', () => ({
  default: {
    getHoyTrabajadores: (...args: unknown[]) => getHoyTrabajadores(...args),
    getHoyDocumentos: (...args: unknown[]) => getHoyDocumentos(...args),
    getHoyCentros: (...args: unknown[]) => getHoyCentros(...args),
  },
}));

function hubFixture(overrides: Record<string, unknown> = {}) {
  return {
    hasActivity: true,
    hasTrabajadores: true,
    activityScope: 'user',
    regimen: 'SIRES_NOM024',
    dateKey: '2026-08-28',
    hoy: {
      trabajadoresUnicos: 2,
      documentosCreados: 3,
      borradoresPendientes: 1,
    },
    clientesRecientes: [
      {
        idEmpresa: 'e1',
        nombreComercial: 'Empresa Demo',
        idCentroTrabajo: 'c1',
        nombreCentro: 'Planta Norte',
        ultimaActividad: new Date().toISOString(),
        actorUsername: 'Dra. Ana',
      },
    ],
    expedientesRecientes: [
      {
        idEmpresa: 'e1',
        idCentroTrabajo: 'c1',
        idTrabajador: 't1',
        nombreTrabajador: 'Pérez Juan',
        nombreComercial: 'Empresa Demo',
        nombreCentro: 'Planta Norte',
        tipoDocumento: 'historiaClinica',
        etiquetaTipo: 'Historia clínica',
        ultimaActividad: new Date().toISOString(),
        actorUsername: 'Dra. Ana',
      },
    ],
    atencion: [],
    pendientes: [],
    consejo: { id: 'anular-trazabilidad', texto: 'Consejo de prueba' },
    ...overrides,
  };
}

function setHub(overrides: Record<string, unknown> = {}) {
  showHub.value = true;
  isLoading.value = false;
  showWelcome.value = false;
  showError.value = false;
  error.value = null;
  resumen.value = hubFixture(overrides);
  inicioResumenState.resumen.value = resumen.value;
}

const toastOpen = vi.fn();

async function mountInicio(userOverrides: Record<string, unknown> = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const userStore = useUserStore();
  userStore.user = {
    _id: 'u1',
    username: 'edgar',
    email: 'e@test.com',
    role: 'Médico',
    idProveedorSalud: 'p1',
    ...userOverrides,
  } as any;

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'inicio', component: InicioView },
      { path: '/empresas', name: 'empresas', component: { template: '<div />' } },
      {
        path: '/login',
        name: 'login',
        component: { template: '<div />' },
      },
      {
        path: '/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/trabajadores',
        name: 'trabajadores',
        component: { template: '<div />' },
      },
      {
        path: '/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/expediente-medico/:idTrabajador',
        name: 'expediente-medico',
        component: { template: '<div />' },
      },
      {
        path: '/crear-documento/:idEmpresa/:idCentroTrabajo/:idTrabajador/:tipoDocumento/:idDocumento?',
        name: 'crear-documento',
        component: { template: '<div />' },
      },
      {
        path: '/manage-permissions',
        name: 'manage-permissions',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push('/');
  await router.isReady();

  return {
    wrapper: mount(InicioView, {
      global: {
        plugins: [pinia, router],
        provide: { toast: { open: toastOpen } },
      },
    }),
    router,
  };
}

describe('InicioView', () => {
  beforeEach(() => {
    showHub.value = false;
    isLoading.value = false;
    showWelcome.value = true;
    showError.value = false;
    error.value = null;
    resumen.value = null;
    fetchResumen.mockReset();
    toastOpen.mockReset();
    invalidateInicioResumenCache();
    getHoyTrabajadores.mockReset();
    getHoyDocumentos.mockReset();
    getHoyCentros.mockReset();
    getHoyTrabajadores.mockResolvedValue({
      data: {
        items: [
          {
            idEmpresa: 'e1',
            idCentroTrabajo: 'c1',
            idTrabajador: 't1',
            nombreTrabajador: 'Pérez Juan',
            nombreComercial: 'Empresa Demo',
            nombreCentro: 'Planta Norte',
            etiquetaTipo: 'Historia clínica',
            ultimaActividad: '2026-08-28T16:00:00.000Z',
            actorUsername: 'Dra. Ana',
          },
        ],
        total: 1,
        truncated: false,
      },
    });
    getHoyDocumentos.mockResolvedValue({
      data: {
        items: [
          {
            idDocumento: 'd1',
            tipoDocumento: 'historiaClinica',
            etiquetaTipo: 'Historia clínica',
            idEmpresa: 'e1',
            idCentroTrabajo: 'c1',
            idTrabajador: 't1',
            nombreTrabajador: 'Pérez Juan',
            nombreComercial: 'Empresa Demo',
            nombreCentro: 'Planta Norte',
            createdAt: '2026-08-28T16:00:00.000Z',
            estado: 'finalizado',
            creadorUsername: 'Dra. Ana',
          },
        ],
        total: 1,
        truncated: false,
      },
    });
    getHoyCentros.mockResolvedValue({
      data: {
        items: [
          {
            idEmpresa: 'e1',
            idCentroTrabajo: 'c1',
            nombreComercial: 'Empresa Demo',
            nombreCentro: 'Planta Norte',
            ultimaActividad: '2026-08-28T16:00:00.000Z',
            actorUsername: 'Dra. Ana',
          },
        ],
        total: 1,
        truncated: false,
      },
    });
  });

  it('muestra skeletons y saludo en carga, sin eslogan institucional', async () => {
    isLoading.value = true;
    showWelcome.value = false;
    const { wrapper } = await mountInicio();
    expect(wrapper.find('[data-testid="inicio-loading"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Cargando su resumen de trabajo');
    expect(wrapper.text()).not.toContain(
      'La aplicación para la creación y gestión',
    );
    expect(wrapper.text()).not.toContain('VER MIS CLIENTES');
    expect(fetchResumen).toHaveBeenCalled();
  });

  it('muestra la bienvenida y el CTA a clientes cuando no hay trabajadores', async () => {
    const { wrapper } = await mountInicio();
    expect(wrapper.find('[data-testid="inicio-welcome"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Ramazzini');
    expect(wrapper.text()).toContain('VER MIS CLIENTES');
    expect(wrapper.text()).not.toContain('Cerrar sesión');
    expect(fetchResumen).toHaveBeenCalled();
  });

  it('usa la transición slide-up al aparecer, como el resto de vistas', async () => {
    const { wrapper } = await mountInicio();
    const transition = wrapper.findComponent({ name: 'Transition' });
    expect(transition.exists()).toBe(true);
    expect(transition.props()).toMatchObject({
      name: 'slide-up',
      appear: true,
      mode: 'out-in',
    });
  });

  it('muestra el hub vacío cuando hay trabajadores sin actividad', async () => {
    setHub({
      hasActivity: false,
      hasTrabajadores: true,
      hoy: { trabajadoresUnicos: 0, documentosCreados: 0, borradoresPendientes: 0 },
      clientesRecientes: [],
      expedientesRecientes: [],
      consejo: { id: 'pdf-regenerar', texto: 'Consejo sin actividad' },
    });
    const { wrapper } = await mountInicio();
    expect(wrapper.find('[data-testid="inicio-hub"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('No hay expedientes recientes.');
    expect(wrapper.text()).toContain('No hay actividad reciente.');
    expect(wrapper.text()).toContain('Ir a clientes');
    expect(wrapper.text()).not.toContain('Ver todos');
    expect(wrapper.text()).toContain('Consejo');
    expect(wrapper.text()).toContain('Consejo sin actividad');
    expect(wrapper.find('[data-testid="inicio-welcome"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('VER MIS CLIENTES');
  });

  it('muestra el hub cuando hay actividad', async () => {
    setHub();
    const { wrapper } = await mountInicio();
    expect(wrapper.find('[data-testid="inicio-hub"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Trabajadores atendidos hoy');
    expect(wrapper.text()).toContain('documentos elaborados en el día');
    expect(wrapper.text()).toContain('Empresa Demo');
    expect(wrapper.text()).toContain('Ver todos');
    expect(wrapper.text()).toContain('Consejo');
    expect(wrapper.text()).toContain('Consejo de prueba');
    expect(wrapper.text()).not.toContain('Continuar');
    expect(wrapper.text()).not.toContain('Revisar');
    expect(wrapper.text()).not.toContain('Cerrar sesión');
    expect(wrapper.text()).not.toContain('CERRAR SESIÓN');
    expect(wrapper.text()).not.toContain(
      'La aplicación para la creación y gestión',
    );
  });

  it('conserva el CTA a clientes si el resumen falla', async () => {
    error.value = 'falló';
    showWelcome.value = false;
    showError.value = true;
    const { wrapper } = await mountInicio();
    expect(wrapper.text()).toContain('VER MIS CLIENTES');
    expect(wrapper.text()).toContain('No se pudo cargar el resumen');
    expect(wrapper.text()).not.toContain('sin actividad');
  });

  it('pone expedientes antes que clientes en el DOM', async () => {
    setHub();
    const { wrapper } = await mountInicio();
    const expedientes = wrapper.get('[data-testid="inicio-expedientes"]').element;
    const clientes = wrapper.get('[data-testid="inicio-clientes"]').element;
    expect(
      Boolean(
        expedientes.compareDocumentPosition(clientes) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  it('muestra Actualizado por solo con activityScope tenant', async () => {
    setHub({ activityScope: 'user' });
    const { wrapper: userWrapper } = await mountInicio();
    expect(userWrapper.text()).not.toContain('Actualizado por');

    setHub({ activityScope: 'tenant' });
    const { wrapper: tenantWrapper } = await mountInicio();
    expect(tenantWrapper.text()).toContain('Actualizado por Dra. Ana');
  });

  it('no inventa el tratamiento Dr. en el saludo', async () => {
    setHub();
    const { wrapper } = await mountInicio();
    expect(wrapper.text()).toMatch(/Buen[oa]s \S+, Edgar/);
    expect(wrapper.text()).not.toContain('Dr. Edgar');
  });

  it('hace clicable el indicador SIRES y el de centros solo si hay actividad', async () => {
    setHub();
    const { wrapper: sires } = await mountInicio();
    const pendientes = sires.get('[data-testid="inicio-metric-pendientes"]');
    expect(pendientes.element.tagName).toBe('BUTTON');
    expect(sires.text()).toContain('Todos los borradores');
    expect(getHoyCentros).not.toHaveBeenCalled();

    setHub({
      regimen: 'SIN_REGIMEN',
      hoy: {
        trabajadoresUnicos: 1,
        documentosCreados: 1,
        centrosConActividad: 0,
      },
    });
    const { wrapper: sinCero } = await mountInicio();
    expect(sinCero.find('[data-testid="inicio-metric-pendientes"]').exists()).toBe(
      false,
    );
    expect(sinCero.get('[data-testid="inicio-metric-centros"]').element.tagName).not.toBe(
      'BUTTON',
    );

    setHub({
      regimen: 'SIN_REGIMEN',
      hoy: {
        trabajadoresUnicos: 1,
        documentosCreados: 1,
        centrosConActividad: 2,
      },
    });
    const { wrapper: sin } = await mountInicio();
    expect(sin.get('[data-testid="inicio-metric-centros"]').element.tagName).toBe(
      'BUTTON',
    );
  });

  it('usa filas con chevron y reduced-motion', async () => {
    setHub();
    const { wrapper } = await mountInicio();
    const row = wrapper.get('[data-testid="inicio-cliente-reciente"]');
    expect(row.element.tagName).toBe('BUTTON');
    const chevron = row.get('.inicio-action-row__chevron');
    expect(chevron.classes()).toContain(
      'motion-reduce:group-hover:translate-x-0',
    );
  });

  it('navega al listado de trabajadores al hacer clic en un cliente reciente', async () => {
    setHub({
      regimen: 'SIN_REGIMEN',
      hoy: {
        trabajadoresUnicos: 1,
        documentosCreados: 1,
        centrosConActividad: 1,
      },
      expedientesRecientes: [],
      consejo: null,
    });
    const { wrapper, router } = await mountInicio();
    await wrapper.get('[data-testid="inicio-cliente-reciente"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('trabajadores');
    expect(router.currentRoute.value.params).toMatchObject({
      idEmpresa: 'e1',
      idCentroTrabajo: 'c1',
    });
  });

  it('no navega si el cliente no tiene centro', async () => {
    setHub({
      clientesRecientes: [
        {
          idEmpresa: 'e1',
          nombreComercial: 'Empresa Incompleta',
          idCentroTrabajo: '',
          nombreCentro: '',
          ultimaActividad: new Date().toISOString(),
        },
      ],
    });
    const { wrapper, router } = await mountInicio();
    const row = wrapper.get('[data-testid="inicio-cliente-reciente"]');
    expect(row.element.tagName).toBe('DIV');
    await row.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('inicio');
  });

  it('navega al expediente al hacer clic en un expediente reciente', async () => {
    setHub({ clientesRecientes: [], consejo: null });
    const { wrapper, router } = await mountInicio();
    await wrapper
      .get('[data-testid="inicio-expediente-reciente"]')
      .trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('expediente-medico');
    expect(router.currentRoute.value.params).toMatchObject({
      idEmpresa: 'e1',
      idCentroTrabajo: 'c1',
      idTrabajador: 't1',
    });
  });

  it('no dispara GET de listas al montar el hub', async () => {
    setHub();
    await mountInicio();
    expect(getHoyTrabajadores).not.toHaveBeenCalled();
    expect(getHoyDocumentos).not.toHaveBeenCalled();
    expect(getHoyCentros).not.toHaveBeenCalled();
  });

  it('deja estáticos los indicadores en cero y abre el modal con un GET si hay valor', async () => {
    setHub({
      hoy: {
        trabajadoresUnicos: 0,
        documentosCreados: 3,
        borradoresPendientes: 0,
      },
    });
    const { wrapper } = await mountInicio();
    expect(wrapper.get('[data-testid="inicio-metric-trabajadores"]').element.tagName).not.toBe(
      'BUTTON',
    );
    expect(wrapper.get('[data-testid="inicio-metric-documentos"]').element.tagName).toBe(
      'BUTTON',
    );

    await wrapper.get('[data-testid="inicio-metric-documentos"]').trigger('click');
    await flushPromises();
    expect(getHoyDocumentos).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="inicio-hoy-modal"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="inicio-hoy-documento"]').text()).toContain(
      'Historia clínica',
    );
  });

  it('no vuelve a pedir al cambiar de página y reutiliza caché al reabrir', async () => {
    getHoyDocumentos.mockResolvedValue({
      data: {
        items: Array.from({ length: 16 }, (_, i) => ({
          idDocumento: `d${i + 1}`,
          tipoDocumento: 'historiaClinica',
          etiquetaTipo: `Doc ${i + 1}`,
          idEmpresa: 'e1',
          idCentroTrabajo: 'c1',
          idTrabajador: 't1',
          nombreTrabajador: 'Pérez Juan',
          nombreComercial: 'Empresa Demo',
          nombreCentro: 'Planta Norte',
          createdAt: '2026-08-28T16:00:00.000Z',
        })),
        total: 16,
        truncated: false,
      },
    });
    setHub();
    const { wrapper } = await mountInicio();
    await wrapper.get('[data-testid="inicio-metric-documentos"]').trigger('click');
    await flushPromises();
    expect(getHoyDocumentos).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="inicio-hoy-range"]').text()).toContain('1–15 de 16');

    await wrapper.get('[data-testid="inicio-hoy-next"]').trigger('click');
    await flushPromises();
    expect(getHoyDocumentos).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="inicio-hoy-range"]').text()).toContain('16–16 de 16');

    await wrapper.get('[aria-label="Cerrar"]').trigger('click');
    await wrapper.get('[data-testid="inicio-metric-documentos"]').trigger('click');
    await flushPromises();
    expect(getHoyDocumentos).toHaveBeenCalledTimes(1);
  });

  it('muestra aviso de truncamiento y permite reintentar un error', async () => {
    getHoyTrabajadores.mockResolvedValue({
      data: {
        items: [
          {
            idEmpresa: 'e1',
            idCentroTrabajo: 'c1',
            idTrabajador: 't1',
            nombreTrabajador: 'Pérez Juan',
            nombreComercial: 'Empresa Demo',
            nombreCentro: 'Planta Norte',
            etiquetaTipo: 'Historia clínica',
            ultimaActividad: '2026-08-28T16:00:00.000Z',
          },
        ],
        total: 301,
        truncated: true,
      },
    });
    setHub();
    const { wrapper } = await mountInicio();
    await wrapper.get('[data-testid="inicio-metric-trabajadores"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="inicio-hoy-truncated"]').text()).toContain(
      '300 registros más recientes',
    );
  });

  it('muestra error y reintenta el listado', async () => {
    getHoyTrabajadores
      .mockRejectedValueOnce({ message: 'falló la red' })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              idEmpresa: 'e1',
              idCentroTrabajo: 'c1',
              idTrabajador: 't1',
              nombreTrabajador: 'Pérez Juan',
              nombreComercial: 'Empresa Demo',
              nombreCentro: 'Planta Norte',
              etiquetaTipo: 'Historia clínica',
              ultimaActividad: '2026-08-28T16:00:00.000Z',
            },
          ],
          total: 1,
          truncated: false,
        },
      });
    setHub();
    const { wrapper } = await mountInicio();
    await wrapper.get('[data-testid="inicio-metric-trabajadores"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="inicio-hoy-error"]').text()).toContain('falló la red');
    await wrapper.get('[data-testid="inicio-hoy-error"] button').trigger('click');
    await flushPromises();
    expect(getHoyTrabajadores).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="inicio-hoy-trabajador"]').exists()).toBe(true);
  });

  it('muestra el autor de última actividad solo con activityScope tenant', async () => {
    setHub({ activityScope: 'user' });
    const { wrapper: userWrapper } = await mountInicio();
    await userWrapper.get('[data-testid="inicio-metric-trabajadores"]').trigger('click');
    await flushPromises();
    expect(userWrapper.get('[data-testid="inicio-hoy-trabajador"]').text()).not.toContain(
      'Actualizado por',
    );

    setHub({ activityScope: 'tenant' });
    const { wrapper: tenantWrapper } = await mountInicio();
    await tenantWrapper.get('[data-testid="inicio-metric-trabajadores"]').trigger('click');
    await flushPromises();
    expect(tenantWrapper.get('[data-testid="inicio-hoy-trabajador"]').text()).toContain(
      'Actualizado por Dra. Ana',
    );
  });

  it('navega al expediente desde un trabajador de hoy y a trabajadores desde un centro', async () => {
    setHub({
      regimen: 'SIN_REGIMEN',
      hoy: {
        trabajadoresUnicos: 1,
        documentosCreados: 1,
        centrosConActividad: 1,
      },
    });
    const { wrapper, router } = await mountInicio();
    await wrapper.get('[data-testid="inicio-metric-trabajadores"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="inicio-hoy-trabajador"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('expediente-medico');
    expect(router.currentRoute.value.params).toMatchObject({
      idEmpresa: 'e1',
      idCentroTrabajo: 'c1',
      idTrabajador: 't1',
    });

    await router.push('/');
    await wrapper.get('[data-testid="inicio-metric-centros"]').trigger('click');
    await flushPromises();
    expect(getHoyCentros).toHaveBeenCalledTimes(1);
    await wrapper.get('[data-testid="inicio-hoy-centro"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('trabajadores');
  });

  it('abre crear-documento si hay permiso y no navega si se lo quitaron', async () => {
    setHub();
    const { wrapper, router } = await mountInicio({
      role: 'Principal',
    });
    await wrapper.get('[data-testid="inicio-metric-documentos"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="inicio-hoy-documento"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('crear-documento');
    expect(useDocumentosStore().currentTypeOfDocument).toBe('historiaClinica');

    setHub();
    const withoutPerm = await mountInicio({
      role: 'Médico',
      permisos: { gestionarDocumentosEvaluacion: false },
    });
    await withoutPerm.wrapper.get('[data-testid="inicio-metric-documentos"]').trigger('click');
    await flushPromises();
    await withoutPerm.wrapper.get('[data-testid="inicio-hoy-documento"]').trigger('click');
    await flushPromises();
    expect(withoutPerm.router.currentRoute.value.name).toBe('inicio');
    expect(withoutPerm.wrapper.find('[data-testid="inicio-hoy-modal"]').exists()).toBe(true);
    expect(toastOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: expect.stringContaining('evaluación'),
      }),
    );
  });

  it('bloquea la aptitud si ya no tiene permiso de diagnóstico', async () => {
    getHoyDocumentos.mockResolvedValue({
      data: {
        items: [
          {
            idDocumento: 'd-apt',
            tipoDocumento: 'aptitud',
            etiquetaTipo: 'Aptitud para el puesto',
            idEmpresa: 'e1',
            idCentroTrabajo: 'c1',
            idTrabajador: 't1',
            nombreTrabajador: 'Pérez Juan',
            nombreComercial: 'Empresa Demo',
            nombreCentro: 'Planta Norte',
            createdAt: '2026-08-28T16:00:00.000Z',
          },
        ],
        total: 1,
        truncated: false,
      },
    });
    setHub();
    const { wrapper, router } = await mountInicio({
      role: 'Médico',
      permisos: { gestionarDocumentosDiagnostico: false },
    });
    await wrapper.get('[data-testid="inicio-metric-documentos"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="inicio-hoy-documento"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('inicio');
    expect(toastOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: expect.stringContaining('diagnóstico'),
      }),
    );
  });

  it('lleva un documento externo al expediente aunque haya permiso', async () => {
    getHoyDocumentos.mockResolvedValue({
      data: {
        items: [
          {
            idDocumento: 'd-ext',
            tipoDocumento: 'documentoExterno',
            etiquetaTipo: 'Documento externo',
            nombreDocumento: 'Laboratorio 2026.pdf',
            idEmpresa: 'e1',
            idCentroTrabajo: 'c1',
            idTrabajador: 't1',
            nombreTrabajador: 'Pérez Juan',
            nombreComercial: 'Empresa Demo',
            nombreCentro: 'Planta Norte',
            createdAt: '2026-08-28T16:00:00.000Z',
          },
        ],
        total: 1,
        truncated: false,
      },
    });
    setHub();
    const { wrapper, router } = await mountInicio({ role: 'Principal' });
    await wrapper.get('[data-testid="inicio-metric-documentos"]').trigger('click');
    await flushPromises();
    const fila = wrapper.get('[data-testid="inicio-hoy-documento"]');
    expect(fila.text()).toContain('Laboratorio 2026.pdf');
    expect(fila.text()).toContain('Documento externo');
    await fila.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('expediente-medico');
    expect(router.currentRoute.value.params).toMatchObject({
      idEmpresa: 'e1',
      idCentroTrabajo: 'c1',
      idTrabajador: 't1',
    });
  });

  it('no navega un documento externo si no hay permiso para gestionarlo', async () => {
    getHoyDocumentos.mockResolvedValue({
      data: {
        items: [
          {
            idDocumento: 'd-ext',
            tipoDocumento: 'documentoExterno',
            etiquetaTipo: 'Documento externo',
            idEmpresa: 'e1',
            idCentroTrabajo: 'c1',
            idTrabajador: 't1',
            nombreTrabajador: 'Pérez Juan',
            nombreComercial: 'Empresa Demo',
            nombreCentro: 'Planta Norte',
            createdAt: '2026-08-28T16:00:00.000Z',
          },
        ],
        total: 1,
        truncated: false,
      },
    });
    setHub();
    const { wrapper, router } = await mountInicio({
      role: 'Médico',
      permisos: { gestionarDocumentosExternos: false },
    });
    await wrapper.get('[data-testid="inicio-metric-documentos"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="inicio-hoy-documento"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('inicio');
    expect(toastOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: expect.stringContaining('externos'),
      }),
    );
  });

  it('en SIRES no llama al listado de centros', async () => {
    setHub();
    const { wrapper } = await mountInicio();
    await wrapper.get('[data-testid="inicio-metric-pendientes"]').trigger('click');
    await flushPromises();
    expect(getHoyCentros).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="inicio-hoy-modal"]').exists()).toBe(false);
  });
});
