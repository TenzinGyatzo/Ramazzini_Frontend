import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import {
  avisoDocumentosFinalizados,
  fraseDeLoQueSeElimina,
  fraseDependientesSinResumen,
  lineasDeUbicaciones,
  sugerenciaBloqueo,
  tituloBloqueo,
  ubicacionesRestantes,
  type ResumenEliminacion,
} from '@/utils/resumenEliminacion';
import { useEliminacion } from '@/composables/useEliminacion';
import ModalEliminacionRevisando from '@/components/ModalEliminacionRevisando.vue';
import ModalEliminacionBloqueada from '@/components/ModalEliminacionBloqueada.vue';
import ModalEliminacion from '@/components/ModalEliminacion.vue';
import { NOMBRE_EN_TITULO, tituloEliminacion } from '@/config/eliminacion';
import { nombreTipoDocumentoEnFrase } from '@/helpers/documentosExpediente';

vi.mock('@/api/AuthAPI', () => ({ default: { verifyCurrentPassword: vi.fn() } }));

const resumen = (cambios: Partial<ResumenEliminacion> = {}): ResumenEliminacion => ({
  nivel: 'empresa',
  nombre: 'ACME',
  regimen: 'SIN_REGIMEN',
  centros: 3,
  trabajadores: 1200,
  documentos: 9500,
  documentosResguardados: 0,
  trabajadoresConResguardados: 0,
  ubicaciones: [],
  bloqueada: false,
  motivo: null,
  mensaje: null,
  maxTrabajadores: 5000,
  ...cambios,
});

const bloqueada = (cambios: Partial<ResumenEliminacion> = {}) =>
  resumen({
    regimen: 'SIRES_NOM024',
    bloqueada: true,
    motivo: 'DOCUMENTOS_RESGUARDADOS',
    mensaje: 'Esta empresa no se puede eliminar porque tiene 14 documentos finalizados o anulados.',
    documentosResguardados: 14,
    trabajadoresConResguardados: 12,
    ubicaciones: [
      { trabajadorId: 't1', trabajador: 'Juan López', centroId: 'c1', centro: 'Planta Norte', documentos: 3 },
      { trabajadorId: 't2', trabajador: 'Ana Ruiz', centroId: 'c2', centro: 'Planta Sur', documentos: 1 },
    ],
    ...cambios,
  });

describe('lo que se va a eliminar', () => {
  it('empresa: centros y trabajadores, «y sus documentos», con separador de miles', () => {
    expect(fraseDeLoQueSeElimina(resumen())).toBe(
      'Se eliminarán 3 centros de trabajo y 1,200 trabajadores y sus documentos.',
    );
  });

  it('centro: trabajadores y sus documentos', () => {
    expect(fraseDeLoQueSeElimina(resumen({ nivel: 'centro', centros: 0, trabajadores: 10 }))).toBe(
      'Se eliminarán 10 trabajadores y sus documentos.',
    );
  });

  it('singulares, y solo lo que sí hay', () => {
    expect(fraseDeLoQueSeElimina(resumen({ centros: 1, trabajadores: 1, documentos: 1 }))).toBe(
      'Se eliminarán 1 centro de trabajo y 1 trabajador y sus documentos.',
    );
    expect(fraseDeLoQueSeElimina(resumen({ centros: 2, trabajadores: 0, documentos: 0 }))).toBe(
      'Se eliminarán 2 centros de trabajo.',
    );
    expect(fraseDeLoQueSeElimina(resumen({ centros: 1, trabajadores: 0, documentos: 0 }))).toBe(
      'Se eliminará 1 centro de trabajo.',
    );
    expect(
      fraseDeLoQueSeElimina(resumen({ nivel: 'centro', centros: 0, trabajadores: 40, documentos: 0 })),
    ).toBe('Se eliminarán 40 trabajadores.');
  });

  it('trabajador: sus documentos', () => {
    const r = resumen({ nivel: 'trabajador', centros: 0, trabajadores: 1, documentos: 8 });
    expect(fraseDeLoQueSeElimina(r)).toBe('Se eliminarán 8 documentos.');
    expect(fraseDeLoQueSeElimina({ ...r, documentos: 1 })).toBe('Se eliminará 1 documento.');
  });

  it('un registro vacío no muestra desglose', () => {
    expect(fraseDeLoQueSeElimina(resumen({ centros: 0, trabajadores: 0, documentos: 0 }))).toBeNull();
    expect(
      fraseDeLoQueSeElimina(resumen({ nivel: 'trabajador', centros: 0, trabajadores: 1, documentos: 0 })),
    ).toBeNull();
  });

  it('sin resumen: lo que depende de una empresa o un centro', () => {
    expect(fraseDependientesSinResumen('empresa')).toContain('centros de trabajo, trabajadores y documentos');
    expect(fraseDependientesSinResumen('centroTrabajo')).toBe('Se eliminarán sus trabajadores y sus documentos.');
    expect(fraseDependientesSinResumen('trabajador')).toBeNull();
  });
});

