import { describe, expect, it } from 'vitest';
import enfermera from './EnfermeraFirmanteView.vue?raw';
import medico from './MedicoFirmanteView.vue?raw';
import tecnico from './TecnicoFirmanteView.vue?raw';

/**
 * El país de nacimiento es dato de identificación: con el firmante bloqueado (CURP real o
 * documento finalizado/anulado, SIRES) debe verse deshabilitado como la entidad. Antes, la
 * copia de la sección SIRES quedaba editable y el cambio se descartaba en silencio al guardar.
 */
const vistas = { EnfermeraFirmanteView: enfermera, MedicoFirmanteView: medico, TecnicoFirmanteView: tecnico };

function camposPaisNacimiento(fuente: string): string[] {
  return (fuente.match(/<PaisNacimientoAutocomplete[\s\S]*?\/>/g) ?? []).filter((bloque) =>
    /v-model="formulario\w+\.paisNacimiento"/.test(bloque),
  );
}

describe('bloqueo del país de nacimiento en los perfiles de firmante', () => {
  for (const [nombre, fuente] of Object.entries(vistas)) {
    it(`${nombre}: todos los campos de país de nacimiento respetan el bloqueo`, () => {
      const campos = camposPaisNacimiento(fuente);
      // Uno para SIN_REGIMEN y otro en «Datos de Nacimiento» (SIRES)
      expect(campos).toHaveLength(2);
      for (const campo of campos) {
        expect(campo).toContain(':disabled="isCurpConformationReadOnly"');
      }
    });
  }
});
