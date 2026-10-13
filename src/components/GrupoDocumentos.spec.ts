import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useUserStore } from '@/stores/user';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { ROLE_DEFAULT_PERMISSIONS } from '@/constants/rolePermissionPolicy';

const guardarOrdenApi = vi.hoisted(() => vi.fn());
vi.mock('@/api/DocumentosAPI', () => ({
  default: { guardarOrdenDelAnio: guardarOrdenApi },
}));

// DocumentoItem carga el visor de PDF; aquí solo importa qué recibe y qué emite
vi.mock('./DocumentoItem.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      name: 'DocumentoItem',
      inheritAttrs: false,
      props: ['documentoId', 'documentoTipo', 'isSelected', 'isDeletionMode', 'toggleRouteSelection'],
      emits: ['eliminarDocumento', 'abrirModalAnular', 'abrirModalUpdate', 'openSubscriptionModal', 'abrirModalFinalizar'],
      setup(props) {
        return () =>
          h('div', {
            class: 'doc-stub',
            'data-tipo': props.documentoTipo,
            'data-id': props.documentoId,
          });
      },
    }),
  };
});

const { default: GrupoDocumentos } = await import('./GrupoDocumentos.vue');

/** Tipos en el orden en que el expediente los muestra por defecto. */
const TIPOS_EN_ORDEN: Array<{ clave: string; tipo: string; campoFecha: string }> = [
  { clave: 'notasAclaratorias', tipo: 'notaAclaratoria', campoFecha: 'fechaNotaAclaratoria' },
  { clave: 'constanciasAptitud', tipo: 'constanciaAptitud', campoFecha: 'fechaConstanciaAptitud' },
  { clave: 'aptitudes', tipo: 'aptitud', campoFecha: 'fechaAptitudPuesto' },
  { clave: 'historiasClinicas', tipo: 'historiaClinica', campoFecha: 'fechaHistoriaClinica' },
  { clave: 'exploracionesFisicas', tipo: 'exploracionFisica', campoFecha: 'fechaExploracionFisica' },
  { clave: 'examenesVista', tipo: 'examenVista', campoFecha: 'fechaExamenVista' },
  { clave: 'historiaOtologica', tipo: 'historiaOtologica', campoFecha: 'fechaHistoriaOtologica' },
  { clave: 'audiometrias', tipo: 'audiometria', campoFecha: 'fechaAudiometria' },
  { clave: 'informeLongitudinalAudiometrico', tipo: 'informeLongitudinalAudiometrico', campoFecha: 'fechaInformeLongitudinalAudiometrico' },
  { clave: 'antidopings', tipo: 'antidoping', campoFecha: 'fechaAntidoping' },
  { clave: 'certificados', tipo: 'certificado', campoFecha: 'fechaCertificado' },
  { clave: 'previoEspirometria', tipo: 'previoEspirometria', campoFecha: 'fechaPrevioEspirometria' },
  { clave: 'documentosExternos', tipo: 'documentoExterno', campoFecha: 'fechaDocumento' },
  { clave: 'notasMedicas', tipo: 'notaMedica', campoFecha: 'fechaNotaMedica' },
  { clave: 'controlPrenatal', tipo: 'controlPrenatal', campoFecha: 'fechaInicioControlPrenatal' },
  { clave: 'certificadosExpedito', tipo: 'certificadoExpedito', campoFecha: 'fechaCertificadoExpedito' },
  { clave: 'recetas', tipo: 'receta', campoFecha: 'fechaReceta' },
  { clave: 'entrevistasPsicologicas', tipo: 'entrevistaPsicologica', campoFecha: 'fechaEntrevistaPsicologica' },
  { clave: 'trastornosEstadoAnimo', tipo: 'trastornosEstadoAnimo', campoFecha: 'fechaTrastornosEstadoAnimo' },
  { clave: 'cuestionarioProdromalBreve', tipo: 'cuestionarioProdromalBreve', campoFecha: 'fechaCuestionarioProdromalBreve' },
  { clave: 'trastornoLimitePersonalidad', tipo: 'trastornoLimitePersonalidad', campoFecha: 'fechaTrastornoLimitePersonalidad' },
  { clave: 'cuestionarioNordico', tipo: 'cuestionarioNordico', campoFecha: 'fechaCuestionarioNordico' },
  { clave: 'evaluacionSuenoVigilia', tipo: 'evaluacionSuenoVigilia', campoFecha: 'fechaEvaluacionSuenoVigilia' },
  { clave: 'eventoSeguimientoCardiometabolico', tipo: 'eventoSeguimientoCardiometabolico', campoFecha: 'fechaEventoSeguimientoCardiometabolico' },
  { clave: 'informeLongitudinalCardiometabolico', tipo: 'informeLongitudinalCardiometabolico', campoFecha: 'fechaInformeLongitudinalCardiometabolico' },
];

const FECHA = '2025-03-15T12:00:00.000Z';

function documento(tipo: string, campoFecha: string, sufijo = '1', extra: Record<string, unknown> = {}) {
  return {
    _id: `${tipo}-${sufijo}`,
    estado: 'borrador',
    rutaPDF: `expedientes/empresa/centro/${tipo}`,
    rutaDocumento: `expedientes/empresa/centro/${tipo}`,
    nombreDocumento: 'Estudio',
    extension: '.pdf',
    [campoFecha]: FECHA,
    ...extra,
  };
}

