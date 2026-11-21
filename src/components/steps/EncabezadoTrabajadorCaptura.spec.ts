// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import EncabezadoTrabajadorCaptura from './EncabezadoTrabajadorCaptura.vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useEmpresasStore } from '@/stores/empresas';
import { alturaHastaElFondo } from '@/composables/useAlturaHastaElFondo';

describe('datos del trabajador en la captura rápida (punto 38)', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('muestra nombre, sexo, edad a la fecha del documento, puesto y empresa', () => {
    const trabajadores = useTrabajadoresStore();
    trabajadores.currentTrabajador = {
      primerApellido: 'López',
      segundoApellido: 'Ruiz',
      nombre: 'Ana',
      sexo: 'Femenino',
      fechaNacimiento: '1990-05-10',
      puesto: 'Soldadora',
    } as any;
    useEmpresasStore().currentEmpresa = { nombreComercial: 'Aceros del Norte' } as any;
    const w = mount(EncabezadoTrabajadorCaptura, { props: { fechaDocumento: '2026-05-09' } });
    const texto = w.text();
    expect(texto).toContain('Ana');
    expect(texto).toContain('López');
    expect(texto).toContain('Femenino');
    expect(texto).toContain('35 años');
    expect(texto).toContain('Soldadora');
    expect(texto).toContain('Aceros del Norte');
    // Sin número de empleado ni antigüedad, no se muestran vacíos
    expect(texto).not.toContain('No. de empleado');
    expect(texto).not.toContain('Antigüedad');
  });

  it('sin trabajador cargado, no muestra nada', () => {
    const w = mount(EncabezadoTrabajadorCaptura);
    expect(w.find('[data-encabezado-trabajador]').exists()).toBe(false);
  });
});

describe('alto del área de captura', () => {
  const caja = (el: Element, top: number, height: number) => {
    el.getBoundingClientRect = () =>
      ({ top, bottom: top + height, height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  };

  it('ocupa la ventana debajo de su principio, menos lo que va abajo (relleno y pie)', () => {
    document.body.innerHTML = `
      <div id="tarjeta" style="padding-bottom: 28px">
        <div id="area"></div>
        <div id="pie"></div>
      </div>`;
    const area = document.getElementById('area')!;
    caja(area, 200, 500);
    caja(document.getElementById('pie')!, 700, 60);
    // 900 de ventana − 200 arriba − 60 del pie − 28 de relleno
    expect(alturaHastaElFondo(area, 900, 320)).toBe(612);
    // En una ventana muy baja no baja del mínimo
    expect(alturaHastaElFondo(area, 400, 320)).toBe(320);
  });
});