describe('título de la confirmación', () => {
  it('verbo y sustantivo según lo que se elimina', () => {
    expect(tituloEliminacion(NOMBRE_EN_TITULO.empresa)).toBe('¿Eliminar empresa?');
    expect(tituloEliminacion(NOMBRE_EN_TITULO.centroTrabajo)).toBe('¿Eliminar centro?');
    expect(tituloEliminacion(NOMBRE_EN_TITULO.trabajador)).toBe('¿Eliminar trabajador?');
    expect(tituloEliminacion(NOMBRE_EN_TITULO.seguimientoProgramado)).toBe('¿Eliminar inasistencia?');
  });

  it('documentos del expediente: nombre del tipo en minúsculas, siglas intactas', () => {
    expect(nombreTipoDocumentoEnFrase('aptitud')).toBe('aptitud');
    expect(nombreTipoDocumentoEnFrase('historiaClinica')).toBe('historia clínica');
    expect(nombreTipoDocumentoEnFrase('antidoping')).toBe('antidoping');
    expect(nombreTipoDocumentoEnFrase('examenVista')).toBe('examen de la vista');
    expect(nombreTipoDocumentoEnFrase('trastornosEstadoAnimo')).toBe(
      'cuestionario trastornos de estado de ánimo (MDQ)',
    );
  });

  it('el composable arma el título del documento con su tipo', () => {
    const eliminacion = useEliminacion();
    eliminacion.requestEliminacion({
      entidad: 'documentoExpediente',
      identificacion: '12/03/2026',
      tipoDocumento: 'historiaClinica',
      onConfirm: async () => undefined,
    });
    expect(eliminacion.tipoRegistro.value).toBe('historia clínica');
    eliminacion.cancelarEliminacion();
  });
});

describe('aviso de documentos finalizados (sin régimen)', () => {
  it('avisa cuántos se perderán; sin finalizados no avisa', () => {
    expect(avisoDocumentosFinalizados(resumen())).toBeNull();
    expect(avisoDocumentosFinalizados(resumen({ documentosResguardados: 1 }))).toContain(
      'Incluye 1 documento finalizado o anulado',
    );
    expect(avisoDocumentosFinalizados(resumen({ documentosResguardados: 2400 }))).toBe(
      'Incluye 2,400 documentos finalizados o anulados, que se eliminarán de forma permanente y no podrán recuperarse.',
    );
  });

  it('si está bloqueada no hay aviso: no se va a eliminar nada', () => {
    expect(avisoDocumentosFinalizados(bloqueada())).toBeNull();
  });
});

