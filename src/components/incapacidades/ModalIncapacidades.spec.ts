import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import ModalIncapacidades from './ModalIncapacidades.vue';
import IncapacidadesAPI from '@/api/IncapacidadesAPI';
import { abrirRespaldo, subirRespaldo, subirRespaldosPendientes } from '@/helpers/incapacidadesRespaldos';

const TRABAJADOR = '65f000000000000000000001';
const puedeGestionar = ref(true);

vi.mock('@/api/IncapacidadesAPI', () => ({
  default: {
    getCasos: vi.fn(),
    registrarIncapacidad: vi.fn().mockResolvedValue({ data: {} }),
    abrirCaso: vi.fn().mockResolvedValue({ data: {} }),
    actualizarCaso: vi.fn().mockResolvedValue({ data: {} }),
    eliminarCaso: vi.fn().mockResolvedValue({ data: {} }),
    eliminarIncapacidad: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('@/stores/trabajadores', () => ({
  useTrabajadoresStore: () => ({
    currentTrabajador: {
      _id: TRABAJADOR,
      nombre: 'Luis',
      primerApellido: 'Pérez',
      puesto: 'Operador',
    },
  }),
}));

vi.mock('@/composables/useUserPermissions', () => ({
  useUserPermissions: () => ({ canAccessRiesgosTrabajo: puedeGestionar }),
}));

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({ ensureUserLoaded: async () => 'u1' }),
}));

vi.mock('@/helpers/incapacidadesRespaldos', async (original) => ({
  ...(await original<typeof import('@/helpers/incapacidadesRespaldos')>()),
  subirRespaldo: vi.fn().mockResolvedValue(undefined),
  abrirRespaldo: vi.fn().mockResolvedValue(undefined),
  subirRespaldosPendientes: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/api/DocumentosAPI', () => ({ default: {} }));
vi.mock('@/lib/clinicalFiles', () => ({ fetchClinicalFileBlob: vi.fn() }));

const respaldo = (campos: Record<string, unknown> = {}) => ({
  _id: 'doc1',
  nombreDocumento: 'Incapacidad IMSS folio AB123',
  fechaDocumento: '2026-03-02T00:00:00.000Z',
  extension: '.pdf',
  rutaDocumento: 'expedientes-medicos/E/C/T',
  tipo: 'certificadoIncapacidad',
  idIncapacidad: 'inc1',
  ...campos,
});

const fractura = () => ({
  caso: {
    _id: 'caso1',
    ramo: 'riesgoTrabajo',
    fechaInicio: '2026-03-02T00:00:00.000Z',
    tipoRiesgo: 'accidenteTrabajo',
    naturalezaLesion: 'fractura',
    regionAnatomica: 'manoDedos',
    grupoDiagnostico: 'traumatismos',
    calificacion: 'siDeTrabajo',
    diasAcumulados: 14,
    fechaTerminoUltimaIncapacidad: '2026-03-15T00:00:00.000Z',
  },
  incapacidades: [
    {
      _id: 'inc1',
      idCaso: 'caso1',
      origen: 'imss',
      caracter: 'inicial',
      folio: 'AB123',
      fechaInicio: '2026-03-02T00:00:00.000Z',
      dias: 7,
      fechaTermino: '2026-03-08T00:00:00.000Z',
    },
    {
      _id: 'inc2',
      idCaso: 'caso1',
      origen: 'imss',
      caracter: 'subsecuente',
      folio: 'AB124',
      fechaInicio: '2026-03-09T00:00:00.000Z',
      dias: 7,
      fechaTermino: '2026-03-15T00:00:00.000Z',
    },
  ],
  estado: 'activo',
  dias: { total: 14, subsidiados: 14, sinSubsidio: 0, aCargoEmpresa: 0 },
  incapacitadoHoy: true,
});

const montar = async (casos: unknown[]) => {
  vi.mocked(IncapacidadesAPI.getCasos).mockResolvedValue({ data: casos } as any);
  const toast = { open: vi.fn() };
  const wrapper = mount(ModalIncapacidades, { global: { provide: { toast } } });
  await flushPromises();
  return { wrapper, toast };
};

const boton = (wrapper: any, texto: string) =>
  wrapper.findAll('button').find((b: any) => b.text().includes(texto));

describe('ModalIncapacidades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    puedeGestionar.value = true;
  });

  it('sin casos invita a registrar', async () => {
    const { wrapper } = await montar([]);
    expect(IncapacidadesAPI.getCasos).toHaveBeenCalledWith(TRABAJADOR);
    expect(wrapper.text()).toContain('Sin incapacidades registradas');
    expect(wrapper.text()).toContain('Pérez Luis');
  });

  it('muestra el caso con sus incapacidades, días y estado', async () => {
    const { wrapper } = await montar([fractura()]);
    const texto = wrapper.text();
    expect(texto).toContain('Incapacitado hoy');
    expect(texto).toContain('Riesgo de trabajo');
    expect(texto).toContain('Accidente de trabajo · Fractura · Mano y dedos');
    expect(texto).toContain('Calificado: sí de trabajo');
    expect(texto).toContain('02-03-2026 al 08-03-2026');
    expect(texto).toContain('folio AB124');
    expect(texto).toContain('14 subsidiados por el IMSS');
    expect(wrapper.emitted('cambio')?.[0]?.[0]).toHaveLength(1);
  });

  it('abre el formulario para una incapacidad nueva y para un subsecuente', async () => {
    const { wrapper } = await montar([fractura()]);

    await boton(wrapper, 'Registrar incapacidad').trigger('click');
    expect(wrapper.text()).toContain('¿De qué tipo es?');

    await boton(wrapper, 'Cancelar').trigger('click');
    await boton(wrapper, 'Agregar subsecuente').trigger('click');
    expect(wrapper.text()).toContain('Se agrega al caso de');
    expect(wrapper.text()).toContain('su última incapacidad terminó el 15-03-2026');
    // Propone el día siguiente al fin de la anterior
    expect((wrapper.find('#inc-inicio').element as HTMLInputElement).value).toBe('2026-03-16');
  });

  it('registra un subsecuente en el caso elegido', async () => {
    const { wrapper } = await montar([fractura()]);
    await boton(wrapper, 'Agregar subsecuente').trigger('click');
    await wrapper.find('#inc-folio').setValue('AB125');
    await wrapper.find('#inc-dias').setValue(7);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(IncapacidadesAPI.registrarIncapacidad).toHaveBeenCalledWith(TRABAJADOR, {
      idCaso: 'caso1',
      incapacidad: {
        origen: 'imss',
        caracter: 'subsecuente',
        folio: 'AB125',
        fechaInicio: '2026-03-16',
        dias: 7,
        fechaExpedicion: undefined,
        conGoceDeSueldo: undefined,
      },
    });
    // Vuelve a la lista y recarga
    expect(IncapacidadesAPI.getCasos).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Accidente de trabajo');
  });

  it('no guarda sin folio ni días, y dice qué falta', async () => {
    const { wrapper } = await montar([fractura()]);
    await boton(wrapper, 'Agregar subsecuente').trigger('click');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(IncapacidadesAPI.registrarIncapacidad).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('El certificado del IMSS lleva folio');
    expect(wrapper.text()).toContain('Indica los días');
  });

  it('eliminar pide confirmación', async () => {
    const { wrapper } = await montar([fractura()]);
    await wrapper.find('button[title="Eliminar incapacidad"]').trigger('click');
    expect(IncapacidadesAPI.eliminarIncapacidad).not.toHaveBeenCalled();

    await boton(wrapper, 'Sí').trigger('click');
    await flushPromises();
    expect(IncapacidadesAPI.eliminarIncapacidad).toHaveBeenCalledWith(TRABAJADOR, 'inc1');
  });

  it('abre el seguimiento del riesgo con sus datos', async () => {
    const { wrapper } = await montar([fractura()]);
    await boton(wrapper, 'Calificación, alta y secuelas').trigger('click');
    expect(wrapper.text()).toContain('Alta y consecuencias');
    expect((wrapper.find('#seg-calificacion').element as HTMLSelectElement).value).toBe('siDeTrabajo');
  });

  it('sin permiso solo consulta: no hay botones para registrar, editar ni eliminar', async () => {
    puedeGestionar.value = false;
    const { wrapper } = await montar([fractura()]);
    expect(boton(wrapper, 'Registrar incapacidad')).toBeUndefined();
    expect(boton(wrapper, 'Agregar subsecuente')).toBeUndefined();
    expect(boton(wrapper, 'Eliminar caso')).toBeUndefined();
    expect(wrapper.find('button[title="Eliminar incapacidad"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('02-03-2026 al 08-03-2026');
  });

  describe('respaldos', () => {
    const conRespaldos = () => ({
      ...fractura(),
      respaldos: [
        respaldo(),
        respaldo({ _id: 'doc2', nombreDocumento: 'ST-7 Probable accidente de trabajo', tipo: 'st7', idIncapacidad: undefined }),
      ],
    });

    it('muestra el certificado en su incapacidad y los formatos en el caso, y los abre', async () => {
      const { wrapper } = await montar([conRespaldos()]);
      const documentos = wrapper.findAll('[data-test="respaldo"]');
      expect(documentos.map((d) => d.text())).toEqual(['Certificado', 'ST-7']);

      await documentos[1].trigger('click');
      expect(abrirRespaldo).toHaveBeenCalledWith(expect.objectContaining({ _id: 'doc2' }));
    });

    it('adjunta el certificado de una incapacidad con su folio y su fecha', async () => {
      const { wrapper } = await montar([fractura()]);
      // Primer botón: la incapacidad inicial
      await wrapper.findAll('[data-test="adjuntar"]')[0].trigger('click');
      expect((wrapper.find('[data-test="fecha"]').element as HTMLInputElement).value).toBe('2026-03-02');
      // El tipo no se pregunta: es el certificado
      expect(wrapper.find('[data-test="tipo"]').exists()).toBe(false);

      await wrapper.find('[data-test="formulario"]').trigger('submit');
      expect(wrapper.find('[data-test="error"]').text()).toBe('Elige un archivo.');
      expect(subirRespaldo).not.toHaveBeenCalled();

      const archivo = new File([new Uint8Array(100)], 'escaneo.pdf', { type: 'application/pdf' });
      const campo = wrapper.find('[data-test="archivo"]');
      Object.defineProperty(campo.element, 'files', { value: [archivo] });
      await campo.trigger('change');
      await wrapper.find('[data-test="formulario"]').trigger('submit');
      await flushPromises();

      expect(subirRespaldo).toHaveBeenCalledWith({
        trabajadorId: TRABAJADOR,
        usuarioId: 'u1',
        archivo,
        tipo: 'certificadoIncapacidad',
        fecha: '2026-03-02',
        nombre: 'Incapacidad IMSS folio AB123',
        idCaso: 'caso1',
        idIncapacidad: 'inc1',
      });
      expect(wrapper.emitted('documentos')).toHaveLength(1);
      // Vuelve a consultar para mostrar el documento
      expect(IncapacidadesAPI.getCasos).toHaveBeenCalledTimes(2);
    });

    it('en el caso de riesgo de trabajo se elige el formato', async () => {
      const { wrapper } = await montar([fractura()]);
      const botones = wrapper.findAll('[data-test="adjuntar"]');
      // Dos incapacidades y, al final, el caso
      expect(botones).toHaveLength(3);
      await botones[2].trigger('click');

      const tipo = wrapper.find('[data-test="tipo"]');
      expect(tipo.findAll('option').map((o) => o.text())).toEqual(['ST-7', 'ST-9', 'ST-2', 'ST-3', 'Otro documento']);
      await tipo.setValue('st2');

      const archivo = new File([new Uint8Array(100)], 'alta.jpg', { type: 'image/jpeg' });
      const campo = wrapper.find('[data-test="archivo"]');
      Object.defineProperty(campo.element, 'files', { value: [archivo] });
      await campo.trigger('change');
      await wrapper.find('[data-test="formulario"]').trigger('submit');
      await flushPromises();

      expect(subirRespaldo).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'st2', nombre: 'ST-2 Dictamen de alta', idCaso: 'caso1', idIncapacidad: undefined }),
      );
    });

    it('el estado vacío no parece una zona para soltar archivos', async () => {
      const { wrapper } = await montar([]);
      expect(wrapper.html()).not.toContain('border-dashed');
    });

    it('la zona de archivos acepta arrastrar y soltar, y rechaza lo que pesa más de 3 MB', async () => {
      const { wrapper } = await montar([fractura()]);
      await wrapper.findAll('[data-test="adjuntar"]')[0].trigger('click');
      const zona = wrapper.find('[data-test="zona-archivos"]');
      expect(zona.classes()).toContain('border-dashed');
      expect(zona.text()).toContain('Arrastra el archivo aquí o haz clic para seleccionar');

      await zona.trigger('dragenter');
      expect(zona.text()).toContain('¡Suelta el archivo aquí!');

      expect(zona.text()).toContain('máximo 3 MB');
      const pesado = new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'foto.jpg', { type: 'image/jpeg' });
      await zona.trigger('drop', { dataTransfer: { files: [pesado] } });
      expect(wrapper.find('[data-test="error"]').text()).toContain('3 MB');
      expect(wrapper.find('[data-test="elegido"]').exists()).toBe(false);

      const ligero = new File([new Uint8Array(2048)], 'certificado.pdf', { type: 'application/pdf' });
      await wrapper.find('[data-test="zona-archivos"]').trigger('drop', { dataTransfer: { files: [ligero] } });
      expect(wrapper.find('[data-test="elegido"]').text()).toContain('certificado.pdf');
      expect(wrapper.find('[data-test="elegido"]').text()).toContain('2 KB');
    });

    it('al registrar se pueden elegir los documentos, y se suben al guardar', async () => {
      const guardado = fractura();
      guardado.incapacidades.push({
        _id: 'inc3',
        idCaso: 'caso1',
        origen: 'imss',
        caracter: 'subsecuente',
        folio: 'AB125',
        fechaInicio: '2026-03-16T00:00:00.000Z',
        dias: 7,
        fechaTermino: '2026-03-22T00:00:00.000Z',
      });
      vi.mocked(IncapacidadesAPI.registrarIncapacidad).mockResolvedValueOnce({ data: guardado } as any);

      const { wrapper } = await montar([fractura()]);
      await boton(wrapper, 'Agregar subsecuente').trigger('click');
      await wrapper.find('#inc-folio').setValue('AB125');
      await wrapper.find('#inc-dias').setValue(7);

      const certificado = new File([new Uint8Array(2048)], 'certificado.pdf', { type: 'application/pdf' });
      const formato = new File([new Uint8Array(2048)], 'st2.jpg', { type: 'image/jpeg' });
      const invalido = new File([new Uint8Array(10)], 'acta.docx');
      await wrapper
        .find('[data-test="zona-archivos"]')
        .trigger('drop', { dataTransfer: { files: [certificado, formato, invalido] } });

      expect(wrapper.find('[data-test="error-respaldos"]').text()).toContain('acta.docx');
      const pendientes = wrapper.findAll('[data-test="respaldo-pendiente"]');
      expect(pendientes).toHaveLength(2);
      // Por defecto es el certificado; el segundo se marca como ST-2
      const tipos = wrapper.findAll('[data-test="tipo-pendiente"]');
      expect((tipos[0].element as HTMLSelectElement).value).toBe('certificadoIncapacidad');
      await tipos[1].setValue('st2');

      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(subirRespaldosPendientes).toHaveBeenCalledWith(
        [
          { archivo: certificado, tipo: 'certificadoIncapacidad' },
          { archivo: formato, tipo: 'st2' },
        ],
        expect.objectContaining({
          trabajadorId: TRABAJADOR,
          usuarioId: 'u1',
          caso: expect.objectContaining({ _id: 'caso1' }),
          // La incapacidad recién registrada, no las anteriores del caso
          incapacidad: expect.objectContaining({ _id: 'inc3' }),
        }),
      );
    });

    it('si un documento no sube, el registro se conserva y se avisa', async () => {
      vi.mocked(IncapacidadesAPI.registrarIncapacidad).mockResolvedValueOnce({ data: fractura() } as any);
      vi.mocked(subirRespaldosPendientes).mockResolvedValueOnce(['certificado.pdf']);

      const { wrapper, toast } = await montar([fractura()]);
      await boton(wrapper, 'Agregar subsecuente').trigger('click');
      await wrapper.find('#inc-folio').setValue('AB125');
      await wrapper.find('#inc-dias').setValue(7);
      const certificado = new File([new Uint8Array(2048)], 'certificado.pdf', { type: 'application/pdf' });
      await wrapper.find('[data-test="zona-archivos"]').trigger('drop', { dataTransfer: { files: [certificado] } });
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(toast.open).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'warning', message: expect.stringContaining('no se pudo subir: certificado.pdf') }),
      );
      // Regresa a la lista con el registro guardado
      expect(IncapacidadesAPI.getCasos).toHaveBeenCalledTimes(2);
    });

    it('sin permiso se pueden abrir, pero no adjuntar', async () => {
      puedeGestionar.value = false;
      const { wrapper } = await montar([conRespaldos()]);
      expect(wrapper.findAll('[data-test="respaldo"]')).toHaveLength(2);
      expect(wrapper.find('[data-test="adjuntar"]').exists()).toBe(false);
    });
  });
});
