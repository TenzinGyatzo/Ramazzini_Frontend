import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { resolveFirmanteTipo } from '@/constants/rolePermissionPolicy';

/**
 * Perfil de firmante de OTRO usuario: el Administrador de plataforma puede ver y
 * corregir los datos de firmante de los usuarios del proveedor en el que está
 * trabajando. Cada pantalla de firmante sigue siendo la del propio usuario,
 * salvo cuando el Administrador llega con `?usuario=<id>`.
 *
 * El servidor ya lo permite: valida que el usuario sea del proveedor activo y
 * que el tipo de firmante corresponda a su rol o perfil profesional.
 */

interface UsuarioDeProveedor {
  _id: string;
  username?: string;
  email?: string;
  role?: string;
  perfilProfesional?: string | null;
}

const RUTA_POR_TIPO = {
  medico: 'medico-firmante',
  enfermera: 'enfermera-firmante',
  tecnico: 'tecnico-evaluador-firmante',
} as const;

/** Pantalla de firmante que le corresponde a un usuario, abierta sobre él; null si no firma. */
export function rutaDePerfilFirmante(usuario: UsuarioDeProveedor): RouteLocationRaw | null {
  const tipo = resolveFirmanteTipo(usuario.role, usuario.perfilProfesional);
  // El Administrador de plataforma no firma documentos
  if (!tipo || usuario.role === 'Administrador') return null;
  return { name: RUTA_POR_TIPO[tipo], query: { usuario: usuario._id } };
}

export function usePerfilFirmanteDeUsuario(almacen: {
  /** Vacía el perfil cargado. */
  limpiar: () => void;
  /** Carga el perfil de firmante de un usuario. */
  cargar: (idUsuario: string) => Promise<unknown>;
}) {
  const userStore = useUserStore();
  const router = useRouter();

  const idPropio = String(userStore.user?._id ?? '');
  const pedido = router?.currentRoute?.value?.query?.usuario;
  const idPedido = typeof pedido === 'string' ? pedido : '';

  /** Solo el Administrador abre el perfil de otro; a los demás el parámetro no les aplica. */
  const esDeOtroUsuario =
    userStore.user?.role === 'Administrador' && !!idPedido && idPedido !== idPropio;

  const idUsuario = computed(() => (esDeOtroUsuario ? idPedido : String(userStore.user?._id ?? '')));
  const usuario = ref<UsuarioDeProveedor | null>(null);

  if (esDeOtroUsuario) {
    // Antes de que la pantalla lea el perfil: que no arranque con los datos del Administrador
    almacen.limpiar();

    onMounted(async () => {
      await almacen.cargar(idPedido);
      const idProveedorSalud = userStore.user?.idProveedorSalud;
      if (!idProveedorSalud) return;
      const resultado = await userStore.fetchUsersByProveedorId(idProveedorSalud, { scope: 'full' });
      const lista = (resultado?.data ?? []) as UsuarioDeProveedor[];
      usuario.value = lista.find((u) => String(u._id) === idPedido) ?? null;
    });

    // Al salir, el perfil en memoria vuelve a ser el del propio Administrador
    onBeforeUnmount(() => {
      almacen.limpiar();
      if (idPropio) void almacen.cargar(idPropio);
    });
  }

  return { esDeOtroUsuario, idUsuario, usuario };
}
