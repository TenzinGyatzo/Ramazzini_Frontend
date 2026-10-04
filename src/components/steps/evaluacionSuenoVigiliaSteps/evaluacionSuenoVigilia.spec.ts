import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useFormDataStore } from '@/stores/formDataStore';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import PasoFrecuenciaSuenoVigilia from './PasoFrecuenciaSuenoVigilia.vue';
import Step7 from './Step7.vue';
import Step8 from './Step8.vue';

/** Botón dentro de la pregunta indicada (`data-pregunta`). */
function boton(wrapper: ReturnType<typeof mount>, pregunta: string, texto: string) {
  const selector = `[data-pregunta="${pregunta}"] button`;
  const encontrado = wrapper.findAll(selector).find((b) => b.text().trim() === texto);
  if (!encontrado) throw new Error(`No se encontró «${texto}» en ${selector}`);
  return encontrado;
}

const datos = () => useFormDataStore().formDataEvaluacionSuenoVigilia as any;

describe('captura de la Evaluación de sueño y vigilia', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('un paso de área inicia sus preguntas en «Nunca» y respeta lo ya contestado', () => {
    Object.assign(datos(), { sueno: { conciliacionTardia: 3 } });

    const wrapper = mount(PasoFrecuenciaSuenoVigilia, { props: { area: 'conciliacionContinuidad' } });

    expect(wrapper.text()).toContain('Módulo A — Sueño');
    expect(wrapper.text()).toContain('Conciliación y continuidad');
    expect(wrapper.findAll('[data-pregunta]')).toHaveLength(3);
    // Solo se tocan las preguntas del área montada
    expect(datos().sueno).toEqual({ conciliacionTardia: 3, despertarNocturno: 0, despertarTemprano: 0 });
    expect(datos().vigilia).toEqual({});
    expect(wrapper.text()).not.toContain('Cada pregunta inicia');
  });

  it('al contestar una pregunta se guarda su valor y cambia el nivel del área', async () => {
    const wrapper = mount(PasoFrecuenciaSuenoVigilia, { props: { area: 'fatiga' } });
    expect(wrapper.findAll('[data-pregunta]')).toHaveLength(2);
    expect(wrapper.find('[data-nivel]').text()).toBe('Sin síntomas');

    await boton(wrapper, 'faltaEnergia', '1 o 2 veces por semana').trigger('click');

    expect(datos().vigilia).toEqual({ faltaEnergia: 2, interrupcionPorAgotamiento: 0 });
    expect(wrapper.find('[data-nivel]').text()).toBe('Semanal');
  });

  it('la seguridad inicia en «No» y respeta lo ya contestado', async () => {
    Object.assign(datos(), { seguridad: { ronquidoFuerte: 'No sabe' } });

    const wrapper = mount(Step7);

    expect(datos().seguridad).toEqual({
      ronquidoFuerte: 'No sabe',
      pausasRespiratorias: 'No',
      despertarConAhogo: 'No',
      suenoActividadPeligrosa: 'No',
      accidenteOCasiAccidente: 'No',
    });
    expect(wrapper.findAll('button[aria-pressed="true"]')).toHaveLength(5);
    expect(wrapper.text()).not.toContain('por contestar');
  });

  it('la descripción aparece con «Sí» y se borra al cambiar la respuesta', async () => {
    const wrapper = mount(Step7);
    const pregunta = '[data-pregunta="suenoActividadPeligrosa"]';
    expect(wrapper.find(`${pregunta} textarea`).exists()).toBe(false);

    await boton(wrapper, 'suenoActividadPeligrosa', 'Sí').trigger('click');
    await wrapper.find(`${pregunta} textarea`).setValue('Cabeceo al conducir');
    expect(datos().seguridad).toMatchObject({
      suenoActividadPeligrosa: 'Sí',
      descripcionSuenoActividadPeligrosa: 'Cabeceo al conducir',
    });

    await boton(wrapper, 'suenoActividadPeligrosa', 'No realiza esas actividades').trigger('click');
    expect(datos().seguridad.suenoActividadPeligrosa).toBe('No realiza esas actividades');
    expect(datos().seguridad.descripcionSuenoActividadPeligrosa).toBeUndefined();
    expect(wrapper.find(`${pregunta} textarea`).exists()).toBe(false);
  });

  it('sin síntomas el paso final solo pide observaciones', () => {
    Object.assign(datos(), { sueno: { suenoSuperficial: 0 }, vigilia: { faltaEnergia: 0 } });
    const wrapper = mount(Step8);
    expect(wrapper.find('[data-pregunta="duracion"]').exists()).toBe(false);
    expect(wrapper.find('[data-pregunta="observaciones"]').exists()).toBe(true);
  });

  it('con síntomas de sueño pide el seguimiento; la pregunta del día solo con síntomas de vigilia', async () => {
    Object.assign(datos(), { sueno: { suenoSuperficial: 2 } });
    const wrapper = mount(Step8);

    expect(wrapper.find('[data-pregunta="duracion"]').text()).toContain('¿Desde cuándo presenta estos síntomas?');
    // El paso dice a qué síntomas se refieren las preguntas
    expect(wrapper.find('[data-sintomas]').text()).toContain('Calidad y descanso (semanal)');
    expect(wrapper.find('[data-pregunta="empeoraAlDormirMal"]').exists()).toBe(false);
    // Sin respuesta por defecto
    expect(wrapper.findAll('button[aria-pressed="true"]')).toHaveLength(0);

    datos().vigilia = { faltaEnergia: 1 };
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-pregunta="empeoraAlDormirMal"]').exists()).toBe(true);
  });

  it('las opciones exclusivas desmarcan a las demás y el orden es el del catálogo', async () => {
    Object.assign(datos(), { sueno: { suenoSuperficial: 2 } });
    const wrapper = mount(Step8);

    await boton(wrapper, 'factores', 'Medicamentos').trigger('click');
    await boton(wrapper, 'factores', 'Dolor o enfermedad').trigger('click');
    expect(datos().seguimiento.factores).toEqual(['Dolor o enfermedad', 'Medicamentos']);

    await boton(wrapper, 'factores', 'No sabe').trigger('click');
    expect(datos().seguimiento.factores).toEqual(['No sabe']);

    await boton(wrapper, 'productosParaDormir', 'Suplementos').trigger('click');
    await wrapper.find('[data-pregunta="productosParaDormir"] input').setValue('Melatonina');
    expect(datos().seguimiento.detalleProductos).toBe('Melatonina');

    await boton(wrapper, 'productosParaDormir', 'Nada').trigger('click');
    expect(datos().seguimiento.productosParaDormir).toEqual(['Nada']);
    expect(datos().seguimiento.detalleProductos).toBeUndefined();
  });

  it('el visualizador rodea todas las filas del paso activo', async () => {
    // jsdom no implementa scrollTo, y al cambiar de paso el visualizador se desplaza a su sección
    Element.prototype.scrollTo = () => {};
    (useEmpresasStore() as any).currentEmpresa = { nombreComercial: 'Empresa de prueba' };
    (useTrabajadoresStore() as any).currentTrabajador = { nombre: 'Ana', fechaNacimiento: '1992-05-10' };
    const { default: Visualizador } = await import('../VisualizadorEvaluacionSuenoVigilia.vue');
    const { useStepsStore } = await import('@/stores/steps');
    const wrapper = mount(Visualizador);
    const pasos = useStepsStore();
    const contornos = () => wrapper.findAll('tbody.contorno-paso');

    // Paso 1: la fecha y, además, las filas de contexto del sueño
    expect(contornos()).toHaveLength(1);
    expect(contornos()[0].attributes('data-grupo')).toBe('contexto');
    expect(contornos()[0].text()).toContain('HORAS DE SUEÑO POR CADA 24');
    expect(contornos()[0].text()).toContain('CALIDAD GENERAL DEL SUEÑO');

    // Pasos de área: el contorno abarca el encabezado del área y todas sus preguntas
    for (const [paso, area, preguntas] of [
      [2, 'calidadDescanso', 3],
      [3, 'conciliacionContinuidad', 3],
      [4, 'somnolencia', 2],
      [5, 'fatiga', 2],
      [6, 'concentracion', 2],
    ] as const) {
      pasos.currentStep = paso;
      await wrapper.vm.$nextTick();
      expect(contornos()).toHaveLength(1);
      expect(contornos()[0].attributes('data-grupo-area')).toBe(area);
      expect(contornos()[0].find(`tr[data-area="${area}"]`).exists()).toBe(true);
      expect(contornos()[0].findAll('tr[data-pregunta]')).toHaveLength(preguntas);
    }
  });

  it('el visualizador refleja la prioridad, las alertas y lo que falta', async () => {
    (useEmpresasStore() as any).currentEmpresa = { nombreComercial: 'Empresa de prueba' };
    (useTrabajadoresStore() as any).currentTrabajador = {
      nombre: 'Ana',
      primerApellido: 'López',
      segundoApellido: 'Ruiz',
      puesto: 'Operadora',
      sexo: 'Femenino',
      fechaNacimiento: '1992-05-10',
    };
    Object.assign(datos(), {
      fechaEvaluacionSuenoVigilia: '2026-10-04',
      minutosSuenoDiarios: 390,
      horarioLaboral: 'Rotatorio',
      sueno: {
        suenoSuperficial: 0,
        despertarSinDescanso: 0,
        suenoInsuficiente: 0,
        conciliacionTardia: 0,
        despertarNocturno: 0,
        despertarTemprano: 0,
      },
      vigilia: {
        esfuerzoNoDormirse: 0,
        suenoInvoluntario: 0,
        faltaEnergia: 0,
        interrupcionPorAgotamiento: 0,
        dificultadAtencion: 0,
        erroresUOlvidos: 0,
      },
    });

    // Import diferido: el store de pasos usa otros stores al cargarse y necesita Pinia activa
    const { default: Visualizador } = await import('../VisualizadorEvaluacionSuenoVigilia.vue');
    const wrapper = mount(Visualizador);

    expect(wrapper.text()).toContain('6 h 30 min');
    expect(wrapper.find('[data-resultado]').text()).toContain('Sin síntomas ni alertas reportadas');
    // La seguridad aún no se contesta
    expect(wrapper.find('[data-resultado]').text()).toContain('evaluación incompleta');
    expect(wrapper.find('[data-seguridad="ronquidoFuerte"]').text()).toContain('Sin respuesta');
    expect(wrapper.find('[data-seguimiento]').exists()).toBe(false);

    datos().sueno.conciliacionTardia = 3;
    datos().seguridad = {
      ronquidoFuerte: 'No',
      pausasRespiratorias: 'No',
      despertarConAhogo: 'No',
      suenoActividadPeligrosa: 'Sí',
      descripcionSuenoActividadPeligrosa: 'Cabeceo al conducir',
      accidenteOCasiAccidente: 'No',
    };
    await wrapper.vm.$nextTick();

    const resultado = wrapper.find('[data-resultado]').text();
    expect(resultado).toContain('Síntomas frecuentes o alerta de seguridad');
    expect(resultado).not.toContain('evaluación incompleta');
    expect(wrapper.find('[data-alerta="suenoActividadPeligrosa"]').exists()).toBe(true);
    expect(wrapper.find('[data-alerta="suenoCorto"]').exists()).toBe(true);
    expect(wrapper.find('tr[data-area="conciliacionContinuidad"]').text()).toContain('Frecuente');
    expect(wrapper.find('tr[data-area="conciliacionContinuidad"]').classes()).toContain('bg-red-50');
    expect(wrapper.find('[data-seguridad="suenoActividadPeligrosa"]').text()).toContain('Cabeceo al conducir');
    expect(wrapper.find('[data-seguimiento]').exists()).toBe(true);
  });
});
