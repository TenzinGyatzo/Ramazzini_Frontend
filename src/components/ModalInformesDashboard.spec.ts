import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { InformeDeTablero } from '@/helpers/dashboardInformes';
import { useUserStore } from '@/stores/user';

const servicio = vi.hoisted(() => ({
  findByEmpresaAndCentro: vi.fn(),
  findByEmpresaOnly: vi.fn(),
  upsertByEmpresaAndCentro: vi.fn(),
  upsertByEmpresa: vi.fn(),
}));
vi.mock('@/api/informe-personalizacion.service', () => ({ informePersonalizacionService: servicio }));
const informesApi = vi.hoisted(() => ({
  registrarExportacionDashboard: vi.fn().mockResolvedValue({}),
  obtenerRelacionConsultas: vi.fn(),
}));
vi.mock('@/api/InformesAPI', () => ({ default: informesApi }));
const xlsx = vi.hoisted(() => ({
  writeFile: vi.fn(),
  aoa: [] as unknown[][],
}));
vi.mock('xlsx', async (original) => {
  const real: any = await original();
  return {
    ...real,
    utils: {
      ...real.utils,
      aoa_to_sheet: (filas: unknown[][]) => {
        xlsx.aoa = filas;
        return real.utils.aoa_to_sheet(filas);
      },
    },
    writeFile: xlsx.writeFile,
  };
});

import ModalInformesDashboard from './ModalInformesDashboard.vue';

const informe = (cambios: Partial<InformeDeTablero> = {}): InformeDeTablero => ({
  empresa: 'Aceros del Norte',
  centro: 'Planta Norte',
  periodo: 'Este año',
  segmento: '',
  responsable: '',
  fecha: '',
  cifras: [],
  hallazgos: [],
  tablas: [],
  conclusiones: '',
  recomendaciones: '',
  recomendacionesTabla: [],
  ...cambios,
});

const general = informe({
  hallazgos: ['40 % con sobrepeso'],
  tablas: [{ seccion: 'Aptitud', titulo: 'Aptitud al puesto', columnas: ['Resultado', 'Trabajadores'], filas: [['Apto', 3]] }],
});
const cardio = informe({
  hallazgos: ['2 con presión alta'],
  tablas: [{ seccion: 'Salud física', titulo: 'Presión arterial', columnas: ['Categoría', 'Trabajadores'], filas: [['Alta', 2]] }],
});

const generarCompleto = vi.fn();

const montar = (centroId: string | undefined, secciones: Record<string, boolean> = { saludVisual: true, diagnosticos: false }) =>
  mount(ModalInformesDashboard, {
    props: {
      abierto: true,
      empresaId: 'empresa1',
      centroId,
      centro: centroId ? 'Planta Norte' : 'Todos',
      periodo: 'Este año',
      segmento: '',
      totalTrabajadores: 12,
      secciones,
      inicio: '2026-01-01',
      fin: '2026-12-31',
      filtros: { sexo: 'Femenino' },
      armar: () => general,
      armarTema: (tema) => (tema === 'cardiometabolico' ? cardio : informe()),
      generarCompleto,
    },
    global: {
      stubs: {
        Teleport: true,
        RichTextEditor: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<textarea data-test="editor" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        RecomendacionesTabla: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<button data-test="agregar-fila" @click="$emit(\'update:modelValue\', [...modelValue, { hallazgo: \'Ruido\', medidaPreventiva: \'Tapones\' }, { hallazgo: \' \', medidaPreventiva: \'\' }])" />',
        },
      },
    },
    attachTo: document.body,
  });

const guardadas: Record<string, any> = {
  completo: { conclusiones: '<p>Del completo</p>', formatoRecomendaciones: 'tabla', recomendacionesTabla: [{ hallazgo: 'Sobrepeso', medidaPreventiva: 'Nutrición' }] },
};

