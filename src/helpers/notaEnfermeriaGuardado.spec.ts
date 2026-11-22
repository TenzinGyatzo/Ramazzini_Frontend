import { describe, expect, it } from 'vitest';
import {
  completarRespuestasPorDefecto,
  fijarHoraApertura,
  horaDeApertura,
  prepararNotaEnfermeriaParaGuardar,
} from './notaEnfermeriaGuardado';

const HOY = '2026-11-21';

describe('nota de enfermería: lo que antes escribían los pasos (punto 46)', () => {
  it('trabajador y signos vitales siempre; fecha y hora solo al revisar la sección de datos', () => {
    const df = completarRespuestasPorDefecto({}, { trabajadorId: 't1', hoy: HOY, hora: '09:15', visitado: () => false });
    expect(df).toEqual({ idTrabajador: 't1', signosVitales: {} });
    completarRespuestasPorDefecto(df, { trabajadorId: 't1', hoy: HOY, hora: '09:15', visitado: (p) => p === 1 });
    expect(df.fechaNotaEnfermeria).toBe(HOY);
    expect(df.horaAtencion).toBe('09:15');
  });

  it('no pisa lo capturado ni lo guardado', () => {
    const df = prepararNotaEnfermeriaParaGuardar(
      { idTrabajador: 'otro', fechaNotaEnfermeria: '2026-11-01', horaAtencion: '07:00', signosVitales: { frecuenciaCardiaca: 80 } },
      { trabajadorId: 't1', hoy: HOY, hora: '09:15' },
    );
    expect(df).toEqual({ idTrabajador: 'otro', fechaNotaEnfermeria: '2026-11-01', horaAtencion: '07:00', signosVitales: { frecuenciaCardiaca: 80 } });
  });

  it('nada se preselecciona: tipo, sistema, origen y destino quedan por elegir', () => {
    const df = prepararNotaEnfermeriaParaGuardar({}, { trabajadorId: 't1', hoy: HOY, hora: '09:15' });
    for (const campo of ['tipoProblema', 'sistema', 'origen', 'destino', 'relacionTemporal', 'motivoAtencion']) {
      expect(df[campo]).toBeUndefined();
    }
  });

  it('la hora que se ve es la de cuando se abrió la nota', () => {
    fijarHoraApertura(new Date(2026, 10, 21, 8, 5));
    expect(horaDeApertura()).toBe('08:05');
    expect(prepararNotaEnfermeriaParaGuardar({}, { hoy: HOY }).horaAtencion).toBe('08:05');
  });
});
