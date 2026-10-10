import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { rutaDePerfilFirmante, usePerfilFirmanteDeUsuario } from './usePerfilFirmanteDeUsuario';

const ADMIN = 'admin1';
const estado = {
  usuario: { _id: ADMIN, role: 'Administrador', idProveedorSalud: 'prov1' } as Record<string, unknown>,
  consulta: {} as Record<string, unknown>,
};
const usuariosDelProveedor = vi.fn();

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ user: estado.usuario, fetchUsersByProveedorId: usuariosDelProveedor }),
}));
vi.mock('vue-router', () => ({
  useRouter: () => ({ currentRoute: { value: { query: estado.consulta } } }),
}));

const almacen = { limpiar: vi.fn(), cargar: vi.fn().mockResolvedValue(undefined) };

const usar = () => {
  let resultado!: ReturnType<typeof usePerfilFirmanteDeUsuario>;
  const wrapper = mount(
    defineComponent({
      setup() {
        resultado = usePerfilFirmanteDeUsuario(almacen);
        return () => h('div');
      },
    }),
  );
  return { resultado, wrapper };
};

describe('perfil de firmante de otro usuario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estado.usuario = { _id: ADMIN, role: 'Administrador', idProveedorSalud: 'prov1' };
    estado.consulta = {};
    usuariosDelProveedor.mockResolvedValue({
      success: true,
      data: [{ _id: 'u7', username: 'Dra. Ana López', email: 'ana@clinica.mx', role: 'Médico' }],
    });
  });

  it('sin parámetro, cada quien edita su propio perfil y no se recarga nada', async () => {
    const { resultado } = usar();
    await flushPromises();
    expect(resultado.esDeOtroUsuario).toBe(false);
    expect(resultado.idUsuario.value).toBe(ADMIN);
    expect(almacen.limpiar).not.toHaveBeenCalled();
    expect(almacen.cargar).not.toHaveBeenCalled();
  });

  it('el Administrador abre el perfil del usuario indicado y lo guarda a nombre de ese usuario', async () => {
    estado.consulta = { usuario: 'u7' };
    const { resultado } = usar();
    // Se vacía antes de montar: la pantalla no arranca con los datos del Administrador
    expect(almacen.limpiar).toHaveBeenCalledTimes(1);
    await flushPromises();

    expect(resultado.esDeOtroUsuario).toBe(true);
    expect(resultado.idUsuario.value).toBe('u7');
    expect(almacen.cargar).toHaveBeenCalledWith('u7');
    expect(resultado.usuario.value).toMatchObject({ username: 'Dra. Ana López', email: 'ana@clinica.mx' });
  });

  it('al salir, el perfil en memoria vuelve a ser el del Administrador', async () => {
    estado.consulta = { usuario: 'u7' };
    const { wrapper } = usar();
    await flushPromises();
    wrapper.unmount();
    expect(almacen.limpiar).toHaveBeenCalledTimes(2);
    expect(almacen.cargar).toHaveBeenLastCalledWith(ADMIN);
  });

  it('a quien no es Administrador el parámetro no le aplica', async () => {
    estado.usuario = { _id: 'u2', role: 'Principal', idProveedorSalud: 'prov1' };
    estado.consulta = { usuario: 'u7' };
    const { resultado } = usar();
    await flushPromises();
    expect(resultado.esDeOtroUsuario).toBe(false);
    expect(resultado.idUsuario.value).toBe('u2');
    expect(almacen.cargar).not.toHaveBeenCalled();
  });

  it('la pantalla depende del rol o del perfil profesional; quien no firma no tiene', () => {
    expect(rutaDePerfilFirmante({ _id: 'u1', role: 'Médico' })).toEqual({
      name: 'medico-firmante',
      query: { usuario: 'u1' },
    });
    expect(rutaDePerfilFirmante({ _id: 'u2', role: 'Enfermero/a' })).toEqual({
      name: 'enfermera-firmante',
      query: { usuario: 'u2' },
    });
    expect(rutaDePerfilFirmante({ _id: 'u3', role: 'Técnico Evaluador' })).toEqual({
      name: 'tecnico-evaluador-firmante',
      query: { usuario: 'u3' },
    });
    expect(rutaDePerfilFirmante({ _id: 'u4', role: 'Principal', perfilProfesional: 'Enfermero/a' })).toEqual({
      name: 'enfermera-firmante',
      query: { usuario: 'u4' },
    });
    expect(rutaDePerfilFirmante({ _id: 'u5', role: 'Administrativo' })).toBeNull();
    expect(rutaDePerfilFirmante({ _id: 'u6', role: 'Administrador' })).toBeNull();
  });
});
