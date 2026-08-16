import { describe, expect, it } from 'vitest';
import { ref, nextTick } from 'vue';
import { useEntidadPaisNacimientoCoherence } from '@/composables/useEntidadPaisNacimientoCoherence';

describe('useEntidadPaisNacimientoCoherence', () => {
  it('fuerza entidad 88 al cambiar de México a extranjero', async () => {
    const formulario = ref({
      entidadNacimiento: '09',
      paisNacimiento: 142,
    });

    useEntidadPaisNacimientoCoherence(formulario, 'trabajador');
    formulario.value.paisNacimiento = 228;
    await nextTick();

    expect(formulario.value.entidadNacimiento).toBe('88');
    expect(formulario.value.paisNacimiento).toBe(228);
  });

  it('fuerza entidad 88 en firmante con país extranjero', async () => {
    const formulario = ref({
      entidadNacimiento: '',
      paisNacimiento: 246,
    });

    useEntidadPaisNacimientoCoherence(formulario, 'firmante');
    await nextTick();

    expect(formulario.value.entidadNacimiento).toBe('88');
  });

  it('sincroniza país a 142 al seleccionar entidad estatal', async () => {
    const formulario = ref({
      entidadNacimiento: '',
      paisNacimiento: 228,
    });

    useEntidadPaisNacimientoCoherence(formulario, 'trabajador');
    formulario.value.entidadNacimiento = '14';
    await nextTick();

    expect(formulario.value.paisNacimiento).toBe(142);
  });

  it('limpia país México al seleccionar entidad NE', async () => {
    const formulario = ref({
      entidadNacimiento: '',
      paisNacimiento: 142,
    });

    useEntidadPaisNacimientoCoherence(formulario, 'trabajador');
    formulario.value.entidadNacimiento = 'NE';
    await nextTick();

    expect(formulario.value.paisNacimiento).toBe('');
  });

  it('firmante limpia entidad 00 aunque el país esté vacío', async () => {
    const formulario = ref({
      entidadNacimiento: '00',
      paisNacimiento: '',
    });

    useEntidadPaisNacimientoCoherence(formulario, 'firmante');
    await nextTick();

    expect(formulario.value.entidadNacimiento).toBe('');
  });

  it('limpia entidad 88 al cambiar de extranjero a México', async () => {
    const formulario = ref({
      entidadNacimiento: '88',
      paisNacimiento: 228,
    });

    useEntidadPaisNacimientoCoherence(formulario, 'trabajador');
    formulario.value.paisNacimiento = 142;
    await nextTick();

    expect(formulario.value.entidadNacimiento).toBe('');
  });
});
