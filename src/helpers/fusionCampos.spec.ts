import { describe, expect, it } from 'vitest';
import type { CampoFusionDiferente } from '@/interfaces/trabajador.interface';
import {
  camposElegidosParaEnvio,
  cambiosEnConservado,
  errorMotivoFusion,
  orientarCampos,
  textoValorCampo,
} from './fusionCampos';

// Como los manda la vista previa: destino = d1, fuente = f1
const campos: CampoFusionDiferente[] = [
  {
    clave: 'nombre',
    etiqueta: 'Nombre',
    identidad: true,
    valoresDestino: { nombre: 'MARIO FERNANDO' },
    valoresFuente: { nombre: 'MARIA FERNANDA' },
    porDefecto: 'destino',
  },
  {
    clave: 'telefono',
    etiqueta: 'Teléfono',
    identidad: false,
    valoresDestino: { telefono: null },
    valoresFuente: { telefono: '6641234567' },
    porDefecto: 'fuente',
  },
];

describe('fusionCampos', () => {
  it('si se conserva el otro registro, invierte los valores y recalcula el valor por defecto', () => {
    const orientados = orientarCampos(campos, false);
    expect(orientados[0]).toMatchObject({
      valoresDestino: { nombre: 'MARIA FERNANDA' },
      valoresFuente: { nombre: 'MARIO FERNANDO' },
      porDefecto: 'destino',
    });
    // Ahora el conservado sí tiene teléfono: se queda el suyo
    expect(orientados[1].porDefecto).toBe('destino');
    expect(orientarCampos(campos, true)).toBe(campos);
  });

  it('envía todos los campos que difieren, con lo elegido por id de registro', () => {
    expect(camposElegidosParaEnvio(campos, { nombre: 'f1' }, 'd1')).toEqual({
      nombre: 'fuente',
      telefono: 'fuente',
    });
    // La elección por id sobrevive a cambiar cuál se conserva
    const orientados = orientarCampos(campos, false);
    expect(camposElegidosParaEnvio(orientados, { nombre: 'f1' }, 'f1')).toEqual({
      nombre: 'destino',
      telefono: 'destino',
    });
  });

  it('muestra fechas como día, el centro por nombre y los grupos juntos', () => {
    expect(textoValorCampo('fechaNacimiento', { fechaNacimiento: '1990-03-12' })).toBe(
      '12/03/1990',
    );
    expect(
      textoValorCampo('idCentroTrabajo', { idCentroTrabajo: 'c1' }, { c1: 'Planta Norte' }),
    ).toBe('Planta Norte');
    expect(textoValorCampo('sexo', { sexo: 'Femenino', sexoCURP: 2 })).toBe('Femenino');
    expect(
      textoValorCampo('contactoEmergencia', {
        contactoEmergenciaNombre: 'ANA',
        contactoEmergenciaTelefono: '555',
      }),
    ).toBe('ANA · 555');
    expect(textoValorCampo('telefono', { telefono: null })).toBeNull();
  });

  it('lista solo los datos que toman el valor del otro registro', () => {
    expect(
      cambiosEnConservado(campos, { nombre: 'destino', telefono: 'fuente' }),
    ).toEqual([
      { clave: 'telefono', etiqueta: 'Teléfono', anterior: null, nuevo: '6641234567' },
    ]);
  });

  it('el motivo es obligatorio y «Otro» pide texto', () => {
    expect(errorMotivoFusion([], '', '')).toMatch(/al menos un motivo/);
    expect(errorMotivoFusion(['OTRO'], '  ', '')).toMatch(/«Otro»/);
    expect(errorMotivoFusion(['CAMBIO_CURP'], '', 'x'.repeat(501))).toMatch(/500/);
    expect(errorMotivoFusion(['CAMBIO_CURP', 'OTRO'], 'Corrección del RENAPO', '')).toBeNull();
  });
});
