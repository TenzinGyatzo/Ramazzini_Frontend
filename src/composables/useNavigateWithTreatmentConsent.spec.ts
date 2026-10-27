import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const getStatus = vi.fn();
const create = vi.fn();
const push = vi.fn();
const isSIRES = ref(true);
const dailyConsentEnabled = ref(true);

vi.mock('@/api/ConsentimientosAPI', () => ({ default: { getStatus, create } }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));
vi.mock('./useRegulatoryPolicy', () => ({
  useRegulatoryPolicy: () => ({ isSIRES, dailyConsentEnabled }),
}));
vi.mock('./useRegulatoryErrorMapper', () => ({
  useRegulatoryErrorMapper: () => ({
    mapRegulatoryError: () => ({ message: '' }),
    extractRegulatoryError: () => null,
  }),
}));

const { useNavigateWithTreatmentConsent } = await import('./useNavigateWithTreatmentConsent');
const { olvidarEstadosConsentimiento, useTreatmentConsent } = await import('./useTreatmentConsent');

const pendiente = { required: true, accepted: false, consentText: 'Texto', declaracionProfesional: 'Declaro' };
const destino = { name: 'crear-documento', params: { tipoDocumento: 'notaMedica' } };
const navegar = (gate: ReturnType<typeof useNavigateWithTreatmentConsent>) =>
  gate.navigateWithTreatmentConsent({ trabajadorId: 't1', trabajadorNombre: 'Ana', to: destino });

describe('consentimiento al crear un documento', () => {
  beforeEach(() => {
    olvidarEstadosConsentimiento();
    getStatus.mockReset();
    create.mockReset();
    push.mockReset();
    isSIRES.value = true;
    dailyConsentEnabled.value = true;
  });

  it('con la precarga, la ventana abre sin esperar al servidor y ya trae el texto', async () => {
    getStatus.mockResolvedValue({ data: pendiente });
    const gate = useNavigateWithTreatmentConsent();
    gate.precargarConsentimiento('t1');
    await vi.waitFor(() => expect(getStatus).toHaveBeenCalledTimes(1));

    void navegar(gate);
    await Promise.resolve();
    await Promise.resolve();

    expect(gate.showModal.value).toBe(true);
    expect(gate.modalConsentText.value).toBe('Texto');
    expect(gate.modalDeclaracionProfesional.value).toBe('Declaro');
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('ya aceptado hoy: navega directo, sin ventana ni otra consulta', async () => {
    getStatus.mockResolvedValue({ data: { required: true, accepted: true } });
    const gate = useNavigateWithTreatmentConsent();
    gate.precargarConsentimiento('t1');
    await navegar(gate);
    expect(push).toHaveBeenCalledWith(destino);
    expect(gate.showModal.value).toBe(false);
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('al registrar navega sin volver a consultar, y el siguiente documento ya no pide consentimiento', async () => {
    getStatus.mockResolvedValue({ data: pendiente });
    create.mockResolvedValue({ data: { _id: 'c1' } });
    const gate = useNavigateWithTreatmentConsent();
    const navegacion = navegar(gate);
    await vi.waitFor(() => expect(gate.showModal.value).toBe(true));

    const registrado = await useTreatmentConsent().registerConsent({ trabajadorId: 't1', metodo: 'VERBAL' as never });
    gate.handleConsentRegistered(registrado!);
    await navegacion;
    expect(push).toHaveBeenCalledTimes(1);

    await navegar(gate);
    expect(push).toHaveBeenCalledTimes(2);
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('una consulta fallida no se recuerda: abre la ventana (que pide el texto) y se reintenta después', async () => {
    getStatus.mockRejectedValueOnce(new Error('red')).mockResolvedValue({ data: pendiente });
    const gate = useNavigateWithTreatmentConsent();
    void navegar(gate);
    await vi.waitFor(() => expect(gate.showModal.value).toBe(true));
    expect(gate.modalConsentText.value).toBe('');

    gate.handleConsentCancel();
    void navegar(gate);
    await vi.waitFor(() => expect(gate.modalConsentText.value).toBe('Texto'));
    expect(getStatus).toHaveBeenCalledTimes(2);
  });

  it('otro día vuelve a consultar', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 9, 27, 23, 59));
      getStatus.mockResolvedValue({ data: { required: true, accepted: true } });
      const gate = useNavigateWithTreatmentConsent();
      await navegar(gate);
      vi.setSystemTime(new Date(2026, 9, 28, 0, 1));
      await navegar(gate);
      expect(getStatus).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('sin consentimiento diario (no SIRES) ni precarga ni ventana', async () => {
    isSIRES.value = false;
    const gate = useNavigateWithTreatmentConsent();
    gate.precargarConsentimiento('t1');
    await navegar(gate);
    expect(getStatus).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith(destino);
  });
});
