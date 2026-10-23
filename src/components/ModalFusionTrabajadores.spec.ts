/**
 * Fusión en cuatro pasos (docs/fusion-trabajadores-especificacion.md, 4).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';

const api = vi.hoisted(() => ({
  buscarParaFusion: vi.fn(),
  getFusionPreview: vi.fn(),
  fusionarTrabajadores: vi.fn(),
  declararPersonasDistintas: vi.fn(),
}));
vi.mock('@/api/TrabajadoresAPI', () => ({ default: api }));
vi.mock('@/composables/useFusionPreviewCache', () => ({
  getCachedFusionPreview: () => null,
  setCachedFusionPreview: vi.fn(),
  invalidateFusionPreviewCache: vi.fn(),
}));

const { default: ModalFusionTrabajadores } = await import('./ModalFusionTrabajadores.vue');

const mario = {
  _id: 'd1',
  nombre: 'MARIO FERNANDO',
  primerApellido: 'LOPEZ',
  folio: 'T0000311',
  curp: 'LORM900312HBCPZR04',
  numeroEmpleado: '1182',
  idCentroTrabajo: 'c1',
  nombreCentroTrabajo: 'Planta Norte',
};
const maria = {
  _id: 'f1',
  nombre: 'MARIA FERNANDA',
  primerApellido: 'LOPEZ',
  folio: 'T0000124',
  curp: 'LORM900312MBCPZR09',
  numeroEmpleado: '0457',
  idCentroTrabajo: 'c2',
  nombreCentroTrabajo: 'Planta Sur',
};

const vistaPrevia = {
  destino: mario,
  fuente: maria,
  conteosDestino: { historiaClinica: 1 },
  conteosFuente: { historiaClinica: 2, antidoping: 1 },
  documentosExpedienteDestino: 1,
  documentosExpedienteFuente: 3,
  registrosVinculadosDestino: 0,
  registrosVinculadosFuente: 0,
  detalleVinculadosDestino: {},
  detalleVinculadosFuente: {},
  resultadosClinicosDestino: [],
  resultadosClinicosFuente: [],
  riesgosTrabajoDestino: [],
  riesgosTrabajoFuente: [],
  totalDocumentosFuente: 3,
  conflictos: { numeroEmpleado: true, consentimientoMismoDia: 0 },
  criterioMatch: null,
  destinoRecomendadoId: 'd1',
  posibleDuplicado: false,
  identidadCoincide: false,
  centrosNombre: { c1: 'Planta Norte', c2: 'Planta Sur' },
  camposDiferentes: [
    {
      clave: 'nombre',
      etiqueta: 'Nombre',
      identidad: true,
      valoresDestino: { nombre: 'MARIO FERNANDO' },
      valoresFuente: { nombre: 'MARIA FERNANDA' },
      porDefecto: 'destino',
    },
    {
      clave: 'numeroEmpleado',
      etiqueta: 'Número de empleado',
      identidad: false,
      valoresDestino: { numeroEmpleado: '1182' },
      valoresFuente: { numeroEmpleado: '0457' },
      porDefecto: 'destino',
    },
    {
      clave: 'idCentroTrabajo',
      etiqueta: 'Centro de trabajo',
      identidad: false,
      valoresDestino: { idCentroTrabajo: 'c1' },
      valoresFuente: { idCentroTrabajo: 'c2' },
      porDefecto: 'destino',
    },
  ],
};

function montar(props: Record<string, unknown> = {}) {
  return mount(ModalFusionTrabajadores, {
    props,
    global: {
      provide: { toast: { open: vi.fn() } },
      stubs: { FusionWorkerIdentidad: true, FusionRegistroResumen: true },
    },
  });
}

const boton = (w: ReturnType<typeof montar>, texto: string) => {
  const encontrado = w.findAll('button').find((b) => b.text().trim() === texto);
  if (!encontrado) throw new Error(`No hay botón «${texto}»`);
  return encontrado;
};

/** Marca el radio de la fila `etiqueta` en la columna 0 (se conserva) o 1 (se elimina). */
async function elegirValor(w: ReturnType<typeof montar>, etiqueta: string, columna: 0 | 1) {
  const fila = w.findAll('table.fusion-campos tbody tr').find((tr) =>
    tr.find('th').text().includes(etiqueta),
  )!;
  await fila.findAll('input[type="radio"]')[columna].setValue(true);
}

