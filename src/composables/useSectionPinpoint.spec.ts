import { beforeAll, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// El módulo usa el estado de los pasos al importarse: Pinia activo antes de cargarlo
let siguienteScrollMicrostep: typeof import('./useSectionPinpoint').siguienteScrollMicrostep;
beforeAll(async () => {
  setActivePinia(createPinia());
  ({ siguienteScrollMicrostep } = await import('./useSectionPinpoint'));
});

// Panel de la sección: 600 px visibles, 1000 de contenido, empieza en y=100 de la pantalla
const panel = (scrollTop = 0) => ({ top: 100, scrollTop, clientHeight: 600, scrollHeight: 1000 });

describe('siguienteScrollMicrostep (panel de la sección)', () => {
  it('microstep normal: se centra un poco por encima del centro', () => {
    // 100 px de alto, en y=500 (400 dentro del contenido): mitad 450 - 30 % de 600 = 270
    expect(siguienteScrollMicrostep(panel(), { top: 500, height: 100 })).toBe(270);
  });

  it('microstep alto con su principio a la vista: no se mueve (antes bajaba hasta el fondo)', () => {
    // Cuadro de texto con lista larga debajo, arriba del panel
    expect(siguienteScrollMicrostep(panel(), { top: 110, height: 800 })).toBeNull();
    expect(siguienteScrollMicrostep(panel(), { top: 400, height: 700 })).toBeNull();
  });

  it('microstep alto con su principio fuera de la vista: se muestra desde su principio', () => {
    // Arriba, fuera del panel (el panel estaba desplazado 300)
    expect(siguienteScrollMicrostep(panel(300), { top: 0, height: 800 })).toBe(200);
    // Abajo, casi al fondo del panel: no se alcanza a ver su título
    expect(siguienteScrollMicrostep(panel(), { top: 650, height: 500 })).toBe(400);
  });
});
