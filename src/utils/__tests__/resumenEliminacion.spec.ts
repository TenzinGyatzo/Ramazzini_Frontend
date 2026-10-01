import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import {
  avisoDocumentosFinalizados,
  fraseDeLoQueSeElimina,
  lineasDeUbicaciones,
  loQueSeElimina,
  sugerenciaBloqueo,
  tituloBloqueo,
  ubicacionesRestantes,
  type ResumenEliminacion,
} from '@/utils/resumenEliminacion';
import { useEliminacion } from '@/composables/useEliminacion';
import ModalEliminacionBloqueada from '@/components/ModalEliminacionBloqueada.vue';
import ModalEliminacion from '@/components/ModalEliminacion.vue';

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
  it('empresa: centros, trabajadores y documentos, con separador de miles', () => {
    expect(loQueSeElimina(resumen())).toBe('3 centros de trabajo, 1,200 trabajadores y 9,500 documentos');
    expect(fraseDeLoQueSeElimina(resumen())).toBe(
      'También se eliminarán 3 centros de trabajo, 1,200 trabajadores y 9,500 documentos.',
    );
  });

  it('singulares, y solo lo que sí hay', () => {
    expect(loQueSeElimina(resumen({ centros: 1, trabajadores: 1, documentos: 1 }))).toBe(
      '1 centro de trabajo, 1 trabajador y 1 documento',
    );
    expect(loQueSeElimina(resumen({ centros: 2, trabajadores: 0, documentos: 0 }))).toBe('2 centros de trabajo');
    expect(loQueSeElimina(resumen({ nivel: 'centro', centros: 0, trabajadores: 40, documentos: 0 }))).toBe(
      '40 trabajadores',
    );
  });

  it('trabajador: solo su expediente', () => {
    const r = resumen({ nivel: 'trabajador', centros: 0, trabajadores: 1, documentos: 12 });
    expect(fraseDeLoQueSeElimina(r)).toBe('También se eliminará todo su expediente: 12 documentos.');
  });

  it('un registro vacío no muestra desglose', () => {
    expect(fraseDeLoQueSeElimina(resumen({ centros: 0, trabajadores: 0, documentos: 0 }))).toBeNull();
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

describe('ventanas', () => {
  it('bloqueada: motivo, dónde están, «no se eliminó nada» y un solo botón; sin campos que llenar', async () => {
    const wrapper = mount(ModalEliminacionBloqueada, { props: { resumen: bloqueada() } });
    const texto = wrapper.text();
    expect(texto).toContain('No se puede eliminar la empresa');
    expect(texto).toContain('"ACME"');
    expect(texto).toContain('14 documentos finalizados o anulados');
    expect(texto).toContain('Juan López · Planta Norte — 3 documentos');
    expect(texto).toContain('y 10 trabajadores más');
    expect(texto).toContain('No se eliminó nada.');
    expect(wrapper.findAll('input')).toHaveLength(0);
    const botones = wrapper.findAll('button');
    expect(botones).toHaveLength(1);
    expect(botones[0].text()).toBe('Entendido');
    await botones[0].trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
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
        tipoRegistro: 'Empresa',
        identificacion: 'ACME',
        textoConfirmacionEsperado: 'ACME',
        resumen: r,
      },
    });

  it('confirmación: dice exactamente qué se elimina', () => {
    const wrapper = confirmacion(resumen());
    expect(wrapper.find('[data-testid="eliminacion-resumen"]').text()).toBe(
      'También se eliminarán 3 centros de trabajo, 1,200 trabajadores y 9,500 documentos.',
    );
    expect(wrapper.find('[data-testid="eliminacion-aviso-finalizados"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('se elimina todo o no se elimina nada');
  });

  it('confirmación sin régimen con documentos finalizados: aviso de pérdida permanente', () => {
    const wrapper = confirmacion(resumen({ documentosResguardados: 14 }));
    expect(wrapper.find('[data-testid="eliminacion-aviso-finalizados"]').text()).toContain(
      'Incluye 14 documentos finalizados o anulados',
    );
  });

  it('confirmación sin resumen (otros registros, o consulta fallida): como antes', () => {
    const wrapper = confirmacion(null);
    expect(wrapper.find('[data-testid="eliminacion-resumen"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('afectará todos los registros dependientes');
  });
});
