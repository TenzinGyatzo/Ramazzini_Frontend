import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getPrestadorNotaMedica, getMedico, getEnfermera } = vi.hoisted(() => ({
  getPrestadorNotaMedica: vi.fn(),
  getMedico: vi.fn(),
  getEnfermera: vi.fn(),
}));
vi.mock('@/api/DocumentosAPI', () => ({ default: { getPrestadorNotaMedica } }));
vi.mock('@/api/MedicoFirmanteAPI', () => ({ default: { getMedicoFirmanteByUserId: getMedico } }));
vi.mock('@/api/EnfermeraFirmanteAPI', () => ({ default: { getEnfermeraFirmanteByUserId: getEnfermera } }));
vi.mock('@/helpers/cexCatalogCodes', () => ({
  getCexCatalogCodes: vi.fn(async () => ({
    tipoPersonal: { medicoGeneral: 2, medicoEspecialista: 4, enfermera: 6 },
    servicioAtencion: 1,
  })),
}));

import { fetchFirmantesDelPrestador, resolveEffectiveTipoPersonalDgis } from './notaMedicaDiagnosticosSis';

/** Punto 37: la pantalla valida con quien registró la nota, con la misma regla que el servidor. */
describe('firmantes del prestador de la nota médica (punto 37)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('al editar el borrador de una enfermera, valida como enfermera aunque edite un médico', async () => {
    getPrestadorNotaMedica.mockResolvedValue({ data: { userId: 'enf1', tipo: 'enfermera', tipoPersonal: 6 } });
    getEnfermera.mockResolvedValue({ data: { nombre: 'Laura' } });
    const r = await fetchFirmantesDelPrestador('trab1', { _id: 'nota1' }, 'medico1');
    expect(getPrestadorNotaMedica).toHaveBeenCalledWith('trab1', 'nota1');
    expect(getEnfermera).toHaveBeenCalledWith('enf1');
    expect(getMedico).not.toHaveBeenCalled();
    expect((await resolveEffectiveTipoPersonalDgis(r.medicoFirmante, r.enfermeraFirmante)).value).toBe(6);
  });

  it('el servidor decide si el médico es general o especialista', async () => {
    getPrestadorNotaMedica.mockResolvedValue({ data: { userId: 'med1', tipo: 'medico', tipoPersonal: 4 } });
    getMedico.mockResolvedValue({ data: { nombre: 'Juan', especialistaSaludTrabajo: 'No' } });
    const r = await fetchFirmantesDelPrestador('trab1', null, 'med1');
    expect(getPrestadorNotaMedica).toHaveBeenCalledWith('trab1', null);
    expect((await resolveEffectiveTipoPersonalDgis(r.medicoFirmante, r.enfermeraFirmante)).value).toBe(4);
  });

  it('una nota nueva o poblada: toma el id aunque venga como objeto', async () => {
    getPrestadorNotaMedica.mockResolvedValue({ data: { userId: null, tipo: null, tipoPersonal: null } });
    const r = await fetchFirmantesDelPrestador('trab1', { _id: { _id: 'nota9' } }, 'med1');
    expect(getPrestadorNotaMedica).toHaveBeenCalledWith('trab1', 'nota9');
    expect(r).toEqual({ medicoFirmante: null, enfermeraFirmante: null });
  });
});