describe('eliminación bloqueada', () => {
  it('título según lo que se quería eliminar', () => {
    expect(tituloBloqueo(bloqueada())).toBe('No se puede eliminar la empresa');
    expect(tituloBloqueo(bloqueada({ nivel: 'centro' }))).toBe('No se puede eliminar el centro de trabajo');
    expect(tituloBloqueo(bloqueada({ nivel: 'trabajador' }))).toBe('No se puede eliminar el trabajador');
  });

  it('dónde están: trabajador y centro (en empresa), solo trabajador (en centro), nada (en trabajador)', () => {
    expect(lineasDeUbicaciones(bloqueada())).toEqual([
      'Juan López · Planta Norte — 3 documentos',
      'Ana Ruiz · Planta Sur — 1 documento',
    ]);
    expect(lineasDeUbicaciones(bloqueada({ nivel: 'centro' }))).toEqual([
      'Juan López — 3 documentos',
      'Ana Ruiz — 1 documento',
    ]);
    expect(lineasDeUbicaciones(bloqueada({ nivel: 'trabajador' }))).toEqual([]);
  });

  it('los que no caben en la lista se resumen', () => {
    expect(ubicacionesRestantes(bloqueada())).toBe('y 10 trabajadores más');
    expect(ubicacionesRestantes(bloqueada({ trabajadoresConResguardados: 3 }))).toBe('y 1 trabajador más');
    expect(ubicacionesRestantes(bloqueada({ trabajadoresConResguardados: 2 }))).toBeNull();
  });

  it('sugerencia según el nivel; una cascada demasiado grande trae la suya en el mensaje', () => {
    expect(sugerenciaBloqueo(bloqueada())).toContain('centros de trabajo y los trabajadores');
    expect(sugerenciaBloqueo(bloqueada({ nivel: 'centro' }))).toContain('los trabajadores que no tengan');
    expect(sugerenciaBloqueo(bloqueada({ nivel: 'trabajador' }))).toContain('darlo de baja');
    const grande = bloqueada({ motivo: 'CASCADA_DEMASIADO_GRANDE' });
    expect(sugerenciaBloqueo(grande)).toBeNull();
    expect(lineasDeUbicaciones(grande)).toEqual([]);
  });
});

describe('solicitarEliminacionConResumen', () => {
  const eliminacion = useEliminacion();
  const request = () => ({
    entidad: 'empresa' as const,
    identificacion: 'ACME',
    contextoNivel: { cantidadCentros: 3 },
    onConfirm: vi.fn(async () => undefined),
  });

  beforeEach(() => {
    eliminacion.cancelarEliminacion();
    eliminacion.cerrarBloqueo();
  });

  it('bloqueada: se informa de inmediato y NO se abre la confirmación (ni contraseña ni nombre)', async () => {
    const construir = vi.fn(request);
    await eliminacion.solicitarEliminacionConResumen(async () => ({ data: bloqueada() }), construir);
    expect(eliminacion.bloqueo.value?.motivo).toBe('DOCUMENTOS_RESGUARDADOS');
    expect(eliminacion.isOpen.value).toBe(false);
    expect(construir).not.toHaveBeenCalled();

    eliminacion.cerrarBloqueo();
    expect(eliminacion.bloqueo.value).toBeNull();
  });

  it('permitida: se abre la confirmación con el desglose', async () => {
    const r = resumen({ documentosResguardados: 5 });
    await eliminacion.solicitarEliminacionConResumen(async () => ({ data: r }), request);
    expect(eliminacion.bloqueo.value).toBeNull();
    expect(eliminacion.isOpen.value).toBe(true);
    expect(eliminacion.nivel.value).toBe('robusto');
    expect(eliminacion.resumen.value).toEqual(r);

    eliminacion.cancelarEliminacion();
    expect(eliminacion.resumen.value).toBeNull();
  });

  it('si la consulta falla, sigue la confirmación de siempre (el servidor valida al eliminar)', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const construir = vi.fn(request);
    await eliminacion.solicitarEliminacionConResumen(async () => {
      throw new Error('sin red');
    }, construir);
    expect(construir).toHaveBeenCalledWith(null);
    expect(eliminacion.isOpen.value).toBe(true);
    expect(eliminacion.resumen.value).toBeNull();
    error.mockRestore();
  });

  it('un segundo clic mientras se consulta no abre dos veces', async () => {
    let resolver: (valor: { data: ResumenEliminacion }) => void = () => undefined;
    const pendiente = new Promise<{ data: ResumenEliminacion }>((r) => (resolver = r));
    const construir = vi.fn(request);
    const primera = eliminacion.solicitarEliminacionConResumen(() => pendiente, construir);
    expect(eliminacion.consultandoResumen.value).toBe(true);
    const segundaConsulta = vi.fn();
    await eliminacion.solicitarEliminacionConResumen(segundaConsulta, construir);
    expect(segundaConsulta).not.toHaveBeenCalled();
    resolver({ data: resumen() });
    await primera;
    expect(construir).toHaveBeenCalledTimes(1);
    expect(eliminacion.consultandoResumen.value).toBe(false);
  });
});

