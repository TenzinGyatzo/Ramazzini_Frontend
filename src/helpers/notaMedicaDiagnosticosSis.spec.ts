/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/CatalogsAPI', () => ({
  default: {
    getCIE10ByCode: vi.fn(async (code: string) => ({ code })),
  },
}));

vi.mock('@/helpers/cexCatalogCodes', () => ({
  getCexCatalogCodes: vi.fn(async () => ({
    tipoPersonal: { medicoGeneral: 2, medicoEspecialista: 4, enfermera: 6 },
  })),
}));

const validateCIE10SexAgeMock = vi.fn<
  (params: import('./cie10').CIE10SexAgeValidationParams) => Promise<import('./cie10').CIE10SexAgeIssue[]>
>(async () => []);

vi.mock('./cie10', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./cie10')>();
  return {
    ...actual,
    validateCIE10SexAge: (params: import('./cie10').CIE10SexAgeValidationParams) =>
      validateCIE10SexAgeMock(params),
    findCIE10Rule: vi.fn(async (code: string) => {
      if (code === 'MT01') return { letra: 'MT' };
      if (code === 'CP01') return { letra: 'CP' };
      if (code === 'C530') return { lsex: 'MUJER', linf: '010A', lsup: '120A', letra: 'C' };
      return { letra: 'C' };
    }),
  };
});

import {
  normalizeNotaMedicaDiagnosticosPv,
  validateDiagnostico2Sis,
  validateDiagnostico3Sis,
  validateNotaMedicaDiagnosticos2Y3,
} from './notaMedicaDiagnosticosSis';

const baseParams = {
  trabajadorSexo: 'Masculino',
  trabajadorFechaNacimiento: new Date('1990-01-01'),
  fechaNotaMedica: new Date('2026-05-23'),
  medicoFirmante: { especialistaSaludTrabajo: false },
  enfermeraFirmante: null,
  showSiresUI: true,
  esMujer: false,
};

describe('normalizeNotaMedicaDiagnosticosPv', () => {
  it('elimina pv y limpia códigos cuando no hay comorbilidad registrada', () => {
    const form: Record<string, unknown> = {
      primeraVezDiagnostico2: undefined,
      codigoCIEDiagnostico2: 'A000',
      primeraVezDiagnostico3: null,
      codigoCIEDiagnostico3: 'B000',
      confirmacionDiagnostica2: false,
      diagnosticoTexto: 'texto diag 2',
      diagnosticoTexto3: 'texto diag 3',
    };
    normalizeNotaMedicaDiagnosticosPv(form);
    expect(form.primeraVezDiagnostico2).toBeUndefined();
    expect(form.codigoCIEDiagnostico2).toBe('');
    expect(form.primeraVezDiagnostico3).toBeUndefined();
    expect(form.codigoCIEDiagnostico3).toBe('');
    expect(form.confirmacionDiagnostica2).toBeUndefined();
    expect(form.diagnosticoTexto).toBeUndefined();
    expect(form.diagnosticoTexto3).toBeUndefined();
  });

  it('elimina -1 residual y no persiste no aplica en el formulario', () => {
    const form: Record<string, unknown> = {
      primeraVezDiagnostico2: -1,
      codigoCIEDiagnostico2: '',
      primeraVezDiagnostico3: -1,
    };
    normalizeNotaMedicaDiagnosticosPv(form);
    expect(form.primeraVezDiagnostico2).toBeUndefined();
    expect(form.primeraVezDiagnostico3).toBeUndefined();
  });

  it('conserva pv 0/1 y no borra campos activos', () => {
    const form: Record<string, unknown> = {
      primeraVezDiagnostico2: 1,
      codigoCIEDiagnostico2: 'A000',
      confirmacionDiagnostica2: true,
    };
    normalizeNotaMedicaDiagnosticosPv(form);
    expect(form.primeraVezDiagnostico2).toBe(1);
    expect(form.codigoCIEDiagnostico2).toBe('A000');
    expect(form.confirmacionDiagnostica2).toBe(true);
  });

  it('SIN_REGIMEN: conserva código CIE sin primeraVez y elimina pv', () => {
    const form: Record<string, unknown> = {
      primeraVezDiagnostico2: undefined,
      codigoCIEDiagnostico2: 'A000',
      confirmacionDiagnostica2: false,
    };
    normalizeNotaMedicaDiagnosticosPv(form, false);
    expect(form.codigoCIEDiagnostico2).toBe('A000');
    expect(form.primeraVezDiagnostico2).toBeUndefined();
    expect(form.confirmacionDiagnostica2).toBeUndefined();
  });

  it('SIN_REGIMEN: limpia diag2 cuando no hay código ni primeraVez', () => {
    const form: Record<string, unknown> = {
      codigoCIEDiagnostico2: '',
    };
    normalizeNotaMedicaDiagnosticosPv(form, false);
    expect(form.codigoCIEDiagnostico2).toBe('');
    expect(form.primeraVezDiagnostico2).toBeUndefined();
  });
});

