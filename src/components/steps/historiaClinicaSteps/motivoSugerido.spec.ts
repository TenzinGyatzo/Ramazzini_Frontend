// @vitest-environment jsdom
/**
 * Punto 53: al abrir una historia clínica nueva, el motivo del examen se preselecciona con las
 * aptitudes anteriores y la antigüedad; lo que el usuario elija no se sobrescribe.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { format, subDays, subMonths } from 'date-fns';
import Step1 from './Step1.vue';
import DocumentosAPI from '@/api/DocumentosAPI';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useDocumentosStore } from '@/stores/documentos';

vi.mock('@/api/DocumentosAPI', () => ({ default: { getAptitudes: vi.fn() } }));
const getAptitudes = DocumentosAPI.getAptitudes as unknown as ReturnType<typeof vi.fn>;

const dia = (d: Date) => format(d, 'yyyy-MM-dd');
const hoy = new Date();

function preparar(fechaIngreso: string | null, aptitudes: string[]) {
  setActivePinia(createPinia());
  const t = useTrabajadoresStore() as any;
  t.currentTrabajador = { nombre: 'Ana', sexo: 'Femenino', fechaIngreso };
  t.currentTrabajadorId = 'x';
  (useEmpresasStore() as any).currentEmpresa = { nombreComercial: 'Empresa' };
  (useCentrosTrabajoStore() as any).currentCentroTrabajo = { nombreCentro: 'Centro' };
  getAptitudes.mockResolvedValue({ data: aptitudes.map((f) => ({ fechaAptitudPuesto: f })) });
  return (useFormDataStore() as any).formDataHistoriaClinica;
}

const elegido = (w: ReturnType<typeof mount>) =>
  (w.find('input[name="motivoExamen"]:checked').element as HTMLInputElement | undefined)?.value;

describe('historia clínica nueva: motivo del examen sugerido', () => {
  beforeEach(() => getAptitudes.mockReset());

  it('con antigüedad menor a un mes y sin aptitud previa sugiere «Ingreso»', async () => {
    const df = preparar(dia(subDays(hoy, 10)), []);
    const w = mount(Step1, { props: { variant: 'compact' } });
    await flushPromises();
    expect(df.motivoExamen).toBe('Ingreso');
    expect(elegido(w)).toBe('Ingreso');
  });

  it('con un mes o más de antigüedad y sin aptitud previa sugiere «Inicial»', async () => {
    const df = preparar(dia(subMonths(hoy, 3)), []);
    const w = mount(Step1, { props: { variant: 'compact' } });
    await flushPromises();
    expect(df.motivoExamen).toBe('Inicial');
    expect(elegido(w)).toBe('Inicial');
  });

  it('con una aptitud anterior sugiere «Periódico»', async () => {
    const df = preparar(dia(subDays(hoy, 10)), [dia(subMonths(hoy, 11))]);
    mount(Step1, { props: { variant: 'compact' } });
    await flushPromises();
    expect(df.motivoExamen).toBe('Periódico');
  });

  it('lo que elige el usuario se conserva al volver al paso', async () => {
    const df = preparar(dia(subMonths(hoy, 3)), []);
    const w = mount(Step1, { props: { variant: 'compact' } });
    await flushPromises();
    await w.find('input[name="motivoExamen"][value="Periódico"]').setValue(true);
    w.unmount();
    const w2 = mount(Step1, { props: { variant: 'compact' } });
    await flushPromises();
    expect(df.motivoExamen).toBe('Periódico');
    expect(elegido(w2)).toBe('Periódico');
  });

  it('al editar una historia clínica guardada no consulta ni cambia el motivo', async () => {
    const df = preparar(dia(subMonths(hoy, 3)), []);
    (useDocumentosStore() as any).currentDocument = { motivoExamen: 'Ingreso', fechaHistoriaClinica: dia(hoy) };
    mount(Step1, { props: { variant: 'compact' } });
    await flushPromises();
    expect(getAptitudes).not.toHaveBeenCalled();
    expect(df.motivoExamen).toBe('Ingreso');
  });
});
