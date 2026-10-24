import { describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { FormKit as FormKitTipado, plugin, defaultConfig } from '@formkit/vue';
import {
  normalizacionPlugin,
  normalizarAlEscribir,
  normalizarCampo,
  normalizarCodigoPostal,
  normalizarCorreo,
  normalizarNombreDeCarpeta,
  normalizarRfc,
  normalizarSitioWeb,
  normalizarTelefono,
  normalizarTexto,
  normalizarTextoLargo,
} from './normalizarCampo';

// Los tipos de FormKit no encajan con h(); en la prueba basta el componente
const FormKit = FormKitTipado as any;

describe('normalización de campos', () => {
  it('texto: recorta y deja un solo espacio entre palabras, sin cambiar mayúsculas ni acentos', () => {
    expect(normalizarTexto('  Bodega   Norte\t ')).toBe('Bodega Norte');
    expect(normalizarTexto(' José  ÁLVAREZ ')).toBe('José ÁLVAREZ');
  });

  it('texto largo: solo los extremos', () => {
    expect(normalizarTextoLargo('  línea 1\n\nlínea  2  ')).toBe('línea 1\n\nlínea  2');
  });

  it('correo, RFC, código postal, teléfono y sitio web', () => {
    expect(normalizarCorreo(' Ana.Perez @Clinica.MX ')).toBe('ana.perez@clinica.mx');
    expect(normalizarRfc('  abc123456xy0 ')).toBe('ABC123456XY0');
    expect(normalizarCodigoPostal(' 81 200 ')).toBe('81200');
    expect(normalizarTelefono(' +52 (664) 123-4567')).toBe('+526641234567');
    expect(normalizarSitioWeb(' https://www.clinica.mx/ ')).toBe('www.clinica.mx');
  });

  it('mientras se escribe: nada que estorbe teclear', () => {
    // El espacio final se conserva para poder escribir la siguiente palabra
    expect(normalizarAlEscribir('texto', '  Ana  ')).toBe('Ana ');
    expect(normalizarAlEscribir('rfc', ' abc ')).toBe('ABC ');
    expect(normalizarAlEscribir('correo', 'Ana @x')).toBe('ana@x');
    expect(normalizarAlEscribir('codigoPostal', '81 2')).toBe('812');
    // El protocolo se quita al salir, no a medio teclear
    expect(normalizarAlEscribir('sitioWeb', 'https:// x')).toBe('https://x');
    expect(normalizarAlEscribir('telefono', '+52 (664)')).toBe('+52664');
    expect(normalizarAlEscribir('textoLargo', '  a  b ')).toBe('  a  b ');
  });

  it('nombre de empresa o centro: solo los extremos (no mueve carpetas)', () => {
    expect(normalizarNombreDeCarpeta('  Bake  Top ')).toBe('Bake  Top');
    expect(normalizarAlEscribir('nombreDeCarpeta', '  Bake  ')).toBe('Bake  ');
  });

  it('lo que no es texto se devuelve tal cual', () => {
    expect(normalizarCampo('texto', undefined)).toBeUndefined();
    expect(normalizarCampo('texto', 5)).toBe(5);
  });
});

describe('plugin de FormKit', () => {
  const Formulario = defineComponent({
    props: { onEnviar: { type: Function, required: true } },
    setup(props) {
      const datos = ref({ nombre: '', email: '', libre: '' });
      return () =>
        h(
          FormKit,
          {
            type: 'form',
            modelValue: datos.value,
            'onUpdate:modelValue': (v: any) => (datos.value = v),
            actions: false,
            onSubmit: (valores: any) => props.onEnviar({ ...valores }),
          },
          () => [
            h(FormKit, { type: 'text', name: 'nombre', normalizar: 'texto' }),
            h(FormKit, {
              type: 'text',
              name: 'email',
              normalizar: 'correo',
              validation: 'required|email',
            }),
            h(FormKit, { type: 'text', name: 'libre' }),
          ],
        );
    },
  });

  const montar = (onEnviar: (v: any) => void) =>
    mount(Formulario, {
      props: { onEnviar },
      global: { plugins: [[plugin, defaultConfig({ plugins: [normalizacionPlugin] })]] },
      attachTo: document.body,
    });

  it('limpia al salir del campo; sin «normalizar» no toca nada', async () => {
    const w = montar(() => {});
    const [nombre, , libre] = w.findAll('input');
    await nombre.setValue('  Ana   Pérez ');
    await flushPromises();
    // Mientras se escribe: sin el inicio ni los dobles, pero con el espacio final
    expect((nombre.element as HTMLInputElement).value).toBe('Ana Pérez ');
    await nombre.trigger('blur');
    await flushPromises();
    expect((nombre.element as HTMLInputElement).value).toBe('Ana Pérez');

    await libre.setValue('  tal cual ');
    await libre.trigger('blur');
    await flushPromises();
    expect((libre.element as HTMLInputElement).value).toBe('  tal cual ');
    w.unmount();
  });

  it('al enviar sin salir del campo (Enter) ya va limpio lo que la validación revisa', async () => {
    let enviado: any = null;
    const w = montar((v) => (enviado = v));
    const [nombre, email] = w.findAll('input');
    await nombre.setValue(' Ana ');
    await email.setValue(' Ana@Clinica.MX ');
    await w.find('form').trigger('submit');
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    // El espacio final del nombre lo quita el servidor
    expect(enviado).toMatchObject({ nombre: 'Ana ', email: 'ana@clinica.mx' });
    w.unmount();
  });
});

describe('configuración real de FormKit', () => {
  it('registra el plugin y las reglas validan el valor ya normalizado', async () => {
    const { default: config } = await import('../../formkit.config.js');
    const w = mount(
      defineComponent({
        setup: () => () =>
          h(FormKit, { type: 'form', actions: false }, () => [
            h(FormKit, {
              type: 'text',
              name: 'sitioWeb',
              normalizar: 'sitioWeb',
              validation: 'urlValidation',
            }),
            h(FormKit, {
              type: 'text',
              name: 'password',
              validation: 'passwordValidation',
            }),
          ]),
      }),
      { global: { plugins: [[plugin, defaultConfig(config as any)]] }, attachTo: document.body },
    );
    const [sitio, password] = w.findAll('input');
    await sitio.setValue('https://www.clinica.mx/');
    await sitio.trigger('blur');
    await password.setValue(' Clave1234');
    await password.trigger('blur');
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect((sitio.element as HTMLInputElement).value).toBe('www.clinica.mx');
    const invalidos = w
      .findAll('[data-invalid]')
      .map((n) => n.find('input').attributes('name'));
    expect(invalidos).toEqual(['password']);
    w.unmount();
  });
});
