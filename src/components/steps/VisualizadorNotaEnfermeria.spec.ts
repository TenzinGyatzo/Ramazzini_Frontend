import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('vue-router', () => ({ useRoute: () => ({ query: {}, params: {} }), useRouter: () => ({ push: vi.fn() }) }));

import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import {
  filasSignosNotaEnfermeria,
  nombreArchivoNotaEnfermeria,
  textoProcedimientosNotaEnfermeria,
} from '@/helpers/notaEnfermeria';

/** Se importa después de crear Pinia: algunos módulos usan un store al cargarse. */
const montar = async () => mount((await import('./VisualizadorNotaEnfermeria.vue')).default);

describe('VisualizadorNotaEnfermeria', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    (useEmpresasStore() as any).currentEmpresa = { nombreComercial: 'Empresa de prueba' };
    (useTrabajadoresStore() as any).currentTrabajador = {
      nombre: 'José',
      primerApellido: 'Pérez',
      puesto: 'Soldador',
      sexo: 'Masculino',
      fechaNacimiento: '1990-03-06',
    };
  });

  it('muestra lo capturado con sus etiquetas', async () => {
    (useFormDataStore() as any).formDataNotaEnfermeria = {
      fechaNotaEnfermeria: '2026-11-05',
      horaAtencion: '09:30',
      relacionTemporal: 'primeraVez',
      motivoAtencion: 'Herida en la mano',
      tipoProblema: 'lesion',
      sistema: 'piel',
      origen: 'accidenteTrabajo',
      destino: 'regresaRestricciones',
      habitusExterior: 'Consciente y orientado',
      signosVitales: { tensionArterialSistolica: 150, tensionArterialDiastolica: 95 },
      tomasControl: [{ hora: '10:15', dolor: 3 }],
      procedimientos: ['curacion', 'otro'],
      procedimientoOtro: 'Retiro de anillo',
      medicamentos: [{ nombre: 'Paracetamol', cantidad: 2, uso: 'ADMINISTRADO', via: 'oral', hora: '09:40' }],
    };
    const texto = (await montar()).text();
    for (const esperado of [
      '09:30',
      'Primera vez',
      'Lesión o traumatismo',
      'Piel y tegumentos',
      'Accidente de trabajo',
      '150/95',
      'Control 1',
      'Curación, Retiro de anillo',
      'Paracetamol',
      'Oral',
      'Regresa con restricciones',
    ]) {
      expect(texto).toContain(esperado);
    }
  });

  it('una nota vacía avisa lo que falta y no dibuja tablas', async () => {
    (useFormDataStore() as any).formDataNotaEnfermeria = {};
    const wrapper = await montar();
    expect(wrapper.text()).toContain('Sin elegir');
    expect(wrapper.text()).toContain('Sin signos vitales registrados');
    expect(wrapper.find('[data-signos]').exists()).toBe(false);
    expect(wrapper.find('[data-medicamentos]').exists()).toBe(false);
  });
});

describe('helpers de la nota de enfermería', () => {
  it('salta las tomas vacías y conserva el número de las de control', () => {
    const filas = filasSignosNotaEnfermeria({
      horaAtencion: '09:00',
      signosVitales: {},
      tomasControl: [{ hora: '09:30' }, { hora: '10:00', temperatura: 37.4 }],
    });
    expect(filas.map((f) => f.toma)).toEqual(['Control 2']);
  });

  it('«Otro» sin descripción se lee como «Otro»', () => {
    expect(textoProcedimientosNotaEnfermeria({ procedimientos: ['lavadoOcular', 'otro'] })).toBe(
      'Lavado ocular, Otro',
    );
  });

  it('el nombre del PDF coincide con el del servidor', () => {
    expect(nombreArchivoNotaEnfermeria('05-11-2026', '09:30')).toBe('Nota Enfermeria 05-11-2026 0930.pdf');
    expect(nombreArchivoNotaEnfermeria('05-11-2026')).toBe('Nota Enfermeria 05-11-2026.pdf');
  });
});