describe('validateDiagnostico2Sis / validateDiagnostico3Sis', () => {
  beforeEach(() => {
    validateCIE10SexAgeMock.mockClear();
  });

  it('exige código cuando pv es 0 o 1', async () => {
    const r0 = await validateDiagnostico2Sis({
      ...baseParams,
      formData: {
        codigoCIE10Principal: 'A000',
        primeraVezDiagnostico2: 0,
        codigoCIEDiagnostico2: '',
      },
    });
    expect(r0.ok).toBe(false);

    const r1 = await validateDiagnostico3Sis({
      ...baseParams,
      formData: { primeraVezDiagnostico3: 1, codigoCIEDiagnostico3: '' },
    });
    expect(r1.ok).toBe(false);
  });

  it('bloquea MT fuera del alcance Ramazzini', async () => {
    const fail = await validateDiagnostico2Sis({
      ...baseParams,
      formData: {
        primeraVezDiagnostico2: 1,
        codigoCIEDiagnostico2: 'MT01',
        codigoCIE10Principal: 'A000',
      },
    });
    expect(fail.ok).toBe(false);
    expect(fail.messageInline).toMatch(/medicina tradicional/i);
  });

  it('bloquea CP fuera del alcance Ramazzini', async () => {
    const fail = await validateDiagnostico2Sis({
      ...baseParams,
      medicoFirmante: { especialistaSaludTrabajo: true },
      formData: {
        primeraVezDiagnostico2: 1,
        codigoCIEDiagnostico2: 'CP01',
        codigoCIE10Principal: 'A000',
      },
    });
    expect(fail.ok).toBe(false);
    expect(fail.messageInline).toMatch(/oncología pediátrica|medicina del trabajo/i);
  });

  it('bloquea diag2 si no hay diagnóstico principal (SIRES)', async () => {
    const result = await validateDiagnostico2Sis({
      ...baseParams,
      formData: {
        primeraVezDiagnostico2: 1,
        codigoCIEDiagnostico2: 'B000',
      },
    });
    expect(result.ok).toBe(false);
    expect(result.messageInline).toMatch(/diagnóstico principal/i);
    expect(result.messageToast).toMatch(/diagnóstico principal/i);
  });

  it('bloquea diag3 si no hay comorbilidad 2 registrada (SIRES)', async () => {
    const result = await validateDiagnostico3Sis({
      ...baseParams,
      formData: {
        codigoCIE10Principal: 'A000',
        primeraVezDiagnostico3: 1,
        codigoCIEDiagnostico3: 'B000',
      },
    });
    expect(result.ok).toBe(false);
    expect(result.messageInline).toMatch(/diagnóstico 2/i);
  });

  it('SIN_REGIMEN: bloquea diag2 sin diagnóstico principal', async () => {
    const result = await validateDiagnostico2Sis({
      ...baseParams,
      showSiresUI: false,
      formData: {
        codigoCIEDiagnostico2: 'A000',
      },
    });
    expect(result.ok).toBe(false);
    expect(result.messageInline).toMatch(/diagnóstico principal/i);
  });

  it('SIN_REGIMEN: permite diag2 solo con código CIE', async () => {
    const result = await validateDiagnostico2Sis({
      ...baseParams,
      showSiresUI: false,
      formData: {
        codigoCIEDiagnostico2: 'A000',
        codigoCIE10Principal: 'B001',
      },
    });
    expect(result.ok).toBe(true);
  });

  it('SIN_REGIMEN: permite diag3 si diag2 tiene código sin primeraVez', async () => {
    const result = await validateDiagnostico3Sis({
      ...baseParams,
      showSiresUI: false,
      formData: {
        codigoCIE10Principal: 'A000',
        codigoCIEDiagnostico2: 'B001',
        codigoCIEDiagnostico3: 'C001',
      },
    });
    expect(result.ok).toBe(true);
  });

  it('SIN_REGIMEN: bloquea diag3 sin diag2 registrado', async () => {
    const result = await validateDiagnostico3Sis({
      ...baseParams,
      showSiresUI: false,
      formData: {
        codigoCIE10Principal: 'A000',
        codigoCIEDiagnostico3: 'C001',
      },
    });
    expect(result.ok).toBe(false);
    expect(result.messageInline).toMatch(/diagnóstico 2/i);
  });

  it('valida sexo/edad una sola vez por campo en diag2', async () => {
    validateCIE10SexAgeMock.mockResolvedValueOnce([
      {
        type: 'CIE10_SEX',
        field: 'codigoCIEDiagnostico2',
        code: 'C530',
        catalogKeyUsed: 'C530',
        messageToast: 'Sexo no permitido',
        messageInline: 'Sexo no permitido',
      },
    ]);

    const result = await validateDiagnostico2Sis({
      ...baseParams,
      formData: {
        primeraVezDiagnostico2: 1,
        codigoCIEDiagnostico2: 'C530',
        codigoCIE10Principal: 'A000',
      },
    });
    expect(result.ok).toBe(false);
    expect(validateCIE10SexAgeMock).toHaveBeenCalledTimes(1);
  });
});

describe('validateNotaMedicaDiagnosticos2Y3', () => {
  beforeEach(() => {
    validateCIE10SexAgeMock.mockClear();
    validateCIE10SexAgeMock.mockResolvedValue([]);
  });

  it('no invoca validateCIE10SexAge más de una vez por campo principal/diag2/diag3', async () => {
    await validateNotaMedicaDiagnosticos2Y3({
      ...baseParams,
      formData: {
        codigoCIE10Principal: 'A000',
        relacionTemporal: 0,
        primeraVezDiagnostico2: 1,
        codigoCIEDiagnostico2: 'B000',
        primeraVezDiagnostico3: 1,
        codigoCIEDiagnostico3: 'C000',
      },
    });

    expect(validateCIE10SexAgeMock).toHaveBeenCalledTimes(3);
    const fields = validateCIE10SexAgeMock.mock.calls.map(
      (call) =>
        Object.keys(call[0] as import('./cie10').CIE10SexAgeValidationParams).filter((k) =>
          k.startsWith('codigo'),
        ),
    );
    expect(fields).toEqual([
      ['codigoCIE10Principal'],
      ['codigoCIEDiagnostico2'],
      ['codigoCIEDiagnostico3'],
    ]);
  });
});