describe('ModalFusionTrabajadores', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useEmpresasStore().currentEmpresaId = 'e1';
    useCentrosTrabajoStore().currentCentroTrabajoId = 'c1';
    vi.spyOn(useTrabajadoresStore(), 'fetchTrabajadoresConHistoria').mockResolvedValue(undefined as any);
    api.buscarParaFusion.mockReset();
    api.getFusionPreview.mockReset().mockResolvedValue({ data: vistaPrevia });
    api.fusionarTrabajadores.mockReset().mockResolvedValue({ data: { ok: true } });
  });

  it('paso 1: sin texto muestra los posibles duplicados de A y no deja elegir el mismo registro', async () => {
    useTrabajadoresStore().currentTrabajador = mario as any;
    api.buscarParaFusion.mockResolvedValue({
      data: [{ ...maria, posibleDuplicado: true, numeroDocumentos: 3, estadoLaboral: 'Activo' }],
    });
    const w = montar({ trabajadorAId: 'd1' });
    await flushPromises();

    expect(api.buscarParaFusion).toHaveBeenCalledWith('e1', 'c1', '', 'd1');
    expect(w.text()).toContain('MARIO FERNANDO');
    expect(w.text()).toContain('Posible duplicado');
    expect(w.text()).toMatch(/Planta Sur\s+· Activo · 3 documentos/);
    expect(boton(w, 'Siguiente').attributes('disabled')).toBeDefined();

    await w.find('ul li button').trigger('click');
    expect(w.find('ul li button').attributes('disabled')).toBeDefined();
    expect(boton(w, 'Siguiente').attributes('disabled')).toBeUndefined();

    await boton(w, 'Siguiente').trigger('click');
    await flushPromises();
    expect(api.getFusionPreview).toHaveBeenCalledWith('e1', 'c1', 'd1', 'f1');
    expect(w.text()).toContain('Los datos de identidad no coinciden');
  });

  it('desde la lista, sin escribir nada, ya muestra los registros más recientes', async () => {
    api.buscarParaFusion.mockResolvedValue({
      data: [{ ...maria, posibleDuplicado: false, numeroDocumentos: 3, estadoLaboral: 'Activo' }],
    });
    const w = montar();
    await flushPromises();

    expect(api.buscarParaFusion).toHaveBeenCalledWith('e1', 'c1', '', undefined);
    expect(w.text()).toContain('Registros más recientes de la empresa');
    expect(w.text()).toContain('MARIA FERNANDA');
  });

  it('con A y B salta al paso 2 y envía motivos y datos elegidos, aunque se cambie cuál se conserva', async () => {
    const fused = vi.fn();
    const w = montar({ trabajadorAId: 'd1', trabajadorBId: 'f1', onFused: fused });
    await flushPromises();
    expect(api.buscarParaFusion).not.toHaveBeenCalled();
    expect(w.text()).toContain('Cuál se conserva');

    // Paso 3: el nombre de María y el centro de María; después se conserva el registro de María
    await boton(w, 'Siguiente').trigger('click');
    await elegirValor(w, 'Nombre', 1);
    await elegirValor(w, 'Centro de trabajo', 1);
    await boton(w, 'Atrás').trigger('click');
    await boton(w, 'Conservar este').trigger('click');
    await boton(w, 'Siguiente').trigger('click');
    // Las elecciones siguen apuntando al valor de María, ahora en la columna del conservado
    const filaNombre = w.findAll('table.fusion-campos tbody tr')[0];
    expect(filaNombre.findAll('input[type="radio"]')[0].element).toHaveProperty('checked', true);

    await boton(w, 'Siguiente').trigger('click');
    // Sin motivo no se fusiona
    await boton(w, 'Fusionar').trigger('click');
    expect(w.text()).toContain('Elige al menos un motivo.');
    expect(api.fusionarTrabajadores).not.toHaveBeenCalled();

    await w.find('input[type="checkbox"][value="CAMBIO_NOMBRE"]').setValue(true);
    await w.find('input[type="checkbox"][value="OTRO"]').setValue(true);
    await w.find('#fusion-motivo-otro').setValue('Corrección del RENAPO');
    await w.find('#fusion-comentario').setValue('  Lo pidió RH  ');
    await w.findAll('input[type="checkbox"]').at(-1)!.setValue(true);
    await boton(w, 'Fusionar').trigger('click');
    await flushPromises();

    expect(api.fusionarTrabajadores).toHaveBeenCalledWith('e1', 'c1', {
      trabajadorDestinoId: 'f1',
      trabajadorFuenteId: 'd1',
      confirmacion: true,
      motivos: ['CAMBIO_NOMBRE', 'OTRO'],
      motivoOtro: 'Corrección del RENAPO',
      comentario: 'Lo pidió RH',
      // El número de empleado no se tocó: queda el del registro conservado
      camposElegidos: { nombre: 'destino', numeroEmpleado: 'destino', idCentroTrabajo: 'destino' },
    });
    expect(fused).toHaveBeenCalledWith({ conservadoId: 'f1', eliminadoId: 'd1', idCentroTrabajo: 'c2' });
  });

  it('un error del servidor se muestra en el paso 4 con el enlace para revisar los datos', async () => {
    api.fusionarTrabajadores.mockRejectedValue({
      response: { status: 400, data: { message: 'La CURP no coincide con el sexo' } },
    });
    const w = montar({ trabajadorAId: 'd1', trabajadorBId: 'f1' });
    await flushPromises();
    await boton(w, 'Siguiente').trigger('click');
    await boton(w, 'Siguiente').trigger('click');
    await w.find('input[type="checkbox"][value="CAMBIO_CURP"]').setValue(true);
    await w.findAll('input[type="checkbox"]').at(-1)!.setValue(true);
    await boton(w, 'Fusionar').trigger('click');
    await flushPromises();

    expect(w.text()).toContain('La CURP no coincide con el sexo');
    await boton(w, 'Revisar los datos').trigger('click');
    expect(w.find('table.fusion-campos').exists()).toBe(true);
  });

  describe('no son la misma persona', () => {
    it('sin alerta de posible duplicado no se ofrece', async () => {
      const w = montar({ trabajadorAId: 'd1', trabajadorBId: 'f1' });
      await flushPromises();
      expect(w.find('.fusion-posible-duplicado').exists()).toBe(false);
    });

    it('con alerta, se confirma con nota y avisa a la vista', async () => {
      api.getFusionPreview.mockResolvedValue({ data: { ...vistaPrevia, posibleDuplicado: true } });
      api.declararPersonasDistintas = vi.fn().mockResolvedValue({ data: {} });
      const descartado = vi.fn();
      const w = montar({ trabajadorAId: 'd1', trabajadorBId: 'f1', onDescartado: descartado });
      await flushPromises();

      await boton(w, 'No son la misma persona').trigger('click');
      expect(w.text()).toContain('quedarán como personas distintas');
      await w.find('#fusion-distintos-nota').setValue('  Son hermanos  ');
      await boton(w, 'Confirmar').trigger('click');
      await flushPromises();

      expect(api.declararPersonasDistintas).toHaveBeenCalledWith('e1', 'c1', {
        trabajadorAId: 'd1',
        trabajadorBId: 'f1',
        nota: 'Son hermanos',
      });
      expect(descartado).toHaveBeenCalled();
      expect(api.fusionarTrabajadores).not.toHaveBeenCalled();
    });

    it('con la misma CURP no se ofrece: solo fusionar o eliminar', async () => {
      api.getFusionPreview.mockResolvedValue({
        data: {
          ...vistaPrevia,
          posibleDuplicado: true,
          fuente: { ...maria, curp: mario.curp },
        },
      });
      const w = montar({ trabajadorAId: 'd1', trabajadorBId: 'f1' });
      await flushPromises();
      expect(w.find('.fusion-posible-duplicado').text()).toContain('fusionándolos o eliminando el que sobra');
      expect(w.findAll('button').some((b) => b.text() === 'No son la misma persona')).toBe(false);
    });

    it('un error del servidor se muestra en la confirmación', async () => {
      api.getFusionPreview.mockResolvedValue({ data: { ...vistaPrevia, posibleDuplicado: true } });
      api.declararPersonasDistintas = vi.fn().mockRejectedValue({
        response: { status: 400, data: { message: 'Estos registros no están marcados como posible duplicado' } },
      });
      const w = montar({ trabajadorAId: 'd1', trabajadorBId: 'f1' });
      await flushPromises();
      await boton(w, 'No son la misma persona').trigger('click');
      await boton(w, 'Confirmar').trigger('click');
      await flushPromises();
      expect(w.text()).toContain('no están marcados como posible duplicado');
    });
  });
});