describe('aviso «Revisando…» mientras se consulta', () => {
  const eliminacion = useEliminacion();
  const request = () => ({
    entidad: 'empresa' as const,
    identificacion: 'ACME',
    onConfirm: vi.fn(async () => undefined),
  });

  beforeEach(() => {
    eliminacion.cancelarEliminacion();
    eliminacion.cerrarBloqueo();
  });

  it('el aviso aparece en el instante del clic y se quita al abrir la confirmación', async () => {
    let resolver: (valor: { data: ResumenEliminacion }) => void = () => undefined;
    const pendiente = new Promise<{ data: ResumenEliminacion }>((r) => (resolver = r));
    const solicitud = eliminacion.solicitarEliminacionConResumen(() => pendiente, request);
    // Inmediato, sin espera previa
    expect(eliminacion.consultaVisible.value).toBe(true);
    resolver({ data: resumen() });
    await solicitud;
    expect(eliminacion.consultaVisible.value).toBe(false);
    expect(eliminacion.isOpen.value).toBe(true);
    // La confirmación llega sobre el mismo fondo: sin animar el suyo
    expect(eliminacion.pasoDirecto.value).toBe(true);
  });

  it('una consulta rápida también muestra el aviso y pasa directo, sin tiempo mínimo', async () => {
    await eliminacion.solicitarEliminacionConResumen(async () => ({ data: resumen() }), request);
    expect(eliminacion.consultaVisible.value).toBe(false);
    expect(eliminacion.isOpen.value).toBe(true);
    expect(eliminacion.pasoDirecto.value).toBe(true);
  });

  it('bloqueada: «no se puede eliminar» también llega sobre el mismo fondo', async () => {
    await eliminacion.solicitarEliminacionConResumen(async () => ({ data: bloqueada() }), request);
    expect(eliminacion.consultaVisible.value).toBe(false);
    expect(eliminacion.bloqueo.value).not.toBeNull();
    expect(eliminacion.pasoDirecto.value).toBe(true);
  });

  it('al cerrar, la ventana vuelve a animarse como siempre', async () => {
    await eliminacion.solicitarEliminacionConResumen(async () => ({ data: resumen() }), request);
    expect(eliminacion.pasoDirecto.value).toBe(true);
    eliminacion.cancelarEliminacion();
    expect(eliminacion.pasoDirecto.value).toBe(false);
  });

  it('la ventana de aviso no tiene botones ni campos', () => {
    const wrapper = mount(ModalEliminacionRevisando, { props: { visible: true } });
    expect(wrapper.text()).toContain('Revisando qué se va a eliminar');
    expect(wrapper.findAll('button, input')).toHaveLength(0);
    expect(mount(ModalEliminacionRevisando, { props: { visible: false } }).text()).toBe('');
  });
});

