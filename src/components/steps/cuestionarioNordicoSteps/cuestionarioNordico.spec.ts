import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useFormDataStore } from '@/stores/formDataStore';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import PasoRegionesNordico from './PasoRegionesNordico.vue';
import GuiaCorporalNordico from './GuiaCorporalNordico.vue';

/** Botón de una región, dentro de la pregunta indicada (`data-pregunta`). */
function boton(
  wrapper: ReturnType<typeof mount>,
  region: string,
  pregunta: string,
  texto: string,
) {
  const selector = `div[data-region="${region}"] [data-pregunta="${pregunta}"] button`;
  const encontrado = wrapper.findAll(selector).find((b) => b.text().trim() === texto);
  if (!encontrado) throw new Error(`No se encontró «${texto}» en ${selector}`);
  return encontrado;
}

describe('captura del Cuestionario Nórdico', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('el paso de cuello y hombros muestra sus tres regiones', () => {
    const wrapper = mount(PasoRegionesNordico, { props: { paso: 2 } });
    expect(wrapper.text()).toContain('Cuello y hombros');
    const tarjetas = wrapper.findAll('div[data-region]');
    expect(tarjetas.map((t) => t.attributes('data-region'))).toEqual([
      'cuello',
      'hombroIzquierdo',
      'hombroDerecho',
    ]);
  });

  it('«Sí» despliega el detalle y lo guarda en el formulario; «No» lo borra', async () => {
    const formData = useFormDataStore();
    const wrapper = mount(PasoRegionesNordico, { props: { paso: 2 } });
    const cuello = 'div[data-region="cuello"]';

    expect(wrapper.find(cuello).text()).not.toContain('Intensidad habitual');

    await boton(wrapper, 'cuello', 'molestia12Meses', 'Sí').trigger('click');
    expect(wrapper.find(cuello).text()).toContain('Intensidad habitual');

    await boton(wrapper, 'cuello', 'tiempoMolestia12Meses', '8-30 días').trigger('click');
    await boton(wrapper, 'cuello', 'intensidad', '8').trigger('click');
    await boton(wrapper, 'cuello', 'diasImpedimento', '1-7 días').trigger('click');
    await boton(wrapper, 'cuello', 'atencionProfesional', 'Fisioterapia').trigger('click');
    await boton(wrapper, 'cuello', 'relacionTrabajo', 'Parcialmente').trigger('click');
    await boton(wrapper, 'cuello', 'actividades', 'Otro').trigger('click');
    await boton(wrapper, 'cuello', 'actividades', 'Posturas forzadas').trigger('click');
    await wrapper.find(`${cuello} input[type="text"]`).setValue('Conducir');

    const regiones = (formData.formDataCuestionarioNordico as any).regiones;
    expect(regiones.cuello).toEqual({
      molestia12Meses: 'Sí',
      tiempoMolestia12Meses: '8-30 días',
      intensidad: 8,
      diasImpedimento: '1-7 días',
      atencionProfesional: 'Fisioterapia',
      relacionTrabajo: 'Parcialmente',
      // Orden del catálogo, no el orden en que se marcaron
      actividades: ['Posturas forzadas', 'Otro'],
      actividadOtra: 'Conducir',
    });

    // Sin relación con el trabajo no quedan actividades
    await boton(wrapper, 'cuello', 'relacionTrabajo', 'No relacionada').trigger('click');
    expect(regiones.cuello.actividades).toBeUndefined();
    expect(regiones.cuello.actividadOtra).toBeUndefined();

    await boton(wrapper, 'cuello', 'molestia12Meses', 'No').trigger('click');
    expect(regiones.cuello).toEqual({ molestia12Meses: 'No' });
    expect(wrapper.find(cuello).text()).not.toContain('Intensidad habitual');
  });

  it('al montar el paso, las regiones sin respuesta quedan en «No» y las ya contestadas se respetan', () => {
    const formData = useFormDataStore();
    Object.assign(formData.formDataCuestionarioNordico, {
      regiones: { hombroDerecho: { molestia12Meses: 'Sí', intensidad: 5 } },
    });

    const wrapper = mount(PasoRegionesNordico, { props: { paso: 2 } });

    const regiones = (formData.formDataCuestionarioNordico as any).regiones;
    expect(regiones.cuello).toEqual({ molestia12Meses: 'No' });
    expect(regiones.hombroIzquierdo).toEqual({ molestia12Meses: 'No' });
    expect(regiones.hombroDerecho).toEqual({ molestia12Meses: 'Sí', intensidad: 5 });
    // Solo se tocan las regiones del paso montado
    expect(regiones.rodillaDerecha).toEqual({});
    expect(wrapper.findAll('button').some((b) => b.text().includes('sin responder'))).toBe(false);
  });

  it('la guía numera las 16 regiones, colorea por nivel y avisa la región pulsada', async () => {
    const wrapper = mount(GuiaCorporalNordico, {
      props: {
        niveles: { cuello: 'molestia', espaldaBaja: 'prioritaria' },
        regionesActivas: ['cuello'],
        interactiva: true,
      },
    });
    const marcadores = wrapper.findAll('g[data-region]');
    expect(marcadores).toHaveLength(16);
    expect(marcadores.map((m) => m.find('text').text())).toEqual(
      Array.from({ length: 16 }, (_, i) => String(i + 1)),
    );
    expect(wrapper.find('g[data-region="cuello"] circle[fill="#F59E0B"]').exists()).toBe(true);
    expect(wrapper.find('g[data-region="espaldaBaja"] circle[fill="#DC2626"]').exists()).toBe(true);
    // El anillo de resalte solo va en las regiones del paso actual
    expect(wrapper.findAll('circle[stroke="#EAB308"]')).toHaveLength(1);

    await wrapper.find('g[data-region="rodillaDerecha"]').trigger('click');
    expect(wrapper.emitted('seleccionar')).toEqual([['rodillaDerecha']]);
  });

  it('el visualizador refleja el resultado en vivo', async () => {
    const empresas = useEmpresasStore();
    const trabajadores = useTrabajadoresStore();
    const formData = useFormDataStore();
    (empresas as any).currentEmpresa = { nombreComercial: 'Empresa de prueba' };
    (trabajadores as any).currentTrabajador = {
      nombre: 'Ana',
      primerApellido: 'López',
      segundoApellido: 'Ruiz',
      puesto: 'Operadora',
      sexo: 'Femenino',
      fechaNacimiento: '1992-05-10',
    };
    Object.assign(formData.formDataCuestionarioNordico, {
      fechaCuestionarioNordico: '2026-10-03',
      antiguedadActividadAnios: 4,
      antiguedadActividadMeses: 6,
      regiones: { cuello: { molestia12Meses: 'No' } },
    });

    // Import diferido: el store de pasos usa otros stores al cargarse y necesita Pinia activa
    const { default: Visualizador } = await import('../VisualizadorCuestionarioNordico.vue');
    const wrapper = mount(Visualizador);

    expect(wrapper.text()).toContain('Sin molestias reportadas');
    expect(wrapper.text()).toContain('4 años 6 meses');
    expect(wrapper.text()).toContain('0 de 16');

    (formData.formDataCuestionarioNordico as any).regiones.espaldaBaja = {
      molestia12Meses: 'Sí',
      tiempoMolestia12Meses: 'Todos los días',
      molestia7Dias: 'Sí',
      intensidad: 9,
      diasImpedimento: 'Más de 30 días',
      atencionProfesional: 'Médico',
      relacionTrabajo: 'Principalmente',
      actividades: ['Levantamiento de cargas'],
    };
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Molestias con prioridad de seguimiento');
    expect(wrapper.text()).toContain('1 de 16');
    expect(wrapper.text()).toContain('9/10 (Intensa)');
    const fila = wrapper.find('tr[data-region="espaldaBaja"]');
    expect(fila.classes()).toContain('bg-red-50');
    expect(fila.text()).toContain('Principalmente: Levantamiento de cargas');
    expect(wrapper.find('tr[data-region="cuello"]').text()).toContain('—');
  });
});
