import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { format } from 'date-fns';

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, params: {} }),
  useRouter: () => ({ push: vi.fn() }),
}));

import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';

/** [carpeta de pasos, formulario del store, campo de fecha] */
const DOCUMENTOS: [string, string, string][] = [
  ['antidopingSteps', 'formDataAntidoping', 'fechaAntidoping'],
  ['certificadoSteps', 'formDataCertificado', 'fechaCertificado'],
  ['historiaOtologicaSteps', 'formDataHistoriaOtologica', 'fechaHistoriaOtologica'],
  ['previoEspirometriaSteps', 'formDataPrevioEspirometria', 'fechaPrevioEspirometria'],
  ['certificadoExpeditoSteps', 'formDataCertificadoExpedito', 'fechaCertificadoExpedito'],
  ['constanciaAptitudSteps', 'formDataConstanciaAptitud', 'fechaConstanciaAptitud'],
  ['controlPrenatalSteps', 'formDataControlPrenatal', 'fechaInicioControlPrenatal'],
  ['cuestionarioNordicoSteps', 'formDataCuestionarioNordico', 'fechaCuestionarioNordico'],
  ['cuestionarioProdromalBreveSteps', 'formDataCuestionarioProdromalBreve', 'fechaCuestionarioProdromalBreve'],
  ['entrevistaPsicologicaSteps', 'formDataEntrevistaPsicologica', 'fechaEntrevistaPsicologica'],
  ['evaluacionSuenoVigiliaSteps', 'formDataEvaluacionSuenoVigilia', 'fechaEvaluacionSuenoVigilia'],
  ['exploracionFisicaSteps', 'formDataExploracionFisica', 'fechaExploracionFisica'],
  ['historiaClinicaSteps', 'formDataHistoriaClinica', 'fechaHistoriaClinica'],
  ['notaMedicaSteps', 'formDataNotaMedica', 'fechaNotaMedica'],
  ['recetaSteps', 'formDataReceta', 'fechaReceta'],
  ['trastornoLimitePersonalidadSteps', 'formDataTrastornoLimitePersonalidad', 'fechaTrastornoLimitePersonalidad'],
  ['trastornosEstadoAnimoSteps', 'formDataTrastornosEstadoAnimo', 'fechaTrastornosEstadoAnimo'],
];

const formulario = (clave: string) =>
  (useFormDataStore() as unknown as Record<string, Record<string, unknown>>)[clave];

// La primera importación de cada paso compila el componente: con la suite en paralelo tarda
describe('la fecha del paso 1 llega al formulario al abrirlo', { timeout: 30000 }, () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useTrabajadoresStore().currentTrabajador = { _id: 't1', nombre: 'X', sexo: 'Masculino' } as never;
    useTrabajadoresStore().currentTrabajadorId = 't1' as never;
    useEmpresasStore().currentEmpresa = { nombreComercial: 'E' } as never;
    useCentrosTrabajoStore().currentCentroTrabajo = { nombreCentro: 'C' } as never;
  });

  const montar = async (carpeta: string) => {
    const { default: Paso } = await import(`./${carpeta}/Step1.vue`);
    const wrapper = mount(Paso, { global: { stubs: { FormKit: true } } });
    await flushPromises();
    return wrapper;
  };

  it.each(DOCUMENTOS)('%s: documento nuevo, la fecha de hoy sin tocar ni salir del paso', async (carpeta, clave, campo) => {
    await montar(carpeta);
    expect(formulario(clave)[campo]).toBe(format(new Date(), 'yyyy-MM-dd'));
  });

  it.each(DOCUMENTOS)('%s: al volver al paso conserva la fecha ya elegida', async (carpeta, clave, campo) => {
    formulario(clave)[campo] = '2026-11-02';
    await montar(carpeta);
    expect(formulario(clave)[campo]).toBe('2026-11-02');
  });
});