describe('ventanas', () => {
  it('bloqueada: motivo, dónde están, «no se eliminó nada» y un solo botón; sin campos que llenar', async () => {
    const wrapper = mount(ModalEliminacionBloqueada, { props: { resumen: bloqueada() } });
    const texto = wrapper.text();
    expect(texto).toContain('No se puede eliminar la empresa');
    expect(texto).toContain('Empresa: ACME');
    expect(texto).toContain('14 documentos finalizados o anulados');
    expect(texto).toContain('Juan López · Planta Norte — 3 documentos');
    expect(texto).toContain('y 10 trabajadores más');
    expect(texto).toContain('No se eliminó nada.');
    expect(wrapper.findAll('input')).toHaveLength(0);
    const botones = wrapper.findAll('button');
    // «Entendido» y la X de cierre
    expect(botones).toHaveLength(2);
    expect(botones.map((b) => b.text())).toContain('Entendido');
    await wrapper.find('button[aria-label="Cerrar"]').trigger('click');
    await botones.find((b) => b.text() === 'Entendido')!.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(2);
  });

  it('bloqueada sin resumen no muestra nada', () => {
    const wrapper = mount(ModalEliminacionBloqueada, { props: { resumen: null } });
    expect(wrapper.text()).toBe('');
  });

  const confirmacion = (r: ResumenEliminacion | null) =>
    mount(ModalEliminacion, {
      props: {
        isVisible: true,
        nivel: 'robusto',
        tipoRegistro: 'empresa',
        identificacion: 'ACME',
        textoConfirmacionEsperado: 'ACME',
        auditResourceType: 'empresa',
        resumen: r,
      },
    });

  it('confirmación: título con verbo y sustantivo, identificación breve y qué se elimina', () => {
    const wrapper = confirmacion(resumen());
    expect(wrapper.find('[data-testid="eliminacion-titulo"]').text()).toBe('¿Eliminar empresa?');
    expect(wrapper.find('[data-testid="eliminacion-identificacion"]').text()).toBe('Empresa: ACME');
    expect(wrapper.find('[data-testid="eliminacion-identificacion"] strong').text()).toBe('ACME');
    expect(wrapper.find('[data-testid="eliminacion-resumen"]').text()).toBe(
      'Se eliminarán 3 centros de trabajo y 1,200 trabajadores y sus documentos. No se puede deshacer.',
    );
    expect(wrapper.find('[data-testid="eliminacion-aviso-finalizados"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Escribe ACME para confirmar');
    expect(wrapper.text()).not.toMatch(/CONFIRMAR ELIMINACIÓN|Parece que quieres|¿Desea continuar\?|¿Estás seguro\?/);
  });

  it('confirmación: la X cierra, como Cancelar', async () => {
    const wrapper = confirmacion(resumen());
    await wrapper.find('button[aria-label="Cerrar"]').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('confirmación sin régimen con documentos finalizados: aviso de pérdida permanente', () => {
    const wrapper = confirmacion(resumen({ documentosResguardados: 14 }));
    expect(wrapper.find('[data-testid="eliminacion-aviso-finalizados"]').text()).toContain(
      'Incluye 14 documentos finalizados o anulados',
    );
  });

  it('confirmación sin resumen (consulta fallida): lo que depende de la empresa', () => {
    const wrapper = confirmacion(null);
    expect(wrapper.find('[data-testid="eliminacion-resumen"]').text()).toBe(
      'Se eliminarán sus centros de trabajo, trabajadores y documentos. No se puede deshacer.',
    );
  });

  it('confirmación de un registro sin dependientes: solo «No se puede deshacer.»', () => {
    const wrapper = mount(ModalEliminacion, {
      props: {
        isVisible: true,
        nivel: 'simple',
        tipoRegistro: 'historia clínica',
        identificacion: '12/03/2026',
        textoConfirmacionEsperado: '12/03/2026',
        auditResourceType: 'documentoExpediente',
      },
    });
    expect(wrapper.find('[data-testid="eliminacion-titulo"]').text()).toBe('¿Eliminar historia clínica?');
    expect(wrapper.find('[data-testid="eliminacion-identificacion"]').text()).toBe('Fecha: 12/03/2026');
    expect(wrapper.find('[data-testid="eliminacion-resumen"]').text()).toBe('No se puede deshacer.');
    expect(wrapper.findAll('input')).toHaveLength(0);
    expect(wrapper.find('[data-testid="eliminacion-nombre-documento"]').exists()).toBe(false);
  });

  it('documento externo: su nombre antes de la fecha', () => {
    const wrapper = mount(ModalEliminacion, {
      props: {
        isVisible: true,
        nivel: 'simple',
        tipoRegistro: 'documento externo',
        identificacion: '06-04-2026',
        nombreDocumento: 'Electrocardiograma',
        textoConfirmacionEsperado: '06-04-2026',
        auditResourceType: 'documentoExpediente',
      },
    });
    expect(wrapper.find('[data-testid="eliminacion-titulo"]').text()).toBe('¿Eliminar documento externo?');
    expect(wrapper.find('[data-testid="eliminacion-nombre-documento"]').text()).toBe('Documento: Electrocardiograma');
    expect(wrapper.find('[data-testid="eliminacion-identificacion"]').text()).toBe('Fecha: 06-04-2026');
    expect(wrapper.find('[data-testid="eliminacion-resumen"]').text()).toBe('No se puede deshacer.');
  });
});