describe('ventana de informes del tablero', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    (useUserStore() as any).user = { _id: 'usuario1' };
    vi.clearAllMocks();
    servicio.findByEmpresaAndCentro.mockImplementation(async (_e: string, _c: string, tipo: string) => guardadas[tipo] ?? null);
    servicio.findByEmpresaOnly.mockResolvedValue(null);
    servicio.upsertByEmpresaAndCentro.mockImplementation(async (_e: string, _c: string, dto: any, tipo: string) => ({ ...dto, tipoInforme: tipo }));
  });

  it('lista los siete informes y pide las conclusiones de cada tipo para el centro que se ve', async () => {
    const wrapper = montar('centro1');
    await flushPromises();
    for (const id of ['completo', 'resumen', 'cardiometabolico', 'auditivo', 'musculoesqueletico', 'excel', 'relacionConsultas']) {
      expect(wrapper.find(`[data-test="informe-${id}"]`).exists()).toBe(true);
    }
    expect(servicio.findByEmpresaAndCentro.mock.calls.map((llamada) => llamada[2])).toEqual([
      'completo',
      'resumen',
      'cardiometabolico',
      'auditivo',
      'musculoesqueletico',
    ]);
    expect(wrapper.find('[data-test="informes-contexto"]').text()).toContain('Planta Norte');
    expect(wrapper.find('[data-test="informes-contexto"]').text()).toContain('toda la plantilla');
    wrapper.unmount();
  });

  it('un informe sin datos se puede abrir, dice por qué y no deja generarlo', async () => {
    const wrapper = montar('centro1');
    await flushPromises();
    await wrapper.find('[data-test="informe-auditivo"]').trigger('click');
    expect(wrapper.find('[data-test="informe-auditivo"]').text()).toContain('Sin datos para generarlo');
    expect(wrapper.find('[data-test="informe-motivo"]').text()).toContain('sin exposición a ruido');
    expect(wrapper.find('[data-test="informe-ver"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-test="informe-descargar"]').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('el informe completo lo genera el tablero; el Excel no lleva conclusiones ni vista previa', async () => {
    const wrapper = montar('centro1');
    await flushPromises();
    await wrapper.find('[data-test="informe-ver"]').trigger('click');
    await wrapper.find('[data-test="informe-descargar"]').trigger('click');
    expect(generarCompleto.mock.calls).toEqual([['ver'], ['descargar']]);

    await wrapper.find('[data-test="informe-excel"]').trigger('click');
    expect(wrapper.find('[data-test="informe-conclusiones"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="informe-ver"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="informe-descargar"]').text()).toContain('Descargar Excel');
    wrapper.unmount();
  });

  it('guarda las conclusiones del informe elegido, con las recomendaciones en tabla y sin filas vacías', async () => {
    const wrapper = montar('centro1');
    await flushPromises();
    await wrapper.find('[data-test="informe-cardiometabolico"]').trigger('click');
    expect(wrapper.find('[data-test="informe-conclusiones"]').text()).toContain('Sin capturar');

    await wrapper.find('[data-test="informe-editar"]').trigger('click');
    await wrapper.find('[data-test="editor"]').setValue('<p>Vigilar la presión</p>');
    await wrapper.find('[data-test="agregar-fila"]').trigger('click');
    await wrapper.find('[data-test="informe-guardar"]').trigger('click');
    await flushPromises();

    expect(servicio.upsertByEmpresaAndCentro).toHaveBeenCalledWith(
      'empresa1',
      'centro1',
      {
        conclusiones: '<p>Vigilar la presión</p>',
        updatedBy: 'usuario1',
        formatoRecomendaciones: 'tabla',
        recomendacionesTabla: [{ hallazgo: 'Ruido', medidaPreventiva: 'Tapones' }],
      },
      'cardiometabolico',
    );
    expect(wrapper.emitted('guardada')?.[0]?.[0]).toBe('cardiometabolico');
    // De vuelta en el detalle, ya aparece como capturado
    expect(wrapper.find('[data-test="informe-conclusiones"]').text()).toContain('Conclusiones capturadas · 1 recomendación');
    wrapper.unmount();
  });

  it('los borradores abren el editor ya con texto y piden confirmar antes de descartarlos', async () => {
    const wrapper = montar('centro1');
    await flushPromises();
    await wrapper.find('[data-test="informe-cardiometabolico"]').trigger('click');

    await wrapper.find('[data-test="informe-borrador"]').trigger('click');
    expect((wrapper.find('[data-test="editor"]').element as HTMLTextAreaElement).value).toBe(
      '<ul><li>2 con presión alta</li></ul>',
    );
    // Cancelar con el borrador sin guardar pide confirmación
    await wrapper.findAll('button').find((boton) => boton.text() === 'Cancelar')!.trigger('click');
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true);
    expect(wrapper.emitted('cerrar')).toBeUndefined();
    wrapper.unmount();
  });

  it('copia al editor lo capturado en el informe completo, sin guardarlo', async () => {
    const wrapper = montar('centro1');
    await flushPromises();
    await wrapper.find('[data-test="informe-resumen"]').trigger('click');
    await wrapper.find('[data-test="informe-copiar"]').trigger('click');
    expect((wrapper.find('[data-test="editor"]').element as HTMLTextAreaElement).value).toBe('<p>Del completo</p>');
    expect(servicio.upsertByEmpresaAndCentro).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('sin centro elegido, las conclusiones son las de toda la empresa', async () => {
    const wrapper = montar(undefined);
    await flushPromises();
    expect(servicio.findByEmpresaOnly).toHaveBeenCalledTimes(5);
    expect(servicio.findByEmpresaAndCentro).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="informe-conclusiones"]').text()).toContain('toda la empresa');
    wrapper.unmount();
  });

  it('la relación de consultas pide las filas del centro con el periodo y los filtros, y arma el Excel', async () => {
    informesApi.obtenerRelacionConsultas.mockResolvedValue({
      data: {
        filas: [
          {
            fecha: '05/03/2026',
            registradaEn: null,
            numeroEmpleado: 'A-12',
            primerApellido: 'PÉREZ',
            segundoApellido: 'NÚÑEZ',
            nombre: 'JOSÉ',
            edad: 35,
            motivo: 'DOLOR AL TRAGAR',
            sistema: 'SÍNTOMAS Y HALLAZGOS NO CLASIFICADOS',
            codigoDiagnostico: 'R070',
            nombreDiagnostico: 'DOLOR DE GARGANTA',
            descripcionComplementaria: '',
            tratamiento: 'PARACETAMOL',
            observaciones: '',
            tituloFirmante: 'DR.',
            primerApellidoFirmante: 'LÓPEZ',
            segundoApellidoFirmante: '',
            nombreFirmante: 'ANA',
          },
        ],
      },
    });
    const wrapper = montar('centro1', { diagnosticos: true });
    await flushPromises();
    await wrapper.find('[data-test="informe-relacionConsultas"]').trigger('click');
    expect(wrapper.find('[data-test="informe-ver"]').exists()).toBe(false);
    await wrapper.find('[data-test="informe-descargar"]').trigger('click');
    await flushPromises();

    expect(informesApi.obtenerRelacionConsultas).toHaveBeenCalledWith('empresa1', 'centro1', '2026-01-01', '2026-12-31', {
      sexo: 'Femenino',
    });
    // SheetJS se importa al pedir el Excel
    await vi.waitFor(() => expect(xlsx.writeFile).toHaveBeenCalled());
    expect(xlsx.aoa[0]).toHaveLength(18);
    expect(xlsx.aoa[0][8]).toBe('SISTEMA');
    expect(xlsx.aoa[1].slice(9, 11)).toEqual(['R070', 'DOLOR DE GARGANTA']);
    expect(xlsx.writeFile.mock.calls[0][1]).toMatch(/^RelacionDeConsultas_/);
    expect(informesApi.registrarExportacionDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'relacionConsultas', modo: 'download' }),
    );
    wrapper.unmount();
  });

  it('sin centro elegido la relación de consultas no se puede generar', async () => {
    const wrapper = montar(undefined, { diagnosticos: true });
    await flushPromises();
    await wrapper.find('[data-test="informe-relacionConsultas"]').trigger('click');
    expect(wrapper.find('[data-test="informe-motivo"]').text()).toContain('elige un centro');
    expect(wrapper.find('[data-test="informe-descargar"]').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });
});
