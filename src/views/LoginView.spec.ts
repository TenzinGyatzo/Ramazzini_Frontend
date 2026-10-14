import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { AxiosError, AxiosHeaders } from 'axios';

const { login, push, fetchUser } = vi.hoisted(() => ({
  login: vi.fn(),
  push: vi.fn(),
  fetchUser: vi.fn(),
}));

vi.mock('@/api/AuthAPI', () => ({ default: { login } }));
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ clearUser: vi.fn(), fetchUser }),
}));
vi.mock('@/stores/resetSessionState', () => ({ resetSessionScopedState: vi.fn() }));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  RouterLink: { template: '<a><slot /></a>' },
}));

import LoginView from './LoginView.vue';

function errorDelServidor(status: number, message: string) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('error', 'ERR_BAD_REQUEST', config as any, {}, {
    status,
    statusText: '',
    headers: {},
    config: config as any,
    data: { message },
  });
}

async function enviar(wrapper: ReturnType<typeof mount>, correo: string, contrasena: string) {
  await wrapper.find('#email').setValue(correo);
  await wrapper.find('#password').setValue(contrasena);
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

describe('LoginView', () => {
  beforeEach(() => {
    login.mockReset();
    push.mockReset();
    fetchUser.mockReset();
  });

  it('quita los espacios del correo antes de enviar', async () => {
    login.mockResolvedValue({ status: 200, data: {} });
    const wrapper = mount(LoginView);
    await enviar(wrapper, '  medico@ejemplo.com ', 'secreta');

    expect(login).toHaveBeenCalledWith('medico@ejemplo.com', 'secreta', { loginContext: 'PRIMARY_LOGIN' });
    expect(push).toHaveBeenCalledWith('/');
  });

  it('con campos vacíos los marca y no consulta al servidor', async () => {
    const wrapper = mount(LoginView);
    await enviar(wrapper, '   ', '');

    expect(login).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Escribe tu correo');
    expect(wrapper.text()).toContain('Escribe tu contraseña');
    expect(wrapper.find('#email').attributes('aria-invalid')).toBe('true');
  });

  it('el aviso de campo vacío desaparece al escribir', async () => {
    const wrapper = mount(LoginView);
    await enviar(wrapper, '', '');
    await wrapper.find('#email').setValue('a@b.com');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Escribe tu correo');
    expect(wrapper.text()).toContain('Escribe tu contraseña');
  });

  it('el error del servidor se borra en cuanto se corrige la contraseña', async () => {
    login.mockRejectedValue(errorDelServidor(401, 'Contraseña incorrecta'));
    const wrapper = mount(LoginView);
    await enviar(wrapper, 'medico@ejemplo.com', 'mala');
    // Algunos textos del archivo usan la ñ descompuesta: se compara normalizado
    const texto = () => wrapper.text().normalize('NFC');
    expect(texto()).toContain('Contraseña incorrecta');

    await wrapper.find('#password').setValue('otra');
    await flushPromises();
    expect(texto()).not.toContain('Contraseña incorrecta');
  });

  it('sin respuesta del servidor avisa que no hay conexión', async () => {
    const config = { headers: new AxiosHeaders() };
    login.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK', config as any));
    const wrapper = mount(LoginView);
    await enviar(wrapper, 'medico@ejemplo.com', 'secreta');

    expect(wrapper.text()).toContain('No se pudo conectar con el servidor');
  });

  it('avisa cuando las mayúsculas están activadas al escribir la contraseña', async () => {
    const wrapper = mount(LoginView);
    const campo = wrapper.find('#password');
    const evento = new KeyboardEvent('keydown', { key: 'A' });
    Object.defineProperty(evento, 'getModifierState', { value: (k: string) => k === 'CapsLock' });
    campo.element.dispatchEvent(evento);
    await flushPromises();
    expect(wrapper.text()).toContain('Las mayúsculas están activadas');

    await campo.trigger('blur');
    expect(wrapper.text()).not.toContain('Las mayúsculas están activadas');
  });

  it('los campos llevan los atributos para gestores de contraseñas y el botón del ojo tiene nombre', () => {
    const wrapper = mount(LoginView);
    expect(wrapper.find('#email').attributes('autocomplete')).toBe('username');
    expect(wrapper.find('#email').attributes('type')).toBe('email');
    expect(wrapper.find('#password').attributes('autocomplete')).toBe('current-password');
    expect(wrapper.find('button[aria-label="Mostrar contraseña"]').exists()).toBe(true);
  });
});
