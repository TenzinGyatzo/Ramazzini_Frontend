import { describe, expect, it } from 'vitest';
import {
  TEXTO_SIN_IMPEDIMENTO_CERTIFICADO,
  normalizarModalidadCertificado,
  textoConclusionInterrogatorio,
  textoImpedimentosCertificado,
} from './certificadoModalidad';

describe('certificado: con resultados clínicos o por interrogatorio', () => {
  it('sin modalidad guardada (certificados anteriores) es con resultados clínicos', () => {
    expect(normalizarModalidadCertificado(undefined)).toBe('resultadosClinicos');
    expect(normalizarModalidadCertificado('interrogatorio')).toBe('interrogatorio');
  });

  it('la conclusión por interrogatorio, en femenino o masculino', () => {
    expect(textoConclusionInterrogatorio('Femenino')).toBe(
      'y de acuerdo con sus respuestas durante el interrogatorio médico, se encuentra clínicamente sana.',
    );
    expect(textoConclusionInterrogatorio('Masculino')).toBe(
      'y de acuerdo con sus respuestas durante el interrogatorio médico, se encuentra clínicamente sano.',
    );
  });

  it('por interrogatorio, «sin impedimento» nombra el puesto del trabajador', () => {
    expect(textoImpedimentosCertificado('interrogatorio', TEXTO_SIN_IMPEDIMENTO_CERTIFICADO, 'Operador')).toBe(
      'no presenta impedimento físico para desarrollar el puesto de Operador',
    );
    // Con resultados clínicos no cambia
    expect(textoImpedimentosCertificado('resultadosClinicos', TEXTO_SIN_IMPEDIMENTO_CERTIFICADO, 'Operador')).toBe(
      TEXTO_SIN_IMPEDIMENTO_CERTIFICADO,
    );
  });

  it('un impedimento escrito por el médico se respeta en las dos modalidades', () => {
    const propio = 'presenta limitación para cargar más de 10 kg';
    expect(textoImpedimentosCertificado('interrogatorio', propio, 'Operador')).toBe(propio);
    expect(textoImpedimentosCertificado(undefined, propio, 'Operador')).toBe(propio);
  });
});