/** Un documento de cada tipo, entregados en orden inverso para que el orden no dependa de la entrada. */
function unDocumentoDeCadaTipo() {
  const documentos: Record<string, unknown[]> = {};
  [...TIPOS_EN_ORDEN].reverse().forEach(({ clave, tipo, campoFecha }) => {
    documentos[clave] = [documento(tipo, campoFecha)];
  });
  return documentos;
}

function politica(features: Record<string, unknown> = {}) {
  return {
    regime: 'SIN_REGIMEN',
    features: { documentImmutabilityEnabled: false, controlPrenatalEnabled: true, ...features },
    validation: {},
  };
}

describe('GrupoDocumentos', () => {
  let pinia: ReturnType<typeof createPinia>;
  let toast: { open: ReturnType<typeof vi.fn> };

  function configurar(opciones: { features?: Record<string, unknown>; role?: string } = {}) {
    const proveedorSaludStore = useProveedorSaludStore();
    proveedorSaludStore.proveedorSalud = {
      _id: 'prov-1',
      regulatoryPolicy: politica(opciones.features),
    } as any;

    const role = opciones.role ?? 'Principal';
    const userStore = useUserStore();
    userStore.user = {
      _id: 'u1',
      role,
      permisos: { ...ROLE_DEFAULT_PERMISSIONS[role] },
    } as any;
  }

  function montar(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
    return mount(GrupoDocumentos, {
      global: { plugins: [pinia], provide: { toast } },
      props: {
        documents: {},
        year: '2025',
        trabajador: {},
        toggleRouteSelection: vi.fn(),
        selectedRoutes: [],
        selectedDocuments: [],
        toggleDeletionMode: vi.fn(),
        onDeleteSelected: vi.fn(),
        ...props,
      },
      slots,
    });
  }

  const tiposMostrados = (wrapper: ReturnType<typeof montar>) =>
    wrapper.findAll('.doc-stub').map((el) => el.attributes('data-tipo'));
  const idsMostrados = (wrapper: ReturnType<typeof montar>) =>
    wrapper.findAll('.doc-stub').map((el) => el.attributes('data-id'));
  const items = (wrapper: ReturnType<typeof montar>) =>
    wrapper.findAllComponents({ name: 'DocumentoItem' });

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    toast = { open: vi.fn() };
    configurar();
  });

  describe('orden por defecto', () => {
    it('muestra los tipos en el orden de siempre, sin importar cómo lleguen', () => {
      const wrapper = montar({ documents: unDocumentoDeCadaTipo() });
      expect(tiposMostrados(wrapper)).toEqual(TIPOS_EN_ORDEN.map((t) => t.tipo));
    });

    it('dentro de un tipo respeta el orden en que llegan los documentos', () => {
      const wrapper = montar({
        documents: {
          notasMedicas: [
            documento('notaMedica', 'fechaNotaMedica', 'a'),
            documento('notaMedica', 'fechaNotaMedica', 'b'),
            documento('notaMedica', 'fechaNotaMedica', 'c'),
          ],
          aptitudes: [documento('aptitud', 'fechaAptitudPuesto')],
        },
      });
      expect(idsMostrados(wrapper)).toEqual(['aptitud-1', 'notaMedica-a', 'notaMedica-b', 'notaMedica-c']);
    });

    it('entrega cada documento a DocumentoItem en la propiedad de su tipo', () => {
      const documentos = unDocumentoDeCadaTipo();
      const wrapper = montar({ documents: documentos });
      items(wrapper).forEach((item) => {
        const tipo = item.props('documentoTipo') as string;
        const clave = TIPOS_EN_ORDEN.find((t) => t.tipo === tipo)!.clave;
        expect(item.vm.$attrs[tipo]).toEqual(documentos[clave][0]);
      });
    });
  });

  describe('conteo y estado vacío', () => {
    it('cuenta todos los documentos del año', () => {
      const wrapper = montar({ documents: unDocumentoDeCadaTipo() });
      expect(wrapper.text()).toContain('25 documentos en total');
      expect(wrapper.text()).toContain('0 de 25 documentos');
    });

    it('usa singular con un solo documento', () => {
      const wrapper = montar({ documents: { aptitudes: [documento('aptitud', 'fechaAptitudPuesto')] } });
      expect(wrapper.text()).toContain('1 documento en total');
    });

    it('muestra el estado vacío cuando no hay documentos ni sección adicional', () => {
      const wrapper = montar();
      expect(wrapper.text()).toContain('No se encontraron documentos para el año 2025');
    });

    it('con sección adicional no muestra el estado vacío', () => {
      const wrapper = montar({}, { extraSection: '<div class="extra">Resultados</div>' });
      expect(wrapper.find('.extra').exists()).toBe(true);
      expect(wrapper.text()).not.toContain('No se encontraron documentos');
    });
  });

  describe('control prenatal', () => {
    it('no se muestra ni se cuenta cuando el proveedor no lo usa', () => {
      configurar({ features: { controlPrenatalEnabled: false } });
      const toggleRouteSelection = vi.fn();
      const wrapper = montar({ documents: unDocumentoDeCadaTipo(), toggleRouteSelection });

      expect(tiposMostrados(wrapper)).not.toContain('controlPrenatal');
      expect(wrapper.text()).toContain('24 documentos en total');

      wrapper.find('input[type="checkbox"]').trigger('change');
      const tiposSeleccionados = toggleRouteSelection.mock.calls.map(([doc]) => doc.documentType);
      expect(tiposSeleccionados).toHaveLength(24);
      expect(tiposSeleccionados).not.toContain('controlPrenatal');
    });
  });

  describe('selección', () => {
    it('«Seleccionar todos» marca cada documento con su identidad y su ruta', async () => {
      const toggleRouteSelection = vi.fn();
      const wrapper = montar({
        documents: {
          aptitudes: [documento('aptitud', 'fechaAptitudPuesto')],
          documentosExternos: [documento('documentoExterno', 'fechaDocumento')],
          constanciasAptitud: [documento('constanciaAptitud', 'fechaConstanciaAptitud')],
        },
        toggleRouteSelection,
      });

      await wrapper.find('input[type="checkbox"]').trigger('change');

      const llamadas = toggleRouteSelection.mock.calls;
      expect(llamadas.every(([, seleccionado]) => seleccionado === true)).toBe(true);
      expect(llamadas.map(([doc]) => doc)).toEqual(
        expect.arrayContaining([
          {
            documentId: 'aptitud-1',
            documentType: 'aptitud',
            filePath: 'expedientes/empresa/centro/aptitud/Aptitud 15-03-2025.pdf',
          },
          {
            documentId: 'documentoExterno-1',
            documentType: 'documentoExterno',
            filePath: 'expedientes/empresa/centro/documentoExterno/Estudio 15-03-2025.pdf',
          },
          {
            documentId: 'constanciaAptitud-1',
            documentType: 'constanciaAptitud',
            filePath: 'expedientes/empresa/centro/constanciaAptitud/Constancia de Aptitud 15-03-2025.pdf',
          },
        ]),
      );
      expect(llamadas).toHaveLength(3);
    });

    it('con todo seleccionado, «Seleccionar todos» desmarca', async () => {
      const toggleRouteSelection = vi.fn();
      const wrapper = montar({
        documents: { aptitudes: [documento('aptitud', 'fechaAptitudPuesto')] },
        selectedDocuments: [{ documentId: 'aptitud-1', documentType: 'aptitud', filePath: 'x' }],
        toggleRouteSelection,
      });

      expect(wrapper.text()).toContain('1 de 1 documentos');
      await wrapper.find('input[type="checkbox"]').trigger('change');
      expect(toggleRouteSelection).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 'aptitud-1' }),
        false,
      );
    });

    it('indica a cada documento si está seleccionado', () => {
      const wrapper = montar({
        documents: {
          aptitudes: [documento('aptitud', 'fechaAptitudPuesto')],
          notasMedicas: [documento('notaMedica', 'fechaNotaMedica')],
        },
        selectedDocuments: [{ documentId: 'notaMedica-1', documentType: 'notaMedica', filePath: 'x' }],
      });
      const seleccion = Object.fromEntries(
        items(wrapper).map((item) => [item.props('documentoId'), item.props('isSelected')]),
      );
      expect(seleccion).toEqual({ 'aptitud-1': false, 'notaMedica-1': true });
    });

    it('un documento sin identificador no entra en la selección', async () => {
      const toggleRouteSelection = vi.fn();
      const wrapper = montar({
        documents: {
          aptitudes: [
            documento('aptitud', 'fechaAptitudPuesto'),
            documento('aptitud', 'fechaAptitudPuesto', '2', { _id: undefined }),
          ],
        },
        toggleRouteSelection,
      });
      await wrapper.find('input[type="checkbox"]').trigger('change');
      expect(toggleRouteSelection).toHaveBeenCalledTimes(1);
    });
  });

  describe('modo eliminación', () => {
    const documentosMixtos = () => ({
      aptitudes: [
        documento('aptitud', 'fechaAptitudPuesto', 'borrador'),
        documento('aptitud', 'fechaAptitudPuesto', 'finalizada', { estado: 'finalizado' }),
      ],
      notasMedicas: [documento('notaMedica', 'fechaNotaMedica', 'anulada', { estado: 'ANULADO' })],
    });

    it('con inmutabilidad solo ofrece seleccionar los documentos eliminables', async () => {
      configurar({ features: { documentImmutabilityEnabled: true } });
      const toggleRouteSelection = vi.fn();
      const wrapper = montar({
        documents: documentosMixtos(),
        isDeletionMode: true,
        toggleRouteSelection,
      });

      expect(wrapper.text()).toContain('0 de 1 eliminables');
      await wrapper.find('input[type="checkbox"]').trigger('change');
      expect(toggleRouteSelection.mock.calls.map(([doc]) => doc.documentId)).toEqual(['aptitud-borrador']);
    });

    it('sin inmutabilidad todos los documentos son eliminables', async () => {
      const toggleRouteSelection = vi.fn();
      const wrapper = montar({
        documents: documentosMixtos(),
        isDeletionMode: true,
        toggleRouteSelection,
      });

      expect(wrapper.text()).toContain('0 de 3 documentos');
      await wrapper.find('input[type="checkbox"]').trigger('change');
      expect(toggleRouteSelection).toHaveBeenCalledTimes(3);
    });

    it('fuera del modo eliminación los inmutables sí se pueden seleccionar', async () => {
      configurar({ features: { documentImmutabilityEnabled: true } });
      const toggleRouteSelection = vi.fn();
      const wrapper = montar({ documents: documentosMixtos(), toggleRouteSelection });
      await wrapper.find('input[type="checkbox"]').trigger('change');
      expect(toggleRouteSelection).toHaveBeenCalledTimes(3);
    });

    it('avisa el modo y lo propaga a cada documento', () => {
      const wrapper = montar({
        documents: { aptitudes: [documento('aptitud', 'fechaAptitudPuesto')] },
        isDeletionMode: true,
      });
      expect(wrapper.text()).toContain('Modo eliminación activado');
      expect(items(wrapper)[0].props('isDeletionMode')).toBe(true);
    });

    it('el botón del modo solo aparece con los cuatro permisos de documentos', async () => {
      const toggleDeletionMode = vi.fn();
      const conPermisos = montar({ toggleDeletionMode });
      const boton = conPermisos.findAll('button').find((b) => b.text().includes('Modo Eliminación'));
      expect(boton).toBeTruthy();
      await boton!.trigger('click');
      expect(toggleDeletionMode).toHaveBeenCalledTimes(1);

      configurar({ role: 'Administrativo' });
      const sinPermisos = montar();
      expect(sinPermisos.findAll('button').some((b) => b.text().includes('Modo Eliminación'))).toBe(false);
    });
  });

  describe('eventos de cada documento', () => {
    it('al eliminar reenvía identificador, fecha del documento y tipo', () => {
      const wrapper = montar({ documents: unDocumentoDeCadaTipo() });
      items(wrapper).forEach((item) => item.vm.$emit('eliminarDocumento'));

      expect(wrapper.emitted('eliminarDocumento')).toEqual(
        TIPOS_EN_ORDEN.map(({ tipo }) => [`${tipo}-1`, '15-03-2025', tipo]),
      );
    });

    it('reenvía anular y finalizar con sus datos, y la ventana de suscripción', () => {
      const wrapper = montar({ documents: { aptitudes: [documento('aptitud', 'fechaAptitudPuesto')] } });
      const item = items(wrapper)[0];
      item.vm.$emit('abrirModalAnular', 'aptitud-1', 'Aptitud', 'aptitud');
      item.vm.$emit('abrirModalFinalizar', 'aptitud-1', 'Aptitud', 'aptitud');
      item.vm.$emit('openSubscriptionModal');

      expect(wrapper.emitted('abrirModalAnular')).toEqual([['aptitud-1', 'Aptitud', 'aptitud']]);
      expect(wrapper.emitted('abrirModalFinalizar')).toEqual([['aptitud-1', 'Aptitud', 'aptitud']]);
      expect(wrapper.emitted('openSubscriptionModal')).toHaveLength(1);
    });

    it('la edición de un documento externo se reenvía', () => {
      const wrapper = montar({
        documents: { documentosExternos: [documento('documentoExterno', 'fechaDocumento')] },
      });
      items(wrapper)[0].vm.$emit('abrirModalUpdate');
      expect(wrapper.emitted('abrirModalUpdate')).toHaveLength(1);
    });
  });

  describe('modo organizar', () => {
    const delAnio = () => ({
      aptitudes: [documento('aptitud', 'fechaAptitudPuesto')],
      recetas: [
        documento('receta', 'fechaReceta', 'a'),
        documento('receta', 'fechaReceta', 'b'),
      ],
      documentosExternos: [documento('documentoExterno', 'fechaDocumento')],
    });
    const POR_DEFECTO = ['aptitud-1', 'documentoExterno-1', 'receta-a', 'receta-b'];
    const ref = (documentType: string, documentId: string) => ({ documentType, documentId });

    const boton = (wrapper: ReturnType<typeof montar>, texto: string) =>
      wrapper.findAll('button').find((b) => b.text().includes(texto));
    const filaDe = (wrapper: ReturnType<typeof montar>, id: string) =>
      wrapper.findAll('.grupo-documentos__fila').find((f) => f.find(`[data-id="${id}"]`).exists())!;

    beforeEach(() => {
      guardarOrdenApi.mockReset();
      guardarOrdenApi.mockImplementation((_t: string, _anio: string, organizacion: { orden: unknown[] }) =>
        Promise.resolve({ data: { organizacion: organizacion.orden.length ? organizacion : null } }),
      );
      useTrabajadoresStore().currentTrabajadorId = 'trab-1' as any;
    });

    it('muestra el año en el orden manual guardado y lo indica', () => {
      useDocumentosStore().organizacionPorAnio = {
        '2025': {
          orden: [
            ref('receta', 'receta-b'),
            ref('documentoExterno', 'documentoExterno-1'),
            ref('aptitud', 'aptitud-1'),
            ref('receta', 'receta-a'),
          ],
        },
      };
      const wrapper = montar({ documents: delAnio() });
      expect(idsMostrados(wrapper)).toEqual(['receta-b', 'documentoExterno-1', 'aptitud-1', 'receta-a']);
      expect(wrapper.text()).toContain('orden personalizado');
    });

    it('el orden manual de otro año no afecta a este', () => {
      useDocumentosStore().organizacionPorAnio = { '2024': { orden: [ref('receta', 'receta-b')] } };
      const wrapper = montar({ documents: delAnio() });
      expect(idsMostrados(wrapper)).toEqual(POR_DEFECTO);
      expect(wrapper.text()).not.toContain('orden personalizado');
    });

    it('el botón aparece con un solo permiso de documentos y nunca en modo eliminación', () => {
      configurar({ role: 'Administrativo' });
      expect(boton(montar({ documents: delAnio() }), 'Organizar')).toBeTruthy();

      const userStore = useUserStore();
      userStore.user = {
        ...userStore.user,
        permisos: { ...ROLE_DEFAULT_PERMISSIONS.Administrativo, gestionarDocumentosExternos: false },
      } as any;
      expect(boton(montar({ documents: delAnio() }), 'Organizar')).toBeUndefined();

      configurar();
      expect(boton(montar({ documents: delAnio(), isDeletionMode: true }), 'Organizar')).toBeUndefined();
    });

    it('con un solo documento también se puede organizar, para preparar subgrupos', () => {
      const wrapper = montar({ documents: { aptitudes: [documento('aptitud', 'fechaAptitudPuesto')] } });
      expect(boton(wrapper, 'Organizar')).toBeTruthy();
    });

    it('mueve con las flechas, guarda el orden completo del año y sale del modo', async () => {
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');
      expect(wrapper.text()).toContain('Organizando el expediente 2025');
      expect(boton(wrapper, 'Guardar orden')!.attributes('disabled')).toBeDefined();

      await filaDe(wrapper, 'documentoExterno-1').find('button[title="Bajar"]').trigger('click');
      expect(idsMostrados(wrapper)).toEqual(['aptitud-1', 'receta-a', 'documentoExterno-1', 'receta-b']);

      await boton(wrapper, 'Guardar orden')!.trigger('click');
      await flushPromises();

      expect(guardarOrdenApi).toHaveBeenCalledWith('trab-1', '2025', {
        orden: [
          ref('aptitud', 'aptitud-1'),
          ref('receta', 'receta-a'),
          ref('documentoExterno', 'documentoExterno-1'),
          ref('receta', 'receta-b'),
        ],
        subgrupos: [],
      });
      expect(wrapper.text()).not.toContain('Organizando el expediente');
      expect(idsMostrados(wrapper)).toEqual(['aptitud-1', 'receta-a', 'documentoExterno-1', 'receta-b']);
      expect(wrapper.text()).toContain('orden personalizado');
    });

    it('arrastrar un documento sobre otro lo coloca en ese lugar', async () => {
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');
      await filaDe(wrapper, 'receta-b').trigger('dragstart');
      await filaDe(wrapper, 'aptitud-1').trigger('dragenter');
      await filaDe(wrapper, 'aptitud-1').trigger('drop');
      expect(idsMostrados(wrapper)).toEqual(['receta-b', 'aptitud-1', 'documentoExterno-1', 'receta-a']);
    });

    it('fuera del modo organizar las filas no se pueden arrastrar', async () => {
      const wrapper = montar({ documents: delAnio() });
      expect(filaDe(wrapper, 'aptitud-1').attributes('draggable')).toBe('false');
      await filaDe(wrapper, 'receta-b').trigger('dragstart');
      await filaDe(wrapper, 'aptitud-1').trigger('dragenter');
      expect(idsMostrados(wrapper)).toEqual(POR_DEFECTO);
    });

    it('cancelar descarta lo movido sin guardar', async () => {
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');
      await filaDe(wrapper, 'aptitud-1').find('button[title="Bajar"]').trigger('click');
      await boton(wrapper, 'Cancelar')!.trigger('click');
      expect(idsMostrados(wrapper)).toEqual(POR_DEFECTO);
      expect(guardarOrdenApi).not.toHaveBeenCalled();
    });

    it('restablecer devuelve el año al orden por defecto y borra lo guardado', async () => {
      useDocumentosStore().organizacionPorAnio = {
        '2025': {
          orden: [
            ref('receta', 'receta-b'),
            ref('aptitud', 'aptitud-1'),
            ref('documentoExterno', 'documentoExterno-1'),
            ref('receta', 'receta-a'),
          ],
        },
      };
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');
      await boton(wrapper, 'Restablecer orden por defecto')!.trigger('click');
      expect(idsMostrados(wrapper)).toEqual(POR_DEFECTO);

      await boton(wrapper, 'Guardar orden')!.trigger('click');
      await flushPromises();

      expect(guardarOrdenApi).toHaveBeenCalledWith('trab-1', '2025', { orden: [], subgrupos: [] });
      expect(useDocumentosStore().organizacionPorAnio['2025']).toBeUndefined();
      expect(wrapper.text()).not.toContain('orden personalizado');
    });

    it('si el servidor rechaza el guardado, avisa y conserva lo acomodado', async () => {
      guardarOrdenApi.mockRejectedValue({ response: { data: { message: 'No tiene permiso' } } });
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');
      await filaDe(wrapper, 'aptitud-1').find('button[title="Bajar"]').trigger('click');
      await boton(wrapper, 'Guardar orden')!.trigger('click');
      await flushPromises();

      expect(toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
      expect(wrapper.text()).toContain('Organizando el expediente 2025');
      expect(idsMostrados(wrapper)[0]).toBe('documentoExterno-1');
    });

    it('al entrar al modo eliminación se abandona la organización', async () => {
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');
      await filaDe(wrapper, 'aptitud-1').find('button[title="Bajar"]').trigger('click');
      await wrapper.setProps({ isDeletionMode: true });
      expect(wrapper.text()).not.toContain('Organizando el expediente');
      expect(idsMostrados(wrapper)).toEqual(POR_DEFECTO);
    });

    it('«Seleccionar todos» sigue funcionando sobre el orden manual', async () => {
      useDocumentosStore().organizacionPorAnio = {
        '2025': { orden: [ref('receta', 'receta-b'), ref('aptitud', 'aptitud-1')] },
      };
      const toggleRouteSelection = vi.fn();
      const wrapper = montar({ documents: delAnio(), toggleRouteSelection });
      await wrapper.find('input[type="checkbox"]').trigger('change');
      expect(toggleRouteSelection.mock.calls.map(([doc]) => doc.documentId)).toEqual([
        'receta-b',
        'receta-a',
        'aptitud-1',
        'documentoExterno-1',
      ]);
    });
  });

  describe('subgrupos', () => {
    const delAnio = () => ({
      aptitudes: [documento('aptitud', 'fechaAptitudPuesto')],
      antidopings: [documento('antidoping', 'fechaAntidoping')],
      notasMedicas: [
        documento('notaMedica', 'fechaNotaMedica', 'a'),
        documento('notaMedica', 'fechaNotaMedica', 'b', { estado: 'finalizado' }),
      ],
      documentosExternos: [documento('documentoExterno', 'fechaDocumento')],
    });
    const ref = (documentType: string, documentId: string, subgrupoId?: string) =>
      subgrupoId ? { documentType, documentId, subgrupoId } : { documentType, documentId };
    const conSubgrupo = () => ({
      '2025': {
        orden: [
          ref('aptitud', 'aptitud-1'),
          ref('antidoping', 'antidoping-1', 'sg-anti'),
          ref('documentoExterno', 'documentoExterno-1', 'sg-anti'),
          ref('notaMedica', 'notaMedica-a'),
          ref('notaMedica', 'notaMedica-b'),
        ],
        subgrupos: [{ id: 'sg-anti', nombre: 'Antidoping' }],
      },
    });

    const boton = (wrapper: ReturnType<typeof montar>, texto: string) =>
      wrapper.findAll('button').find((b) => b.text().includes(texto));
    const filaDe = (wrapper: ReturnType<typeof montar>, id: string) =>
      wrapper.findAll('.grupo-documentos__fila').find((f) => f.find(`[data-id="${id}"]`).exists())!;
    const encabezados = (wrapper: ReturnType<typeof montar>) => wrapper.findAll('.grupo-documentos__subgrupo');
    const enSubgrupo = (wrapper: ReturnType<typeof montar>) =>
      wrapper
        .findAll('.grupo-documentos__fila--en-subgrupo')
        .map((f) => f.find('.doc-stub').attributes('data-id'));

    beforeEach(() => {
      guardarOrdenApi.mockReset();
      guardarOrdenApi.mockImplementation((_t: string, _anio: string, organizacion: { orden: unknown[] }) =>
        Promise.resolve({ data: { organizacion: organizacion.orden.length ? organizacion : null } }),
      );
      useTrabajadoresStore().currentTrabajadorId = 'trab-1' as any;
    });

    it('muestra el subgrupo con su nombre, su conteo y sus documentos juntos y abiertos', () => {
      useDocumentosStore().organizacionPorAnio = conSubgrupo();
      const wrapper = montar({ documents: delAnio() });

      expect(encabezados(wrapper)).toHaveLength(1);
      expect(encabezados(wrapper)[0].text()).toContain('Antidoping');
      expect(encabezados(wrapper)[0].text()).toContain('2 documentos');
      expect(idsMostrados(wrapper)).toEqual(['aptitud-1', 'antidoping-1', 'documentoExterno-1', 'notaMedica-a', 'notaMedica-b']);
      expect(enSubgrupo(wrapper)).toEqual(['antidoping-1', 'documentoExterno-1']);
      expect(wrapper.text()).toContain('5 documentos en total');
    });

    it('se pliega y se despliega sin perder la cuenta del año ni la selección', async () => {
      useDocumentosStore().organizacionPorAnio = conSubgrupo();
      const wrapper = montar({
        documents: delAnio(),
        selectedDocuments: [{ documentId: 'antidoping-1', documentType: 'antidoping', filePath: 'x' }],
      });
      const alternar = () => encabezados(wrapper)[0].find('button').trigger('click');

      await alternar();
      expect(idsMostrados(wrapper)).toEqual(['aptitud-1', 'notaMedica-a', 'notaMedica-b']);
      expect(encabezados(wrapper)[0].find('button').attributes('aria-expanded')).toBe('false');
      expect(wrapper.text()).toContain('5 documentos en total');
      expect(wrapper.text()).toContain('1 de 5 documentos');

      await alternar();
      expect(idsMostrados(wrapper)).toHaveLength(5);
    });

    it('la casilla del subgrupo selecciona solo sus documentos', async () => {
      useDocumentosStore().organizacionPorAnio = conSubgrupo();
      const toggleRouteSelection = vi.fn();
      const wrapper = montar({ documents: delAnio(), toggleRouteSelection });

      await encabezados(wrapper)[0].find('input[type="checkbox"]').trigger('change');

      expect(toggleRouteSelection.mock.calls.map(([doc, marcado]) => [doc.documentId, marcado])).toEqual([
        ['antidoping-1', true],
        ['documentoExterno-1', true],
      ]);
    });

    it('en modo eliminación la casilla del subgrupo respeta los documentos inmutables', async () => {
      configurar({ features: { documentImmutabilityEnabled: true } });
      useDocumentosStore().organizacionPorAnio = {
        '2025': {
          orden: [ref('notaMedica', 'notaMedica-a', 'sg-notas'), ref('notaMedica', 'notaMedica-b', 'sg-notas')],
          subgrupos: [{ id: 'sg-notas', nombre: 'Notas médicas' }],
        },
      };
      const toggleRouteSelection = vi.fn();
      const wrapper = montar({ documents: delAnio(), isDeletionMode: true, toggleRouteSelection });

      await encabezados(wrapper)[0].find('input[type="checkbox"]').trigger('change');
      expect(toggleRouteSelection.mock.calls.map(([doc]) => doc.documentId)).toEqual(['notaMedica-a']);
    });

    it('«Seleccionar todos» incluye los documentos de un subgrupo plegado', async () => {
      useDocumentosStore().organizacionPorAnio = conSubgrupo();
      const toggleRouteSelection = vi.fn();
      const wrapper = montar({ documents: delAnio(), toggleRouteSelection });
      await encabezados(wrapper)[0].find('button').trigger('click');
      await wrapper.find('input[type="checkbox"]').trigger('change');
      expect(toggleRouteSelection).toHaveBeenCalledTimes(5);
    });

    it('crea un subgrupo, le pone nombre, le asigna documentos y lo guarda', async () => {
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');
      await boton(wrapper, 'Nuevo subgrupo')!.trigger('click');
      await flushPromises();

      const nombre = wrapper.find('input[aria-label="Nombre del subgrupo"]');
      expect((nombre.element as HTMLInputElement).value).toBe('Nuevo subgrupo');
      expect(encabezados(wrapper)[0].text()).toContain('Vacío');
      await nombre.setValue('Antidoping');

      await filaDe(wrapper, 'documentoExterno-1').find('select').setValue(wrapper.find('select option:nth-child(2)').attributes('value'));
      await filaDe(wrapper, 'antidoping-1').find('select').setValue(wrapper.find('select option:nth-child(2)').attributes('value'));
      // Las dos notas médicas ya venían reunidas en su subgrupo automático
      expect(enSubgrupo(wrapper)).toEqual(['documentoExterno-1', 'antidoping-1', 'notaMedica-a', 'notaMedica-b']);

      await boton(wrapper, 'Guardar orden')!.trigger('click');
      await flushPromises();

      const [, , organizacion] = guardarOrdenApi.mock.calls[0];
      expect(organizacion.subgrupos.map((s: any) => [s.nombre, s.posicion])).toEqual([
        ['Antidoping', 0],
        ['Notas médicas', 2],
      ]);
      const id = organizacion.subgrupos[0].id;
      expect(id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
      // Al guardar, el año queda como se ve: el subgrupo automático pasa a ser del usuario
      expect(organizacion.orden).toEqual([
        ref('documentoExterno', 'documentoExterno-1', id),
        ref('antidoping', 'antidoping-1', id),
        ref('aptitud', 'aptitud-1'),
        ref('notaMedica', 'notaMedica-a', 'auto-notas-medicas'),
        ref('notaMedica', 'notaMedica-b', 'auto-notas-medicas'),
      ]);
      expect(wrapper.text()).not.toContain('automático');
      expect(encabezados(wrapper)[0].text()).toContain('Antidoping');
      expect(wrapper.text()).not.toContain('Organizando el expediente');
    });

    it('un subgrupo vacío también se guarda, para llenarlo después', async () => {
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');
      await boton(wrapper, 'Nuevo subgrupo')!.trigger('click');
      await flushPromises();
      await wrapper.find('input[aria-label="Nombre del subgrupo"]').setValue('Por subir');
      expect(boton(wrapper, 'Guardar orden')!.attributes('disabled')).toBeUndefined();

      await boton(wrapper, 'Guardar orden')!.trigger('click');
      await flushPromises();

      const [, , organizacion] = guardarOrdenApi.mock.calls[0];
      expect(organizacion.subgrupos[0]).toMatchObject({ nombre: 'Por subir', posicion: 0 });
      expect(organizacion.orden).toHaveLength(5);
      expect(encabezados(wrapper)[0].text()).toContain('Por subir');
      expect(encabezados(wrapper)[0].text()).toContain('0 documentos');
      expect(encabezados(wrapper)[0].find('input[type="checkbox"]').attributes('disabled')).toBeDefined();
    });

    it('un año sin organizar reúne solo lo que marcan las reglas y lo señala como automático', () => {
      const wrapper = montar({ documents: delAnio() });
      expect(encabezados(wrapper)).toHaveLength(1);
      expect(encabezados(wrapper)[0].text()).toContain('Notas médicas');
      expect(encabezados(wrapper)[0].text()).toContain('automático');
      expect(enSubgrupo(wrapper)).toEqual(['notaMedica-a', 'notaMedica-b']);
      expect(wrapper.text()).not.toContain('orden personalizado');
    });

    it('un año organizado a mano no recibe subgrupos automáticos', () => {
      useDocumentosStore().organizacionPorAnio = {
        '2025': { orden: [ref('notaMedica', 'notaMedica-b'), ref('notaMedica', 'notaMedica-a')], subgrupos: [] },
      };
      const wrapper = montar({ documents: delAnio() });
      expect(encabezados(wrapper)).toHaveLength(0);
      expect(wrapper.text()).toContain('orden personalizado');
    });

    it('quitar un subgrupo automático y guardar lo deja quitado', async () => {
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');
      await boton(wrapper, 'Quitar subgrupo')!.trigger('click');
      await boton(wrapper, 'Guardar orden')!.trigger('click');
      await flushPromises();

      const [, , organizacion] = guardarOrdenApi.mock.calls[0];
      expect(organizacion.subgrupos).toEqual([]);
      expect(organizacion.orden).toHaveLength(5);
      expect(encabezados(wrapper)).toHaveLength(0);
    });

    it('con las flechas un documento entra al subgrupo vecino y sale por su borde', async () => {
      useDocumentosStore().organizacionPorAnio = conSubgrupo();
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');

      await filaDe(wrapper, 'aptitud-1').find('button[title="Bajar"]').trigger('click');
      expect(enSubgrupo(wrapper)).toEqual(['aptitud-1', 'antidoping-1', 'documentoExterno-1']);

      await filaDe(wrapper, 'aptitud-1').find('button[title="Subir"]').trigger('click');
      expect(enSubgrupo(wrapper)).toEqual(['antidoping-1', 'documentoExterno-1']);
      expect(idsMostrados(wrapper)[0]).toBe('aptitud-1');

      await filaDe(wrapper, 'documentoExterno-1').find('button[title="Bajar"]').trigger('click');
      expect(enSubgrupo(wrapper)).toEqual(['antidoping-1']);
      expect(idsMostrados(wrapper)).toEqual(['aptitud-1', 'antidoping-1', 'documentoExterno-1', 'notaMedica-a', 'notaMedica-b']);
    });

    it('el subgrupo completo se mueve con sus flechas', async () => {
      useDocumentosStore().organizacionPorAnio = conSubgrupo();
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');
      await encabezados(wrapper)[0].find('button[title="Bajar subgrupo"]').trigger('click');
      expect(idsMostrados(wrapper)).toEqual(['aptitud-1', 'notaMedica-a', 'antidoping-1', 'documentoExterno-1', 'notaMedica-b']);
      expect(enSubgrupo(wrapper)).toEqual(['antidoping-1', 'documentoExterno-1']);
    });

    it('arrastrar un documento sobre el encabezado lo mete al subgrupo', async () => {
      useDocumentosStore().organizacionPorAnio = conSubgrupo();
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');
      await filaDe(wrapper, 'notaMedica-b').trigger('dragstart');
      await encabezados(wrapper)[0].trigger('dragenter');
      expect(enSubgrupo(wrapper)).toEqual(['notaMedica-b', 'antidoping-1', 'documentoExterno-1']);
    });

    it('quitar el subgrupo deja sus documentos sueltos en el mismo lugar', async () => {
      useDocumentosStore().organizacionPorAnio = conSubgrupo();
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');
      await boton(wrapper, 'Quitar subgrupo')!.trigger('click');
      expect(encabezados(wrapper)).toHaveLength(0);
      expect(idsMostrados(wrapper)).toEqual(['aptitud-1', 'antidoping-1', 'documentoExterno-1', 'notaMedica-a', 'notaMedica-b']);

      await boton(wrapper, 'Guardar orden')!.trigger('click');
      await flushPromises();
      expect(guardarOrdenApi.mock.calls[0][2].subgrupos).toEqual([]);
      expect(guardarOrdenApi.mock.calls[0][2].orden.every((r: any) => !r.subgrupoId)).toBe(true);
    });

    it('renombrar un subgrupo cuenta como cambio y se guarda', async () => {
      useDocumentosStore().organizacionPorAnio = conSubgrupo();
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');
      expect(boton(wrapper, 'Guardar orden')!.attributes('disabled')).toBeDefined();
      await wrapper.find('input[aria-label="Nombre del subgrupo"]').setValue('Toxicología');
      await boton(wrapper, 'Guardar orden')!.trigger('click');
      await flushPromises();
      expect(guardarOrdenApi.mock.calls[0][2].subgrupos).toEqual([{ id: 'sg-anti', nombre: 'Toxicología', posicion: 1 }]);
    });

    it('restablecer quita los subgrupos del usuario y vuelven los automáticos', async () => {
      useDocumentosStore().organizacionPorAnio = conSubgrupo();
      const wrapper = montar({ documents: delAnio() });
      await boton(wrapper, 'Organizar')!.trigger('click');
      await boton(wrapper, 'Restablecer orden por defecto')!.trigger('click');
      expect(enSubgrupo(wrapper)).toEqual(['notaMedica-a', 'notaMedica-b']);
      await boton(wrapper, 'Guardar orden')!.trigger('click');
      await flushPromises();
      expect(guardarOrdenApi).toHaveBeenCalledWith('trab-1', '2025', { orden: [], subgrupos: [] });
      expect(encabezados(wrapper)).toHaveLength(1);
      expect(encabezados(wrapper)[0].text()).toContain('automático');
    });
  });
});
